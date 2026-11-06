/**
 * Сервис для управления результатами антивирусных проверок
 * Сохраняет и извлекает результаты сканирования файлов из базы данных
 */

const queryService = require('../systemServices/queryService');
const apiError = require('../../exceptions/apiError');
const { getFileInfoFromService, formatScanWithFileInfo, formatScanWithFileInfoForHistory } = require('./fileInfoHelper');

/**
 * Сервис для работы с результатами антивирусных проверок
 */
class AntivirusScanService {
    /**
     * Сохранение результата проверки в базу данных
     * @param {Object} scanData - Данные проверки
     * @param {string} scanData.fileName - Имя файла
     * @param {string} scanData.filePath - Путь к файлу
     * @param {number} scanData.fileSize - Размер файла
     * @param {string} scanData.fileHash - SHA256 хеш файла
     * @param {string} scanData.mimetype - MIME тип файла
     * @param {Object} scanData.result - Результат от антивирусного движка
     * @param {string} scanData.fileTable - Таблица файлов ('files' или 'files_single')
     * @param {string} scanData.fileId - ID записи в таблице файлов (UUID)
     * @returns {Promise<Object>} - Сохраненная запись
     */
    async saveScanResult(scanData) {
        const {
            fileSize,
            fileHash,
            mimetype,
            result,
            fileTable = 'files',
            fileId = null
        } = scanData;

        try {
            // Преобразуем результат сканирования в нужный формат
            const scanRecord = this.formatScanResult({
                fileSize,
                fileHash,
                mimetype,
                result,
                fileTable,
                fileId
            });

            // Сохраняем в базу данных
            const query = `
                INSERT INTO antivirus_scans (
                    file_table, file_id, file_size,
                    file_hash, mimetype, status, is_infected, verdict,
                    confidence, scan_duration_ms, threats, threat_count,
                    scan_details, triggered_rules, chains, scan_engine,
                    scan_version, scan_seed, scanned_at, created_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
                )
                RETURNING *
            `;

            const params = [
                scanRecord.fileTable,
                scanRecord.fileId,
                scanRecord.fileSize,
                scanRecord.fileHash,
                scanRecord.mimetype,
                scanRecord.status,
                scanRecord.isInfected,
                scanRecord.verdict,
                scanRecord.confidence,
                scanRecord.scanDurationMs,
                JSON.stringify(scanRecord.threats),
                scanRecord.threatCount,
                JSON.stringify(scanRecord.scanDetails),
                scanRecord.triggeredRules,
                JSON.stringify(scanRecord.chains),
                scanRecord.scanEngine,
                scanRecord.scanVersion,
                scanRecord.scanSeed,
                scanRecord.scannedAt,
                scanRecord.createdAt
            ];

            const resultDb = await queryService.query(query, params);
            return resultDb.rows[0];

        } catch (error) {
            console.error('[AntivirusScanService] Ошибка сохранения результата проверки:', error);
            throw apiError.Internal('Ошибка сохранения результата антивирусной проверки', 'AVS001');
        }
    }

