// services/user/subServices/userStatusService.js
const apiError = require('../../../exceptions/apiError');
const notificationService = require('../../notifications/notificationService');
const notificationSettingsService = require('../../notifications/notificationSettingsService');
const cacheService = require('../../systemServices/cacheService');
const permissionService = require('../../systemServices/permissionService');
const sessionNotifier = require('../../systemServices/socket/notifiers/sessionNotifier');
const mainSettindsService = require('../../systemSettings/mainSettindsService');
const userSessionsService = require('../system/userSessionsService');
const userDevicesService = require('./userDevicesService');

class UserStatusService {
    async getAllStatuses(client) {
        const res = await client.query(`
            SELECT status_id, code_name, name, descr, is_staff 
            FROM public.user_statuses 
            ORDER BY status_id ASC
        `);
        return res.rows;
    }

    async getStatusById(client, statusId) {
        const res = await client.query(`
            SELECT status_id, code_name, name, descr, is_staff 
            FROM public.user_statuses 
            WHERE status_id = $1
        `, [statusId]);
        return res.rows.length > 0 ? res.rows[0] : null;
    }

    async isStaffStatus(client, statusId) {
        const res = await client.query(`
            SELECT is_staff 
            FROM public.user_statuses 
            WHERE status_id = $1
        `, [statusId]);
        return res.rows.length > 0 ? res.rows[0].is_staff : false;
    }

