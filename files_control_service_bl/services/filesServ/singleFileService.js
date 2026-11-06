const multer = require('multer');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
    FILE_MODULES,
    COMMON_SETTINGS,
    getModuleConfig,
    isValidModule,
    validateFileForModule,
    getFileTypeByMime,
    generateFilePath,
    getFilePathByName,
    generateSingleFilePath,
    generateSingleFilePathWithTimestamp
} = require('./fileModuleConfig');
const minioFileManagerService = require('../systemServices/minioFileManagerService');
const tokenService = require('../systemServices/tokenService');
const apiError = require('../../exceptions/apiError');
const queryService = require('../systemServices/queryService');
// const { getSettingWithToken } = require('../../grpc/handlers/settingHandler');
const antivirusEngine = require('./antivirusEngine');
const antivirusScanService = require('./antivirusScanService');
const { handleMaliciousFile } = require('./malwareHandler');

// Библиотеки для обработки медиа
const sharp = require('sharp');
const { createCanvas } = require('@napi-rs/canvas');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { processFileMetadata } = require('./metadata');
const { processFileCompression } = require('./compression');
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Сервис для работы с одиночными системными файлами
 * Использует таблицу files_single и модуль single_system_files
 */
class SingleFileService {
    constructor() {
        this.tempDirectory = COMMON_SETTINGS.tempDirectory;
        this.setupMulter();
    }

    /**
     * Настройка multer для загрузки файлов с увеличенным лимитом
     */
    setupMulter() {
        const storage = multer.diskStorage({
            destination: async (req, file, cb) => {
                try {
                    await fs.mkdir(this.tempDirectory, { recursive: true });
                    cb(null, this.tempDirectory);
                } catch (err) {
                    cb(err);
                }
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = crypto.randomBytes(16).toString('hex');
                const ext = path.extname(file.originalname);
                cb(null, `${Date.now()}_${uniqueSuffix}${ext}`);
            }
        });

        // Увеличиваем лимит до 1GB для системных файлов
        this.upload = multer({
            storage: storage,
            limits: {
                fileSize: 1024 * 1024 * 1024, // 1GB
                files: 1
            }
        });
    }

