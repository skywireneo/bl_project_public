const apiError = require('../exceptions/apiError');
const pgdb = require('../pgdb');
const criticalActionsService = require('../services/criticalActionsService');
const maintenanceService = require('../services/systemServices/maintenanceService');

class criticalActionsController {

    async executeCriticalAction(req, res, next) {
        const client = await pgdb.connect();
        try {
            await client.query('BEGIN');
            const { id_name, value } = req.body;
            const token = req.headers.authorization.split(' ')[1];
            const result = await criticalActionsService.executeCriticalAction(client, id_name, value, token);
            await client.query('COMMIT');
            res.json(result);
        } catch (error) {
            await client.query('ROLLBACK');
            next(error);
        } finally {
            client.release();
        }
    }

    async getCriticalActions(req, res, next) {
        const client = await pgdb.connect();
        try {
            await client.query('BEGIN');
            const token = req.headers.authorization.split(' ')[1];
            const result = await criticalActionsService.getCriticalActions(client, token);
            await client.query('COMMIT');
            res.json(result);
        } catch (error) {
            await client.query('ROLLBACK');
            next(error);
        } finally {
            client.release();
        }
    }

    async getCriticalActionsLogs(req, res, next) {
        const client = await pgdb.connect();
        try {
            await client.query('BEGIN');
            const { page = 1, limit = 10, userId } = req.query;
            const token = req.headers.authorization.split(' ')[1];
            const logs = await criticalActionsService.getLogs(
                client,
                parseInt(page),
                parseInt(limit),
                userId !== undefined && userId !== '' ? parseInt(userId) : null,
                token
            );
            await client.query('COMMIT');
            res.json(logs);
        } catch (error) {
            await client.query('ROLLBACK');
            next(error);
        } finally {
            client.release();
        }
    }

    async toggleCriticalActionLock(req, res, next) {
        const client = await pgdb.connect();
        try {
            await client.query('BEGIN');
            const { id_name, is_locked } = req.body;
            const token = req.headers.authorization.split(' ')[1];
            const result = await criticalActionsService.toggleCriticalActionLock(client, id_name, is_locked, token);
            await client.query('COMMIT');
            res.json(result);
        } catch (error) {
            await client.query('ROLLBACK');
            next(error);
        } finally {
            client.release();
        }
    }

    async deleteCritActlogs(req, res, next) {
        const client = await pgdb.connect();
        try {
            await client.query('BEGIN');
            const token = req.headers.authorization.split(' ')[1];
            const result = await criticalActionsService.deleteOldLogs(client, token);
            await client.query('COMMIT');
            res.json(result);
        } catch (error) {
            await client.query('ROLLBACK');
            next(error);
        } finally {
            client.release();
        }
    }

    async getWhitelist(req, res, next) {
        const client = await pgdb.connect();
        try {
            await client.query('BEGIN');
            const { list_type } = req.query;
            const token = req.headers.authorization.split(' ')[1];
            const result = await criticalActionsService.getWhitelistItems(client, list_type, token);
            await client.query('COMMIT');
            res.json(result);
        } catch (error) {
            await client.query('ROLLBACK');
            next(error);
        } finally {
            client.release();
        }
    }

    async updateWhitelist(req, res, next) {
        const client = await pgdb.connect();
        try {
            await client.query('BEGIN');
            const { list_type, items } = req.body;
            const token = req.headers.authorization.split(' ')[1];
            const result = await criticalActionsService.updateWhitelistItems(client, list_type, items, token);
            await client.query('COMMIT');
            res.json(result);
        } catch (error) {
            await client.query('ROLLBACK');
            next(error);
        } finally {
            client.release();
        }
    }

    async getMaintenanceStatus(req, res, next) {
        const client = await pgdb.connect();
        try {
            await client.query('BEGIN');
            const result = await maintenanceService.getScheduledMaintenance(client);
            await client.query('COMMIT');
            res.json({ success: true, data: result });
        } catch (error) {
            await client.query('ROLLBACK');
            next(error);
        } finally {
            client.release();
        }
    }

    async scheduleMaintenance(req, res, next) {
        const client = await pgdb.connect();
        try {
            await client.query('BEGIN');
            const { scheduledAt, expectedOpenAt, message } = req.body;
            const token = req.headers.authorization.split(' ')[1];

            // Получаем ID пользователя из токена для логирования
            const tokenService = require('../services/systemServices/tokenService');
            const decoded = tokenService.validateToken(token);

            if (!scheduledAt || !message) {
                throw apiError.BadRequest('Время и сообщение обязательны');
            }

            const result = await maintenanceService.scheduleMaintenance(
                client,
                scheduledAt,
                expectedOpenAt || null,
                message,
                decoded.data.id
            );

            await client.query('COMMIT');
            res.json({ success: true, data: result });
        } catch (error) {
            await client.query('ROLLBACK');
            next(error);
        } finally {
            client.release();
        }
    }

    async cancelMaintenance(req, res, next) {
        const client = await pgdb.connect();
        try {
            await client.query('BEGIN');
            const success = await maintenanceService.cancelMaintenance(client);
            await client.query('COMMIT');
            res.json({ success, message: success ? 'Техработы отменены' : 'Нет активных задач для отмены' });
        } catch (error) {
            await client.query('ROLLBACK');
            next(error);
        } finally {
            client.release();
        }
    }

    async getMaintenanceHistory(req, res, next) {
        const client = await pgdb.connect();
        try {
            await client.query('BEGIN');
            const { page = 1, limit = 20 } = req.query;
            const result = await maintenanceService.getMaintenanceHistory(
                client,
                parseInt(page),
                parseInt(limit)
            );
            await client.query('COMMIT');
            res.json(result);
        } catch (error) {
            await client.query('ROLLBACK');
            next(error);
        } finally {
            client.release();
        }
    }

    async cleanupMaintenanceHistory(req, res, next) {
        const client = await pgdb.connect();
        try {
            await client.query('BEGIN');
            const result = await maintenanceService.cleanupOldMaintenanceTasks(client);
            await client.query('COMMIT');
            res.json(result);
        } catch (error) {
            await client.query('ROLLBACK');
            next(error);
        } finally {
            client.release();
        }
    }

    async getCacheStats(req, res, next) {
        try {
            const stats = await criticalActionsService.getCacheStats();
            res.json({ success: true, data: stats });
        } catch (error) {
            next(error);
        }
    }

    async clearCache(req, res, next) {
        const client = await pgdb.connect();
        try {
            await client.query('BEGIN');
            const { type, triggerReload } = req.body;

            const result = await criticalActionsService.clearCache(type, triggerReload);

            await client.query('COMMIT');
            res.json(result);
        } catch (error) {
            await client.query('ROLLBACK');
            next(error);
        } finally {
            client.release();
        }
    }
}

module.exports = new criticalActionsController();