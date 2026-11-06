// controllers/notificationController.js
const pgdb = require('../pgdb');
const notificationService = require('../services/notifications/notificationService');
const notificationSettingsService = require('../services/notifications/notificationSettingsService');
const tokenService = require('../services/systemServices/tokenService');
const apiError = require('../exceptions/apiError');

class NotificationController {

    async getGroups(req, res, next) {
        const client = await pgdb.connect();
        try {
            const groups = await notificationSettingsService.getAllGroups(client);
            res.json(groups);
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async createGroup(req, res, next) {
        const client = await pgdb.connect();
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const actorStatus = decoded.data.status;
            const actorId = decoded.data.id;

            const group = await notificationSettingsService.createGroup(client, req.body, actorStatus, actorId);
            res.json(group);
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async updateGroup(req, res, next) {
        const client = await pgdb.connect();
        try {
            const { id } = req.params;
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const actorStatus = decoded.data.status;
            const actorId = decoded.data.id;

            const group = await notificationSettingsService.updateGroup(client, parseInt(id), req.body, actorStatus, actorId);
            res.json(group);
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async deleteGroup(req, res, next) {
        const client = await pgdb.connect();
        try {
            const { id } = req.params;
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const actorStatus = decoded.data.status;
            const actorId = decoded.data.id;

            const result = await notificationSettingsService.deleteGroup(client, parseInt(id), actorStatus, actorId);
            res.json(result);
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async updateGroupChannels(req, res, next) {
        const client = await pgdb.connect();
        try {
            const { id } = req.params;
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const actorId = decoded.data.id;

            const result = await notificationSettingsService.updateGroupChannels(client, parseInt(id), req.body.channels, actorId);
            res.json(result);
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async getGroupTemplates(req, res, next) {
        const client = await pgdb.connect();
        try {
            const { id } = req.params;
            const templates = await notificationSettingsService.getGroupTemplates(client, parseInt(id));
            res.json(templates);
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async updateTemplate(req, res, next) {
        const client = await pgdb.connect();
        try {
            const { group_id, channel_code, title_template, body_template } = req.body;

            if (!group_id) {
                throw apiError.BadRequest('Не указан group_id');
            }

            const template = await notificationSettingsService.updateTemplate(
                client,
                parseInt(group_id),
                channel_code,
                { title_template, body_template }
            );
            res.json(template);
        } catch (e) {
            next(e);
        } finally {
            client.release();
        }
    }

    async getRoleDefaults(req, res, next) {
        const client = await pgdb.connect();
        try {
            const { roleCode } = req.params;
            const defaults = await notificationSettingsService.getRoleDefaults(client, roleCode);
            res.json(defaults);
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async updateRoleDefaults(req, res, next) {
        const client = await pgdb.connect();
        try {
            const { roleCode } = req.params;
            const result = await notificationSettingsService.updateRoleDefaults(client, roleCode, req.body.settings);
            res.json(result);
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async broadcast(req, res, next) {
        const client = await pgdb.connect();
        try {
            const token = req.headers.authorization.split(' ')[1];
            const actorId = tokenService.validateToken(token).data.id;
            const result = await notificationSettingsService.broadcast(client, req.body, actorId);
            res.json(result);
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async getMySettings(req, res, next) {
        const client = await pgdb.connect();
        try {
            const token = req.headers.authorization.split(' ')[1];
            const userId = tokenService.validateToken(token).data.id;
            const settings = await notificationSettingsService.getUserSettings(client, userId);
            res.json(settings);
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async updateMySettings(req, res, next) {
        const client = await pgdb.connect();
        try {
            const token = req.headers.authorization.split(' ')[1];
            const userId = tokenService.validateToken(token).data.id;
            const result = await notificationSettingsService.updateUserSettings(client, userId, req.body.settings);
            res.json(result);
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async getMyNotifications(req, res, next) {
        const client = await pgdb.connect();
        try {
            const token = req.headers.authorization.split(' ')[1];
            const userId = tokenService.validateToken(token).data.id;
            const { type, is_read, limit = 20, offset = 0 } = req.query;
            const result = await notificationService.getNotifications(client, userId, {
                type,
                is_read: is_read !== undefined ? is_read === 'true' : undefined,
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
            res.json(result);
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async getUnreadCounts(req, res, next) {
        const client = await pgdb.connect();
        try {
            const token = req.headers.authorization.split(' ')[1];
            const userId = tokenService.validateToken(token).data.id;
            const counts = await notificationService.getUnreadCounts(client, userId);
            res.json(counts);
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async markAsRead(req, res, next) {
        const client = await pgdb.connect();
        try {
            const token = req.headers.authorization.split(' ')[1];
            const userId = tokenService.validateToken(token).data.id;
            const { id } = req.params;
            const result = await notificationService.markAsRead(client, userId, parseInt(id));
            res.json(result || { success: false });
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async markAllAsRead(req, res, next) {
        const client = await pgdb.connect();
        try {
            const token = req.headers.authorization.split(' ')[1];
            const userId = tokenService.validateToken(token).data.id;
            const { type } = req.query;
            const result = await notificationService.markAllAsRead(client, userId, type);
            res.json(result);
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async cleanupOldNotifications(req, res, next) {
        const client = await pgdb.connect();
        try {
            const count = await notificationService.cleanupOldNotifications(client, 10);
            res.json({ deleted_count: count });
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async getChannels(req, res, next) {
        const client = await pgdb.connect();
        try {
            const channels = await notificationSettingsService.getAllChannels(client);
            res.json(channels);
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async updateChannel(req, res, next) {
        const client = await pgdb.connect();
        try {
            const { id } = req.params;
            const { is_active } = req.body;
            const token = req.headers.authorization.split(' ')[1];
            const actorId = tokenService.validateToken(token).data.id;
            const channel = await notificationSettingsService.updateChannelActive(client, parseInt(id), is_active, actorId);
            res.json(channel);
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async getAdminHistory(req, res, next) {
        const client = await pgdb.connect();
        try {
            const { page = 1, limit = 20, actionType, actorId } = req.query;
            const history = await notificationSettingsService.getAdminHistory(client, {
                page: parseInt(page),
                limit: parseInt(limit),
                actionType,
                actorId
            });
            res.json(history);
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async cleanupOldAdminHistory(req, res, next) {
        const client = await pgdb.connect();
        try {
            const count = await notificationSettingsService.cleanupOldAdminHistory(client, 100);
            res.json({ deleted_count: count });
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async getUserSettingsHistory(req, res, next) {
        const client = await pgdb.connect();
        try {
            const { userId } = req.params;
            const { page = 1, limit = 20 } = req.query;

            const token = req.headers.authorization.split(' ')[1];
            const currentUserId = tokenService.validateToken(token).data.id;
            const currentStatus = tokenService.validateToken(token).data.status;

            const isAdmin = ['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'ADMINISTRATOR', 'TOP_LEVEL_ADMINISTRATOR'].includes(currentStatus);
            if (parseInt(userId) !== currentUserId && !isAdmin) {
                throw apiError.Forbidden('Нет доступа к истории другого пользователя');
            }

            const history = await notificationSettingsService.getUserSettingsHistory(client, parseInt(userId), {
                page: parseInt(page),
                limit: parseInt(limit)
            });
            res.json(history);
        } catch (e) { next(e); }
        finally { client.release(); }
    }

    async cleanupOldUserSettingsHistory(req, res, next) {
        const client = await pgdb.connect();
        try {
            const count = await notificationSettingsService.cleanupOldUserSettingsHistory(client, 100);
            res.json({ deleted_count: count });
        } catch (e) { next(e); }
        finally { client.release(); }
    }
}

function autoBind(obj) {
    const proto = Object.getPrototypeOf(obj);
    for (const key of Object.getOwnPropertyNames(proto)) {
        const val = obj[key];
        if (key !== 'constructor' && typeof val === 'function') {
            obj[key] = val.bind(obj);
        }
    }
    return obj;
}

module.exports = autoBind(new NotificationController());