const bcrypt = require('bcryptjs');
const tokenService = require('../../systemServices/tokenService');
const apiError = require('../../../exceptions/apiError');
const { hashData, encrypt, decrypt } = require('../../systemServices/cryptoService');
const userLoginTrackingService = require('../system/userLoginTrackingService');
const userRefreshTokenService = require('../system/userRefreshTokenService');
const staffSecurityService = require('./staffSecurityService');
const jwt = require('jsonwebtoken');
const cacheService = require('../../systemServices/cacheService');
const userSessionsService = require('../system/userSessionsService');


class userDevicesService {

    /**
     * Маскирует IP-адрес для безопасного отображения в интерфейсе.
     * Реальный IP остается в БД для аудитов и безопасности.
     * IPv4: 192.168.1.100 -> 192.168.*.*
     * IPv6: 2001:0db8:85a3:... -> 2001:0db8:*:*:*:*:*:*
     */
    maskIpAddress(ip) {
        if (!ip || typeof ip !== 'string') return 'Неизвестно';

        const trimmedIp = ip.trim();

        // Проверка на стандартный IPv4
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(trimmedIp)) {
            const parts = trimmedIp.split('.');
            // Маскируем последние два октета (можно изменить на parts[2] + '.*', если нужно показывать подсеть точнее)
            return `${parts[0]}.${parts[1]}.*.*`;
        }

        // Проверка на IPv6 (содержит двоеточия)
        if (trimmedIp.includes(':')) {
            const parts = trimmedIp.split(':');
            // Оставляем первые 2 сегмента, остальные маскируем
            if (parts.length >= 2) {
                return `${parts[0]}:${parts[1]}:*:*:*:*:*:*`;
            }
            return `${parts[0]}:*:*:*:*:*:*:*`;
        }