    // Внутренний хелпер для логирования истории (успех или провал)
    async _logRoleHistory(client, actorId, targetId, oldStatusId, newStatusId, actionStatus, failReason) {
        await client.query(`
            INSERT INTO public.user_role_history 
            (actor_user_id, target_user_id, old_status_id, requested_status_id, action_status, fail_reason)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [actorId, targetId, oldStatusId, newStatusId, actionStatus, failReason]);
    }

    async changeUserStatus(client, login, newStatusCodeName, user_data, user_status) {
        const actorId = user_data?.id;
        const isPrivileged = ['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(user_status);

        if (!isPrivileged) {
            throw apiError.Forbidden ? apiError.Forbidden('Недостаточно прав') : apiError.BadRequest('Недостаточно прав');
        }

        // 1. Получаем данные целевого пользователя
        const targetRes = await client.query(`
            SELECT user_id, login, status AS current_status_id 
            FROM public.users 
            WHERE login = $1
        `, [login]);

        if (targetRes.rows.length === 0) {
            throw apiError.NotFound('Пользователь не найден');
        }
        const target = targetRes.rows[0];

        // 2. Запрет на изменение самого себя
        if (target.user_id === actorId) {
            await this._logRoleHistory(client, actorId, target.user_id, target.current_status_id, null, 'failed', 'Попытка изменения статуса самому себе');
            throw apiError.BadRequest('Нельзя изменить статус самому себе');
        }

        const PROTECTED_LOGINS = [await mainSettindsService.selectSetting(client, 'main_admin'), await mainSettindsService.selectSetting(client, 'main_dev')];

        // 3. Запрет на изменение защищённых логинов
        if (PROTECTED_LOGINS.includes(target.login.toLowerCase())) {
            await this._logRoleHistory(client, actorId, target.user_id, target.current_status_id, null, 'failed', `Попытка изменения статуса защищённого логина: ${target.login}`);
            throw apiError.Forbidden(`Логин "${target.login}" является защищённым и не может быть изменён`);
        }

        // 4. Проверяем существование нового статуса
        const newStatusRes = await client.query(`
            SELECT status_id, is_staff FROM public.user_statuses WHERE code_name = $1
        `, [newStatusCodeName]);

        if (newStatusRes.rows.length === 0) {
            await this._logRoleHistory(client, actorId, target.user_id, target.current_status_id, null, 'failed', `Неверный код статуса: ${newStatusCodeName}`);
            throw apiError.BadRequest('Указанный код статуса не существует в справочнике');
        }
        const newStatus = newStatusRes.rows[0];

        // 5. Определяем, был ли пользователь стаффом до этого
        let oldIsStaff = false;
        if (target.current_status_id) {
            const oldStatusRes = await client.query(`SELECT is_staff FROM public.user_statuses WHERE status_id = $1`, [target.current_status_id]);
            if (oldStatusRes.rows.length > 0) {
                oldIsStaff = oldStatusRes.rows[0].is_staff;
            }
        }

        const becomingStaff = !oldIsStaff && newStatus.is_staff;
        const leavingStaff = oldIsStaff && !newStatus.is_staff;

        // В конце метода changeUserStatus, после _logRoleHistory:

        // === ЛОГИКА БЕЗОПАСНОСТИ ПРИ СМЕНЕ СТАТУСА ===

        // 1. Снимаем доверие со всех устройств при ЛЮБОМ переходе между staff ↔ non-staff
        if (becomingStaff || leavingStaff) {
            await userDevicesService.untrustUserDevices(client, target.user_id);
        }

        // 2. При переходе в staff — отзываем ВСЕ активные сессии (refresh-токены)
        if (becomingStaff) {
            // system=true позволяет отозвать токены без передачи access-токена текущего пользователя
            await userSessionsService.logoutFromAllSessions(client, target.user_id, null, null, true);
        }
        // ==============================================

        // 6. Обновляем статус пользователя (внутри транзакции контроллера)
        await client.query(`
            UPDATE public.users 
            SET status = $1 
            WHERE login = $2
        `, [newStatus.status_id, login]);

        await client.query(`
            DELETE FROM public.user_permission_overrides 
            WHERE user_id = $1
        `, [target.user_id]);

        await cacheService.delete('effective_perms', `user:${target.user_id}`);

        // 7. Логика управления таблицей admin_user_data
        if (becomingStaff) {
            await client.query(`
                INSERT INTO public.admin_user_data (user_id, is_active, created_at)
                VALUES ($1, true, NOW())
                ON CONFLICT (user_id) 
                DO UPDATE SET is_active = true, deactivated_at = NULL
            `, [target.user_id]);
        } else if (leavingStaff) {
            await client.query(`
                UPDATE public.admin_user_data 
                SET is_active = false, deactivated_at = NOW()
                WHERE user_id = $1 AND is_active = true
            `, [target.user_id]);
        }

        // 6.1. Записываем в историю прав: какие дефолтные права выданы новой ролью
        const newDefaultsRes = await client.query(
            `SELECT permission_code FROM public.role_permissions 
             WHERE status_code = $1 AND is_default = true`,
            [newStatusCodeName]
        );
        const grantedDefaults = newDefaultsRes.rows.map(r => r.permission_code);

        // Получаем code_name старого статуса для записи в историю
        const oldStatusRes2 = await client.query(
            `SELECT code_name FROM public.user_statuses WHERE status_id = $1`,
            [target.current_status_id]
        );
        const oldStatusCode = oldStatusRes2.rows.length > 0 ? oldStatusRes2.rows[0].code_name : 'UNKNOWN';

        if (grantedDefaults.length > 0) {
            await permissionService.logRoleChangePermissions(
                client, actorId, target.user_id, oldStatusCode, newStatusCodeName, grantedDefaults
            );
        }

        // 6.2. Уведомляем пользователя через сокет
        sessionNotifier.notifyUserDataRefresh(target.user_id, 'Ваши права доступа были изменены администратором');

        // Уведомляем пользователя о смене роли
        await notificationService.emit(client, {
            groupCode: 'system_role_changed',
            targetUserIds: target.user_id,
            payload: {
                old_role: oldStatusCode,
                new_role: newStatusCodeName,
                date: new Date().toLocaleString('ru-RU')
            }
        });

        // Применяем дефолтные настройки уведомлений для новой роли
        await notificationSettingsService.applyRoleDefaults(client, target.user_id, newStatusCodeName);

        // 8. Логируем успешное изменение
        await this._logRoleHistory(client, actorId, target.user_id, target.current_status_id, newStatus.status_id, 'success', null);

        return { user_id: target.user_id, login: target.login, status: newStatus.status_id };
    }

    // Получение истории с пагинацией и фильтрацией
    async getRoleHistory(client, targetUserId, actorUserId, page = 1, limit = 20) {
        // 🛡️ ЗАЩИТА: Санитизация входных параметров на уровне сервиса.
        // Превращает строки "null", "undefined", "" или нечисловые значения в настоящий null.
        const sanitizeId = (id) => {
            if (!id || id === 'null' || id === 'undefined' || id === '') return null;
            const parsed = parseInt(id, 10);
            return isNaN(parsed) ? null : parsed;
        };

        const validTargetUserId = sanitizeId(targetUserId);
        const validActorUserId = sanitizeId(actorUserId);

        let conditions = [];
        let params = [];
        let paramCount = 1;

        // Теперь проверяем уже очищенные значения
        if (validTargetUserId) {
            conditions.push(`h.target_user_id = $${paramCount}`);
            params.push(validTargetUserId);
            paramCount++;
        }
        if (validActorUserId) {
            conditions.push(`h.actor_user_id = $${paramCount}`);
            params.push(validActorUserId);
            paramCount++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Общее количество записей
        const countRes = await client.query(`SELECT COUNT(*) FROM public.user_role_history h ${whereClause}`, params);
        const total = parseInt(countRes.rows[0].count, 10);

        params.push(limit);
        params.push((page - 1) * limit);

        // Данные с джойнами для читаемости
        const dataRes = await client.query(`
            SELECT 
                h.id, h.actor_user_id, h.target_user_id, h.old_status_id, 
                h.requested_status_id, h.action_status, h.fail_reason, h.created_at,
                actor.login as actor_login,
                target.login as target_login,
                old_stat.code_name as old_status_code,
                new_stat.code_name as new_status_code
            FROM public.user_role_history h
            LEFT JOIN public.users actor ON h.actor_user_id = actor.user_id
            LEFT JOIN public.users target ON h.target_user_id = target.user_id
            LEFT JOIN public.user_statuses old_stat ON h.old_status_id = old_stat.status_id
            LEFT JOIN public.user_statuses new_stat ON h.requested_status_id = new_stat.status_id
            ${whereClause}
            ORDER BY h.created_at DESC
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `, params);

        return { records: dataRes.rows, total, page, limit };
    }

    // Очистка истории старше N дней (для вызова из Cron)
    async cleanupOldRoleHistory(client, days = 100) {
        const res = await client.query(`
            DELETE FROM public.user_role_history
            WHERE created_at < NOW() - INTERVAL '${days} days'
        `);
        return res.rowCount; // Возвращает количество удалённых строк
    }
}

module.exports = new UserStatusService();