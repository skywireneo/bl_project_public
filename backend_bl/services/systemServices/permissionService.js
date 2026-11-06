const cacheService = require('./cacheService');
const mainSettindsService = require('../systemSettings/mainSettindsService');
const apiError = require('../../exceptions/apiError');
const sessionNotifier = require('./socket/notifiers/sessionNotifier');

class PermissionService {
    /**
     * Главная функция: Считает эффективные права с учетом кеша Redis
     */
    async getEffectivePermissions(client, userId) {
        const cacheKey = `user:${userId}`;

        // 1. Проверяем Redis
        const cached = await cacheService.get('effective_perms', cacheKey);
        if (cached && Array.isArray(cached)) return cached;

        // 2. Cache Miss: Считаем из БД
        // Получаем статус пользователя
        const userRes = await client.query('SELECT u.login, s.code_name FROM users u JOIN user_statuses s ON u.status = s.status_id WHERE u.user_id = $1', [userId]);
        if (userRes.rows.length === 0) throw apiError.NotFound('Пользователь не найден');

        const { login, code_name: statusCode } = userRes.rows[0];

        // Получаем права роли (потолок и дефолты)
        const rolePermsRes = await client.query('SELECT permission_code, is_default FROM role_permissions WHERE status_code = $1', [statusCode]);
        const rolePerms = rolePermsRes.rows.reduce((acc, row) => {
            acc[row.permission_code] = row.is_default;
            return acc;
        }, {});

        // Получаем ручные исключения
        const overridesRes = await client.query('SELECT permission_code, is_granted FROM user_permission_overrides WHERE user_id = $1', [userId]);
        const overrides = overridesRes.rows.reduce((acc, row) => {
            acc[row.permission_code] = row.is_granted;
            return acc;
        }, {});

        // 3. Формула: (Дефолты + Ручные true) - Ручные false
        const effective = [];
        for (const [perm, isDefault] of Object.entries(rolePerms)) {
            if (overrides.hasOwnProperty(perm)) {
                if (overrides[perm]) effective.push(perm); // Ручное разрешение
            } else {
                if (isDefault) effective.push(perm); // Дефолтное разрешение
            }
        }

        // 4. Сохраняем в Redis (TTL 1 час)
        await cacheService.set('effective_perms', cacheKey, effective, 3600);

        return effective;
    }

    /**
     * 🛡 Защита "Неприкасаемых"
     */
    async _checkProtectedUser(client, targetUserId) {
        const mainAdmin = await mainSettindsService.selectSetting(client, 'main_admin');
        const mainDev = await mainSettindsService.selectSetting(client, 'main_dev');

        const targetRes = await client.query('SELECT login FROM users WHERE user_id = $1', [targetUserId]);
        if (targetRes.rows.length === 0) throw apiError.NotFound('Пользователь не найден');

        const targetLogin = targetRes.rows[0].login.toLowerCase();
        if ([mainAdmin, mainDev].includes(targetLogin)) {
            throw apiError.Forbidden('PERMISSION_DENIED_PROTECTED', 'Невозможно изменить права главного администратора/разработчика');
        }
    }

    /**
     * Обновление прав роли (Потолок + Дефолты)
     */
    async updateRolePermissions(client, statusCode, permissionsArray) {
        // permissionsArray: [{ code: 'incident:delete', is_default: true }, ...]
        await client.query('DELETE FROM role_permissions WHERE status_code = $1', [statusCode]);

        if (permissionsArray.length > 0) {
            const values = permissionsArray.map(p => `('${statusCode}', '${p.code}', ${p.is_default})`).join(',');
            await client.query(`INSERT INTO role_permissions (status_code, permission_code, is_default) VALUES ${values}`);
        }

        await cacheService.deletePattern('effective_perms', 'user:*');
    }

