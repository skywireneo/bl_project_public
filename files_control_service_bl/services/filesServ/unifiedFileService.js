const multer = require('multer');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const {
    FILE_MODULES,
    COMMON_SETTINGS,
    getModuleConfig,
    isValidModule,
    validateFileForModule,
    getFileTypeByMime,
    generateFilePath,
    getFilePathByName,
    getFileTypeByExtension
} = require('./fileModuleConfig');
const minioFileManagerService = require('../systemServices/minioFileManagerService');
const tokenService = require('../systemServices/tokenService');
const apiError = require('../../exceptions/apiError');
const queryService = require('../systemServices/queryService');
const antivirusScanService = require('./antivirusScanService');
const antivirusEngine = require('./antivirusEngine');
const { handleMaliciousFile, getUserIdByFileId, isMaliciousVerdict } = require('./malwareHandler');
const watermarkService = require('./watermarkService');
const { processFileMetadata } = require('./metadata');
const { processFileCompression } = require('./compression');

class UnifiedFileService {
    constructor() {
        this.tempDirectory = COMMON_SETTINGS.tempDirectory;
        this.setupMulter();
    }

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

        this.upload = multer({
            storage: storage,
            limits: {
                fileSize: COMMON_SETTINGS.maxTotalFileSize,
                files: COMMON_SETTINGS.allowedFileCount
            }
        });
    }

    async getCurrentFilesCount(moduleName, recordId) {
        try {
            const query = `SELECT COUNT(*) as file_count FROM files WHERE module = $1 AND record_id = $2`;
            const result = await queryService.query(query, [moduleName, recordId]);
            return parseInt(result.rows[0].file_count) || 0;
        } catch (error) {
            return 0;
        }
    }

    async handleFileUpload(req, res, moduleName, recordId = null, current_user_status = null) {
        return new Promise((resolve, reject) => {
            this.upload.array('files')(req, res, async (err) => {
                if (err) {
                    if (err.code === 'LIMIT_UNEXPECTED_FILE') return reject(apiError.BadRequest('LIMIT_UNEXPECTED_FILE', `Неправильное имя поля`, 'FS001'));
                    if (err.code === 'LIMIT_FILE_SIZE') if (!current_user_status || !['DEVELOPER', 'TOP_LEVEL_DEVELOPER'].includes(current_user_status)) { return reject(apiError.BadRequest('LIMIT_FILE_SIZE', `Файл превышает лимит`, 'FS002')); }
                    if (err.code === 'LIMIT_FILE_COUNT') if (!current_user_status || !['DEVELOPER', 'TOP_LEVEL_DEVELOPER'].includes(current_user_status)) { return reject(apiError.BadRequest('LIMIT_FILE_COUNT', `Превышено количество файлов`, 'FS003')); }
                    return reject(err);
                }

                if (!req.files || !Array.isArray(req.files) || req.files.length < 1) {
                    return reject(apiError.BadRequest("NO_FILES", 'Файлы не загружены', 'FS004'));
                }

                try {
                    // console.log(req.files)
                    const validationResult = await this.validateFiles(moduleName, req.files, recordId);
                    const invalidFiles = validationResult.results.filter(result => !result.valid);

                    if (invalidFiles.length > 0) {
                        await this.cleanupFiles(req.files);
                        return reject(apiError.BadRequest("INCORRECT_FILES",
                            `Найдены некорректные файлы: ${invalidFiles.map(f => f.error).join(', ')}`, "FS005"));
                    }

                    resolve({
                        files: validationResult.filteredFiles,
                        validationResults: validationResult.results,
                        limitInfo: validationResult.limitInfo
                    });
                } catch (error) {
                    await this.cleanupFiles(req.files);
                    throw apiError.Internal(error, "FS000");
                }
            });
        });
    }

    async validateFiles(moduleName, files, recordId = null) {
        const config = getModuleConfig(moduleName);
        if (!config) throw apiError.BadRequest('Неизвестный модуль файлов');

        const results = [];
        let validFiles = [];

        for (const file of files) {
            const validation = validateFileForModule(moduleName, file);
            results.push({ file, ...validation });
            if (validation.valid) validFiles.push(file);
        }

        let filteredFiles = validFiles;
        let limitInfo = {
            currentCount: 0, maxLimit: config.maxFiles, availableSlots: config.maxFiles,
            requested: files.length, processed: validFiles.length, skipped: 0, reason: null
        };

        if (recordId) {
            try {
                const currentCount = await this.getCurrentFilesCount(moduleName, recordId);
                const availableSlots = config.maxFiles - currentCount;
                limitInfo.currentCount = currentCount;
                limitInfo.availableSlots = availableSlots;

                if (availableSlots <= 0) {
                    filteredFiles = [];
                    limitInfo.skipped = validFiles.length;
                    limitInfo.reason = 'limit_reached';
                } else if (validFiles.length > availableSlots) {
                    filteredFiles = validFiles.slice(0, availableSlots);
                    limitInfo.skipped = validFiles.length - availableSlots;
                    limitInfo.reason = 'partial_limit';
                }
            } catch (error) { }
        }

        return { results, filteredFiles, limitInfo };
    }

    /**
     * Добавление файлов к записи
     *  НОВОЕ: После создания файла создаём вотермарк-копию
     */
    async addFiles(moduleName, recordId, files, token) {
        const config = getModuleConfig(moduleName);
        if (!config) throw apiError.BadRequest('Неизвестный модуль файлов');

        let decoded = null
        token ? decoded = tokenService.validateToken(token) : decoded = null
        await this.checkAccessToEditRecord(moduleName, recordId, decoded?.data?.id, decoded?.data?.status);
        const uploadedFiles = [];

        try {
            const validationResult = await this.validateFiles(moduleName, files, recordId);
            const filesToProcess = validationResult.filteredFiles;
            const limitInfo = validationResult.limitInfo;

            if (filesToProcess.length === 0) {
                let message = 'Все файлы невалидны.';
                if (limitInfo.reason === 'limit_reached') message = `Лимит файлов (${limitInfo.maxLimit}) исчерпан.`;
                else if (limitInfo.reason === 'partial_limit') message = `Загружено ${filesToProcess.length} из ${validationResult.results.length} из-за лимита.`;

                return { success: true, uploaded: 0, saved: 0, files: [], limitInfo, message };
            }

            let cleanFiles = [];

            if (config.enableAntivirusScan) {
                const scanResult = await this.scanFilesForVirus(filesToProcess);
                const scanResults = scanResult.scanResults || [];
                const infectedScans = scanResults.filter(r => r.isInfected);
                cleanFiles = scanResults.filter(r => !r.isInfected);

                if (infectedScans.length > 0) {
                    await this.cleanupFiles(files);
                    for (const scanData of infectedScans) {
                        try {
                            const savedScan = await antivirusScanService.saveScanResult({
                                fileSize: scanData.file.size, fileHash: scanData.fileHash,
                                mimetype: scanData.file.mimetype, result: scanData.result,
                                fileTable: 'files', fileId: null
                            });
                            if (isMaliciousVerdict(scanData.result.verdict)) {
                                await handleMaliciousFile(decoded.data.id, null, savedScan, 'files');
                            }
                        } catch (saveError) { }
                    }
                    const threatNames = infectedScans.map(f =>
                        f.result.threats?.length ? `${f.file.originalname} (${f.result.threats.map(t => t.name).join(', ')})` : f.file.originalname
                    ).join(', ');
                    throw apiError.BadRequest('AV_SCAN_FAILED', `Обнаружена угроза: ${threatNames}`, 'AV001');
                }
            }

            if (config.metadata) {
                for (const file of filesToProcess) {
                    try {
                        const fullTempPath = path.join(this.tempDirectory, file.filename);
                        await processFileMetadata(fullTempPath, config.metadata);
                        console.log("processFileMetadata")
                    } catch (metadataError) { }
                }
            }

            if (config.compression) {
                for (const file of filesToProcess) {
                    try {
                        await processFileCompression(file, this.tempDirectory, config.compression);
                    } catch (compressionError) { }
                }
            }

            let currentSortOrder = await this.getNextSortOrder(moduleName, recordId);
            const fileScanMapping = new Map();
            const watermarkResults = [];

            for (const file of filesToProcess) {
                try {
                    if (config.enableAntivirusScan && cleanFiles.length > 0) {
                        const scanData = cleanFiles.find(r => r.file.filename === file.filename);
                        if (!scanData) continue;
                    }

                    const filePath = generateFilePath(moduleName, recordId, file.originalname);
                    const fullTempPath = path.join(this.tempDirectory, file.filename);

                    const objectName = await minioFileManagerService.uploadFile(fullTempPath, path.dirname(filePath));
                    const savedFileName = path.basename(objectName);

                    uploadedFiles.push({
                        originalName: savedFileName,
                        filePath: objectName,
                        size: file.size,
                        mimetype: file.mimetype,
                        tempPath: fullTempPath
                    });

                    const fileRecord = await this.saveFileToDatabase(
                        moduleName, recordId, uploadedFiles[uploadedFiles.length - 1],
                        decoded, currentSortOrder, null
                    );

                    if (config.enableAntivirusScan) {
                        const scanData = cleanFiles.find(r => r.file.filename === file.filename);
                        if (scanData) {
                            const savedScan = await antivirusScanService.saveScanResult({
                                fileSize: fileRecord.file_size, fileHash: scanData.fileHash,
                                mimetype: fileRecord.mimetype, result: scanData.result,
                                fileTable: 'files', fileId: fileRecord.id
                            });
                            fileScanMapping.set(fileRecord.id, savedScan.id);
                        }
                    }

                    //  НОВОЕ: Создаём вотермарк-копию
                    const watermarkResult = await watermarkService.createWatermarkCopy(
                        moduleName, recordId, savedFileName, file.mimetype, objectName
                    );
                    watermarkResults.push({
                        fileName: savedFileName,
                        watermarkCreated: watermarkResult.success,
                        watermarkFileName: watermarkResult.watermarkFileName
                    });

                    currentSortOrder++;
                } catch (error) {
                    console.error('Ошибка обработки файла:', error);
                }
            }

            for (const [fileId, scanId] of fileScanMapping) {
                try {
                    await antivirusScanService.linkScanToFile('files', fileId, scanId);
                } catch (linkError) { }
            }

            await this.cleanupFiles(files);

            const dbResults = uploadedFiles.map((f, idx) => ({
                id: idx,
                file_name: f.originalName,
                file_size: f.size,
                mimetype: f.mimetype
            }));

            return {
                success: true,
                uploaded: uploadedFiles.length,
                saved: dbResults.length,
                files: dbResults,
                limitInfo,
                watermarkResults,
                message: `Загружено ${uploadedFiles.length} файлов. Вотермарок создано: ${watermarkResults.filter(r => r.watermarkCreated).length}`
            };

        } catch (error) {
            await this.rollbackFileUpload(uploadedFiles);
            throw apiError.Internal(error, "FS100");
        }
    }

    /**
     * Обновление файла
     *  НОВОЕ: Удаляем старую вотермарк-копию и создаём новую
     */
    async updateFile(moduleName, recordId, fileId, fileData, newFile, token) {
        const config = getModuleConfig(moduleName);
        if (!config) throw apiError.BadRequest('Неизвестный модуль файлов');

        let decoded = null
        token ? decoded = tokenService.validateToken(token) : decoded = null
        await this.checkAccessToEditRecord(moduleName, recordId, decoded?.data?.id, decoded?.data?.status);
        const isAdminOrDeveloper = ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"].includes(decoded?.data?.status);
        try {
            const existingFileId = fileData.id;
            const existingFilePath = getFilePathByName(moduleName, recordId, fileData.file_name);
            let originalFileName = fileData.file_name;
            const originalExtension = path.extname(originalFileName);
            const newExtension = path.extname(newFile.originalname);
            const baseName = path.basename(originalFileName, originalExtension);
            const updatedFileName = `${baseName}${newExtension}`;
            const updatedFilePath = existingFilePath.replace(originalExtension, newExtension);

            if (originalExtension != newExtension) {
                await minioFileManagerService.deleteFile(existingFilePath);
            }

            //  НОВОЕ: Удаляем старую вотермарк-копию
            await watermarkService.deleteWatermarkCopy(existingFilePath);

            const validation = validateFileForModule(moduleName, newFile);
            if (!validation.valid) throw apiError.BadRequest(validation.error);

            let scanId = null;

            if (config.enableAntivirusScan) {
                const fullTempPath = path.join(this.tempDirectory, newFile.filename);
                const fileBuffer = await fs.readFile(fullTempPath);
                const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

                const cachedResult = await antivirusScanService.checkFileByHash(fileHash);
                let scanResult;

                if (cachedResult) {
                    scanResult = { ...cachedResult, isInfected: cachedResult.is_infected, verdict: cachedResult.verdict };
                } else {
                    scanResult = await antivirusEngine.scanFile(fullTempPath);
                }

                if (scanResult.isInfected) {
                    try { await minioFileManagerService.deleteFile(existingFilePath); } catch (e) { }
                    await this.cleanupFiles([newFile]);
                    const threatNames = scanResult.threats?.length ? scanResult.threats.map(t => t.name).join(', ') : 'неизвестная угроза';
                    throw apiError.BadRequest('AV_SCAN_FAILED', `Обнаружена угроза: ${threatNames}`, 'AV002');
                }

                await minioFileManagerService.replaceFile(fullTempPath, updatedFilePath);

                const fileBuffer2 = await fs.readFile(fullTempPath);
                const fileHash2 = crypto.createHash('sha256').update(fileBuffer2).digest('hex');
                let scanResult2;
                const cachedResult2 = await antivirusScanService.checkFileByHash(fileHash2);
                if (cachedResult2) {
                    scanResult2 = { ...cachedResult2, isInfected: cachedResult2.is_infected };
                } else {
                    scanResult2 = await antivirusEngine.scanFile(fullTempPath);
                }

                const savedScan = await antivirusScanService.saveScanResult({
                    fileSize: newFile.size, fileHash: fileHash2, mimetype: newFile.mimetype,
                    result: scanResult2, fileTable: 'files', fileId: existingFileId
                });
                scanId = savedScan.id;
            } else {
                const fullTempPath = path.join(this.tempDirectory, newFile.filename);
                await minioFileManagerService.replaceFile(fullTempPath, updatedFilePath);
            }

            const dbResult = await this.updateFileInDatabase(
                moduleName, recordId, existingFileId, decoded,
                { originalName: updatedFileName, filePath: updatedFilePath, size: newFile.size, mimetype: newFile.mimetype, scanId },
                isAdminOrDeveloper
            );

            //  НОВОЕ: Создаём новую вотермарк-копию
            const watermarkResult = await watermarkService.createWatermarkCopy(
                moduleName, recordId, updatedFileName, newFile.mimetype, updatedFilePath
            );

            await this.cleanupFiles([newFile]);

            return {
                success: true,
                file: dbResult,
                watermarkCreated: watermarkResult.success,
                watermarkFileName: watermarkResult.watermarkFileName
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Удаление файла
     *  НОВОЕ: Удаляем и вотермарк-копию
     */
    async deleteFile(fileId, token) {
        let decoded = null
        token ? decoded = tokenService.validateToken(token) : decoded = null
        const fileData = await this.getFileDataByFileId(fileId);
        const moduleName = fileData.module;
        const recordId = fileData.recordId;

        try {
            await this.checkAccessToEditRecord(moduleName, recordId, decoded?.data?.id, decoded?.data?.status);
            const config = getModuleConfig(moduleName);
            if (!config) throw apiError.BadRequest('Неизвестный модуль файлов');

            const fileInfo = fileData.fileData;
            const deletedSortOrder = fileInfo.sort_order;
            const filePath = getFilePathByName(moduleName, recordId, fileInfo.file_name);

            //  НОВОЕ: Удаляем вотермарк-копию
            await watermarkService.deleteWatermarkCopy(filePath);

            await this.deleteFileFromStorage(filePath);
            const dbResult = await this.deleteFileFromDatabase(fileId);
            await antivirusScanService.deleteScansForFile('files', fileId);
            await this.reorderFilesAfterDelete(moduleName, recordId, deletedSortOrder);

            return { success: true, deleted: dbResult };
        } catch (error) {
            throw error;
        }
    }

    async deleteIncidentFiles(moduleName, recordId) {
        const config = getModuleConfig(moduleName);
        if (!config) throw apiError.BadRequest('Неизвестный модуль файлов');

        try {
            const files = await this.getFilesFromDatabase(moduleName, recordId);

            if (files.length === 0) {
                return { success: true, message: 'Файлы не найдены', deletedCount: 0, deletedFiles: [] };
            }

            const folderPath = `${config.storagePath}/${recordId}/`;

            const deletedDbFiles = [];
            for (const file of files) {
                try {
                    const deletedFile = await this.deleteFileFromDatabase(file.id);
                    if (deletedFile) deletedDbFiles.push(deletedFile);
                    await antivirusScanService.deleteScansForFile('files', file.id);
                } catch (error) { }
            }

            //  deleteFolder удалит и вотермарк-копии (они в той же папке)
            try {
                await minioFileManagerService.deleteFolder(folderPath);
            } catch (minioError) {
                console.error('Ошибка удаления папки:', minioError);
            }

            return {
                success: true,
                message: `Удалено ${deletedDbFiles.length} файлов инцидента`,
                deletedCount: deletedDbFiles.length,
                deletedFiles: deletedDbFiles.map(file => ({
                    id: file.id, file_name: file.file_name, file_size: file.file_size, mimetype: file.mimetype
                }))
            };

        } catch (error) {
            throw error;
        }
    }

    // =========================================================================
    // ПРОВЕРКИ ДОСТУПА (без изменений)
    // =========================================================================

    async checkAccessToGetRecord(moduleName, recordId, userId = -1, userStatus = null, ret = false) {
        const startCheck = Date.now();

        try {
            const { checkCanSee } = require('../../grpc/handlers/filesHandler');

            //  БЫЛО: Promise.race с timeoutMs = 5000
            // СТАЛО: прямой вызов (deadline уже внутри gRPC)
            console.log(1, recordId, userId, userStatus)
            const result = await checkCanSee(moduleName, recordId, userId, userStatus);


            // console.log(111111111111);
            // console.log(result);
            // console.log(`[AccessCheck] Проверка пройдена за ${Date.now() - startCheck}ms`);
            if (result) {
                return true
            } else {
                if (ret) {
                    return false
                } else {
                    throw apiError.Forbidden('Нет доступа для редактирования записи');
                }
            }
        } catch (error) {
            const duration = Date.now() - startCheck;
            console.error(`[AccessCheck] Ошибка за ${duration}ms:`, error.message);

            // Fallback на БД
            // try {
            //     const query = `SELECT COUNT(*) as exists FROM files WHERE module = $1 AND record_id = $2`;
            //     const result = await queryService.query(query, [moduleName, recordId]);
            //     if (parseInt(result.rows[0].exists) === 0) {
            //         throw apiError.BadRequest('NO_FILES', 'Для записи нет файлов');
            //     }
            //     console.log(`[AccessCheck] Fallback успешен через БД`);
            //     return true;
            // } catch (fallbackError) {
            //     if (userStatus && ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"].includes(userStatus)) return true;
            //     throw fallbackError;
            // }
            throw apiError.Forbidden('Нет доступа для редактирования записи');
        }
    }

    async checkAccessToEditRecord(moduleName, recordId, userId = -1, userStatus = null, ret = false) {
        const startCheck = Date.now();
        // console.log(`[AccessCheck:Edit] Начало проверки для ${moduleName}/${recordId}, userId=${userId}, status=${userStatus}`);

        try {
            const { checkCanEdit } = require('../../grpc/handlers/filesHandler');

            //  БЫЛО: Promise.race с timeoutMs = 5000
            // СТАЛО: прямой вызов — deadline уже встроен в gRPC-клиент (GRPC_TIMEOUT_MS)
            // Это правильнее: gRPC сам освобождает ресурсы при таймауте,
            // а не продолжает висеть в фоне как при Promise.race
            console.log(2, recordId, userId, userStatus)
            const result = await checkCanEdit(moduleName, recordId, userId, userStatus);
            // console.log(`[AccessCheck:Edit]  Проверка пройдена за ${Date.now() - startCheck}ms`);
            if (result) {
                return true
            } else {
                if (ret) {
                    return false
                } else {
                    throw apiError.Forbidden('Нет доступа для редактирования записи');
                }
            }
        } catch (error) {
            const duration = Date.now() - startCheck;
            console.error(`[AccessCheck:Edit] ❌ Ошибка за ${duration}ms:`, error.message);

            // //  Fallback-логика для недоступного gRPC
            // // Различаем типы ошибок для более точной диагностики
            // const isTimeout = error.code === 4  // DEADLINE_EXCEEDED
            //     || error.message?.includes('deadline')
            //     || error.message?.includes('timeout');

            // const isUnavailable = error.code === 14  // UNAVAILABLE
            //     || error.message?.includes('UNAVAILABLE')
            //     || error.message?.includes('connect');

            // if (isTimeout || isUnavailable) {
            //     console.warn(`[AccessCheck:Edit] gRPC недоступен (timeout/unavailable), применяем fallback-логику`);

            //     // Для DEVELOPER/ADMINISTRATOR разрешаем (у них и так полные права)
            //     if (userStatus && ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"].includes(userStatus)) {
            //         console.warn(`[AccessCheck:Edit]  Разрешаем для ${userStatus} (fallback)`);
            //         return true;
            //     }

            //     // Для остальных — запрещаем (безопасность важнее доступности)
            //     console.error(`[AccessCheck:Edit] ❌ Запрещаем доступ: gRPC недоступен, статус ${userStatus || 'unknown'}`);
            //     throw apiError.Forbidden(
            //         'SERVICE_TEMPORARILY_UNAVAILABLE',
            //         'Сервис проверки прав временно недоступен. Попробуйте позже.'
            //     );
            // }

            // Другие ошибки (например, права действительно отсутствуют) — пробрасываем
            if (ret) {
                return false
            } else {
                throw apiError.Forbidden('Нет доступа для редактирования записи');
            }
        }
    }

    // =========================================================================
    // ПОЛУЧЕНИЕ ФАЙЛОВ
    // =========================================================================

    async getFiles(moduleName, recordId, token, options = {}) {
        let decoded = null
        token ? decoded = tokenService.validateToken(token) : decoded = null

        // console.log(222222222222222222)
        // console.log(decoded?.data?.status)
        await this.checkAccessToGetRecord(moduleName, recordId, decoded?.data?.id, decoded?.data?.status);

        try {
            const config = getModuleConfig(moduleName);
            const files = await this.getFilesFromDatabase(moduleName, recordId);
            const isAdminOrDeveloper = ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"].includes(decoded?.data?.status);

            const filteredFiles = isAdminOrDeveloper ? files : files.map(file => ({
                id: file.id, file_size: file.file_size, file_type: file.file_type,
                file_extension: file.file_extension, sort_order: file.sort_order
            }));

            let result = {
                success: true, total: filteredFiles.length,
                allowedFileTypes: config.allowedFileTypes, maxFiles: config.maxFiles,
                name: config.name, description: config.description, files: filteredFiles
            };

            if (isAdminOrDeveloper) {
                result.module = moduleName;
                result.recordId = recordId;
            }

            return result;
        } catch (error) {
            throw error;
        }
    }

    async getFilesFromDatabase(moduleName, recordId) {
        const { getFileTypeByExtension } = require('./fileModuleConfig');
        const query = `SELECT id, file_name, file_size, mimetype, sort_order, created_at
                       FROM files WHERE module = $1 AND record_id = $2 ORDER BY sort_order ASC`;
        const result = await queryService.query(query, [moduleName, recordId]);
        return result.rows.map(file => ({
            ...file,
            file_type: getFileTypeByExtension(file.file_name),
            file_extension: file.file_name.split('.').pop().toLowerCase()
        }));
    }

    async getFileDataByFileId(fileId) {
        const query = `SELECT module, record_id, id, file_name, file_size, mimetype, sort_order, created_at
                       FROM files WHERE id = $1`;
        const result = await queryService.query(query, [fileId]);
        if (!result) throw apiError.BadRequest('Не найден файл');
        return { module: result.rows[0].module, recordId: result.rows[0].record_id, fileData: result.rows[0] };
    }

    /**
     * Получение файла из хранилища
     *  НОВОЕ: Если нужны вотермарки - скачиваем готовую _wm версию
     */
    async getFile(fileId, token) {
        let decoded = null
        token ? decoded = tokenService.validateToken(token) : decoded = null
        const fileData = await this.getFileDataByFileId(fileId);
        const moduleName = fileData.module;
        const recordId = fileData.recordId;

        try {
            await this.checkAccessToGetRecord(moduleName, recordId, decoded?.data?.id, decoded?.data?.status);
            const config = getModuleConfig(moduleName);
            if (!config) throw apiError.BadRequest('Неизвестный модуль файлов');

            const fileInfo = fileData.fileData;
            const originalPath = getFilePathByName(moduleName, recordId, fileInfo.file_name);

            // Проверяем, нужно ли отдавать с вотермаркой
            const shouldWatermark = await watermarkService.shouldAddWatermark(moduleName, recordId);
            const isMedia = watermarkService.isSupportedMediaType(fileInfo.mimetype);

            let filePathToDownload = originalPath;
            let isWatermarked = false;

            if (shouldWatermark && isMedia && !await this.checkAccessToEditRecord(moduleName, recordId, decoded?.data?.id, decoded?.data?.status, true)) {
                // Проверяем существование вотермарк-копии
                const result = await watermarkService.getWatermarkedOrOriginalPath(originalPath);
                filePathToDownload = result.path;
                isWatermarked = result.isWatermarked;

                if (!isWatermarked) {
                    // console.log(`[GetFile]  Вотермарк-копия не найдена для ${fileInfo.file_name}, отдаём оригинал`);
                }
            }

            const fileBuffer = await minioFileManagerService.downloadFile(filePathToDownload);

            return {
                fileName: fileInfo.file_name,  // Всегда возвращаем оригинальное имя
                mimetype: fileInfo.mimetype,
                size: fileBuffer.length,
                fileBuffer: fileBuffer,
                watermarked: isWatermarked
            };

        } catch (error) {
            throw apiError.Internal('Ошибка получения файла', "FS600");
        }
    }

    // =========================================================================
    // ПРОЧИЕ МЕТОДЫ (без существенных изменений)
    // =========================================================================

    async reorderFiles(moduleName, recordId, fileOrders, token) {
        let decoded = null
        token ? decoded = tokenService.validateToken(token) : decoded = null
        try {
            await this.checkAccessToEditRecord(moduleName, recordId, decoded?.data?.id, decoded?.data?.status);
            const config = getModuleConfig(moduleName);
            if (!config) throw apiError.BadRequest('Неизвестный модуль файлов');

            const isAdminOrDeveloper = ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"].includes(decoded?.data?.status);
            const results = [];

            for (const fileOrder of fileOrders) {
                const query = `UPDATE files SET sort_order = $1, updated_at = (NOW() AT TIME ZONE 'UTC')
                              WHERE module = $2 AND record_id = $3 AND id = $4 RETURNING *`;
                const result = await queryService.query(query, [fileOrder.sortOrder, moduleName, recordId, fileOrder.id]);

                if (result.rows.length > 0) {
                    const file = result.rows[0];
                    const formattedFile = {
                        id: file.id, sort_order: file.sort_order,
                        file_type: getFileTypeByExtension(file.file_name),
                        file_extension: file.file_name.split('.').pop().toLowerCase()
                    };
                    // if (isAdminOrDeveloper) {
                    Object.assign(formattedFile, {
                        file_name: file.file_name, file_size: file.file_size,
                        mimetype: file.mimetype, created_at: file.created_at, updated_at: file.updated_at
                    });
                    // }
                    results.push(formattedFile);
                }
            }

            return { success: true, updated: results.length, files: results };
        } catch (error) {
            throw apiError.Internal('Ошибка обновления порядка файлов', "FS700");
        }
    }

    async reorderFilesAfterDelete(moduleName, recordId, deletedSortOrder) {
        try {
            const query = `UPDATE files SET sort_order = sort_order - 1, updated_at = (NOW() AT TIME ZONE 'UTC')
                          WHERE module = $1 AND record_id = $2 AND sort_order > $3 RETURNING *`;
            const result = await queryService.query(query, [moduleName, recordId, deletedSortOrder]);
            return result.rows;
        } catch (error) { }
    }

    async saveFileToDatabase(moduleName, recordId, fileData, decoded, sortOrder = null, scanId = null) {
        const config = getModuleConfig(moduleName);
        if (sortOrder === null) sortOrder = await this.getNextSortOrder(moduleName, recordId);

        const query = `INSERT INTO files (module, record_id, file_name, file_size, mimetype, sort_order, created_at, user_added_id, antivirus_scan_id)
                      VALUES ($1, $2, $3, $4, $5, $6, (NOW() AT TIME ZONE 'UTC'), $7, $8) RETURNING *`;
        const result = await queryService.query(query,
            [moduleName, recordId, fileData.originalName, fileData.size, fileData.mimetype, sortOrder, decoded?.data?.id, scanId]);
        return result.rows[0];
    }

    async getNextSortOrder(moduleName, recordId) {
        try {
            const query = `SELECT COALESCE(MAX(sort_order), 0) as max_order FROM files WHERE module = $1 AND record_id = $2`;
            const result = await queryService.query(query, [moduleName, recordId]);
            return result.rows[0].max_order + 1;
        } catch (error) {
            return 1;
        }
    }

    async updateFileInDatabase(moduleName, recordId, existingFileId, decoded, newFileData, isAdminOrDeveloper = false) {
        let query, params;

        if (newFileData.scanId) {
            query = `UPDATE files SET file_name = $2, file_size = $3, mimetype = $4, antivirus_scan_id = $5, updated_at = (NOW() AT TIME ZONE 'UTC')
                    WHERE record_id = $1 AND id = $6 AND module = $7 RETURNING *`;
            params = [recordId, newFileData.originalName, newFileData.size, newFileData.mimetype, newFileData.scanId, existingFileId, moduleName];
        } else {
            query = `UPDATE files SET file_name = $2, file_size = $3, mimetype = $4, updated_at = (NOW() AT TIME ZONE 'UTC')
                    WHERE record_id = $1 AND id = $5 AND module = $6 RETURNING *`;
            params = [recordId, newFileData.originalName, newFileData.size, newFileData.mimetype, existingFileId, moduleName];
        }

        const result = await queryService.query(query, params);
        const updatedFile = result.rows[0];

        const baseFile = {
            id: updatedFile.id, file_size: updatedFile.file_size, sort_order: updatedFile.sort_order,
            file_type: getFileTypeByExtension(updatedFile.file_name),
            file_extension: updatedFile.file_name.split('.').pop().toLowerCase()
        };

        if (isAdminOrDeveloper) {
            return {
                ...baseFile, file_name: updatedFile.file_name, mimetype: updatedFile.mimetype,
                created_at: updatedFile.created_at, updated_at: updatedFile.updated_at,
                antivirus_scan_id: updatedFile.antivirus_scan_id
            };
        }
        return baseFile;
    }

    async deleteFileFromDatabase(fileId) {
        const query = 'DELETE FROM files WHERE id = $1 RETURNING *';
        const result = await queryService.query(query, [fileId]);
        return result.rows[0];
    }

    async deleteFileFromStorage(filePath) {
        try {
            await minioFileManagerService.deleteFileFromMinioByPath(filePath);
        } catch (error) {
            throw apiError.Internal('Ошибка удаления файла из хранилища', "FS1000");
        }
    }

    async cleanupFiles(files) {
        if (!files || !Array.isArray(files) || files.length === 0) return;
        await Promise.all(files.map(file => {
            if (file?.path) return fs.unlink(file.path).catch(() => { });
            return Promise.resolve();
        }));
    }

    async scanFilesForVirus(files) {
        const results = [];
        let allClean = true;
        const scanResults = [];

        for (const file of files) {
            try {
                const fullTempPath = path.join(this.tempDirectory, file.filename);
                const fileBuffer = await fs.readFile(fullTempPath);
                const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

                const cachedResult = await antivirusScanService.checkFileByHash(fileHash);
                let scanResult;

                if (cachedResult) {
                    scanResult = { ...cachedResult, isInfected: cachedResult.is_infected, verdict: cachedResult.verdict };
                } else {
                    scanResult = await antivirusEngine.scanFile(fullTempPath);
                    scanResult.fileHash = fileHash;
                }

                results.push({ file, result: scanResult, isInfected: scanResult.isInfected });
                scanResults.push({ file, result: scanResult, isInfected: scanResult.isInfected, fileHash });

                if (scanResult.isInfected) {
                    allClean = false;
                }
            } catch (error) {
                const failOnError = process.env.ANTIVIRUS_FAIL_ON_ERROR !== 'false';
                const errorResult = { status: 'error', reason: error.message, isInfected: failOnError };
                results.push({ file, result: errorResult, isInfected: failOnError });
                scanResults.push({ file, result: errorResult, isInfected: failOnError, fileHash: null });
                if (failOnError) allClean = false;
            }
        }

        return { allClean, results, scanResults };
    }

    async rollbackFileUpload(uploadedFiles) {
        for (const file of uploadedFiles) {
            try { await this.deleteFileFromStorage(file.filePath); } catch (error) { }
        }
    }

    // =========================================================================
    // АРХИВ ИНЦИДЕНТА
    // =========================================================================

    async getIncidentCreationDate(recordId) {
        const query = `SELECT date_add FROM incidents_main_info WHERE incident_id = $1`;
        const result = await queryService.query(query, [recordId]);
        if (result.rows.length === 0) throw apiError.NotFound('INCIDENT_NOT_FOUND', 'Инцидент не найден');
        return result.rows[0].date_add;
    }

    formatArchiveName(recordId, date) {
        const formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
        });
        const parts = formatter.formatToParts(new Date(date));
        const get = (type) => parts.find(p => p.type === type).value;
        return `${recordId}_${get('year')}-${get('month')}-${get('day')}_${get('hour')}-${get('minute')}_MSK`;
    }

    /**
     * Создать ZIP-архив из файлов инцидента
     *  НОВОЕ: Использует готовые вотермарк-копии если они есть
     */
    async createIncidentArchive(moduleName, recordId, token) {
        const startTime = Date.now();
        // console.log(`[Archive] Начало создания архива для ${moduleName}/${recordId}`);

        const decoded = tokenService.validateToken(token);
        await this.checkAccessToGetRecord(moduleName, recordId, decoded.data.id, decoded.data.status);

        const config = getModuleConfig(moduleName);
        if (!config) throw apiError.BadRequest('UNKNOWN_MODULE', 'Неизвестный модуль');

        const files = await this.getFilesFromDatabase(moduleName, recordId);
        if (files.length === 0) throw apiError.BadRequest('NO_FILES', 'Для инцидента нет файлов');

        const incidentDate = await this.getIncidentCreationDate(recordId);
        const archiveName = `${this.formatArchiveName(recordId, incidentDate)}.zip`;

        const shouldWatermark = await watermarkService.shouldAddWatermark(moduleName, recordId);

        // console.log(`[Archive] Загружаем ${files.length} файлов (с вотермарками если есть)...`);

        const fileBuffers = await Promise.all(
            files.map(async (file) => {
                try {
                    const originalPath = getFilePathByName(moduleName, recordId, file.file_name);
                    let pathToDownload = originalPath;

                    // Если нужны вотермарки и файл медиа - пробуем взять _wm версию
                    if (shouldWatermark && watermarkService.isSupportedMediaType(file.mimetype)) {
                        const result = await watermarkService.getWatermarkedOrOriginalPath(originalPath);
                        pathToDownload = result.path;
                    }

                    const buffer = await minioFileManagerService.downloadFile(pathToDownload);
                    return { file, buffer, error: null };
                } catch (error) {
                    console.error(`[Archive] Ошибка загрузки ${file.file_name}:`, error.message);
                    return { file, buffer: null, error: error.message };
                }
            })
        );

        const zip = new AdmZip();
        let skippedCount = 0;
        let processedCount = 0;

        for (const item of fileBuffers) {
            if (item.error || !item.buffer) { skippedCount++; continue; }

            const ext = path.extname(item.file.file_name).toLowerCase();
            const archiveFileName = `${item.file.sort_order}${ext}`;

            zip.addFile(archiveFileName, item.buffer, `Добавлено: ${item.file.created_at || new Date().toISOString()}`);
            processedCount++;
        }

        if (processedCount === 0) {
            throw apiError.Internal('Не удалось обработать ни один файл', 'ARCHIVE_ALL_FAILED');
        }

        const archiveBuffer = zip.toBuffer();
        // console.log(`[Archive]  Готово за ${Date.now() - startTime}ms, размер: ${(archiveBuffer.length / 1024 / 1024).toFixed(2)} MB`);

        return {
            success: true,
            archiveName,
            archiveBuffer,
            filesCount: files.length,
            processedCount,
            totalSize: files.reduce((sum, f) => sum + (f.file_size || 0), 0),
            skippedCount
        };
    }

    // =========================================================================
    //  МАССОВЫЕ ОПЕРАЦИИ ДЛЯ ВОДЯНЫХ ЗНАКОВ (прокси к watermarkService)
    // =========================================================================

    async regenerateAllWatermarks(moduleName = null) {
        return await watermarkService.regenerateAllWatermarks(moduleName);
    }

    async deleteAllWatermarks(moduleName = null) {
        return await watermarkService.deleteAllWatermarks(moduleName);
    }

    async createMissingWatermarks(moduleName = null) {
        return await watermarkService.createMissingWatermarks(moduleName);
    }

    // =========================================================================
    //  ОПЕРАЦИИ С ВОДЯНЫМИ ЗНАКАМИ ДЛЯ КОНКРЕТНОГО РЕКОРДА
    // =========================================================================

    /**
     * Удалить все вотермарк-копии для конкретного рекорда
     * 
     * Используется когда:
     * - Нужно отключить водяные знаки для конкретного инцидента
     * - Очистить старые/повреждённые вотермарки перед перегенерацией
     * - Освободить место в хранилище
     * 
     * @param {string} moduleName - Имя модуля (например, 'incident_evidence')
     * @param {string} recordId - ID записи
     * @returns {Promise<Object>} - статистика операции
     */
    async deleteWatermarksForRecord(moduleName, recordId) {
        const startTime = Date.now();
        // console.log(`[Watermarks:Record] 🔴 Удаление вотермарок для ${moduleName}/${recordId}`);

        // 1. Проверяем модуль
        const config = getModuleConfig(moduleName);
        if (!config) {
            throw apiError.BadRequest('UNKNOWN_MODULE', `Неизвестный модуль: ${moduleName}`);
        }

        // 2. Получаем все файлы рекорда
        const files = await this.getFilesFromDatabase(moduleName, recordId);

        if (files.length === 0) {
            // console.log(`[Watermarks:Record] Файлов для рекорда ${recordId} не найдено`);
            return {
                success: true,
                moduleName,
                recordId,
                totalFiles: 0,
                deleted: 0,
                skipped: 0,
                failed: 0,
                durationMs: Date.now() - startTime,
                message: 'Файлы не найдены'
            };
        }

        // console.log(`[Watermarks:Record] Найдено файлов: ${files.length}`);

        let deleted = 0;
        let skipped = 0;
        let failed = 0;
        const details = [];

        // 3. Обрабатываем каждый файл
        for (const file of files) {
            // Пропускаем сами вотермарк-файлы (если они вдруг попали в таблицу)
            if (watermarkService.isWatermarkFile(file.file_name)) {
                skipped++;
                continue;
            }

            // Пропускаем неподдерживаемые типы
            if (!watermarkService.isSupportedMediaType(file.mimetype)) {
                skipped++;
                continue;
            }

            try {
                const originalPath = getFilePathByName(moduleName, recordId, file.file_name);
                const result = await watermarkService.deleteWatermarkCopy(originalPath);

                if (result) {
                    deleted++;
                    details.push({ fileName: file.file_name, action: 'deleted' });
                } else {
                    skipped++;
                    details.push({ fileName: file.file_name, action: 'not_found' });
                }
            } catch (error) {
                failed++;
                console.error(`[Watermarks:Record] ❌ Ошибка удаления для ${file.file_name}:`, error.message);
                details.push({ fileName: file.file_name, action: 'error', error: error.message });
            }
        }

        const duration = Date.now() - startTime;
        const stats = {
            success: true,
            moduleName,
            recordId,
            totalFiles: files.length,
            deleted,
            skipped,
            failed,
            details,
            durationMs: duration,
            message: `Удалено ${deleted} вотермарок из ${files.length} файлов за ${duration}ms`
        };

        // console.log(`[Watermarks:Record]  Готово:`, {
        //     total: files.length,
        //     deleted,
        //     skipped,
        //     failed,
        //     durationMs: duration
        // });

        return stats;
    }

    /**
     * Создать вотермарк-копии для всех файлов конкретного рекорда
     * 
     * Используется когда:
     * - Вотермарки были отключены, но теперь нужно включить для конкретного инцидента
     * - Нужно принудительно создать копии (например, после изменения логотипа)
     * - Миграция старых файлов на новую схему
     * 
     *  Если вотермарк-копия уже существует — она НЕ перезаписывается.
     *    Для принудительной перегенерации используй сначала deleteWatermarksForRecord,
     *    затем createWatermarksForRecord.
     * 
     * @param {string} moduleName - Имя модуля (например, 'incident_evidence')
     * @param {string} recordId - ID записи
     * @param {Object} [options] - Дополнительные опции
     * @param {boolean} [options.force=false] - Принудительно пересоздать даже если копия есть
     * @returns {Promise<Object>} - статистика операции
     */
    async createWatermarksForRecord(moduleName, recordId, options = {}) {
        const startTime = Date.now();
        const force = options.force === true;

        // console.log(`[Watermarks:Record]  Создание вотермарок для ${moduleName}/${recordId}${force ? ' (принудительно)' : ''}`);

        // 1. Проверяем модуль
        const config = getModuleConfig(moduleName);
        if (!config) {
            throw apiError.BadRequest('UNKNOWN_MODULE', `Неизвестный модуль: ${moduleName}`);
        }

        // 2. Получаем все файлы рекорда
        const files = await this.getFilesFromDatabase(moduleName, recordId);

        if (files.length === 0) {
            // console.log(`[Watermarks:Record] Файлов для рекорда ${recordId} не найдено`);
            return {
                success: true,
                moduleName,
                recordId,
                totalFiles: 0,
                created: 0,
                alreadyExists: 0,
                skipped: 0,
                failed: 0,
                durationMs: Date.now() - startTime,
                message: 'Файлы не найдены'
            };
        }

        // console.log(`[Watermarks:Record] Найдено файлов: ${files.length}`);

        let created = 0;
        let alreadyExists = 0;
        let skipped = 0;
        let failed = 0;
        const details = [];

        // 3. Обрабатываем каждый файл
        for (const file of files) {
            // Пропускаем сами вотермарк-файлы
            if (watermarkService.isWatermarkFile(file.file_name)) {
                skipped++;
                continue;
            }

            // Пропускаем неподдерживаемые типы
            if (!watermarkService.isSupportedMediaType(file.mimetype)) {
                skipped++;
                continue;
            }

            try {
                const originalPath = getFilePathByName(moduleName, recordId, file.file_name);

                // Если не force — проверяем существование
                if (!force) {
                    const exists = await watermarkService.watermarkCopyExists(originalPath);
                    if (exists) {
                        alreadyExists++;
                        details.push({ fileName: file.file_name, action: 'already_exists' });
                        continue;
                    }
                } else {
                    // В режиме force сначала удаляем старую копию
                    await watermarkService.deleteWatermarkCopy(originalPath).catch(() => { });
                }

                // Создаём новую копию
                const result = await watermarkService.createWatermarkCopy(
                    moduleName,
                    recordId,
                    file.file_name,
                    file.mimetype,
                    originalPath
                );

                if (result.success) {
                    created++;
                    details.push({
                        fileName: file.file_name,
                        action: 'created',
                        watermarkFileName: result.watermarkFileName
                    });
                } else {
                    // createWatermarkCopy вернул disabled/unsupported — это не ошибка
                    if (result.error === 'disabled' || result.error === 'unsupported_type') {
                        skipped++;
                        details.push({ fileName: file.file_name, action: 'skipped', reason: result.error });
                    } else {
                        failed++;
                        details.push({ fileName: file.file_name, action: 'error', error: result.error });
                    }
                }
            } catch (error) {
                failed++;
                console.error(`[Watermarks:Record] ❌ Ошибка создания для ${file.file_name}:`, error.message);
                details.push({ fileName: file.file_name, action: 'error', error: error.message });
            }
        }

        const duration = Date.now() - startTime;
        const stats = {
            success: true,
            moduleName,
            recordId,
            totalFiles: files.length,
            created,
            alreadyExists,
            skipped,
            failed,
            details,
            durationMs: duration,
            message: `Создано ${created} вотермарок из ${files.length} файлов за ${duration}ms` +
                (alreadyExists > 0 ? ` (${alreadyExists} уже существовало)` : '')
        };

        // console.log(`[Watermarks:Record]  Готово:`, {
        //     total: files.length,
        //     created,
        //     alreadyExists,
        //     skipped,
        //     failed,
        //     durationMs: duration
        // });

        return stats;
    }

    /**
     * Перегенерировать все вотермарк-копии для конкретного рекорда
     * (удалить старые + создать новые)
     * 
     * Используется когда:
     * - Изменился логотип/текст водяного знака
     * - Изменились настройки (прозрачность, позиция)
     * - Нужно обновить все копии для конкретного инцидента
     * 
     * @param {string} moduleName - Имя модуля
     * @param {string} recordId - ID записи
     * @returns {Promise<Object>} - статистика операции
     */
    async regenerateWatermarksForRecord(moduleName, recordId) {
        const startTime = Date.now();
        // console.log(`[Watermarks:Record] 🔄 Перегенерация вотермарок для ${moduleName}/${recordId}`);

        // Шаг 1: Удаляем все существующие копии
        const deleteStats = await this.deleteWatermarksForRecord(moduleName, recordId);

        // Шаг 2: Создаём новые с force=true
        const createStats = await this.createWatermarksForRecord(moduleName, recordId, { force: true });

        const duration = Date.now() - startTime;
        const combinedStats = {
            success: deleteStats.success && createStats.success,
            moduleName,
            recordId,
            totalFiles: createStats.totalFiles,
            deleted: deleteStats.deleted,
            created: createStats.created,
            skipped: createStats.skipped,
            failed: createStats.failed,
            durationMs: duration,
            deleteStats: {
                deleted: deleteStats.deleted,
                skipped: deleteStats.skipped,
                failed: deleteStats.failed
            },
            createStats: {
                created: createStats.created,
                skipped: createStats.skipped,
                failed: createStats.failed
            },
            message: `Перегенерация завершена: удалено ${deleteStats.deleted}, создано ${createStats.created} за ${duration}ms`
        };

        // console.log(`[Watermarks:Record]  Перегенерация завершена:`, {
        //     deleted: deleteStats.deleted,
        //     created: createStats.created,
        //     durationMs: duration
        // });

        return combinedStats;
    }

    /**
     * Получение истории антивирусных проверок для файла
     */
    async getFileScanHistory(fileId, options = {}) {
        const fileData = await this.getFileDataByFileId(fileId);
        const moduleName = fileData.module;
        try {
            const config = getModuleConfig(moduleName);
            if (!config) {
                throw apiError.BadRequest('Неизвестный модуль файлов');
            }

            const fileInfo = fileData.fileData;
            if (!fileInfo) {
                throw apiError.NotFound('Файл не найден');
            }

            const scans = await antivirusScanService.getScansForFile('files', fileId, options);
            return scans;
        } catch (error) {
            console.error('Ошибка получения истории проверок:', error);
            throw apiError.Internal('Ошибка получения истории антивирусных проверок', 'FS900');
        }
    }
}

module.exports = new UnifiedFileService();;