const apiError = require('../../../exceptions/apiError');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const ValidateService = require('../../systemServices/validate/validateService');
const userRefreshTokenService = require('../system/userRefreshTokenService');
const mainSettindsService = require('../../systemSettings/mainSettindsService');
const userSessionsService = require('../system/userSessionsService');

const validateService = new ValidateService();

class StaffSecurityService {
    // Генерация криптостойкого пароля 15-20 символов
    generateSecurePassword(length = 16) {
        if (length < 15 || length > 20) length = 16;

        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const all = lowercase + uppercase + numbers + special;

        let password = '';
        // Гарантируем наличие каждого типа символов
        password += lowercase[crypto.randomInt(lowercase.length)];
        password += uppercase[crypto.randomInt(uppercase.length)];
        password += numbers[crypto.randomInt(numbers.length)];
        password += special[crypto.randomInt(special.length)];

        // Остальные символы
        for (let i = 4; i < length; i++) {
            password += all[crypto.randomInt(all.length)];
        }

        // Перемешиваем символы
        return password.split('').sort(() => crypto.randomInt(2) - 1).join('');
    }

    // Получение информации перед сменой пароля
    async getPasswordChangeInfo(client, userId, userStatus) {
        const isPrivileged = ['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(userStatus);

        // Получаем дату последней смены пароля
        const lastChangeRes = await client.query(
            `SELECT created_at FROM public.password_change_history 
             WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );

        const lastChangeDate = lastChangeRes.rows.length > 0 ? lastChangeRes.rows[0].created_at : null;

        // Получаем флаг обязательной смены
        const userRes = await client.query(
            `SELECT must_change_password FROM public.users WHERE user_id = $1`,
            [userId]
        );
        const mustChange = userRes.rows[0]?.must_change_password || false;

        return {
            last_change_date: lastChangeDate,
            can_set_custom_password: isPrivileged ? true : true, // Админ может указать пароль, обычный юзер тоже
            must_change_password: mustChange
        };
    }

    // Смена пароля пользователем самому себе
    async changeSelfPassword(client, userId, oldPassword, newPassword, autoGenerate = false) {
        // Получаем текущий хэш пароля
        const userRes = await client.query(
            `SELECT pass FROM public.users WHERE user_id = $1`,
            [userId]
        );

        if (userRes.rows.length === 0) {
            throw apiError.NotFound('Пользователь не найден');
        }

        const currentHash = userRes.rows[0].pass;

        // Проверяем старый пароль
        const isValid = await bcrypt.compare(oldPassword, currentHash.trim());
        if (!isValid) {
            throw apiError.BadRequest('INVALID_PASSWORD', 'Неверный текущий пароль');
        }

        // Генерируем или валидируем новый пароль
        let finalPassword = newPassword;
        if (autoGenerate) {
            finalPassword = this.generateSecurePassword(16);
        } else {
            validateService.userValidation.validatePassword(newPassword);
        }

        // Хешируем новый пароль
        const newHash = await bcrypt.hash(finalPassword, 5);

        // Обновляем пароль
        await client.query(
            `UPDATE public.users SET pass = $1, must_change_password = false WHERE user_id = $2`,
            [newHash, userId]
        );

        // Логируем смену
        await client.query(
            `INSERT INTO public.password_change_history (user_id, actor_user_id, change_type)
             VALUES ($1, $1, 'SELF_CHANGE')`,
            [userId]
        );

        await userSessionsService.revokeTokensAndNotify(client, userId, 'all');

        return {
            success: true,
            message: 'Пароль успешно изменён',
            new_password: autoGenerate ? finalPassword : null
        };
    }

    // Смена пароля админом другому пользователю
    async changeUserPasswordByAdmin(client, actorId, actorLogin, targetUserId, newPassword, autoGenerate, reason) {
        if (!reason || reason.trim() === '') {
            throw apiError.BadRequest('REASON_REQUIRED', 'Причина смены пароля обязательна');
        }

        // Проверяем, что целевой пользователь не защищён
        const targetRes = await client.query(
            `SELECT u.user_id, u.login, s.code_name as status_code
             FROM public.users u
             LEFT JOIN public.user_statuses s ON u.status = s.status_id
             WHERE u.user_id = $1`,
            [targetUserId]
        );

        if (targetRes.rows.length === 0) {
            throw apiError.NotFound('Пользователь не найден');
        }

        const target = targetRes.rows[0];

        // Запрет на изменение самого себя
        if (target.user_id === actorId) {
            throw apiError.BadRequest('SELF_CHANGE_FORBIDDEN', 'Нельзя изменить пароль самому себе через этот метод');
        }

        const main_admin = await mainSettindsService.selectSetting(client, "main_admin");
        const main_dev = await mainSettindsService.selectSetting(client, "main_dev");
        const higher_security = [main_admin, main_dev].includes(actorLogin);

        if ([main_admin, main_dev].includes(target.login.toLowerCase()) && !higher_security) {
            throw apiError.Forbidden(`Пароль пользователя "${target.login}" не может быть изменён`);
        }

        // Генерируем или валидируем пароль
        let finalPassword = newPassword;
        let changeType = 'ADMIN_RESET';

        if (autoGenerate) {
            finalPassword = this.generateSecurePassword(16);
            changeType = 'AUTO_GENERATED';
        } else {
            validateService.userValidation.validatePassword(newPassword);
        }

        // Хешируем
        const newHash = await bcrypt.hash(finalPassword, 5);

        // Обновляем пароль и ставим флаг обязательной смены
        await client.query(
            `UPDATE public.users SET pass = $1, must_change_password = true WHERE user_id = $2`,
            [newHash, targetUserId]
        );

        // Логируем
        await client.query(
            `INSERT INTO public.password_change_history (user_id, actor_user_id, change_type, reason)
             VALUES ($1, $2, $3, $4)`,
            [targetUserId, actorId, changeType, reason]
        );

        // Отзываем все refresh токены целевого пользователя
        await userSessionsService.revokeTokensAndNotify(client, targetUserId, 'all');

        return {
            success: true,
            message: 'Пароль пользователя изменён',
            new_password: autoGenerate ? finalPassword : null,
            user_login: target.login
        };
    }

    // Регенерация доп. пароля (для стаффа)
    async regenerateSecondaryPassword(client, actorId, actorLogin, targetUserId) {
        // Проверяем, что целевой пользователь — стафф
        const targetRes = await client.query(
            `SELECT u.user_id, u.login, s.is_staff
             FROM public.users u
             LEFT JOIN public.user_statuses s ON u.status = s.status_id
             WHERE u.user_id = $1`,
            [targetUserId]
        );

        if (targetRes.rows.length === 0) {
            throw apiError.NotFound('Пользователь не найден');
        }

        const target = targetRes.rows[0];

        if (!target.is_staff) {
            throw apiError.BadRequest('NOT_STAFF', 'Доп. пароль доступен только для сотрудников');
        }

        const main_admin = await mainSettindsService.selectSetting(client, "main_admin");
        const main_dev = await mainSettindsService.selectSetting(client, "main_dev");
        // const higher_security = [main_admin, main_dev].includes(candidateData.login);

        if (![main_admin, main_dev].includes(actorLogin) && actorId != targetUserId) {
            throw apiError.Forbidden(`Пароль пользователя "${target.login}" не может быть изменён`);
        }

        // Генерируем новый доп. пароль
        const secondaryPassword = this.generateSecurePassword(12); // Доп. пароль короче
        const hash = await bcrypt.hash(secondaryPassword, 10);

        // Сохраняем или обновляем в admin_user_data
        await client.query(
            `INSERT INTO public.admin_user_data (user_id, secondary_password_hash, secondary_password_set_at, is_active, created_at)
             VALUES ($1, $2, NOW(), true, NOW())
             ON CONFLICT (user_id) 
             DO UPDATE SET secondary_password_hash = $2, secondary_password_set_at = NOW()`,
            [targetUserId, hash]
        );

        // Логируем
        await client.query(
            `INSERT INTO public.password_change_history (user_id, actor_user_id, change_type)
             VALUES ($1, $2, 'SECONDARY_REGEN')`,
            [targetUserId, actorId]
        );

        return {
            success: true,
            message: 'Доп. пароль сгенерирован',
            secondary_password: secondaryPassword,
            user_login: target.login
        };
    }

    // Проверка доп. пароля (второй этап входа)
    async verifySecondaryPassword(client, userId, secondaryPassword, deviceInfo, userAgent, clientIp) {
        // Получаем хэш доп. пароля
        const res = await client.query(
            `SELECT secondary_password_hash FROM public.admin_user_data WHERE user_id = $1`,
            [userId]
        );

        if (res.rows.length === 0 || !res.rows[0].secondary_password_hash) {
            throw apiError.BadRequest('NO_SECONDARY_PASSWORD', 'Доп. пароль не установлен');
        }

        const hash = res.rows[0].secondary_password_hash;
        const isValid = await bcrypt.compare(secondaryPassword, hash.trim());

        if (!isValid) {
            const userLoginTrackingService = require('../system/userLoginTrackingService');
            await userLoginTrackingService.registerLogin(client, {
                user_id: userId,
                decryptedTelegramId: null, //decryptedTelegramId,
                method: 'password',
                platform: 'web',
                system: 'main',
                userAgent,
                clientIp,
                deviceInfo,
                status: 'fail',
                fail_reason: 'Неправильный доп пароль'
            });
            throw apiError.BadRequest('INVALID_SECONDARY_PASSWORD', 'Неверный доп. пароль');
        }

        return true;
    }

    // Очистка истории смены паролей старше 300 дней
    async cleanupOldPasswordHistory(client) {
        const res = await client.query(
            `DELETE FROM public.password_change_history
             WHERE created_at < NOW() - INTERVAL '300 days'`
        );
        return res.rowCount;
    }
}

module.exports = new StaffSecurityService();