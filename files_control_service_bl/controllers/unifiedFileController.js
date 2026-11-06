const apiError = require('../exceptions/apiError');
const { getModuleConfig, isValidModule, generateSingleFilePath, generateSingleFilePathWithTimestamp } = require('../services/filesServ/fileModuleConfig');
const singleFileService = require('../services/filesServ/singleFileService');
const unifiedFileService = require('../services/filesServ/unifiedFileService');
const tokenService = require('../services/systemServices/tokenService');

/**
 * Унифицированный контроллер для работы с файлами
 * Заменяет разрозненную обработку файлов в различных контроллерах
 */
class UnifiedFileController {

    constructor() {
        // Привязываем методы к контексту класса
        this.uploadFiles = this.uploadFiles.bind(this);
        this.updateFile = this.updateFile.bind(this);
        this.deleteFile = this.deleteFile.bind(this);
        this.getFiles = this.getFiles.bind(this);
        this.downloadFile = this.downloadFile.bind(this);
        this.reorderFiles = this.reorderFiles.bind(this);
        this.downloadIncidentArchive = this.downloadIncidentArchive.bind(this);
        // Новые методы для одиночных системных файлов
        this.getSingleFiles = this.getSingleFiles.bind(this);
        this.updateSingleFile = this.updateSingleFile.bind(this);
        this.deleteSingleFile = this.deleteSingleFile.bind(this);
        this.downloadSingleFile = this.downloadSingleFile.bind(this);
    }

    /**
     * Загрузка файлов к записи
     * POST /files/upload?module={module}&recordId={id}
     */
    async uploadFiles(req, res, next) {
        try {
            const { module: moduleName, recordId } = req.query;

            // Валидация обязательных параметров
            if (!moduleName) {
                throw apiError.BadRequest('Не указан модуль файлов');
            }
            if (!recordId) {
                throw apiError.BadRequest('Не указан ID записи');
            }

            // Проверяем существование модуля
            if (!isValidModule(moduleName)) {
                throw apiError.BadRequest('Неизвестный модуль файлов');
            }

            const token = req?.headers?.authorization?.split(' ')[1]
            const decoded = token ? tokenService.validateToken(token) : null
            const current_user = decoded ? decoded?.data : null;
            const current_user_status = decoded ? current_user?.status : null;

            // Обрабатываем загрузку файлов
            const uploadResult = await unifiedFileService.handleFileUpload(req, res, moduleName, current_user_status);

            const result = await unifiedFileService.addFiles(
                moduleName,
                recordId,
                uploadResult.files,
                token
            );

            res.json({
                success: true,
                message: `Успешно загружено ${result.uploaded} файлов`,
                data: result
            });

        } catch (error) {
            // Удаляем временные файлы при ошибке
            if (req.files) {
                await unifiedFileService.cleanupFiles(req.files).catch(console.error);
            }
            next(error);
        }
    }

    /**
     * Обновление файла
     * При обновлении файл должен сохранять то же расширение и имя
     * POST /files/update?module={module}&recordId={id}&fileId={id}
     */
    async updateFile(req, res, next) {
        try {
            const { fileId } = req.query;

            if (!fileId) {
                throw apiError.BadRequest('Не указано id файла');
            }

            const fileData = await unifiedFileService.getFileDataByFileId(fileId);
            const moduleName = fileData.module
            const recordId = fileData.recordId

            // Проверяем существование модуля
            if (!isValidModule(moduleName)) {
                throw apiError.BadRequest('Неизвестный модуль файлов');
            }

            // Проверяем авторизацию
            const token = req?.headers?.authorization?.split(' ')[1]
            const decoded = token ? tokenService.validateToken(token) : null
            const current_user = decoded ? decoded?.data : null;
            const current_user_status = decoded ? current_user?.status : null;

            // Обрабатываем загрузку нового файла
            const uploadResult = await unifiedFileService.handleFileUpload(req, res, moduleName, current_user_status);

            if (uploadResult.files.length === 0) {
                throw apiError.BadRequest('Файл для замены не загружен');
            }
            if (uploadResult.files.length > 1) {
                throw apiError.BadRequest('Можно заменить только один файл за раз');
            }

            // Обновляем файл (с сохранением того же имени и расширения)
            const result = await unifiedFileService.updateFile(
                moduleName,
                recordId,
                fileId,
                fileData.fileData,
                uploadResult.files[0],
                token
            );

            res.json({
                success: true,
                message: 'Файл успешно обновлен',
                data: result
            });

        } catch (error) {
            // Удаляем временные файлы при ошибке
            if (req.files) {
                await unifiedFileService.cleanupFiles(req.files).catch(console.error);
            }
            next(error);
        }
    }

