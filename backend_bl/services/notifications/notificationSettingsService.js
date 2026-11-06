// services/notifications/notificationSettingsService.js
const apiError = require('../../exceptions/apiError');
const cacheService = require('../systemServices/cacheService');
const notificationNotifier = require('./notificationNotifier');

class NotificationSettingsService {

    /**
 * Получить все группы уведомлений с их каналами
 */
    async getAllGroups(client) {
        const groupsRes = await client.query(`
            SELECT 
                g.*,
                COALESCE(json_agg(
                    json_build_object(
                        'channel_id', c.id,
                        'channel_code', c.code,
                        'channel_name', c.name,
                        'channel_active', c.is_active,
                        'is_enabled', gc.is_enabled,
                        'is_locked_for_user', gc.is_locked_for_user
                    )
                ) FILTER (WHERE c.id IS NOT NULL), '[]') as channels
            FROM notification_groups g
            LEFT JOIN notification_group_channels gc ON gc.group_id = g.id
            LEFT JOIN notification_channels c ON c.id = gc.channel_id
            GROUP BY g.id
            ORDER BY 
                CASE g.type WHEN 'user' THEN 0 ELSE 1 END,
                g.code
        `);
        return groupsRes.rows;
    }

    /**
     * Создать новую группу уведомлений
     */
    async createGroup(client, data, actorStatus, actorId = null) {
        const { code, name, description, type, priority, is_system, is_critical, icon, color } = data;

        // Защита: is_system может ставить только TOP_LEVEL_DEVELOPER
        if (is_system && actorStatus !== 'TOP_LEVEL_DEVELOPER') {
            throw apiError.Forbidden('Только TOP_LEVEL_DEVELOPER может создавать системные группы');
        }

        const res = await client.query(`
            INSERT INTO notification_groups 
            (code, name, description, type, priority, is_system, is_critical, icon, color)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [code, name, description, type, priority || 'normal', is_system || false, is_critical || false, icon || 'fa-bell', color || '#6366f1']);

        // Автоматически добавляем web-канал
        const webChannel = await client.query(`SELECT id FROM notification_channels WHERE code = 'web'`);
        if (webChannel.rows.length > 0) {
            await client.query(`
                INSERT INTO notification_group_channels (group_id, channel_id, is_enabled, is_locked_for_user)
                VALUES ($1, $2, TRUE, $3)
                ON CONFLICT (group_id, channel_id) DO NOTHING
            `, [res.rows[0].id, webChannel.rows[0].id, is_system || false]);
        }

        // Создаём шаблон по умолчанию для web
        await client.query(`
            INSERT INTO notification_templates (group_id, channel_code, title_template, body_template)
            VALUES ($1, 'web', $2, $3)
            ON CONFLICT (group_id, channel_code) DO NOTHING
        `, [res.rows[0].id, name, description || '']);

        // Инвалидируем кеш
        await cacheService.deletePattern('notif_groups', '*');
        await this.logAdminAction(client, null, 'GROUP_CREATED', res.rows[0].id, 'group', res.rows[0].name,
            {},
            { code: res.rows[0].code, name: res.rows[0].name, type: res.rows[0].type }
        );
        return res.rows[0];
    }

    /**
     * Обновить группу уведомлений
     */
    async updateGroup(client, groupId, data, actorStatus, actorId = null) {
        const groupRes = await client.query(`SELECT * FROM notification_groups WHERE id = $1`, [groupId]);
        if (groupRes.rows.length === 0) throw apiError.NotFound('Группа не найдена');

        const group = groupRes.rows[0];

        // Защита системных групп
        if (group.is_system && actorStatus !== 'TOP_LEVEL_DEVELOPER') {
            throw apiError.Forbidden('Только TOP_LEVEL_DEVELOPER может изменять системные группы');
        }

        // Защита от снятия is_system
        if (group.is_system && data.is_system === false) {
            throw apiError.Forbidden('Нельзя снять флаг is_system с системной группы');
        }

        const res = await client.query(`
            UPDATE notification_groups 
            SET name = COALESCE($2, name),
                description = COALESCE($3, description),
                priority = COALESCE($4, priority),
                is_critical = COALESCE($5, is_critical),
                icon = COALESCE($6, icon),
                color = COALESCE($7, color),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [groupId, data.name, data.description, data.priority, data.is_critical, data.icon, data.color]);

        await cacheService.deletePattern('notif_groups', '*');
        await this.logAdminAction(client, actorId, 'GROUP_UPDATED', groupId, 'group', group.name,
            { name: group.name, description: group.description, priority: group.priority, is_critical: group.is_critical },
            { name: data.name || group.name, description: data.description || group.description, priority: data.priority || group.priority, is_critical: data.is_critical !== undefined ? data.is_critical : group.is_critical }
        );
        return res.rows[0];
    }