        // Fallback для нестандартных форматов (например, проксированные заголовки)
        return trimmedIp.length > 4 ? trimmedIp.substring(0, 4) + '***' : '***';
    }

    /**
     * При создании устройства добавляем is_trusted = false (по умолчанию)
     */
    async createUserDevice(client, userId, deviceFingerprint, deviceInfo, ip, isTrusted = false) {
        const deviceName = `${deviceInfo?.os || 'Unknown'} / ${deviceInfo?.browser || 'Unknown'}`;

        const encriptIpData = encrypt(ip, 'IDENTITY_KEY');

        const insertRes = await client.query(
            `INSERT INTO public.user_devices 
                (user_id, device_fingerprint, device_name, os, browser, model, is_mobile, 
                 ip_last, login_count, created_at, last_login_at, is_deleted, is_trusted,
                 ip_last_encrypted, ip_last_iv, ip_last_auth_tag) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, NOW() AT TIME ZONE 'UTC', NOW() AT TIME ZONE 'UTC', false, $9, $10, $11, $12) 
             RETURNING id`,
            [
                userId,
                deviceFingerprint,
                deviceName,
                deviceInfo?.os || 'Unknown',
                deviceInfo?.browser || 'Unknown',
                deviceInfo?.model || 'Unknown',
                deviceInfo?.is_mobile || false,
                this.maskIpAddress(ip),
                isTrusted,
                encriptIpData?.encrypted,
                encriptIpData?.iv,
                encriptIpData?.authTag
            ]
        );
        return insertRes.rows[0].id;
    }

    /**
     * Добавляем is_trusted и custom_name в SELECT
     */
    async getUserDevices(client, user_id, current_user_status) {
        const res = await client.query(
            `SELECT id, device_name, custom_name, os, browser, model, is_mobile, 
                    ip_last, login_count, last_login_at, created_at, is_trusted,
                    ip_last_encrypted, ip_last_iv, ip_last_auth_tag
             FROM public.user_devices 
             WHERE user_id = $1 AND is_deleted = false 
             ORDER BY last_login_at DESC`,
            [user_id]
        );

        const isAdmin = ['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(current_user_status);

        return res.rows.map(row => {
            const { ip_last_encrypted, ip_last_iv, ip_last_auth_tag, ...safeRow } = row;

            let displayIp = safeRow.ip_last || 'Неизвестно';

            if (isAdmin) {
                if (ip_last_encrypted && ip_last_iv && ip_last_auth_tag) {
                    try {
                        displayIp = decrypt(
                            {
                                encrypted: ip_last_encrypted,
                                iv: ip_last_iv,
                                authTag: ip_last_auth_tag
                            },
                            'IDENTITY_KEY'
                        );
                    } catch (err) {
                        console.error(`[ERROR] Не удалось расшифровать IP для устройства ${row.id}:`, err);
                        displayIp = 'Ошибка расшифровки';
                    }
                }
            } else {
                displayIp = this.maskIpAddress(displayIp);
            }

            return {
                ...safeRow,
                ip_last: displayIp
            };
        });
    }

    async updateUserDevicesLoginCount(client, ip, deviceId) {
        await client.query(
            `UPDATE public.user_devices SET ip_last = $1, login_count = login_count + 1, last_login_at = NOW() AT TIME ZONE 'UTC' WHERE id = $2 AND is_deleted = false`,
            [this.maskIpAddress(ip), deviceId]
        );
        return
    }

    async deleteDevice(client, user_id, device_id, user_status, currentSessionId = null) {
        // 1. Проверяем существование устройства и его владельца
        const deviceCheck = await client.query(
            `SELECT user_id FROM public.user_devices WHERE id = $1`, [device_id]
        );

        if (deviceCheck.rows.length === 0) {
            throw new Error('Устройство не найдено');
        }

        const targetUserId = deviceCheck.rows[0].user_id;

        // 2. Проверка прав (Админ может удалять любое, пользователь только свое)
        if (!['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(user_status) && targetUserId !== user_id) {
            throw new Error('Нет прав на удаление этого устройства');
        }

        // 3. ОТЗЫВАЕМ ТОКЕНЫ И УВЕДОМЛЯЕМ ЧЕРЕЗ СОКЕТЫ (вместо userRefreshTokenService.revokeTokensByDeviceId)
        // Мы импортируем userSessionsService в начале файла (см. ниже)
        await userSessionsService.revokeSessionsByDeviceAndNotify(client, targetUserId, device_id, currentSessionId);

        // 4. Soft-delete самого устройства
        const query = ['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(user_status)
            ? `UPDATE public.user_devices SET is_deleted = true WHERE id = $1 RETURNING id`
            : `UPDATE public.user_devices SET is_deleted = true WHERE id = $1 AND user_id = $2 RETURNING id`;

        const params = ['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(user_status)
            ? [device_id]
            : [device_id, user_id];

        const res = await client.query(query, params);

        if (res.rowCount === 0) {
            throw new Error('Не удалось удалить устройство');
        }

        // 5. Инвалидируем кеш статистики
        await cacheService.delete('stats', 'system_overview_v1');

        return true;
    }

    // Проверка, является ли устройство известным для пользователя
    async isDeviceKnown(client, userId, deviceFingerprint) {
        const res = await client.query(
            `SELECT id FROM public.user_devices 
             WHERE user_id = $1 AND device_fingerprint = $2 AND is_deleted = false`,
            [userId, deviceFingerprint]
        );
        return res.rows.length > 0;
    }

    async isDeviceExist(client, user_id, deviceFingerprint) {
        const existing = await client.query(
            `SELECT id FROM public.user_devices WHERE user_id = $1 AND device_fingerprint = $2`,
            [user_id, deviceFingerprint]
        );
        return existing;
    }

    /**
 * Очистка старых устройств по двум разным сценариям
 */
    async deleteOldDevices(client) {
        try {
            const DELETE_TIMEOUT_DAYS = 30; // В будущем можно заменить на await settingsService.selectSetting("delete_old_devices")

            const res = await client.query(
                `
                DELETE FROM public.user_devices
                WHERE (
                    -- Условие 1: Старые устройства, которые уже были помечены как удаленные (soft delete)
                    (
                        last_login_at < (NOW() AT TIME ZONE 'UTC' - INTERVAL '${DELETE_TIMEOUT_DAYS} days') 
                        AND is_deleted = true
                    )
                    OR
                    -- Условие 2: Временные API-устройства с конкретными параметрами, неактивные более 1 часа
                    -- (Для них проверка is_deleted не требуется, удаляем сразу)
                    (
                        device_name = 'API Client / Unknown' 
                        AND browser = 'API' 
                        AND model = 'test' 
                        AND last_login_at < (NOW() AT TIME ZONE 'UTC' - INTERVAL '1 hour')
                    )
                )
                `
            );

            return { success: true, deleted: res.rowCount };
        } catch (err) {

            console.error(`[ERROR] deleteOldDevices failed:`, err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Обновление статуса доверия устройства
     * Требует подтверждения паролем для установки is_trusted = true
     */
    async updateDeviceTrust(client, userId, deviceId, isTrusted, confirmPassword = null) {
        // 1. Проверяем существование устройства и его владельца
        const deviceCheck = await client.query(
            `SELECT user_id FROM public.user_devices WHERE id = $1 AND is_deleted = false`,
            [deviceId]
        );

        if (deviceCheck.rows.length === 0) {
            throw apiError.NotFound('DEVICE_NOT_FOUND', 'Устройство не найдено');
        }

        const targetUserId = deviceCheck.rows[0].user_id;

        // 2. Проверка прав (пользователь может управлять только своими устройствами)
        if (targetUserId !== userId) {
            throw apiError.Forbidden('Нет прав на управление этим устройством');
        }

        // 3. Если делаем доверенным → требуем подтверждение паролем
        if (isTrusted && confirmPassword) {
            const userCheck = await client.query(
                `SELECT pass FROM users WHERE user_id = $1`,
                [userId]
            );

            if (userCheck.rows.length === 0) {
                throw apiError.NotFound('USER_NOT_FOUND', 'Пользователь не найден');
            }

            const isPasswordValid = await bcrypt.compare(confirmPassword, userCheck.rows[0].pass.trim());
            if (!isPasswordValid) {
                throw apiError.BadRequest('INVALID_PASSWORD', 'Неверный пароль для подтверждения');
            }
        } else if (isTrusted && !confirmPassword) {
            throw apiError.BadRequest('PASSWORD_REQUIRED', 'Требуется подтверждение паролем');
        }

        // 4. Обновляем статус
        await client.query(
            `UPDATE public.user_devices SET is_trusted = $1 WHERE id = $2`,
            [isTrusted, deviceId]
        );

        return { success: true, isTrusted };
    }

    /**
     * Обновление кастомного названия устройства
     */
    async updateDeviceName(client, userId, deviceId, customName, appendDeviceInfo = false) {
        // 1. Проверяем существование устройства и его владельца
        const deviceCheck = await client.query(
            `SELECT user_id, os, browser, model FROM public.user_devices WHERE id = $1 AND is_deleted = false`,
            [deviceId]
        );

        if (deviceCheck.rows.length === 0) {
            throw apiError.NotFound('DEVICE_NOT_FOUND', 'Устройство не найдено');
        }

        const device = deviceCheck.rows[0];

        // 2. Проверка прав
        if (device.user_id !== userId) {
            throw apiError.Forbidden('Нет прав на управление этим устройством');
        }

        // 3. Формируем финальное название
        let finalName = customName;
        if (appendDeviceInfo && customName) {
            const deviceInfo = `${device.browser || 'Unknown'}${device.model && device.model !== 'Unknown' ? `, ${device.model}` : ''}`;
            finalName = `${customName} (${deviceInfo})`;
        }

        // 4. Обновляем
        await client.query(
            `UPDATE public.user_devices SET custom_name = $1, device_name = $2 WHERE id = $3`,
            [customName, finalName, deviceId]
        );

        return { success: true, deviceName: finalName };
    }

    /**
     * Снятие доверия у неактивных устройств (для крона)
     */
    async downgradeOldTrustedDevices(client) {
        const DOWNGRADE_TIMEOUT_DAYS = 30;

        const res = await client.query(
            `UPDATE public.user_devices 
             SET is_trusted = false 
             WHERE is_trusted = true 
               AND is_deleted = false 
               AND last_login_at < (NOW() AT TIME ZONE 'UTC' - INTERVAL '${DOWNGRADE_TIMEOUT_DAYS} days')`,
        );

        return { success: true, downgraded: res.rowCount };
    }

    /**
     * Обновление устройства с установкой is_trusted = true
     */
    async updateDeviceAsTrusted(client, deviceId, ip) {
        await client.query(
            `UPDATE public.user_devices 
             SET ip_last = $1, login_count = login_count + 1, last_login_at = NOW() AT TIME ZONE 'UTC', is_trusted = true 
             WHERE id = $2 AND is_deleted = false`,
            [this.maskIpAddress(ip), deviceId]
        );
    }

    /**
 * Массовое снятие доверия со ВСЕХ устройств всех пользователей.
 * Используется в экстренных ситуациях (например, глобальный сброс безопасности).
 */
    async untrustAllDevicesGlobally(client) {
        const res = await client.query(`
        UPDATE public.user_devices 
        SET is_trusted = false 
        WHERE is_trusted = true AND is_deleted = false
    `);
        return { success: true, untrusted: res.rowCount };
    }

    /**
     * Снятие доверия со всех устройств конкретного пользователя.
     * Вызывается при смене статуса между staff/non-staff в любую сторону.
     */
    async untrustUserDevices(client, userId) {
        const res = await client.query(`
        UPDATE public.user_devices 
        SET is_trusted = false 
        WHERE user_id = $1 AND is_trusted = true AND is_deleted = false
    `, [userId]);

        // Опционально: уведомляем пользователя через сокеты
        if (res.rowCount > 0) {
            try {
                const sessionNotifier = require('../../systemServices/socket/notifiers/sessionNotifier');
                sessionNotifier.notifyUserDataRefresh(userId, 'Доверие со всех ваших устройств было снято администратором');
            } catch (err) {
                console.error('[WARN] Не удалось отправить уведомление о снятии доверия:', err.message);
            }
        }

        return { success: true, untrusted: res.rowCount };
    }
}
module.exports = new userDevicesService();