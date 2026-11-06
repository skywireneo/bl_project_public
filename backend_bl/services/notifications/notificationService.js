const notificationNotifier = require('./notificationNotifier');
const cacheService = require('../systemServices/cacheService');
const notificationSettingsService = require('./notificationSettingsService');

class NotificationService {
    _renderTemplate(template, payload) {
        if (!template) return '';
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            return payload && payload[key] !== undefined ? String(payload[key]) : match;
        });
    }

    async _isChannelEnabled(client, userId, groupId, channelId) {
        const groupRes = await client.query(
            `SELECT is_system, type FROM notification_groups WHERE id = $1`,
            [groupId]
        );
        if (groupRes.rows.length === 0) return false;
        const group = groupRes.rows[0];

        if (group.is_system) return true;

        const gcRes = await client.query(
            `SELECT is_enabled, is_locked_for_user FROM notification_group_channels WHERE group_id = $1 AND channel_id = $2`,
            [groupId, channelId]
        );
        if (gcRes.rows.length === 0) return false;
        const gc = gcRes.rows[0];
        if (!gc.is_enabled) return false;

        if (gc.is_locked_for_user) return true;

        const usRes = await client.query(
            `SELECT is_enabled FROM notification_user_settings WHERE user_id = $1 AND group_id = $2 AND channel_id = $3`,
            [userId, groupId, channelId]
        );
        if (usRes.rows.length > 0) return usRes.rows[0].is_enabled;

        const roleRes = await client.query(
            `SELECT s.code_name FROM users u JOIN user_statuses s ON u.status = s.status_id WHERE u.user_id = $1`,
            [userId]
        );
        if (roleRes.rows.length === 0) return false;
        const roleCode = roleRes.rows[0].code_name;

        const drsRes = await client.query(
            `SELECT is_enabled FROM notification_default_role_settings WHERE role_code = $1 AND group_id = $2 AND channel_id = $3`,
            [roleCode, groupId, channelId]
        );
        if (drsRes.rows.length > 0) return drsRes.rows[0].is_enabled;

        return true;
    }

    async _getSoundEnabled(client, userId, groupId, channelId) {
        const usRes = await client.query(
            `SELECT sound_enabled FROM notification_user_settings WHERE user_id = $1 AND group_id = $2 AND channel_id = $3`,
            [userId, groupId, channelId]
        );
        if (usRes.rows.length > 0) return usRes.rows[0].sound_enabled;

        const roleRes = await client.query(
            `SELECT s.code_name FROM users u JOIN user_statuses s ON u.status = s.status_id WHERE u.user_id = $1`,
            [userId]
        );
        if (roleRes.rows.length === 0) return true;

        const drsRes = await client.query(
            `SELECT sound_enabled FROM notification_default_role_settings WHERE role_code = $1 AND group_id = $2 AND channel_id = $3`,
            [roleRes.rows[0].code_name, groupId, channelId]
        );
        return drsRes.rows.length > 0 ? drsRes.rows[0].sound_enabled : true;
    }

    async emit(client, params) {
        const { groupCode, targetUserIds, payload = {}, titleOverride, bodyOverride } = params;

        const groupRes = await client.query(
            `SELECT * FROM notification_groups WHERE code = $1`,
            [groupCode]
        );
        if (groupRes.rows.length === 0) {
            console.warn(`[NotificationService] Группа ${groupCode} не найдена`);
            return { success: false, reason: 'Group not found' };
        }
        const group = groupRes.rows[0];

        const templatesRes = await client.query(`
            SELECT t.channel_code, t.title_template, t.body_template, 
                   c.id as channel_id, c.code, c.is_active
            FROM notification_templates t
            JOIN notification_channels c ON c.code = t.channel_code
            WHERE t.group_id = $1 AND c.is_active = TRUE
        `, [group.id]);
        const templates = templatesRes.rows;

        const userIds = Array.isArray(targetUserIds) ? targetUserIds : [targetUserIds];
        if (userIds.length === 0) return { success: false, reason: 'No recipients' };

        const results = [];

        for (const userId of userIds) {
            for (const template of templates) {
                if (!template.is_active) continue;

                const enabled = await this._isChannelEnabled(client, userId, group.id, template.channel_id);
                if (!enabled) continue;

                const title = titleOverride || this._renderTemplate(template.title_template, payload);
                const body = bodyOverride || this._renderTemplate(template.body_template, payload);

                if (template.channel_code === 'web') {
                    const notifRes = await client.query(`
                        INSERT INTO notifications 
                        (user_id, group_id, group_code, type, title, body, payload, priority, channel_code)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        RETURNING id, created_at
                    `, [
                        userId, group.id, group.code, group.type,
                        title, body, JSON.stringify(payload), group.priority,
                        template.channel_code
                    ]);

                    const notification = {
                        id: notifRes.rows[0].id,
                        group_id: group.id,
                        group_code: group.code,
                        type: group.type,
                        title,
                        body,
                        payload,
                        priority: group.priority,
                        icon: group.icon,
                        color: group.color,
                        created_at: notifRes.rows[0].created_at
                    };

                    notificationNotifier.notifyNew(userId, notification);
                    results.push({ userId, channel: 'web', notificationId: notification.id });
                }
                else if (template.channel_code === 'email') {
                    console.log(`[NotificationService] Email notification for user ${userId}: ${title}`);
                    results.push({ userId, channel: 'email', status: 'queued' });
                }
                else if (template.channel_code === 'telegram') {
                    console.log(`[NotificationService] Telegram notification for user ${userId}: ${title}`);
                    results.push({ userId, channel: 'telegram', status: 'queued' });
                }

                try {
                    await notificationSettingsService.incrementChannelStats(client, template.channel_id, group.id);
                } catch (e) {
                    console.error('[NotificationService] Ошибка инкремента статистики:', e.message);
                }
            }
        }

        return { success: true, sent: results.length, results };
    }

    async getNotifications(client, userId, { type, is_read, limit = 20, offset = 0 }) {
        let where = `WHERE n.user_id = $1 AND n.deleted_at IS NULL`;
        const params = [userId];
        let paramCount = 1;

        if (type) {
            paramCount++;
            where += ` AND n.type = $${paramCount}`;
            params.push(type);
        }
        if (is_read !== undefined && is_read !== null) {
            paramCount++;
            where += ` AND n.is_read = $${paramCount}`;
            params.push(is_read);
        }

        const countRes = await client.query(
            `SELECT COUNT(*) FROM notifications n ${where}`,
            params
        );
        const total = parseInt(countRes.rows[0].count, 10);

        paramCount++;
        const limitParam = paramCount;
        paramCount++;
        const offsetParam = paramCount;
        params.push(limit, offset);

        const dataRes = await client.query(`
            SELECT 
                n.id, n.group_id, n.group_code, n.type, n.title, n.body,
                n.payload, n.priority, n.is_read, n.read_at, n.created_at,
                g.icon, g.color
            FROM notifications n
            LEFT JOIN notification_groups g ON g.id = n.group_id
            ${where}
            ORDER BY n.created_at DESC
            LIMIT $${limitParam} OFFSET $${offsetParam}
        `, params);

        return {
            data: dataRes.rows,
            meta: { total, limit, offset }
        };
    }

    async getUnreadCounts(client, userId) {
        const res = await client.query(`
            SELECT type, COUNT(*) as count
            FROM notifications
            WHERE user_id = $1 AND is_read = FALSE AND deleted_at IS NULL
            GROUP BY type
        `, [userId]);

        const counts = { user: 0, staff: 0, total: 0 };
        for (const row of res.rows) {
            counts[row.type] = parseInt(row.count, 10);
            counts.total += parseInt(row.count, 10);
        }
        return counts;
    }

    async markAsRead(client, userId, notificationId) {
        const res = await client.query(`
            UPDATE notifications 
            SET is_read = TRUE, read_at = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING id, read_at
        `, [notificationId, userId]);

        if (res.rows.length > 0) {
            notificationNotifier.notifyRead(userId, notificationId, res.rows[0].read_at);
        }
        return res.rows[0] || null;
    }

    async markAllAsRead(client, userId, type) {
        let where = `WHERE user_id = $1 AND is_read = FALSE AND deleted_at IS NULL`;
        const params = [userId];
        if (type) {
            where += ` AND type = $2`;
            params.push(type);
        }

        const res = await client.query(`
            UPDATE notifications 
            SET is_read = TRUE, read_at = NOW()
            ${where}
            RETURNING id, read_at
        `, params);

        notificationNotifier.notifyReadAll(userId, type, new Date().toISOString());
        return { updated: res.rowCount };
    }

    async cleanupOldNotifications(client, days = 10) {
        const res = await client.query(`
            DELETE FROM notifications
            WHERE is_read = TRUE 
            AND read_at < NOW() - INTERVAL '${days} days'
        `);
        return res.rowCount;
    }
}

module.exports = new NotificationService();