    /**
     * Удалить группу уведомлений
     */
    async deleteGroup(client, groupId, actorStatus) {
        const groupRes = await client.query(`SELECT * FROM notification_groups WHERE id = $1`, [groupId]);
        if (groupRes.rows.length === 0) throw apiError.NotFound('Группа не найдена');

        if (groupRes.rows[0].is_system && actorStatus !== 'TOP_LEVEL_DEVELOPER') {
            throw apiError.Forbidden('Только TOP_LEVEL_DEVELOPER может удалять системные группы');
        }

        await client.query(`DELETE FROM notification_groups WHERE id = $1`, [groupId]);
        await cacheService.deletePattern('notif_groups', '*');
        return { success: true };
    }

    /**
     * Обновить настройки каналов для группы
     */
    async updateGroupChannels(client, groupId, channels, actorId = null) {
        const groupRes = await client.query(`SELECT * FROM notification_groups WHERE id = $1`, [groupId]);
        if (groupRes.rows.length === 0) throw apiError.NotFound('Группа не найдена');

        if (groupRes.rows[0].is_system && actorStatus !== 'TOP_LEVEL_DEVELOPER') {
            throw apiError.Forbidden('Только TOP_LEVEL_DEVELOPER может изменять каналы системных групп');
        }

        // channels: [{channel_id, is_enabled, is_locked_for_user}]
        for (const ch of channels) {
            await client.query(`
                INSERT INTO notification_group_channels (group_id, channel_id, is_enabled, is_locked_for_user)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (group_id, channel_id) 
                DO UPDATE SET is_enabled = $3, is_locked_for_user = $4
            `, [groupId, ch.channel_id, ch.is_enabled, ch.is_locked_for_user]);
        }
        const groupRes2 = await client.query(`SELECT name FROM notification_groups WHERE id = $1`, [groupId]);
        await this.logAdminAction(client, actorId, 'GROUP_CHANNEL_ADDED', groupId, 'group', groupRes2.rows[0]?.name,
            {},
            { channels: channels }
        );
        return { success: true };
    }

    /**
     * Получить шаблоны для группы
     */
    async getGroupTemplates(client, groupId) {
        const res = await client.query(`
            SELECT t.*, c.name as channel_name
            FROM notification_templates t
            JOIN notification_channels c ON c.code = t.channel_code
            WHERE t.group_id = $1
            ORDER BY c.code
        `, [groupId]);
        return res.rows;
    }

    /**
     * Обновить шаблон
     */
    async updateTemplate(client, groupId, channelCode, data) {
        const res = await client.query(`
            INSERT INTO notification_templates (group_id, channel_code, title_template, body_template)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (group_id, channel_code) 
            DO UPDATE SET title_template = $3, body_template = $4, updated_at = NOW()
            RETURNING *
        `, [groupId, channelCode, data.title_template, data.body_template]);
        const groupRes = await client.query(`SELECT name FROM notification_groups WHERE id = $1`, [groupId]);
        await this.logAdminAction(client, null, 'TEMPLATE_UPDATED', groupId, 'group', groupRes.rows[0]?.name,
            {},
            { channel_code: channelCode, title_template: data.title_template, body_template: data.body_template }
        );
        return res.rows[0];
    }

