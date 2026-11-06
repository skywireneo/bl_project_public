// const logService = require('../logService');
// const notificationsService = require('../notificationsService');
// const settingsService = require('../settingsService');
// const { hashData } = require('./cryptoService');
// const queryService = require('./queryService');
const cacheService = require('../../systemServices/cacheService');
const { encrypt, decrypt } = require('../../systemServices/cryptoService');
const userDevicesService = require('../subServices/userDevicesService');

class UserLoginTrackingService {

    //   _createLogger(log_meta_id, decoded = null, record_id = null, overrides = {}) {
    //       if (!log_meta_id || typeof log_meta_id !== 'string') {
    //           throw new Error('log_meta_id обязателен и должен быть строкой (например, "US101")');
    //       }
    //       const baseContext = {
    //           log_meta_id: log_meta_id,
    //           segment: 'USER',
    //           type_of_action: 'EDIT',
    //           user_id: decoded?.data?.id ?? null,
    //           user_login: decoded?.data?.login ?? null,
    //           user_role: decoded?.data?.status ?? null,
    //           record_id: record_id,
    //           ...overrides
    //       };
    //       return logService.forContext(baseContext);
    //   }

    //   /**
    //    * Парсинг user-agent для читаемого отображения
    //    */
    //   parseUserAgent(userAgent) {
    //     let device = 'Desktop';
    //     let browser = 'Other';

    //     if (/mobile/i.test(userAgent)) device = 'Mobile';
    //     else if (/tablet/i.test(userAgent)) device = 'Tablet';

    //     if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent)) browser = 'Chrome';
    //     else if (/firefox/i.test(userAgent)) browser = 'Firefox';
    //     else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';
    //     else if (/edge/i.test(userAgent)) browser = 'Edge';

    //     return { device, browser };
    //   }

    /**
     * Регистрация входа пользователя и устройства
     */
    async registerLogin(client, {
        user_id, deviceId = null, method = 'password', platform = 'web', system = 'main',
        userAgent = '', ip = null, deviceInfo = {}, status = 'success', fail_reason = null
    }) {
        const encriptIpData = ip ? encrypt(ip, 'IDENTITY_KEY') : null;

        // Просто логируем факт входа с уже готовым device_id
        await client.query(
            `INSERT INTO public.user_auth_logins 
             (user_id, device_id, ip_address, method, system, status, fail_reason, language, timezone, user_agent, platform, attempt_time, ip_address_encrypted, ip_address_iv, ip_address_auth_tag)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW() AT TIME ZONE 'UTC', $12, $13, $14)`,
            [
                user_id,
                deviceId,
                ip ? userDevicesService.maskIpAddress(ip) : null,
                method,
                system,
                status,
                fail_reason,
                deviceInfo?.language || null,
                deviceInfo?.timezone || null,
                userAgent,
                platform,
                encriptIpData?.encrypted || null,
                encriptIpData?.iv || null,
                encriptIpData?.authTag || null
            ]
        );
    }

