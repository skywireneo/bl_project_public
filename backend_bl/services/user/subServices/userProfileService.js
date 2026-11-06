// services/user/subServices/userProfileService.js
const apiError = require('../../../exceptions/apiError');
const mainSettindsService = require('../../systemSettings/mainSettindsService');
const userStatusService = require('./userStatusService');

class UserProfileService {
    async getUserByLogin(client, login, user_data, user_status) {
        const userRes = await client.query(`
            SELECT user_id, login, status AS status_id, reg_date
            FROM public.users
            WHERE login = $1
        `, [login]);

        if (userRes.rows.length === 0) {
            throw apiError.NotFound('Пользователь не найден');
        }

        const user = userRes.rows[0];
        const statusInfo = await userStatusService.getStatusById(client, user.status_id);

        const isDeveloperPrivileged = ['DEVELOPER', 'TOP_LEVEL_DEVELOPER'].includes(user_status);
        const isAdministratorPrivileged = ['TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(user_status);
        const isRequesterPrivileged = isDeveloperPrivileged || isAdministratorPrivileged;

        const PROTECTED_LOGINS = [await mainSettindsService.selectSetting(client, 'main_admin'), await mainSettindsService.selectSetting(client, 'main_dev')];

        const isTargetUserStaff = await userStatusService.isStaffStatus(client, user.status_id);
        const isTargetProtected = PROTECTED_LOGINS.includes(user.login.toLowerCase());
        const isSelf = user_data && user_data.id === user.user_id; // Проверка: смотрит ли пользователь на себя

        let statusPayload;
        let adminDataPayload = null;
        let canEditStatus = false;

        if (isRequesterPrivileged) {
            if (isTargetProtected) {
                // Защищённый логин: показываем флаг, но скрываем список статусов и админские данные
                statusPayload = {
                    ...(statusInfo || { code_name: 'UNKNOWN', name: 'Неизвестный статус' }),
                    is_protected: true,
                    allStatuses: []
                };
                canEditStatus = false;
            } else if (isSelf) {
                // Просмотр себя: список статусов даём, но редактировать запрещаем
                statusPayload = {
                    ...(statusInfo || { code_name: 'UNKNOWN', name: 'Неизвестный статус', descr: 'Не найден', is_staff: false }),
                    allStatuses: await userStatusService.getAllStatuses(client)
                };
                canEditStatus = false;
            } else {
                // Обычный привилегированный просмотр чужого профиля
                statusPayload = {
                    ...(statusInfo || { code_name: 'UNKNOWN', name: 'Неизвестный статус', descr: 'Не найден', is_staff: false }),
                    allStatuses: await userStatusService.getAllStatuses(client)
                };
                canEditStatus = true;
            }

            // Admin data показываем ТОЛЬКО если это не защищённый логин
            if (!isTargetProtected && isTargetUserStaff) {
                const adminDataRes = await client.query(`
                    SELECT is_active, created_at, deactivated_at
                    FROM public.admin_user_data
                    WHERE user_id = $1
                `, [user.user_id]);

                if (adminDataRes.rows.length > 0) {
                    adminDataPayload = adminDataRes.rows[0];
                }
            }
        } else {
            // Обычный пользователь
            statusPayload = {
                name: statusInfo ? statusInfo.name : 'Неизвестный статус',
                code_name: statusInfo ? statusInfo.code_name : 'UNKNOWN',
            };
        }

        return {
            user_id: user.user_id,
            login: user.login,
            reg_date: user.reg_date,
            status: statusPayload,
            can_edit_status: canEditStatus,
            admin_data: adminDataPayload
        };
    }
}

module.exports = new UserProfileService();