    /**
     * Получить дефолтные настройки для роли
     */
    async getRoleDefaults(client, roleCode) {
        const res = await client.query(`
            SELECT 
                drs.*,
                g.code as group_code,
                g.name as group_name,
                g.type as group_type,
                c.code as channel_code,
                c.name as channel_name
            FROM notification_default_role_settings drs
            JOIN notification_groups g ON g.id = drs.group_id
            JOIN notification_channels c ON c.id = drs.channel_id
            WHERE drs.role_code = $1
            ORDER BY g.type, g.code, c.code
        `, [roleCode]);
        return res.rows;
    }

    /**
     * Обновить дефолтные настройки для роли
     */
    async updateRoleDefaults(client, roleCode, settings) {
        // settings: [{group_id, channel_id, is_enabled, sound_enabled}]
        await client.query(`DELETE FROM notification_default_role_settings WHERE role_code = $1`, [roleCode]);

        if (settings && settings.length > 0) {
            const values = settings.map((s, i) =>
                `($1, ${s.group_id}, ${s.channel_id}, ${s.is_enabled}, ${s.sound_enabled})`
            ).join(',');
            await client.query(`
                INSERT INTO notification_default_role_settings 
                (role_code, group_id, channel_id, is_enabled, sound_enabled)
                VALUES ${values}
            `, [roleCode]);
        }

        await this.logAdminAction(client, null, 'DEFAULTS_UPDATED', null, 'role', roleCode,
            {},
            { settings_count: settings.length }
        );

        return { success: true };
    }

    /**
 * Массовая рассылка (broadcast)
 */
    async broadcast(client, data, actorId) {
        const { group_code, title, body, target_type, target_roles } = data;

        if (!group_code) {
            throw apiError.BadRequest('Не выбрана группа уведомлений');
        }
        if (!title || !body) {
            throw apiError.BadRequest('Заголовок и текст сообщения обязательны');
        }

        // 1. Определяем список получателей
        let userIds = [];
        if (target_type === 'all') {
            const usersRes = await client.query(`SELECT user_id FROM users`);
            userIds = usersRes.rows.map(r => r.user_id);
        } else if (target_type === 'staff') {
            const usersRes = await client.query(`
                SELECT u.user_id FROM users u
                JOIN user_statuses s ON u.status = s.status_id
                WHERE s.is_staff = TRUE
            `);
            userIds = usersRes.rows.map(r => r.user_id);
        } else if (target_type === 'roles' && Array.isArray(target_roles) && target_roles.length > 0) {
            const placeholders = target_roles.map((_, i) => `$${i + 1}`).join(',');
            const usersRes = await client.query(`
                SELECT u.user_id FROM users u
                JOIN user_statuses s ON u.status = s.status_id
                WHERE s.code_name IN (${placeholders})
            `, target_roles);
            userIds = usersRes.rows.map(r => r.user_id);
        }

        if (userIds.length === 0) {
            return { success: true, sent: 0 };
        }

        // Убираем дубликаты user_id (на случай, если пользователь имеет несколько ролей, хотя в твоей системе это маловероятно, но для безопасности)
        userIds = [...new Set(userIds)];

        // 2. Получаем данные выбранной группы из БД
        const groupRes = await client.query(
            `SELECT * FROM notification_groups WHERE code = $1`,
            [group_code]
        );

        if (groupRes.rows.length === 0) {
            throw apiError.NotFound('Выбранная группа уведомлений не найдена');
        }
        const group = groupRes.rows[0];

        let totalSent = 0;

        // 3. Создаем уведомления и отправляем сокеты
        for (const userId of userIds) {
            const res = await client.query(`
                INSERT INTO notifications 
                (user_id, group_id, group_code, type, title, body, payload, priority)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, created_at
            `, [
                userId, group.id, group.code, group.type,
                title, body,
                JSON.stringify({ is_broadcast: true, actor_id: actorId }),
                group.priority
            ]);

            // Отправляем через сокет
            notificationNotifier.notifyNew(userId, {
                id: res.rows[0].id,
                group_id: group.id,
                group_code: group.code,
                type: group.type,
                title,
                body,
                payload: { is_broadcast: true },
                priority: group.priority,
                icon: group.icon,
                color: group.color,
                created_at: res.rows[0].created_at
            });

            totalSent++;
        }
        await this.logAdminAction(client, actorId, 'BROADCAST_SENT', null, 'broadcast', `Broadcast: ${title.substring(0, 50)}`,
            {},
            { group_code, target_type, target_roles, sent_count: totalSent }
        );
        return { success: true, sent: totalSent };
    }

