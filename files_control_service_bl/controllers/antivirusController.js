/**
 * Контроллер для работы с антивирусными проверками
 * Предоставляет API endpoints для просмотра истории и статистики проверок
 */

const apiError = require('../exceptions/apiError');
const antivirusEngine = require('../services/filesServ/antivirusEngine');
const antivirusScanService = require('../services/filesServ/antivirusScanService');
const singleFileService = require('../services/filesServ/singleFileService');
const unifiedFileService = require('../services/filesServ/unifiedFileService');

/**
 * Контроллер антивирусных проверок
 */
class AntivirusController {

    /**
     * Получение истории всех проверок с пагинацией
     * GET /api/antivirus/history?page=1&limit=50&status=infected
     */
    async getHistory(req, res, next) {
        try {
            const {
                page = 1,
                limit = 1000,
                status,
                infectedOnly,
                fileTable
            } = req.query;

            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                status: status || null,
                infectedOnly: infectedOnly === 'true',
                fileTable: fileTable || null
            };

            const result = await antivirusScanService.getScanHistory(options);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Получение статистики антивирусных проверок
     * GET /api/antivirus/statistics?start_date=2024-01-01&end_date=2024-12-31
     */
    async getStatistics(req, res, next) {
        try {
            const { start_date, end_date, status } = req.query;

            const options = {
                startDate: start_date ? new Date(start_date) : null,
                endDate: end_date ? new Date(end_date) : null,
                status: status || null
            };

            const stats = await antivirusScanService.getStatistics(options);

            res.json({
                success: true,
                statistics: stats
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Получение результата проверки по ID
     * GET /api/antivirus/scan?scanId=xxx
     */
    async getScanById(req, res, next) {
        try {
            const { scanId } = req.query;

            if (!scanId) {
                throw apiError.BadRequest('Параметр scanId обязателен');
            }

            const scan = await antivirusScanService.getScanById(scanId);

            if (!scan) {
                throw apiError.NotFound('Результат проверки не найден');
            }

            res.json({
                success: true,
                scan: scan
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Получение истории проверок для сингл файла
     * GET /api/antivirus/single-files/history?codeName=main_logo&limit=20&offset=0
     */
    async getSingleFileScanHistory(req, res, next) {
        try {
            const { codeName } = req.query;

            if (!codeName) {
                throw apiError.BadRequest('Параметр codeName обязателен');
            }

            const { limit = 20, offset = 0 } = req.query;

            const history = await singleFileService.getFileScanHistory(codeName, {
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            res.json({
                success: true,
                codeName: codeName,
                history: history
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Получение результата последней проверки для сингл файла
     * GET /api/antivirus/single-files?codeName=main_logo
     */
    async getSingleFileScanResult(req, res, next) {
        try {
            const { codeName } = req.query;

            if (!codeName) {
                throw apiError.BadRequest('Параметр codeName обязателен');
            }

            const scan = await singleFileService.getFileScanResult(codeName);

            res.json({
                success: true,
                codeName: codeName,
                scan: scan
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Получение истории проверок для файла в модуле
     * GET /api/antivirus/files/history?moduleName=incident_evidence&recordId=xxx&fileName=photo.jpg&limit=20&offset=0
     */
    async getFileScanHistory(req, res, next) {
        try {
            const { fileId } = req.query;

            if (!fileId) {
                throw apiError.BadRequest('Параметры fileId обязательны');
            }

            const { limit = 20, offset = 0 } = req.query;

            const history = await unifiedFileService.getFileScanHistory(
                fileId,
                {
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            );

            res.json({
                success: true,
                fileId: fileId,
                history: history
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Получение результата последней проверки для файла в модуле
     * GET /api/antivirus/files?moduleName=incident_evidence&recordId=xxx&fileName=photo.jpg
     */
    async getFileScanResult(req, res, next) {
        try {
            const { moduleName, recordId, fileName } = req.query;

            if (!moduleName || !recordId || !fileName) {
                throw apiError.BadRequest('Параметры moduleName, recordId и fileName обязательны');
            }

            const scan = await unifiedFileService.getFileScanResult(
                moduleName,
                recordId,
                fileName
            );

            res.json({
                success: true,
                moduleName: moduleName,
                recordId: recordId,
                fileName: fileName,
                scan: scan
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Получение истории проверок для всех файлов записи
     * GET /api/antivirus/records/history?moduleName=incident_evidence&recordId=xxx&page=1&limit=50
     */
    async getRecordScanHistory(req, res, next) {
        try {
            const { moduleName, recordId } = req.query;

            if (!moduleName || !recordId) {
                throw apiError.BadRequest('Параметры moduleName и recordId обязательны');
            }

            const { page = 1, limit = 50, status, infected_only } = req.query;

            const result = await unifiedFileService.getRecordScanHistory(
                moduleName,
                recordId,
                {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    status: status || null,
                    infectedOnly: infected_only === 'true'
                }
            );

            res.json({
                success: true,
                moduleName: moduleName,
                recordId: recordId,
                ...result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Очистка старых результатов проверок
     * DELETE /api/antivirus/cleanup?days=30
     */
    async cleanupOldScans(req, res, next) {
        try {
            const { days = 30 } = req.query;

            const deletedCount = await antivirusScanService.cleanupOldScans(parseInt(days));

            res.json({
                success: true,
                message: `Удалено ${deletedCount} старых записей`,
                deletedCount: deletedCount
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Принудительная повторная проверка файла
     * POST /api/antivirus/rescan?moduleName=incident_evidence&recordId=xxx&fileName=photo.jpg
     */
    async rescanFile(req, res, next) {
        try {
            const { fileId } = req.query;

            if (!fileId) {
                throw apiError.BadRequest('Параметры fileId обязательны');
            }

            // console.log(fileId)

            const token = req.headers.authorization?.split(' ')[1];

            // Получаем файл из хранилища
            const fileInfo = await unifiedFileService.getFile(
                fileId,
                token
            );

            const fileName = fileInfo.fileName

            if (!fileInfo) {
                throw apiError.NotFound('Файл не найден');
            }

            // console.log(fileId)

            // Скачиваем файл во временную директорию
            const fs = require('fs').promises;
            const path = require('path');
            const tempDir = '/tmp/antivirus_rescan';
            await fs.mkdir(tempDir, { recursive: true });
            const tempPath = path.join(tempDir, `${Date.now()}_${fileName}`);

            await fs.writeFile(tempPath, fileInfo.fileBuffer);

            // Выполняем сканирование
            const scanResult = await antivirusEngine.scanFile(tempPath);

            // Сохраняем новый результат
            const crypto = require('crypto');
            const fileHash = crypto.createHash('sha256').update(fileInfo.fileBuffer).digest('hex');

            const savedScan = await antivirusScanService.saveScanResult({
                fileSize: fileInfo.size,
                fileHash: fileHash,
                mimetype: fileInfo.mimetype,
                result: scanResult,
                fileTable: 'files',
                fileId: fileId
            });

            // Обновляем связь файла с новым сканированием
            await antivirusScanService.linkScanToFile('files', fileId, savedScan.id);

            // Удаляем временный файл
            await fs.unlink(tempPath);

            res.json({
                success: true,
                message: 'Файл успешно пересканирован',
                scan: savedScan
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Принудительное пересканирование одиночного файла
     * POST /api/antivirus/single-files/rescan?codeName=main_logo
     */
    async rescanSingleFile(req, res, next) {
        try {
            const { codeName } = req.query;

            if (!codeName) {
                return next(apiError.BadRequest('Не указан codeName'));
            }

            const result = await singleFileService.rescanSingleFile(codeName);

            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AntivirusController();
