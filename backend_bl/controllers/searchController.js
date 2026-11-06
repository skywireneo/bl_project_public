const pgdb = require('../pgdb');
const searchHistoryService = require('../services/search/searchHistoryService');
const searchService = require('../services/search/searchService');
const tokenService = require('../services/systemServices/tokenService');

class searchController {

    async searchPersone(req, res, next) {
        const client = await pgdb.connect();
        try {
            await client.query('BEGIN');

            const { email, string } = req.query;

            //  Одно объявление requestIp
            const requestIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                || req.ip
                || req.socket.remoteAddress;
            const deviceId = req.headers['x-device-id'] || null;

            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;

            const result = await searchService.searchPersone(client, email, string, {
                request_ip: requestIp,
                device_id: deviceId
            }, current_user);

            await client.query('COMMIT');
            res.json(result);
        } catch (error) {
            await client.query('ROLLBACK');
            next(error);
        } finally {
            client.release();
        }
    }

    async searchPVZ(req, res, next) {
        const client = await pgdb.connect();
        try {
            await client.query('BEGIN');

            const { email, city, street, home } = req.query;

            //  Одно объявление requestIp
            const requestIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                || req.ip
                || req.socket.remoteAddress;
            const deviceId = req.headers['x-device-id'] || null;

            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;

            const result = await searchService.searchPVZ(client, email, city, street, home, {
                request_ip: requestIp,
                device_id: deviceId
            }, current_user);

            await client.query('COMMIT');
            res.json(result);
        } catch (error) {
            await client.query('ROLLBACK');
            next(error);
        } finally {
            client.release();
        }
    }


    /**
     * GET /api/search-history
     * Получение истории поисковых запросов
     * 
     * Query params:
     * - email: фильтр по email пользователя
     * - type: фильтр по типу поиска ('person' | 'pvz')
     * - status: фильтр по статусу ('found' | 'not_found' | 'error' | 'rate_limited')
     * - device_id: фильтр по ID устройства
     * - days: за сколько дней (default: 7)
     * - limit: лимит записей (default: 50, max: 1000)
     * - offset: смещение для пагинации (default: 0)
     */
    async getHistory(req, res, next) {
        const client = await pgdb.connect();
        try {
            const {
                email,
                type,
                status,
                device_id,
                days = 7,
                limit = 50,
                offset = 0
            } = req.query;

            // Если пользователь не админ — показываем только его историю
            const currentUser = req.user; // предполагается что middleware добавляет req.user
            const filterEmail = ['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(currentUser?.status)
                ? email // админ может смотреть любую историю
                : currentUser?.email; // обычный пользователь видит только свою

            const result = await searchHistoryService.getHistory(client, {
                user_email: filterEmail,
                search_type: type,
                result_status: status,
                device_id: device_id,
                days: parseInt(days),
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        } finally {
            client.release();
        }
    }

    /**
     * GET /api/search-history/statistics
     * Получение статистики по поисковым запросам
     * 
     * Query params:
     * - email: фильтр по email (для админов)
     * - days: за сколько дней (default: 7)
     */
    async getHistoryStatistics(req, res, next) {
        const client = await pgdb.connect();
        try {
            const { email, days = 7 } = req.query;

            const currentUser = req.user;
            const filterEmail = ['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(currentUser?.status)
                ? email
                : currentUser?.email;

            const stats = await searchHistoryService.getStatistics(client, {
                user_email: filterEmail,
                days: parseInt(days)
            });

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            next(error);
        } finally {
            client.release();
        }
    }

    /**
     * DELETE /api/search-history/cleanup
     * Очистка старых записей (только для админов)
     * 
     * Query params:
     * - days: удалить записи старше N дней (default: 10)
     */
    async historyCleanup(req, res, next) {
        const client = await pgdb.connect();
        try {
            const days = 90;

            // const currentUser = req.user;
            // if (!['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(currentUser?.status)) {
            //     throw apiError.Forbidden('ACCESS_DENIED', 'Недостаточно прав для выполнения очистки');
            // }

            const deletedCount = await searchHistoryService.cleanupOldHistory(
                client,
                parseInt(days)
            );

            res.json({
                success: true,
                data: {
                    deleted_count: deletedCount,
                    message: `Удалено ${deletedCount} записей старше ${days} дней`
                }
            });
        } catch (error) {
            next(error);
        } finally {
            client.release();
        }
    }
}

module.exports = new searchController();