    // ============================================
    // ПОЛЬЗОВАТЕЛЬСКИЕ МЕТОДЫ
    // ============================================

    /**
     * Получить настройки пользователя (с учётом блокировок)
     */
    async getUserSettings(client, userId) {
        const cacheKey = `user:${userId}`;
        const cached = await cacheService.get('notif_settings', cacheKey);
        if (cached) return cached;

        // Получаем статус пользователя
        const userRes = await client.query(`
            SELECT s.code_name FROM users u
            JOIN user_statuses s ON u.status = s.status_id
            WHERE u.user_id = $1
        `, [userId]);
        if (userRes.rows.length === 0) throw apiError.NotFound('Пользователь не найден');
        const roleCode = userRes.rows[0].code_name;

        // Получаем все группы с каналами
        const groupsRes = await client.query(`
            SELECT 
                g.id, g.code, g.name, g.description, g.type, g.priority,
                g.is_system, g.is_critical, g.icon, g.color,
                COALESCE(json_agg(
                    json_build_object(
                        'channel_id', c.id,
                        'channel_code', c.code,
                        'channel_name', c.name,
                        'group_enabled', gc.is_enabled,
                        'locked_for_user', gc.is_locked_for_user,
                        'user_enabled', COALESCE(us.is_enabled, drs.is_enabled, TRUE),
                        'user_sound', COALESCE(us.sound_enabled, drs.sound_enabled, TRUE)
                    )
                ) FILTER (WHERE c.id IS NOT NULL), '[]') as channels
            FROM notification_groups g
            LEFT JOIN notification_group_channels gc ON gc.group_id = g.id
            LEFT JOIN notification_channels c ON c.id = gc.channel_id AND c.is_active = TRUE
            LEFT JOIN notification_user_settings us ON us.group_id = g.id AND us.channel_id = c.id AND us.user_id = $1
            LEFT JOIN notification_default_role_settings drs ON drs.group_id = g.id AND drs.channel_id = c.id AND drs.role_code = $2
            GROUP BY g.id
            ORDER BY 
                CASE g.type WHEN 'user' THEN 0 ELSE 1 END,
                g.code
        `, [userId, roleCode]);

        const result = groupsRes.rows.map(g => ({
            ...g,
            // Финальный расчёт: канал доступен только если group_enabled=true
            channels: g.channels.filter(ch => ch.group_enabled).map(ch => ({
                ...ch,
                // Если is_system - всегда включено
                final_enabled: g.is_system ? true : (ch.locked_for_user ? ch.group_enabled : ch.user_enabled),
                // Может ли юзер менять
                can_toggle: !g.is_system && !ch.locked_for_user
            }))
        }));

        await cacheService.set('notif_settings', cacheKey, result, 300); // 5 минут
        return result;
    }

    /**
 * Обновить настройки пользователя
 */
    async updateUserSettings(client, userId, settings) {
        for (const s of settings) {
            const checkRes = await client.query(`
                SELECT g.is_system, gc.is_locked_for_user
                FROM notification_groups g
                JOIN notification_group_channels gc ON gc.group_id = g.id AND gc.channel_id = $2
                WHERE g.id = $1
            `, [s.group_id, s.channel_id]);

            if (checkRes.rows.length === 0) continue;
            const { is_system, is_locked_for_user } = checkRes.rows[0];

            if (is_system || is_locked_for_user) continue;

            const oldRes = await client.query(`
                SELECT is_enabled, sound_enabled 
                FROM notification_user_settings 
                WHERE user_id = $1 AND group_id = $2 AND channel_id = $3
            `, [userId, s.group_id, s.channel_id]);

            const oldSettings = oldRes.rows.length > 0
                ? oldRes.rows[0]
                : { is_enabled: true, sound_enabled: true };

            const newSettings = {
                is_enabled: s.is_enabled,
                sound_enabled: s.sound_enabled
            };

            // Проверяем, действительно ли изменилось
            const hasChanged =
                oldSettings.is_enabled !== newSettings.is_enabled ||
                oldSettings.sound_enabled !== newSettings.sound_enabled;

            await client.query(`
                INSERT INTO notification_user_settings 
                (user_id, group_id, channel_id, is_enabled, sound_enabled)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (user_id, group_id, channel_id)
                DO UPDATE SET is_enabled = $4, sound_enabled = $5, updated_at = NOW()
            `, [userId, s.group_id, s.channel_id, s.is_enabled, s.sound_enabled]);

            if (hasChanged) {
                await this.logUserSettingsChange(client, userId, s.group_id, s.channel_id, oldSettings, newSettings);
            }
        }

        await cacheService.delete('notif_settings', `user:${userId}`);
        notificationNotifier.notifySettingsChanged(userId, 'Ваши настройки уведомлений обновлены');

        return { success: true };
    }