    /**
     * Обновление индивидуальных прав пользователя
     */
    async updateUserOverrides(client, targetUserId, overridesArray, actorId) {
        await this._checkProtectedUser(client, targetUserId);

        const userRes = await client.query(
            'SELECT s.code_name FROM users u JOIN user_statuses s ON u.status = s.status_id WHERE u.user_id = $1',
            [targetUserId]
        );
        const statusCode = userRes.rows[0].code_name;

        const ceilingRes = await client.query(
            'SELECT permission_code FROM role_permissions WHERE status_code = $1',
            [statusCode]
        );
        const ceiling = ceilingRes.rows.map(r => r.permission_code);

        for (const override of overridesArray) {
            if (!ceiling.includes(override.code)) {
                throw apiError.BadRequest('PERMISSION_OUT_OF_CEILING', `Право "${override.code}" недоступно для статуса ${statusCode}`);
            }
        }

        const oldOverridesRes = await client.query(
            'SELECT permission_code, is_granted FROM user_permission_overrides WHERE user_id = $1',
            [targetUserId]
        );
        const oldOverridesMap = {};
        oldOverridesRes.rows.forEach(r => { oldOverridesMap[r.permission_code] = r.is_granted; });

        const newOverridesMap = {};
        overridesArray.forEach(o => { newOverridesMap[o.code] = o.is_granted; });

        const allCodes = new Set([...Object.keys(oldOverridesMap), ...Object.keys(newOverridesMap)]);
        for (const code of allCodes) {
            const oldVal = oldOverridesMap.hasOwnProperty(code) ? (oldOverridesMap[code] ? 'GRANTED' : 'DENIED') : 'INHERITED';
            const newVal = newOverridesMap.hasOwnProperty(code) ? (newOverridesMap[code] ? 'GRANTED' : 'DENIED') : 'INHERITED';

            if (oldVal !== newVal) {
                await this.logPermissionChange(client, actorId, targetUserId, code, oldVal, newVal);
            }
        }

        // 4. Удаляем старые и вставляем новые
        await client.query('DELETE FROM user_permission_overrides WHERE user_id = $1', [targetUserId]);

        if (overridesArray.length > 0) {
            const values = overridesArray.map(o => `(${targetUserId}, '${o.code}', ${o.is_granted})`).join(',');
            await client.query(`INSERT INTO user_permission_overrides (user_id, permission_code, is_granted) VALUES ${values}`);
        }

        // 5. Инвалидация кеша
        await cacheService.delete('effective_perms', `user:${targetUserId}`);

        // 6. Уведомление через сокет
        const sessionNotifier = require('./socket/notifiers/sessionNotifier');
        sessionNotifier.notifyUserDataRefresh(targetUserId, 'Ваши индивидуальные права доступа были изменены администратором');
    }

    /**
     * Получение всех прав для UI (Справочник + Текущая конфигурация роли)
     */
    async getPermissionsDictionary(client, statusCode = null) {
        const allPerms = await client.query('SELECT * FROM permissions ORDER BY category, code');

        let roleConfig = [];
        if (statusCode) {
            const res = await client.query('SELECT permission_code, is_default FROM role_permissions WHERE status_code = $1', [statusCode]);
            roleConfig = res.rows;
        }

        return {
            dictionary: allPerms.rows,
            roleConfig: roleConfig
        };
    }

    /**
     * Получение индивидуальных настроек пользователя
     */
    async getUserOverrides(client, targetUserId) {
        const res = await client.query('SELECT permission_code, is_granted FROM user_permission_overrides WHERE user_id = $1', [targetUserId]);
        return res.rows;
    }

    /**
 * Запись в историю: ручное изменение одного права
 */
    async logPermissionChange(client, actorId, targetUserId, permissionCode, oldState, newState, reason = null) {
        await client.query(
            `INSERT INTO public.user_permission_history 
             (actor_user_id, target_user_id, action_type, permission_code, old_state, new_state, reason)
             VALUES ($1, $2, 'PERMISSION_TOGGLED', $3, $4, $5, $6)`,
            [actorId, targetUserId, permissionCode, oldState, newState, reason]
        );
    }

    /**
     * Запись в историю: смена статуса (массовая выдача дефолтных прав)
     */
    async logRoleChangePermissions(client, actorId, targetUserId, oldStatus, newStatus, grantedDefaults) {
        for (const permCode of grantedDefaults) {
            await client.query(
                `INSERT INTO public.user_permission_history 
                 (actor_user_id, target_user_id, action_type, permission_code, old_state, new_state, reason)
                 VALUES ($1, $2, 'ROLE_CHANGED', $3, $4, 'GRANTED', $5)`,
                [actorId, targetUserId, permCode, oldStatus, `Смена статуса: ${oldStatus} → ${newStatus}`]
            );
        }
    }

    /**
     * Получение истории прав пользователя с пагинацией
     */
    async getPermissionHistory(client, targetUserId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        const countRes = await client.query(
            `SELECT COUNT(*) FROM public.user_permission_history WHERE target_user_id = $1`,
            [targetUserId]
        );
        const total = parseInt(countRes.rows[0].count, 10);

        const dataRes = await client.query(
            `SELECT 
                h.id, h.actor_user_id, h.target_user_id, h.action_type,
                h.permission_code, h.old_state, h.new_state, h.reason, h.created_at,
                actor.login AS actor_login
             FROM public.user_permission_history h
             LEFT JOIN public.users actor ON h.actor_user_id = actor.user_id
             WHERE h.target_user_id = $1
             ORDER BY h.created_at DESC
             LIMIT $2 OFFSET $3`,
            [targetUserId, limit, offset]
        );

        return {
            data: dataRes.rows,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        };
    }

    /**
     * Очистка истории старше N дней (для вызова из Cron)
     */
    async cleanupOldPermissionHistory(client, days = 365) {
        const res = await client.query(
            `DELETE FROM public.user_permission_history 
             WHERE created_at < (NOW() AT TIME ZONE 'UTC') - INTERVAL '${days} days'`
        );
        return res.rowCount;
    }
}

module.exports = new PermissionService();