    /**
     * Форматирование результата сканирования для сохранения
     * @param {Object} data - Исходные данные
     * @returns {Object} - Отформатированные данные для БД
     */
    formatScanResult(data) {
        const { fileSize, fileHash, mimetype, result, fileTable, fileId } = data;

        // Определяем статус по вердикту
        const statusMap = {
            'CLEAN': 'clean',
            'SUSPICIOUS': 'suspicious',
            'LIKELY_MALICIOUS': 'infected',
            'MALICIOUS': 'infected',
            'TIMEOUT': 'timeout',
            'ERROR': 'error'
        };

        const threats = result.threats || [];
        const triggeredRules = result.triggeredRules || [];
        const chains = result.chains || [];

        // Форматируем угрозы для JSON
        const formattedThreats = threats.map(threat => ({
            type: threat.type || 'unknown',
            severity: threat.severity || 'unknown',
            name: threat.name || 'Unknown',
            score: threat.score || 0,
            description: threat.description || '',
            rule: threat.rule || ''
        }));

        // Форматируем цепочки
        const formattedChains = Array.isArray(chains) ? chains : (chains.set ? [...chains] : []);

        return {
            fileTable: fileTable,
            fileId: fileId,
            fileSize: fileSize || 0,
            fileHash: fileHash || null,
            mimetype: mimetype || 'application/octet-stream',
            status: statusMap[result.verdict] || (result.isInfected ? 'infected' : 'clean'),
            isInfected: result.isInfected || false,
            verdict: result.verdict || 'CLEAN',
            confidence: result.confidence || 0,
            scanDurationMs: result.scanTime || 0,
            threats: formattedThreats,
            threatCount: formattedThreats.length,
            scanDetails: {
                score: result.score || 0,
                scoreBreakdown: result.scoreBreakdown || {},
                timedOut: result.timedOut || false,
                explanations: result.explanations || []
            },
            triggeredRules: triggeredRules,
            chains: formattedChains,
            scanEngine: 'internal',
            scanVersion: result.ruleVersion || '1.0.0',
            scanSeed: result.scanSeed || Date.now(),
            scannedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Получение результата проверки по ID с информацией о файле
     * @param {string} scanId - ID проверки
     * @returns {Promise<Object|null>} - Результат проверки или null
     */
    async getScanById(scanId) {
        try {
            const query = 'SELECT * FROM antivirus_scans WHERE id = $1';
            const result = await queryService.query(query, [scanId]);

            if (!result.rows[0]) {
                return null;
            }

            const scan = result.rows[0];
            const fileInfo = await getFileInfoFromService(scan.file_table, scan.file_id);

            return formatScanWithFileInfo(scan, fileInfo);
        } catch (error) {
            console.error('[AntivirusScanService] Ошибка получения результата проверки:', error);
            throw apiError.Internal('Ошибка получения результата антивирусной проверки', 'AVS002');
        }
    }

    /**
     * Получение последней проверки для файла с информацией о файле
     * @param {string} fileTable - Таблица файлов
     * @param {string} fileId - ID записи файла
     * @returns {Promise<Object|null>} - Последний результат проверки или null
     */
    async getLatestScanForFile(fileTable, fileId) {
        try {
            const query = `
                SELECT * FROM antivirus_scans
                WHERE file_table = $1 AND file_id = $2
                ORDER BY scanned_at DESC
                LIMIT 1
            `;
            const result = await queryService.query(query, [fileTable, fileId]);

            if (!result.rows[0]) {
                return null;
            }

            const scan = result.rows[0];
            const fileInfo = await getFileInfoFromService(fileTable, fileId);

            return formatScanWithFileInfoForHistory(scan, fileInfo);
        } catch (error) {
            console.error('[AntivirusScanService] Ошибка получения последней проверки:', error);
            throw apiError.Internal('Ошибка получения результата антивирусной проверки', 'AVS003');
        }
    }

    /**
     * Получение всех проверок для файла с информацией о файле
     * @param {string} fileTable - Таблица файлов
     * @param {string} fileId - ID записи файла
     * @param {Object} options - Опции пагинации
     * @returns {Promise<Array>} - Массив проверок
     */
    async getScansForFile(fileTable, fileId, options = {}) {
        const { limit = 20, offset = 0 } = options;

        try {
            const query = `
                SELECT * FROM antivirus_scans
                WHERE file_table = $1 AND file_id = $2
                ORDER BY scanned_at DESC
                LIMIT $3 OFFSET $4
            `;
            const result = await queryService.query(query, [fileTable, fileId, limit, offset]);

            // Получаем информацию о файле из соответствующего сервиса
            const fileInfo = await getFileInfoFromService(fileTable, fileId);

            // Форматируем все записи (краткий формат для истории)
            return result.rows.map(scan => formatScanWithFileInfoForHistory(scan, fileInfo));
        } catch (error) {
            console.error('[AntivirusScanService] Ошибка получения проверок для файла:', error);
            throw apiError.Internal('Ошибка получения результатов антивирусной проверки', 'AVS004');
        }
    }

    /**
     * Обновление связи файла с результатом проверки
     * @param {string} fileTable - Таблица файлов
     * @param {string} fileId - ID записи файла
     * @param {string} scanId - ID проверки
     * @returns {Promise<Object>} - Обновленная запись файла
     */
    async linkScanToFile(fileTable, fileId, scanId) {
        try {
            const tableName = fileTable === 'files_single' ? 'files_single' : 'files';
            const idColumn = fileTable === 'files_single' ? 'code_name' : 'id';

            const query = `
                UPDATE ${tableName}
                SET antivirus_scan_id = $1, updated_at = (NOW() AT TIME ZONE 'UTC')
                WHERE ${idColumn} = $2
                RETURNING *
            `;

            const result = await queryService.query(query, [scanId, fileId]);
            return result.rows[0];
        } catch (error) {
            console.error('[AntivirusScanService] Ошибка связи файла с проверкой:', error);
            throw apiError.Internal('Ошибка обновления связи с антивирусной проверкой', 'AVS005');
        }
    }

    /**
     * Получение статистики проверок
     * @param {Object} options - Опции фильтрации
     * @returns {Promise<Object>} - Статистика
     */
    async getStatistics(options = {}) {
        const { startDate = null, endDate = null, status = null } = options;

        try {
            let whereConditions = [];
            let params = [];
            let paramIndex = 1;

            if (startDate) {
                whereConditions.push(`scanned_at >= $${paramIndex}`);
                params.push(startDate);
                paramIndex++;
            }

            if (endDate) {
                whereConditions.push(`scanned_at <= $${paramIndex}`);
                params.push(endDate);
                paramIndex++;
            }

            if (status) {
                whereConditions.push(`status = $${paramIndex}`);
                params.push(status);
                paramIndex++;
            }

            const whereClause = whereConditions.length > 0
                ? `WHERE ${whereConditions.join(' AND ')}`
                : '';

            const query = `
                SELECT
                    COUNT(*) as total_scans,
                    COUNT(*) FILTER (WHERE is_infected = TRUE) as infected_count,
                    COUNT(*) FILTER (WHERE status = 'clean') as clean_count,
                    COUNT(*) FILTER (WHERE status = 'error') as error_count,
                    COUNT(*) FILTER (WHERE status = 'timeout') as timeout_count,
                    COUNT(*) FILTER (WHERE status = 'suspicious') as suspicious_count,
                    AVG(scan_duration_ms) as avg_duration_ms,
                    MAX(scanned_at) as last_scan_at,
                    SUM(threat_count) as total_threats
                FROM antivirus_scans
                ${whereClause}
            `;

            const result = await queryService.query(query, params);
            return result.rows[0];
        } catch (error) {
            console.error('[AntivirusScanService] Ошибка получения статистики:', error);
            throw apiError.Internal('Ошибка получения статистики антивирусных проверок', 'AVS006');
        }
    }

    /**
     * Получение истории проверок с пагинацией и информацией о файлах
     * @param {Object} options - Опции пагинации и фильтрации
     * @returns {Promise<Object>} - Результат с историей и пагинацией
     */
    async getScanHistory(options = {}) {
        const {
            page = 1,
            limit = 50,
            status = null,
            infectedOnly = false,
            fileTable = null
        } = options;

        try {
            let whereConditions = [];
            let params = [];
            let paramIndex = 1;



            if (status) {
                whereConditions.push(`status = $${paramIndex}`);
                params.push(status);
                paramIndex++;
            }

            if (infectedOnly) {
                whereConditions.push(`is_infected = TRUE`);
            }

            if (fileTable) {
                whereConditions.push(`file_table = $${paramIndex}`);
                params.push(fileTable);
                paramIndex++;
            }

            const whereClause = whereConditions.length > 0
                ? `WHERE ${whereConditions.join(' AND ')}`
                : '';

            // Получаем общее количество
            const countQuery = `SELECT COUNT(*) as total FROM antivirus_scans ${whereClause}`;
            const countResult = await queryService.query(countQuery, params);
            const total = parseInt(countResult.rows[0].total) || 0;

            // Вычисляем смещение
            const offset = (page - 1) * limit;

            // Получаем записи
            const query = `
                SELECT * FROM antivirus_scans
                ${whereClause}
                ORDER BY scanned_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            const result = await queryService.query(query, [...params, limit, offset]);

            // Группируем file_id по таблицам для оптимизации
            const fileIdsByTable = {};
            result.rows.forEach(scan => {
                if (!fileIdsByTable[scan.file_table]) {
                    fileIdsByTable[scan.file_table] = new Set();
                }
                fileIdsByTable[scan.file_table].add(scan.file_id);
            });

            // Получаем информацию о файлах из соответствующих сервисов
            const fileInfoMap = {};
            for (const [tableName, ids] of Object.entries(fileIdsByTable)) {
                const idArray = Array.from(ids);
                for (const id of idArray) {
                    const fileInfo = await getFileInfoFromService(tableName, id);
                    if (fileInfo) {
                        fileInfoMap[`${tableName}:${id}`] = fileInfo;
                    }
                }
            }

            // Форматируем записи с информацией о файлах (краткий формат для истории)
            const formattedScans = result.rows.map(scan => {
                const fileInfo = fileInfoMap[`${scan.file_table}:${scan.file_id}`] || null;
                return formatScanWithFileInfoForHistory(scan, fileInfo);
            });

            // Вычисляем мета-данные пагинации
            const totalPages = Math.ceil(total / limit);

            return {
                success: true,
                data: formattedScans,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalItems: total,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            console.error('[AntivirusScanService] Ошибка получения истории проверок:', error);
            throw apiError.Internal('Ошибка получения истории антивирусных проверок', 'AVS007');
        }
    }

    /**
     * Удаление старых результатов проверок
     * @param {number} daysToKeep - Количество дней для хранения
     * @returns {Promise<number>} - Количество удаленных записей
     */
    async cleanupOldScans(daysToKeep = 30) {
        try {
            const query = `
                DELETE FROM antivirus_scans
                WHERE scanned_at < NOW() - INTERVAL '${daysToKeep} days'
                RETURNING id
            `;

            const result = await queryService.query(query);
            const deletedCount = result.rows.length;

            // console.log(`[AntivirusScanService] Удалено ${deletedCount} старых записей проверок`);
            return deletedCount;
        } catch (error) {
            console.error('[AntivirusScanService] Ошибка удаления старых проверок:', error);
            throw apiError.Internal('Ошибка очистки старых результатов', 'AVS008');
        }
    }

    /**
     * Проверка файла по хешу в истории проверок
     * @param {string} fileHash - SHA256 хеш файла
     * @returns {Promise<Object|null>} - Предыдущий результат или null
     */
    async checkFileByHash(fileHash) {
        try {
            const query = `
                SELECT * FROM antivirus_scans
                WHERE file_hash = $1 AND is_infected = FALSE
                ORDER BY scanned_at DESC
                LIMIT 1
            `;

            const result = await queryService.query(query, [fileHash]);
            if (!result.rows[0]) {
                return null;
            }

            const scan = result.rows[0];
            const fileInfo = await getFileInfoFromService(scan.file_table, scan.file_id);

            return formatScanWithFileInfo(scan, fileInfo);
        } catch (error) {
            console.error('[AntivirusScanService] Ошибка проверки по хешу:', error);
            return null;
        }
    }

    /**
     * Удаление всех проверок для конкретного файла
     * @param {string} fileTable - Таблица файлов ('files' или 'files_single')
     * @param {string} fileId - ID записи в таблице файлов
     * @returns {Promise<number>} - Количество удаленных записей
     */
    async deleteScansForFile(fileTable, fileId) {
        try {
            const query = `
                DELETE FROM antivirus_scans
                WHERE file_table = $1 AND file_id = $2
                RETURNING id
            `;

            const result = await queryService.query(query, [fileTable, String(fileId)]);
            const deletedCount = result.rows.length;

            // console.log(`[AntivirusScanService] Удалено ${deletedCount} записей проверок для файла ${fileTable}:${fileId}`);
            return deletedCount;
        } catch (error) {
            console.error('[AntivirusScanService] Ошибка удаления проверок для файла:', error);
            return 0;
        }
    }
}

module.exports = new AntivirusScanService();