    /**
     * Применить дефолтные настройки при смене роли
     * Вызывается из userStatusService.changeUserStatus
     */
    async applyRoleDefaults(client, userId, newRoleCode) {
        // Удаляем старые персональные настройки
        await client.query(`DELETE FROM notification_user_settings WHERE user_id = $1`, [userId]);

        // Копируем дефолты роли в персональные настройки
        await client.query(`
            INSERT INTO notification_user_settings (user_id, group_id, channel_id, is_enabled, sound_enabled)
            SELECT $1, group_id, channel_id, is_enabled, sound_enabled
            FROM notification_default_role_settings
            WHERE role_code = $2
        `, [userId, newRoleCode]);

        await cacheService.delete('notif_settings', `user:${userId}`);
    }

    /**
     * Получить все каналы со статистикой
     */
    async getAllChannels(client) {
        const res = await client.query(`
            SELECT 
                c.id, c.code, c.name, c.description, c.is_active, c.created_at,
                COALESCE(SUM(ncs.notifications_sent), 0) as total_sent,
                MAX(ncs.last_sent_at) as last_sent_at,
                COUNT(DISTINCT ngc.group_id) FILTER (WHERE ngc.is_enabled = TRUE) as groups_using
            FROM notification_channels c
            LEFT JOIN notification_group_channels ngc ON ngc.channel_id = c.id
            LEFT JOIN notification_channel_stats ncs ON ncs.channel_id = c.id
            GROUP BY c.id
            ORDER BY c.id
        `);
        return res.rows;
    }

    /**
 * Обновить активность канала (с авто-добавлением в группы)
 */
    async updateChannelActive(client, channelId, isActive, actorId) {
        const oldRes = await client.query(
            `SELECT * FROM notification_channels WHERE id = $1`,
            [channelId]
        );
        if (oldRes.rows.length === 0) throw apiError.NotFound('Канал не найден');
        const oldChannel = oldRes.rows[0];

        // 1. Обновляем сам канал
        const res = await client.query(`
            UPDATE notification_channels 
            SET is_active = $2
            WHERE id = $1
            RETURNING *
        `, [channelId, isActive]);

        // 2. ЕСЛИ канал ВКЛЮЧАЕТСЯ, добавляем его во все группы, где его ещё нет
        if (isActive && !oldChannel.is_active) {
            await client.query(`
                INSERT INTO notification_group_channels (group_id, channel_id, is_enabled, is_locked_for_user)
                SELECT g.id, $1, TRUE, FALSE
                FROM notification_groups g
                ON CONFLICT (group_id, channel_id) DO NOTHING
            `, [channelId]);
        }

        await this.logAdminAction(client, actorId, 'CHANNEL_TOGGLED', channelId, 'channel', oldChannel.name,
            { is_active: oldChannel.is_active },
            { is_active: isActive }
        );

        return res.rows[0];
    }

    /**
     * Инкремент статистики канала (вызывается при отправке уведомления)
     */
    async incrementChannelStats(client, channelId, groupId) {
        await client.query(`
            SELECT increment_notification_channel_stat($1, $2)
        `, [channelId, groupId]);
    }