    /**
     * Удаление файла
     * При удалении также обновляется порядок оставшихся файлов
     * DELETE /files/delete?module={module}&recordId={id}&fileName={name}
     */
    async deleteFile(req, res, next) {
        try {
            const { fileId } = req.query;

            if (!fileId) {
                throw apiError.BadRequest('Не указано id файла');
            }

            // Проверяем авторизацию
            const token = req.headers?.authorization?.split(' ')[1];

            // Удаляем файл (с обновлением порядка файлов)
            const result = await unifiedFileService.deleteFile(
                fileId,
                token
            );

            res.json({
                success: true,
                message: 'Файл успешно удален',
                data: result
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Получение списка файлов записи
     * GET /files/list?module={module}&fileId={id}
     */
    async getFiles(req, res, next) {
        try {
            const { module: moduleName, recordId } = req.query;

            // Валидация обязательных параметров
            if (!moduleName) {
                throw apiError.BadRequest('Не указан модуль файлов');
            }
            if (!recordId) {
                throw apiError.BadRequest('Не указан ID записи');
            }

            // Проверяем существование модуля
            if (!isValidModule(moduleName)) {
                throw apiError.BadRequest('Неизвестный модуль файлов');
            }

            // Проверяем авторизацию
            const token = req.headers?.authorization?.split(' ')[1];

            // Получаем список файлов
            const result = await unifiedFileService.getFiles(
                moduleName,
                recordId,
                token,
                {
                    includeMetadata: req.query.includeMetadata === 'true',
                    includeThumbnails: req.query.includeThumbnails === 'true'
                }
            );

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Скачивание файла
     * GET /files/download?module={module}&recordId={id}&fileName={name}
     */
    async downloadFile(req, res, next) {
        try {
            const { fileId } = req.query;

            if (!fileId) {
                throw apiError.BadRequest('Не указано id файла');
            }

            // Проверяем авторизацию
            const token = req.headers?.authorization?.split(' ')[1];

            // Получаем файл из хранилища
            const result = await unifiedFileService.getFile(
                fileId,
                token
            );

            // Устанавливаем заголовки для скачивания
            res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
            res.setHeader('Content-Type', result.mimetype);

            // Отправляем файл
            res.send(result.fileBuffer);

        } catch (error) {
            next(error);
        }
    }

    /**
     * Обновление порядка файлов
     * POST /files/reorder?module={module}&recordId={id}
     * Тело запроса: { fileOrders: [{ fileName: "filename", sortOrder: 1 }, ...] }
     */
    async reorderFiles(req, res, next) {
        try {
            const { module: moduleName, recordId } = req.query;
            const { fileOrders } = req.body;

            // Валидация обязательных параметров
            if (!moduleName) {
                throw apiError.BadRequest('Не указан модуль файлов');
            }
            if (!recordId) {
                throw apiError.BadRequest('Не указан ID записи');
            }
            if (!fileOrders || !Array.isArray(fileOrders) || fileOrders.length === 0) {
                throw apiError.BadRequest('Не указан порядок файлов');
            }

            // Проверяем существование модуля
            if (!isValidModule(moduleName)) {
                throw apiError.BadRequest('Неизвестный модуль файлов');
            }

            // Проверяем авторизацию
            const token = req.headers?.authorization?.split(' ')[1];

            // Обновляем порядок файлов
            const result = await unifiedFileService.reorderFiles(
                moduleName,
                recordId,
                fileOrders,
                token
            );

            res.json({
                success: true,
                message: 'Порядок файлов успешно обновлен',
                data: result
            });

        } catch (error) {
            next(error);
        }
    }

    // =========================================================================
    // Методы для работы с одиночными системными файлами (single_system_files)
    // =========================================================================

    /**
     * Получение списка одиночных системных файлов с пагинацией
     * GET /single-files/list?page={page}&limit={limit}&type={type}
     */
    async getSingleFiles(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 1000;
            const type = req.query.type || null;

            // Проверяем авторизацию
            const token = req.headers.authorization?.split(' ')[1];

            // Получаем список файлов с пагинацией
            const result = await singleFileService.getSingleFiles({
                page,
                limit,
                type,
                codeName: req.query.codeName || null
            });

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Обновление одиночного системного файла по code_name
     * POST /single-files/update?codeName={codeName}
     */
    async updateSingleFile(req, res, next) {
        try {
            const { codeName } = req.query;

            // Валидация обязательных параметров
            if (!codeName) {
                throw apiError.BadRequest('Не указано кодовое имя файла');
            }

            // Проверяем авторизацию
            const token = req.headers.authorization?.split(' ')[1];

            // Обновляем файл
            const result = await singleFileService.updateSingleFile(
                codeName,
                token,
                req,
                res
            );

            res.json({
                success: true,
                message: 'Файл успешно обновлен',
                data: result
            });

        } catch (error) {
            // Удаляем временные файлы при ошибке
            if (req.files) {
                await unifiedFileService.cleanupFiles(req.files).catch(console.error);
            }
            next(error);
        }
    }

    /**
     * Удаление одиночного системного файла по code_name
     * DELETE /single-files/delete?codeName={codeName}
     */
    async deleteSingleFile(req, res, next) {
        try {
            const { codeName } = req.query;

            // Валидация обязательных параметров
            if (!codeName) {
                throw apiError.BadRequest('Не указано кодовое имя файла');
            }

            // Проверяем авторизацию
            const token = req.headers.authorization?.split(' ')[1];

            // Удаляем файл
            const result = await singleFileService.deleteSingleFile(codeName);

            res.json({
                success: true,
                message: 'Файл успешно удален',
                data: result
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Скачивание одиночного системного файла по code_name
     * GET /single-files/download?codeName={codeName}
     */
    async downloadSingleFile(req, res, next) {
        try {
            const { codeName } = req.query;

            // Валидация обязательных параметров
            if (!codeName) {
                throw apiError.BadRequest('Не указано кодовое имя файла');
            }

            // Проверяем авторизацию
            const token = req.headers.authorization?.split(' ')[1];

            // Получаем файл из хранилища
            const result = await singleFileService.getSingleFile(codeName);

            // Проверяем, найден ли файл
            if (!result.success) {
                throw apiError.NotFound(result.message || 'Файл не найден');
            }

            // Устанавливаем заголовки для скачивания
            res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
            res.setHeader('Content-Type', result.mimetype);

            // Отправляем файл
            res.send(result.fileBuffer);

        } catch (error) {
            next(error);
        }
    }

    /**
 * Скачивание ZIP-архива с файлами инцидента
 * GET /files/archive?module={module}&recordId={id}
 */
    async downloadIncidentArchive(req, res, next) {
        try {
            const { module: moduleName, recordId } = req.query;

            // Валидация обязательных параметров
            if (!moduleName) {
                throw apiError.BadRequest('Не указан модуль файлов');
            }
            if (!recordId) {
                throw apiError.BadRequest('Не указан ID записи');
            }

            // Проверяем существование модуля
            if (!isValidModule(moduleName)) {
                throw apiError.BadRequest('Неизвестный модуль файлов');
            }

            // Проверяем авторизацию
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                throw apiError.Unauthorized('Отсутствует токен авторизации');
            }

            // Создаём архив
            const result = await unifiedFileService.createIncidentArchive(
                moduleName,
                recordId,
                token
            );

            // Устанавливаем заголовки для скачивания ZIP-файла
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${result.archiveName}"`);
            res.setHeader('Content-Length', result.archiveBuffer.length);

            // Кастомные заголовки с метаданными архива
            res.setHeader('X-Files-Count', result.filesCount);
            res.setHeader('X-Processed-Count', result.processedCount);
            if (result.skippedCount > 0) {
                res.setHeader('X-Skipped-Files', result.skippedCount);
            }

            // Отправляем буфер архива
            res.send(result.archiveBuffer);

        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UnifiedFileController();