    /**
     * Получение истории входов пользователя с защитой IP-адреса
     */
    async getLoginHistory(client, user_id, current_user_status, limit = 20, page = 1) {
        const offset = (page - 1) * limit;
        const res = await client.query(
            `SELECT l.user_auth_login_id, l.attempt_time, l.status, l.method, l.system, l.ip_address, l.fail_reason, l.timezone, l.platform, l.user_agent,
                    d.device_name, d.os, d.browser, l.ip_address_encrypted, l.ip_address_iv, l.ip_address_auth_tag
             FROM public.user_auth_logins l
             LEFT JOIN public.user_devices d ON l.device_id = d.id
             WHERE l.user_id = $1
             ORDER BY l.attempt_time DESC
             LIMIT $2 OFFSET $3`,
            [user_id, limit, offset]
        );

        const isAdmin = ['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(current_user_status);

        return res.rows.map(row => {
            // 1. Деструктуризация: извлекаем поля шифрования, оставляя только безопасные данные в safeRow
            const { ip_address_encrypted, ip_address_iv, ip_address_auth_tag, ...safeRow } = row;

            let displayIp = safeRow.ip_address || 'Неизвестно';

            if (isAdmin) {
                // 🛡️ АДМИН: Пытаемся расшифровать реальный IP
                if (ip_address_encrypted && ip_address_iv && ip_address_auth_tag) {
                    try {
                        displayIp = decrypt(
                            {
                                encrypted: ip_address_encrypted,
                                iv: ip_address_iv,
                                authTag: ip_address_auth_tag
                            },
                            'IDENTITY_KEY'
                        );
                    } catch (err) {
                        console.error(`[ERROR] Не удалось расшифровать IP в истории входов (Запись ID: ${row.user_auth_login_id}):`, err);
                        displayIp = 'Ошибка расшифровки';
                    }
                }
            } else {
                // 👤 ОБЫЧНЫЙ ПОЛЬЗОВАТЕЛЬ: Маскируем IP
                // Если метод maskIpAddress находится в другом сервисе, можно импортировать его или продублировать логику здесь:
                displayIp = displayIp;
            }

            // 2. Возвращаем безопасный объект, подменяя ip_address на обработанное значение
            return {
                ...safeRow,
                ip_address: displayIp
            };
        });
    }

    async deleteOldLoginLogs(client) {
        try {
            const DELETE_TIMEOUT_DAYS = 30//await settingsService.selectSetting("delete_old_auth_logs");
            const res = await client.query(
                `
                  DELETE FROM user_auth_logins
                  WHERE
                      (attempt_time < (NOW() AT TIME ZONE 'UTC' - INTERVAL '${DELETE_TIMEOUT_DAYS} days'))
                  `
            );
            // this._createLogger('USD003', null, null, { subsegment: 'SYSTEM_ACTIONS', type_of_action: 'DELETE' })
            //     .isSystem(`Выполнена очистка старых логов входов (старее ${DELETE_TIMEOUT_DAYS} дней): удалено ${res.rowCount} записей`);
            return { success: true, deleted: res.rowCount };
        } catch (err) {
            // this._createLogger('USD004', null, null, { subsegment: 'SYSTEM_ACTIONS', type_of_action: 'DELETE' })
            //     .systemError(`Ошибка при очистке старых логов входов: ${err.message}`);
            return { success: false, error: err.message };
        }
    }

    // ПОЛУЧЕНИЕ ВСЕСТОРОННЕЙ СТАТИСТИКИ (с кешированием)
    async getSystemStats(client) {
        return await cacheService.getOrSet('stats', 'system_overview_v1', async () => {
            try {
                // 1. Обзорная сводка за 24 часа
                const overviewRes = await client.query(`
                    SELECT 
                        COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count,
                        COUNT(CASE WHEN status = 'fail' THEN 1 END) as fail_count,
                        COUNT(DISTINCT user_id) as unique_users
                    FROM public.user_auth_logins
                    WHERE attempt_time >= NOW() AT TIME ZONE 'UTC' - INTERVAL '24 hours'
                `);
                const overview = overviewRes.rows[0];
                const totalLogins24h = parseInt(overview.success_count) + parseInt(overview.fail_count);
                const failRate24h = totalLogins24h > 0 ? ((parseInt(overview.fail_count) / totalLogins24h) * 100).toFixed(1) : 0;

                // 2. Топ причин ошибок за 24 часа
                const topFailsRes = await client.query(`
                    SELECT fail_reason, COUNT(*) as count
                    FROM public.user_auth_logins
                    WHERE status = 'fail' 
                      AND attempt_time >= NOW() AT TIME ZONE 'UTC' - INTERVAL '24 hours' 
                      AND fail_reason IS NOT NULL
                    GROUP BY fail_reason 
                    ORDER BY count DESC 
                    LIMIT 5
                `);

                // 3. Топ пользователей с неудачными попытками за 24 часа
                const topUsersFailsRes = await client.query(`
                    SELECT user_id, COUNT(*) as fail_count
                    FROM public.user_auth_logins
                    WHERE status = 'fail' AND attempt_time >= NOW() AT TIME ZONE 'UTC' - INTERVAL '24 hours'
                    GROUP BY user_id 
                    ORDER BY fail_count DESC 
                    LIMIT 5
                `);

                // 4. Демография устройств (ТОЛЬКО активные, is_deleted = false)
                const osRes = await client.query(`
                    SELECT os, COUNT(*) as count FROM public.user_devices WHERE is_deleted = false GROUP BY os ORDER BY count DESC
                `);
                const browserRes = await client.query(`
                    SELECT browser, COUNT(*) as count FROM public.user_devices WHERE is_deleted = false GROUP BY browser ORDER BY count DESC
                `);
                const mobileRatioRes = await client.query(`
                    SELECT 
                        COUNT(CASE WHEN is_mobile = true THEN 1 END) as mobile_count,
                        COUNT(CASE WHEN is_mobile = false THEN 1 END) as desktop_count
                    FROM public.user_devices WHERE is_deleted = false
                `);
                const topModelsRes = await client.query(`
                    SELECT model, COUNT(*) as count 
                    FROM public.user_devices 
                    WHERE is_deleted = false AND model != 'Unknown' AND model != 'Desktop PC (x64)' 
                    GROUP BY model ORDER BY count DESC LIMIT 5
                `);
                const totalActiveDevicesRes = await client.query(`
                    SELECT COUNT(*) as count FROM public.user_devices WHERE is_deleted = false
                `);

                // 5. Активность по часам суток за последние 30 дней
                const hourlyActivityRes = await client.query(`
                    SELECT 
                        EXTRACT(HOUR FROM attempt_time AT TIME ZONE 'UTC') as hour_of_day,
                        COUNT(*) as count
                    FROM public.user_auth_logins
                    WHERE attempt_time >= NOW() AT TIME ZONE 'UTC' - INTERVAL '30 days'
                    GROUP BY EXTRACT(HOUR FROM attempt_time AT TIME ZONE 'UTC')
                    ORDER BY hour_of_day
                `);

                // Формируем массив из 24 элементов (0-23)
                const hourlyActivity = Array(24).fill(0);
                hourlyActivityRes.rows.forEach(row => {
                    hourlyActivity[Math.floor(row.hour_of_day)] = parseInt(row.count);
                });

                return {
                    overview: {
                        total_logins_24h: totalLogins24h,
                        success_count_24h: parseInt(overview.success_count),
                        fail_count_24h: parseInt(overview.fail_count),
                        fail_rate_24h: parseFloat(failRate24h),
                        unique_active_users_24h: parseInt(overview.unique_users),
                        total_active_devices: parseInt(totalActiveDevicesRes.rows[0].count)
                    },
                    security: {
                        top_fail_reasons: topFailsRes.rows,
                        top_users_with_fails: topUsersFailsRes.rows
                    },
                    devices: {
                        os_breakdown: osRes.rows,
                        browser_breakdown: browserRes.rows,
                        mobile_ratio: {
                            mobile: parseInt(mobileRatioRes.rows[0].mobile_count),
                            desktop: parseInt(mobileRatioRes.rows[0].desktop_count)
                        },
                        top_models: topModelsRes.rows
                    },
                    temporal: {
                        hourly_activity_30d: hourlyActivity
                    },
                    cached_at: new Date().toISOString()
                };
            } catch (error) {
                console.error('[getSystemStats] Ошибка агрегации:', error);
                throw error;
            }
        }, 300); // TTL = 300 секунд (5 минут)
    }




}

module.exports = new UserLoginTrackingService();