    /**
     * Записать действие в историю админки
     */
    async logAdminAction(client, actorId, actionType, targetId, targetType, targetName, oldValue, newValue) {
        await client.query(`
            INSERT INTO notification_admin_history 
            (actor_user_id, action_type, target_id, target_type, target_name, old_value, new_value)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            actorId, actionType, targetId, targetType, targetName,
            JSON.stringify(oldValue || {}),
            JSON.stringify(newValue || {})
        ]);
    }

    /**
     * Получить историю действий админки с пагинацией
     */
    async getAdminHistory(client, { page = 1, limit = 20, actionType = null, actorId = null }) {
        let where = '1=1';
        const params = [];
        let paramCount = 0;

        if (actionType) {
            paramCount++;
            where += ` AND h.action_type = $${paramCount}`;
            params.push(actionType);
        }
        if (actorId) {
            paramCount++;
            where += ` AND h.actor_user_id = $${paramCount}`;
            params.push(parseInt(actorId));
        }

        const countRes = await client.query(
            `SELECT COUNT(*) FROM notification_admin_history h WHERE ${where}`,
            params
        );
        const total = parseInt(countRes.rows[0].count, 10);

        paramCount++;
        const limitParam = paramCount;
        paramCount++;
        const offsetParam = paramCount;
        params.push(limit, (page - 1) * limit);

        const dataRes = await client.query(`
            SELECT 
                h.*,
                u.login as actor_login,
                u.status as actor_status
            FROM notification_admin_history h
            LEFT JOIN users u ON u.user_id = h.actor_user_id
            WHERE ${where}
            ORDER BY h.created_at DESC
            LIMIT $${limitParam} OFFSET $${offsetParam}
        `, params);

        return {
            data: dataRes.rows,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        };
    }

    /**
     * Очистка старой истории админки
     */
    async cleanupOldAdminHistory(client, days = 100) {
        const res = await client.query(`
            DELETE FROM notification_admin_history
            WHERE created_at < NOW() - INTERVAL '${days} days'
        `);
        return res.rowCount;
    }

    /**
     * Записать изменение настроек пользователя
     */
    async logUserSettingsChange(client, userId, groupId, channelId, oldSettings, newSettings) {
        const groupRes = await client.query(
            `SELECT code FROM notification_groups WHERE id = $1`, [groupId]
        );
        const channelRes = await client.query(
            `SELECT code FROM notification_channels WHERE id = $1`, [channelId]
        );

        await client.query(`
            INSERT INTO notification_user_settings_history
            (user_id, group_id, channel_id, group_code, channel_code,
             old_is_enabled, new_is_enabled, old_sound_enabled, new_sound_enabled)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            userId, groupId, channelId,
            groupRes.rows[0]?.code || null,
            channelRes.rows[0]?.code || null,
            oldSettings.is_enabled, newSettings.is_enabled,
            oldSettings.sound_enabled, newSettings.sound_enabled
        ]);
    }

    /**
     * Получить историю настроек пользователя
     */
    async getUserSettingsHistory(client, userId, { page = 1, limit = 20 }) {
        const offset = (page - 1) * limit;

        const countRes = await client.query(
            `SELECT COUNT(*) FROM notification_user_settings_history WHERE user_id = $1`,
            [userId]
        );
        const total = parseInt(countRes.rows[0].count, 10);

        const dataRes = await client.query(`
            SELECT 
                h.*,
                g.name as group_name, g.icon as group_icon, g.color as group_color,
                c.name as channel_name
            FROM notification_user_settings_history h
            LEFT JOIN notification_groups g ON g.id = h.group_id
            LEFT JOIN notification_channels c ON c.id = h.channel_id
            WHERE h.user_id = $1
            ORDER BY h.changed_at DESC
            LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);

        return {
            data: dataRes.rows,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        };
    }

    /**
     * Очистка старой истории пользовательских настроек
     */
    async cleanupOldUserSettingsHistory(client, days = 100) {
        const res = await client.query(`
            DELETE FROM notification_user_settings_history
            WHERE changed_at < NOW() - INTERVAL '${days} days'
        `);
        return res.rowCount;
    }
}

module.exports = new NotificationSettingsService();