    /**
     * Получение списка одиночных файлов с пагинацией
     * @param {Object} options - Параметры пагинации и фильтрации
     * @returns {Promise<Object>} - Результат с списком файлов
     */
    async getSingleFiles(options = {}) {
        const {
            page = 1,
            limit = 1000,
            type = null,
            codeName = null
        } = options;

        try {
            let whereConditions = [];
            let queryParams = [];
            let paramIndex = 1;

            if (type) {
                whereConditions.push(`type = $${paramIndex}`);
                queryParams.push(type);
                paramIndex++;
            }

            if (codeName) {
                whereConditions.push(`code_name = $${paramIndex}`);
                queryParams.push(codeName);
                paramIndex++;
            }

            const whereClause = whereConditions.length > 0
                ? `WHERE ${whereConditions.join(' AND ')}`
                : '';

            const countQuery = `SELECT COUNT(*) as total FROM files_single ${whereClause}`;
            const countResult = await queryService.query(countQuery, queryParams);
            const total = parseInt(countResult.rows[0].total) || 0;

            const offset = (page - 1) * limit;

            const dataQuery = `
                SELECT 
                    id,
                    code_name,
                    name,
                    descr,
                    type,
                    attached,
                    can_delete,
                    file_name,
                    max_size_mb
                FROM files_single
                ${whereClause}
                ORDER BY forder ASC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            const dataParams = [...queryParams, limit, offset];
            const result = await queryService.query(dataQuery, dataParams);

            const totalPages = Math.ceil(total / limit);
            const hasNextPage = page < totalPages;
            const hasPrevPage = page > 1;

            return {
                success: true,
                data: result.rows,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalItems: total,
                    itemsPerPage: limit,
                    hasNextPage: hasNextPage,
                    hasPrevPage: hasPrevPage
                }
            };

        } catch (error) {
            console.error('Ошибка получения списка одиночных файлов:', error);
            throw apiError.Internal('Ошибка получения списка файлов', 'SFS001');
        }
    }

    /**
     * Получение информации о файле из БД по code_name
     * @param {string} codeName - Кодовое имя записи
     * @returns {Promise<Object|null>} - Информация о файле или null
     */
    async getSingleFileInfo(codeName) {
        try {
            const query = `
                SELECT 
                    id,
                    code_name,
                    name,
                    descr,
                    type,
                    attached,
                    can_delete,
                    file_name,
                    max_size_mb
                FROM files_single
                WHERE code_name = $1
            `;

            const result = await queryService.query(query, [codeName]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Ошибка получения информации о файле:', error);
            throw apiError.Internal('Ошибка получения информации о файле', 'SFS002');
        }
    }

    /**
     * Обновление одиночного системного файла
     * @param {string} codeName - Кодовое имя записи
     * @param {Object} req - Express request объект
     * @param {Object} res - Express response объект
     * @returns {Promise<Object>} - Результат операции
     */
    async updateSingleFile(codeName, token, req, res) {
        const decoded = tokenService.validateToken(token);
        return new Promise(async (resolve, reject) => {
            try {
                this.upload.single('file')(req, res, async (err) => {
                    if (err) {
                        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                            return reject(apiError.BadRequest('Неправильное имя поля для файла. Используйте \'file\'', 'SFS003'));
                        }
                        if (err.code === 'LIMIT_FILE_SIZE') {
                            return reject(apiError.BadRequest('Файл превышает максимально допустимый размер', 'SFS004'));
                        }
                        return reject(err);
                    }

                    if (!req.file) {
                        return reject(apiError.BadRequest('Файл не загружен', 'SFS005'));
                    }

                    try {
                        const fileInfo = await this.getSingleFileInfo(codeName);
                        if (!fileInfo) {
                            await this.cleanupFiles([req.file]);
                            return reject(apiError.NotFound('Запись не найдена'));
                        }

                        const config = getModuleConfig('single_system_files');
                        if (!config) {
                            await this.cleanupFiles([req.file]);
                            return reject(apiError.BadRequest('Модуль single_system_files не найден'));
                        }

                        const dbType = fileInfo.type;
                        const validation = this.validateSingleFile(req.file, dbType, config, fileInfo.max_size_mb);
                        if (!validation.valid) {
                            await this.cleanupFiles([req.file]);
                            return reject(apiError.BadRequest(validation.error));
                        }

                        let compressionResult = null;
                        let scanResult = null;
                        let scanId = null;
                        if (config.enableAntivirusScan) {
                            const fullTempPath = path.join(this.tempDirectory, req.file.filename);
                            const fileBuffer = await fs.readFile(fullTempPath);
                            const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

                            const cachedResult = await antivirusScanService.checkFileByHash(fileHash);
                            if (cachedResult) {
                                // console.log(`[Antivirus] Найден кэшированный результат для хеша ${fileHash.substring(0, 16)}...`);
                                scanResult = {
                                    ...cachedResult,
                                    isInfected: cachedResult.is_infected,
                                    verdict: cachedResult.verdict,
                                    confidence: cachedResult.confidence,
                                    threats: cachedResult.threats,
                                    timedOut: cachedResult.scan_details?.timedOut || false,
                                    score: cachedResult.scan_details?.score || 0,
                                    ruleVersion: cachedResult.scan_version
                                };
                                scanId = cachedResult.id;
                            } else {
                                scanResult = await antivirusEngine.scanFile(fullTempPath);
                            }

                            if (scanResult.isInfected) {
                                const threatNames = scanResult.threats && scanResult.threats.length > 0
                                    ? scanResult.threats.map(t => t.name).join(', ')
                                    : 'неизвестная угроза';

                                const savedScan = await antivirusScanService.saveScanResult({
                                    fileSize: req.file.size,
                                    fileHash: fileHash,
                                    mimetype: req.file.mimetype,
                                    result: scanResult,
                                    fileTable: 'files_single',
                                    fileId: fileInfo.id
                                });

                                if (savedScan) {
                                    scanId = savedScan.id;
                                }

                                // Вызов обработчика при обнаружении вредоносного файла
                                if (scanResult.verdict === 'MALICIOUS' || scanResult.verdict === 'LIKELY_MALICIOUS') {
                                    await handleMaliciousFile(decoded.data.id, fileInfo.id);
                                }

                                await this.cleanupFiles([req.file]);
                                return reject(apiError.BadRequest(
                                    `AV_SCAN_FAILED`,
                                    `Обнаружена угроза в файле: ${threatNames}`,
                                    'AV002'
                                ));
                            }
                        }

                        // Удаляем метаданные из файла после антивирусной проверки
                        if (config.metadata) {
                            // console.log(`[Metadata] Начинаем удаление метаданных из файла ${req.file.originalname} для модуля single_system_files`);
                            try {
                                const fullTempPath = path.join(this.tempDirectory, req.file.filename);
                                const metadataResult = await processFileMetadata(
                                    fullTempPath,
                                    config.metadata
                                );

                                if (metadataResult.error) {
                                    console.warn(`[Metadata] Предупреждение для ${req.file.originalname}: ${metadataResult.error}`);
                                }
                            } catch (metadataError) {
                                console.error(`[Metadata] Ошибка удаления метаданных из файла ${req.file.originalname}:`, metadataError);
                            }
                        }

                        // Применяем сжатие к файлу после антивирусной проверки
                        if (config.compression) {
                            // console.log(`[Compression] Начинаем сжатие файла ${req.file.originalname} для модуля single_system_files`);
                            try {
                                const result = await processFileCompression(
                                    req.file,
                                    this.tempDirectory,
                                    config.compression
                                );
                                compressionResult = result.compressionInfo;

                                if (result.compressionInfo.error) {
                                    console.warn(`[Compression] Предупреждение для ${req.file.originalname}: ${result.compressionInfo.error}`);
                                }
                            } catch (compressionError) {
                                console.error(`[Compression] Ошибка сжатия файла ${req.file.originalname}:`, compressionError);
                                compressionResult = {
                                    compressed: false,
                                    reason: 'error',
                                    error: compressionError.message
                                };
                            }
                        }

                        const newFilePath = generateSingleFilePathWithTimestamp(codeName, req.file.originalname);

                        if (fileInfo.attached && fileInfo.file_name) {
                            const oldFilePath = generateSingleFilePath(codeName, fileInfo.file_name);
                            try {
                                await minioFileManagerService.deleteFile(oldFilePath);
                            } catch (deleteError) {
                                console.warn('Не удалось удалить старый файл:', deleteError.message);
                            }
                        }

                        const fullTempPath = path.join(this.tempDirectory, req.file.filename);
                        const uploadedPath = await minioFileManagerService.uploadFile(
                            fullTempPath,
                            path.dirname(newFilePath)
                        );

                        const savedFileName = path.basename(uploadedPath);

                        if (config.enableAntivirusScan) {
                            const fileBuffer = await fs.readFile(fullTempPath);
                            const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

                            await antivirusScanService.deleteScansForFile('files_single', fileInfo.id);

                            const savedScan = await antivirusScanService.saveScanResult({
                                fileSize: req.file.size,
                                fileHash: fileHash,
                                mimetype: req.file.mimetype,
                                result: scanResult,
                                fileTable: 'files_single',
                                fileId: fileInfo.id
                            });

                            if (savedScan) {
                                scanId = savedScan.id;
                            }
                        }

                        const updateQuery = `
                            UPDATE files_single
                            SET 
                                file_name = $1,
                                attached = true,
                                antivirus_scan_id = $2,
                                updated_at = (NOW() AT TIME ZONE 'UTC')
                            WHERE code_name = $3
                            RETURNING *
                        `;

                        const updateParams = [savedFileName, scanId, codeName];
                        const updateResult = await queryService.query(updateQuery, updateParams);

                        await this.cleanupFiles([req.file]);

                        resolve({
                            success: true,
                            file: updateResult.rows[0],
                            compressionResult: compressionResult,
                            message: 'Файл успешно обновлен'
                        });

                    } catch (error) {
                        await this.cleanupFiles([req.file]);
                        reject(error);
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Валидация файла для одиночного системного файла
     * @param {Object} file - Загруженный файл
     * @param {string} dbType - Тип файла из БД (image, video, audio, document, archive, code)
     * @param {Object} config - Конфигурация модуля single_system_files
     * @param {number} maxSizeMb - Максимальный размер из БД в мегабайтах
     * @returns {Object} - Результат валидации {valid: boolean, error?: string}
     */
    validateSingleFile(file, dbType, config, maxSizeMb) {
        if (!config.allowedFileTypes[dbType]) {
            return { valid: false, error: `Неизвестный тип файла: ${dbType}` };
        }

        const typeConfig = config.allowedFileTypes[dbType];

        const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
        if (!typeConfig.extensions.includes(ext)) {
            return { valid: false, error: `Недопустимое расширение файла: ${ext}. Разрешены: ${typeConfig.extensions.join(', ')}` };
        }

        if (!config.allowedMimeTypes.includes(file.mimetype)) {
            return { valid: false, error: `Недопустимый тип файла: ${file.mimetype}` };
        }

        let maxSize = typeConfig.maxSize;
        if (maxSizeMb !== null && maxSizeMb !== undefined) {
            const dbMaxSizeBytes = maxSizeMb * 1024 * 1024;
            maxSize = Math.min(maxSize, dbMaxSizeBytes);
        }

        if (file.size > maxSize) {
            const maxSizeMB = Math.floor(maxSize / 1024 / 1024);
            return { valid: false, error: `Файл превышает допустимый размер (${maxSizeMB}MB)` };
        }

        return { valid: true };
    }

    /**
     * Удаление одиночного системного файла
     * @param {string} codeName - Кодовое имя записи
     * @returns {Promise<Object>} - Результат операции
     */
    async deleteSingleFile(codeName) {
        try {
            const fileInfo = await this.getSingleFileInfo(codeName);
            if (!fileInfo) {
                throw apiError.NotFound('Запись не найдена');
            }

            if (!fileInfo.can_delete) {
                throw apiError.BadRequest('Удаление файла запрещено для этой записи');
            }

            if (fileInfo.attached && fileInfo.file_name) {
                const filePath = generateSingleFilePath(codeName, fileInfo.file_name);
                try {
                    await minioFileManagerService.deleteFile(filePath);
                } catch (deleteError) {
                    console.warn('Не удалось удалить файл из MinIO:', deleteError.message);
                }
            }

            const updateQuery = `
                UPDATE files_single
                SET 
                    file_name = '',
                    attached = false,
                    antivirus_scan_id = NULL,
                    updated_at = (NOW() AT TIME ZONE 'UTC')
                WHERE code_name = $1
                RETURNING *
            `;

            const result = await queryService.query(updateQuery, [codeName]);

            await antivirusScanService.deleteScansForFile('files_single', fileInfo.id);

            return {
                success: true,
                deleted: result.rows[0],
                message: 'Файл успешно удален'
            };

        } catch (error) {
            console.error('Ошибка удаления одиночного файла:', error);
            throw error;
        }
    }

    /**
     * Получение одиночного файла из хранилища
     * @param {string} codeName - Кодовое имя записи
     * @returns {Promise<Object>} - Информация о файле и его содержимое
     */
    async getSingleFile(codeName) {
        try {
            const fileInfo = await this.getSingleFileInfo(codeName);
            if (!fileInfo) {
                return {
                    success: false,
                    message: 'Файл не найден',
                    attached: false
                };
            }

            if (!fileInfo.attached || !fileInfo.file_name) {
                return {
                    success: false,
                    message: 'Файл не прикреплен',
                    attached: false
                };
            }

            const filePath = generateSingleFilePath(codeName, fileInfo.file_name);
            const fileBuffer = await minioFileManagerService.downloadFile(filePath);

            return {
                success: true,
                mimetype: this.getMimeTypeByExtension(fileInfo.file_name),
                size: fileBuffer.length,
                fileBuffer: fileBuffer
            };

        } catch (error) {
            console.error('Ошибка получения одиночного файла:', error);
            throw apiError.Internal('Ошибка получения файла', 'SFS006');
        }
    }

    /**
     * Получение MIME типа по расширению файла
     * @param {string} filename - Имя файла
     * @returns {string} - MIME тип
     */
    getMimeTypeByExtension(filename) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.jpe': 'image/jpeg',
            '.jfif': 'image/jpeg',
            '.png': 'image/png',
            '.apng': 'image/apng',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.dib': 'image/bmp',
            '.tiff': 'image/tiff',
            '.tif': 'image/tiff',
            '.webp': 'image/webp',
            '.avif': 'image/avif',
            '.jxl': 'image/jxl',
            '.heic': 'image/heic',
            '.heif': 'image/heif',
            '.svg': 'image/svg+xml',
            '.svgz': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.icns': 'image/x-icns',
            '.psd': 'image/vnd.adobe.photoshop',
            '.psb': 'image/vnd.adobe.photoshop',
            '.raw': 'image/x-raw',
            '.cr2': 'image/x-raw',
            '.nef': 'image/x-raw',
            '.arw': 'image/x-raw',
            '.dng': 'image/x-raw',
            '.tga': 'image/tga',
            '.pcx': 'image/pcx',
            '.exr': 'image/x-exr',
            '.hdr': 'image/hdr',
            '.pict': 'image/pict',
            '.pct': 'image/pict',
            '.pic': 'image/pict',
            '.mp4': 'video/mp4',
            '.m4v': 'video/mp4',
            '.mov': 'video/quicktime',
            '.qt': 'video/quicktime',
            '.webm': 'video/webm',
            '.avi': 'video/x-msvideo',
            '.divx': 'video/x-msvideo',
            '.mkv': 'video/x-matroska',
            '.mka': 'video/x-matroska',
            '.wmv': 'video/x-ms-wmv',
            '.flv': 'video/x-flv',
            '.f4v': 'video/x-flv',
            '.mpeg': 'video/mpeg',
            '.mpg': 'video/mpeg',
            '.mpe': 'video/mpeg',
            '.m1v': 'video/mpeg',
            '.m2v': 'video/mpeg',
            '.3gp': 'video/3gpp',
            '.3g2': 'video/3gpp2',
            '.ogv': 'video/ogg',
            '.vob': 'video/mpeg',
            '.ts': 'video/mp2t',
            '.mts': 'video/mp2t',
            '.m2ts': 'video/mp2t',
            '.rm': 'application/vnd.rn-realmedia',
            '.rmvb': 'application/vnd.rn-realmedia-vbr',
            '.asf': 'video/x-ms-asf',
            '.mp3': 'audio/mpeg',
            '.m4a': 'audio/mp4',
            '.m4b': 'audio/mp4',
            '.m4p': 'audio/mp4',
            '.wav': 'audio/wav',
            '.wave': 'audio/wav',
            '.ogg': 'audio/ogg',
            '.oga': 'audio/ogg',
            '.flac': 'audio/flac',
            '.aac': 'audio/aac',
            '.wma': 'audio/wma',
            '.aiff': 'audio/aiff',
            '.aif': 'audio/aiff',
            '.opus': 'audio/opus',
            '.mid': 'audio/midi',
            '.midi': 'audio/midi',
            '.ac3': 'audio/ac3',
            '.dts': 'audio/dts',
            '.alac': 'audio/alac',
            '.ape': 'audio/ape',
            '.amr': 'audio/amr',
            '.awb': 'audio/amr-wb',
            '.gsm': 'audio/gsm',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.dot': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.docm': 'application/vnd.ms-word.document.macroEnabled.12',
            '.dotx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
            '.dotm': 'application/vnd.ms-word.template.macroEnabled.12',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12',
            '.xlsb': 'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
            '.xltx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
            '.xltm': 'application/vnd.ms-excel.template.macroEnabled.12',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.pptm': 'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
            '.potx': 'application/vnd.openxmlformats-officedocument.presentationml.template',
            '.potm': 'application/vnd.ms-powerpoint.template.macroEnabled.12',
            '.ppsx': 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
            '.ppsm': 'application/vnd.ms-powerpoint.slideshow.macroEnabled.12',
            '.ppam': 'application/vnd.ms-powerpoint.addin.macroEnabled.12',
            '.vsd': 'application/vnd.visio',
            '.vsdx': 'application/vnd.visio',
            '.mpp': 'application/vnd.ms-project',
            '.odt': 'application/vnd.oasis.opendocument.text',
            '.ott': 'application/vnd.oasis.opendocument.text-template',
            '.odm': 'application/vnd.oasis.opendocument.text-master',
            '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
            '.ots': 'application/vnd.oasis.opendocument.spreadsheet-template',
            '.odp': 'application/vnd.oasis.opendocument.presentation',
            '.otp': 'application/vnd.oasis.opendocument.presentation-template',
            '.odg': 'application/vnd.oasis.opendocument.graphics',
            '.otg': 'application/vnd.oasis.opendocument.graphics-template',
            '.odf': 'application/vnd.oasis.opendocument.formula',
            '.txt': 'text/plain',
            '.text': 'text/plain',
            '.log': 'text/plain',
            '.rtf': 'application/rtf',
            '.rtfd': 'application/rtf',
            '.csv': 'text/csv',
            '.xml': 'application/xml',
            '.json': 'application/json',
            '.yaml': 'application/yaml',
            '.yml': 'application/yaml',
            '.ini': 'text/plain',
            '.cfg': 'text/plain',
            '.conf': 'text/plain',
            '.config': 'text/plain',
            '.html': 'text/html',
            '.htm': 'text/html',
            '.xhtml': 'application/xhtml+xml',
            '.shtml': 'text/html',
            '.css': 'text/css',
            '.scss': 'text/x-scss',
            '.sass': 'text/x-sass',
            '.less': 'text/x-less',
            '.js': 'application/javascript',
            '.mjs': 'application/javascript',
            '.cjs': 'application/javascript',
            '.ts': 'application/typescript',
            '.tsx': 'application/typescript',
            '.md': 'text/markdown',
            '.markdown': 'text/markdown',
            '.rst': 'text/rst',
            '.tex': 'application/x-tex',
            '.latex': 'application/x-latex',
            '.zip': 'application/zip',
            '.zipx': 'application/zip',
            '.7z': 'application/x-7z-compressed',
            '.rar': 'application/vnd.rar',
            '.rar4': 'application/vnd.rar',
            '.rar5': 'application/vnd.rar',
            '.tar': 'application/x-tar',
            '.gz': 'application/gzip',
            '.gzip': 'application/gzip',
            '.tgz': 'application/gzip',
            '.bz2': 'application/x-bzip2',
            '.tbz2': 'application/x-bzip2',
            '.xz': 'application/x-xz',
            '.zst': 'application/zstd',
            '.lzh': 'application/x-lzh-compressed',
            '.lha': 'application/x-lzh-compressed',
            '.arj': 'application/x-arj',
            '.cab': 'application/vnd.cab-compress',
            '.iso': 'application/x-iso9660-image',
            '.img': 'application/x-iso9660-image',
            '.dmg': 'application/x-apple-diskimage',
            '.vmdk': 'application/x-virtualbox-vdi',
            '.vhd': 'application/x-vhd',
            '.ttf': 'font/ttf',
            '.otf': 'font/otf',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.eot': 'application/vnd.ms-fontobject',
            '.fnt': 'application/x-font',
            '.fon': 'application/x-font',
            '.ps': 'application/postscript',
            '.eps': 'application/postscript',
            '.ai': 'application/postscript',
            '.indd': 'application/x-indesign',
            '.pub': 'application/x-mspublisher',
            '.prn': 'application/x-prn',
            '.wpd': 'application/wordperfect',
            '.wps': 'application/vnd.ms-works',
            '.abw': 'application/x-abiword',
            '.djvu': 'image/vnd.djvu',
            '.djv': 'image/vnd.djvu',
            '.fb2': 'application/x-fictionbook',
            '.fbz': 'application/x-fictionbook+xml',
            '.epub': 'application/epub+zip',
            '.mobi': 'application/x-mobipocket-ebook',
            '.azw': 'application/vnd.amazon.ebook',
            '.py': 'text/x-python',
            '.pyw': 'text/x-python',
            '.pyi': 'text/x-python',
            '.java': 'text/x-java',
            '.class': 'application/java',
            '.c': 'text/x-c',
            '.cpp': 'text/x-c++',
            '.cc': 'text/x-c++',
            '.cxx': 'text/x-c++',
            '.h': 'text/x-c',
            '.hpp': 'text/x-c',
            '.cs': 'text/x-csharp',
            '.go': 'text/x-go',
            '.rs': 'text/x-rust',
            '.rb': 'text/x-ruby',
            '.php': 'text/x-php',
            '.swift': 'text/x-swift',
            '.kt': 'text/x-kotlin',
            '.lua': 'text/x-lua',
            '.perl': 'text/x-perl',
            '.r': 'text/x-r',
            '.dart': 'text/x-dart',
            '.sh': 'application/x-sh',
            '.bash': 'application/x-sh',
            '.sql': 'text/x-sql',
            '.vue': 'text/x-vue',
            '.svelte': 'text/x-svelte',
            '.elm': 'text/x-elm',
            '.ex': 'text/x-elixir',
            '.exs': 'text/x-elixir',
            '.ml': 'text/x-ocaml',
            '.mli': 'text/x-ocaml',
            '.f': 'text/x-fortran',
            '.for': 'text/x-fortran',
            '.bas': 'text/x-basic',
            '.asm': 'text/x-asm',
            '.s': 'text/x-asm',
            '.hs': 'text/x-haskell',
            '.lhs': 'text/x-haskell',
            '.clj': 'text/x-clojure',
            '.lisp': 'text/x-lisp',
            '.scm': 'text/x-scheme',
            '.chm': 'application/x-chm',
            '.hlp': 'application/winhlp',
            '.man': 'text/troff',
            '.me': 'text/troff',
            '.ms': 'text/troff',
            '.nfo': 'text/plain',
            '.info': 'text/plain',
            '.readme': 'text/plain',
            '.license': 'text/plain',
            '.todo': 'text/plain'
        };

        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * Очистка временных файлов
     */
    async cleanupFiles(files) {
        if (!files || !Array.isArray(files) || files.length === 0) return;

        await Promise.all(
            files.map(file => {
                if (file?.path) {
                    return fs.unlink(file.path).catch(e => console.error(`Ошибка удаления файла ${file.path}:`, e));
                }
                return Promise.resolve();
            })
        );
    }

    /**
     * Проверка работоспособности антивируса
     */
    async checkAntivirusHealth() {
        try {
            const health = await antivirusEngine.isHealthy();
            return health && health.status === 'ready';
        } catch (error) {
            console.error('[Antivirus] Проверка работоспособности неудачна:', error.message);
            return false;
        }
    }

    /**
     * Получение результата последней антивирусной проверки для файла
     * @param {string} codeName - Кодовое имя записи
     * @returns {Promise<Object|null>} - Результат проверки или null
     */
    async getFileScanResult(codeName) {
        try {
            const fileInfo = await this.getSingleFileInfo(codeName);
            if (!fileInfo) {
                throw apiError.NotFound('Файл не найден');
            }

            if (fileInfo.antivirus_scan_id) {
                const scanResult = await antivirusScanService.getScanById(fileInfo.antivirus_scan_id);
                if (scanResult) {
                    return scanResult;
                }
            }

            const latestScan = await antivirusScanService.getLatestScanForFile('files_single', fileInfo.id);
            return latestScan;
        } catch (error) {
            console.error('Ошибка получения результата проверки:', error);
            throw apiError.Internal('Ошибка получения результата антивирусной проверки', 'SFS007');
        }
    }

    /**
     * Получение истории антивирусных проверок для файла
     * @param {string} codeName - Кодовое имя записи
     * @param {Object} options - Опции пагинации
     * @returns {Promise<Array>} - Массив проверок
     */
    async getFileScanHistory(codeName, options = {}) {
        try {
            const fileInfo = await this.getSingleFileInfo(codeName);
            if (!fileInfo) {
                throw apiError.NotFound('Файл не найден');
            }

            const scans = await antivirusScanService.getScansForFile('files_single', fileInfo.id, options);
            return scans;
        } catch (error) {
            console.error('Ошибка получения истории проверок:', error);
            throw apiError.Internal('Ошибка получения истории антивирусных проверок', 'SFS008');
        }
    }

    /**
     * Принудительное пересканирование одиночного файла
     * @param {string} codeName - Кодовое имя записи
     * @returns {Promise<Object>} - Результат пересканирования
     */
    async rescanSingleFile(codeName) {
        try {
            const fileInfo = await this.getSingleFileInfo(codeName);
            if (!fileInfo) {
                throw apiError.NotFound('Файл не найден');
            }

            if (!fileInfo.attached || !fileInfo.file_name) {
                throw apiError.BadRequest('Файл не прикреплён для сканирования');
            }

            const isHealthy = await this.checkAntivirusHealth();
            if (!isHealthy) {
                throw apiError.ServiceUnavailable('Антивирусный сканер недоступен');
            }

            const filePath = generateSingleFilePath(codeName, fileInfo.file_name);
            const fileBuffer = await minioFileManagerService.downloadFile(filePath);

            const tempFileName = `rescan_${Date.now()}_${fileInfo.file_name}`;
            const tempFilePath = path.join(this.tempDirectory, tempFileName);
            await fsSync.promises.writeFile(tempFilePath, fileBuffer);

            try {
                const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

                const cachedResult = await antivirusScanService.checkFileByHash(fileHash);
                let scanResult;

                if (cachedResult) {
                    // console.log(`[Antivirus] Найден кэшированный результат для хеша ${fileHash.substring(0, 16)}...`);
                    scanResult = {
                        ...cachedResult,
                        isInfected: cachedResult.is_infected,
                        verdict: cachedResult.verdict,
                        confidence: cachedResult.confidence,
                        threats: cachedResult.threats,
                        timedOut: cachedResult.scan_details?.timedOut || false,
                        score: cachedResult.scan_details?.score || 0,
                        ruleVersion: cachedResult.scan_version,
                        fileHash: fileHash,
                        cached: true
                    };
                } else {
                    scanResult = await antivirusEngine.scanFile(tempFilePath);
                    scanResult.fileHash = fileHash;
                    scanResult.cached = false;
                }

                const minioFilePath = scanResult.isInfected ? null : filePath;

                const savedScan = await antivirusScanService.saveScanResult({
                    fileName: fileInfo.file_name,
                    filePath: minioFilePath,
                    fileSize: fileBuffer.length,
                    fileHash: fileHash,
                    mimetype: this.getMimeTypeByExtension(fileInfo.file_name),
                    result: scanResult,
                    fileTable: 'files_single',
                    fileId: fileInfo.id
                });

                await antivirusScanService.linkScanToFile('files_single', fileInfo.code_name, savedScan.id);

                // Вызов обработчика при обнаружении вредоносного файла при пересканировании
                if (scanResult.verdict === 'MALICIOUS' || scanResult.verdict === 'LIKELY_MALICIOUS') {
                    await handleMaliciousFile(null, fileInfo.id);
                }

                await fsSync.promises.unlink(tempFilePath).catch(err => {
                    console.warn(`[Antivirus] Не удалось удалить временный файл: ${tempFilePath}`, err.message);
                });

                return {
                    success: true,
                    scan: savedScan,
                    isInfected: scanResult.isInfected,
                    verdict: scanResult.verdict,
                    threatCount: scanResult.threats?.length || 0,
                    message: scanResult.isInfected
                        ? `Обнаружена угроза: ${scanResult.threats?.map(t => t.name).join(', ') || 'неизвестная'}`
                        : 'Файл чист'
                };

            } catch (scanError) {
                try {
                    await fsSync.promises.unlink(tempFilePath);
                } catch (cleanupError) {
                    console.warn(`[Antivirus] Ошибка удаления временного файла:`, cleanupError.message);
                }
                throw scanError;
            }

        } catch (error) {
            console.error(`[Antivirus] Ошибка пересканирования файла ${codeName}:`, error);
            if (error instanceof apiError.ApiError) {
                throw error;
            }
            throw apiError.Internal('Ошибка пересканирования файла', 'SFS009');
        }
    }
}

module.exports = new SingleFileService();
