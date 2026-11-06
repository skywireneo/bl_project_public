const bcrypt = require('bcryptjs');
const tokenService = require('../../systemServices/tokenService');
const apiError = require('../../../exceptions/apiError');
const { hashData } = require('../../systemServices/cryptoService');
const userLoginTrackingService = require('../system/userLoginTrackingService');
const userRefreshTokenService = require('../system/userRefreshTokenService');
const staffSecurityService = require('./staffSecurityService');
const jwt = require('jsonwebtoken');
const userDevicesService = require('./userDevicesService');
const userSessionsService = require('../system/userSessionsService');
const mainSettindsService = require('../../systemSettings/mainSettindsService');
const permissionService = require('../../systemServices/permissionService');

const userSecurityService = require('./userSecurityService');


class userLoginService {
    async loginUser(client, login, pass, userAgent = '', ip = null, deviceInfo = null) {

        console.log(userAgent, ip, deviceInfo)
        // // Определяем, является ли login email-ом
        // const isEmailInput = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login);

        // // Валидируем: если email — то как email, иначе как логин
        // if (isEmailInput) {
        //     validateService.userValidation.validateEmail(login);
        // } else {
        //     validateService.userValidation.validateLogin(login);
        // }
        // validateService.userValidation.validatePassword(pass);

        //!===========Проверить на сервере

        // === DEBUG: вывод всей информации ===
        // console.log("=== [DEBUG] LOGIN INFO ===");
        // console.log("Login:", login);
        // console.log("Password:", pass); // уже расшифрована
        // console.log("Device info:", deviceInfo);
        // console.log("User Agent:", userAgent);
        // console.log("IP:", ip);

        // // === Определение гео по IP ===
        // let geoInfo = null;
        // if (ip) {
        //     geoInfo = geoip.lookup(ip);
        // }
        // console.log("Geo info:", geoInfo); // будет объект { country, region, city, ll, metro, zip } или null

        // //!===========

        let candidate = null;
        let loginMethod = 'login'; // 'login' или 'email'

        const mainAdmin = await mainSettindsService.selectSetting(client, 'main_admin');
        const mainDev = await mainSettindsService.selectSetting(client, 'main_dev');
        const closeLogin = await mainSettindsService.selectSetting(client, 'lockdown_mode');

        if (closeLogin === 'true' || closeLogin === true) {
            const allowedLogins = [
                String(mainAdmin).toLowerCase(),
                String(mainDev).toLowerCase()
            ].filter(Boolean);
            if (!allowedLogins.includes(String(login).toLowerCase())) {
                // ПРАВИЛЬНО
                throw apiError.BadRequest('US110', `Вход временно заблокирован администратором в целях безопасности. Попробуйте позже через 10 минут!`);
            }
        }

        // 1. Сначала ищем по login
        const loginRes = await client.query(
            `SELECT u.user_id, u.pass, u.login, u.status, s.code_name AS status_code, s.is_staff
                    FROM users u
                    LEFT JOIN user_statuses s ON u.status = s.status_id
                    WHERE u.login = $1`,
            [login]
        );

        if (loginRes.rows.length > 0) {
            candidate = loginRes.rows[0];
            loginMethod = 'login';
        } else {
            //     // 2. Если не нашли по login — ищем по email
            //     const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login);
            //     if (isEmail) {
            //         const encEmail = await userEncriptionService.getEmailDataEncrypted(login);
            //         const emailRes = await client.query(
            //             `SELECT u.user_id, u.pass, u.login, u.status, u.name_hesh, u.name_encrypted, u.name_iv, u.name_auth_tag,
            //                     u.flag, u.access, u.telegram_id_encrypted, u.telegram_id_iv, u.telegram_id_auth_tag,
            //                     u.gender_id, u.preferred_language_id, u.theme_preference_id, u.persona_help_type,
            //                     s.code_name AS status_code
            //              FROM users u
            //              JOIN users_emails ue ON u.user_id = ue.user_id
            //              LEFT JOIN user_statuses s ON u.status = s.status_id
            //              WHERE ue.email_hesh = $1 AND ue.confirm = true AND ue.is_for_login = true AND ue.deleted = false
            //              LIMIT 1`,
            //             [encEmail.heshEmail]
            //         );

            //         if (emailRes.rows.length > 0) {
            //             candidate = emailRes.rows[0];
            //             loginMethod = 'email';
            //         }
            //     }
            candidate = null
        }

        if (!candidate) {
            throw apiError.BadRequest('US113', `Пользователь не найден`);
        }

        // // Проверяем подтверждённый email для входа
        // if (loginMethod === 'login') {
        //     // Если вход по login — проверяем что есть хотя бы один подтверждённый email с флагом is_for_login
        //     const loginEmailCheck = await client.query(
        //         `SELECT count(*) FROM users_emails
        //          WHERE user_id = $1 AND confirm = true AND is_for_login = true AND deleted = false`,
        //         [candidate.user_id]
        //     );

        //     // if (parseInt(loginEmailCheck.rows[0].count) === 0) {
        //     //     throw apiError.BadRequest('EMAIL_NOT_CONFIRMED_LOGIN', 'Для входа требуется подтвердить email с флагом "Email для входа"');
        //     // }
        // }
        // // Если loginMethod === 'email' — email уже подтверждён (проверка в WHERE запроса)

        const candidateRes = await client.query(
            `SELECT
                    u.user_id AS user_id,
                    u.pass AS pass,
                    u.login AS login,
                    user_statuses.code_name AS status
                FROM users u
                LEFT JOIN user_statuses ON u.status = user_statuses.status_id
                WHERE u.user_id = $1`,
            [candidate.user_id]
        );

        const candidateData = candidateRes.rows[0];
        // let decryptedTelegramId = null;
        // try {
        //     decryptedTelegramId = await userEncriptionService.getTgIdDataDecrypted(
        //         candidateData.telegram_id_encrypted,
        //         candidateData.telegram_id_iv,
        //         candidateData.telegram_id_auth_tag
        //     );
        // } catch (err) {
        //     this._createLogger('US117', null, candidateData.user_id, { subsegment: 'INDIRECT_ACTIONS', type_of_action: 'GET' })
        //         .inaccessible(`Ошибка расшифровки telegram_id для пользователя: "${candidateData.login}"`);
        //     decryptedTelegramId = null;
        // }
        // const decryptedName = await userEncriptionService.getNameDataDecrypted(
        //     candidateData.name_encrypted,
        //     candidateData.name_iv,
        //     candidateData.name_auth_tag
        // );
        // if (candidateData.status === "PER_BLOCKED") {
        //     await userLoginTrackingService.registerLogin({
        //         user_id: candidateData.user_id,
        //         decryptedTelegramId,
        //         method: 'password',
        //         platform: 'web',
        //         system: 'main',
        //         userAgent,
        //         ip,
        //         deviceInfo,
        //         status: 'fail',
        //         fail_reason: 'Пользователь заблокирован в системе'
        //     });
        //     this._createLogger('US114', null, candidateData.user_id, { subsegment: 'DIRECT_ACTIONS', type_of_action: 'GET' })
        //         .inaccessible(`Попытка входа заблокированного пользователя: "${candidateData.login}"`);
        //     return { status: "BLOCK" };
        // }
        // if (candidateData.flag == -1) {
        //     await userLoginTrackingService.registerLogin({
        //         user_id: candidateData.user_id,
        //         decryptedTelegramId,
        //         method: 'password',
        //         platform: 'web',
        //         system: 'main',
        //         userAgent,
        //         ip,
        //         deviceInfo,
        //         status: 'fail',
        //         fail_reason: 'Аккаунт пользователя заморожен'
        //     });
        //     this._createLogger('US114', null, candidateData.user_id, { subsegment: 'DIRECT_ACTIONS', type_of_action: 'GET' })
        //         .inaccessible(`Попытка входа замороженного аккаунта пользователя: "${candidateData.login}"`);
        //     return { status: "SUSPEND" };
        // }
        const isPassEquals = await bcrypt.compare(pass, candidateData.pass.trim());
        if (!isPassEquals) {
            await userLoginTrackingService.registerLogin(client, {
                user_id: candidateData.user_id,
                decryptedTelegramId: null,
                method: 'password',
                platform: 'web',
                system: 'main',
                userAgent,
                ip,
                deviceInfo,
                status: 'fail',
                fail_reason: 'Неправильный пароль'
            });
            await client.query('COMMIT');
            // this._createLogger('US115', null, candidateData.user_id, { subsegment: 'DIRECT_ACTIONS', type_of_action: 'GET' })
            //     .inaccessible(`Попытка входа с неверным паролем для пользователя: "${candidateData.login}"`);
            throw apiError.BadRequest('US115', `Неверный пароль`);
        }

        //  ПРОВЕРКА: двухэтапная авторизация
        //  ПРОВЕРКА: двухэтапная авторизация (TOTP / админский код)
        if (deviceInfo) {
            const deviceFingerprint = deviceInfo.fingerprint || deviceInfo;
            const existingDevice = await client.query(
                `SELECT id, is_trusted FROM public.user_devices
         WHERE user_id = $1 AND device_fingerprint = $2 AND is_deleted = false`,
                [candidate.user_id, deviceFingerprint]
            );
            const isTrustedDevice = existingDevice.rows.length > 0 && existingDevice.rows[0].is_trusted === true;

            if (!isTrustedDevice) {
                // Проверяем настройки безопасности
                const secRes = await client.query(
                    `SELECT totp_enabled FROM public.user_security_settings WHERE user_id = $1`,
                    [candidate.user_id]
                );
                const secSettings = secRes.rows[0] || { totp_enabled: false };

                // Приоритет: TOTP > админский код
                const requiresTOTP = secSettings.totp_enabled === true;
                const requiresSecondaryPassword = !requiresTOTP && candidate.is_staff;

                if (requiresTOTP || requiresSecondaryPassword) {
                    const tempSessionToken = jwt.sign(
                        {
                            type: 'SECONDARY_AUTH',
                            userId: candidate.user_id,
                            deviceFingerprint,
                            userAgent,
                            ip,
                            requiresTOTP,
                            requiresSecondaryPassword
                        },
                        process.env.JWT_TEMP_SECRET || 'temp-secret-key-change-in-prod',
                        { expiresIn: '5m' }
                    );

                    await userLoginTrackingService.registerLogin(client, {
                        user_id: candidate.user_id,
                        decryptedTelegramId: null,
                        method: 'password',
                        platform: 'web',
                        system: 'main',
                        userAgent,
                        ip,
                        deviceInfo,
                        status: 'secondary_required'
                    });

                    return {
                        requiresSecondaryPassword,   // для стаффа без TOTP
                        requiresTOTP,                // для всех с TOTP
                        tempSessionToken
                    };
                }
            }
        }

        // const main_admin = await settingsService.selectSetting(client, "main_admin");
        // const main_dev = await settingsService.selectSetting(client, "main_dev");
        // const higher_security = [main_admin, main_dev].includes(candidateData.login);

        //  Генерируем данные для токенов
        const userData = {
            id: candidateData.user_id,
            login: candidateData.login,
            status: candidateData.status,
            // name: decryptedName,
            // flag: candidateData.flag,
            // telegram_id: decryptedTelegramId,
            // higher_security,
            // persona_help_type: candidateData.persona_help_type,
            // gl: candidateData.access.includes("GET_LOGS")
        };

        const accessToken = tokenService.generateAccessToken(userData);
        const refreshToken = tokenService.generateRefreshToken({ id: candidateData.user_id });
        // const tokenAccess = tokenService.generateTokens({
        //     access: candidateData.access || []
        // });

        //  СОХРАНЯЕМ REFRESHTOKEN В БД
        const tokenHash = await hashData(refreshToken);
        // console.log(refreshToken)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 дней

        // 1. ЕДИНОЕ место управления устройством
        let deviceId = null;
        const deviceFingerprint = deviceInfo?.fingerprint || null;

        if (deviceFingerprint) {
            const existing = await userDevicesService.isDeviceExist(client, candidateData.user_id, deviceFingerprint);
            if (existing.rows.length > 0) {
                deviceId = existing.rows[0].id;
                await userDevicesService.updateUserDevicesLoginCount(client, ip, deviceId);
            } else {
                deviceId = await userDevicesService.createUserDevice(client, candidateData.user_id, deviceFingerprint, deviceInfo, ip);
            }
        } else {
            // Fallback для API-клиентов без фингерпринта
            deviceId = await userDevicesService.createUserDevice(client, candidateData.user_id, null, { device_name: 'API Client / Unknown', os: 'Unknown', browser: 'API', model: 'test', is_mobile: false }, ip);
        }

        await userSessionsService.revokeSessionsByDevice(client, candidateData.user_id, deviceId);

        // 2. Сохраняем сессию с привязкой к deviceId
        const sessionId = await userRefreshTokenService.saveRefreshToken(
            client,
            candidateData.user_id,
            tokenHash,
            deviceId,
            expiresAt
        );

        // 3. Логируем вход, ПЕРЕДАВАЯ готовый deviceId
        await userLoginTrackingService.registerLogin(client, {
            user_id: candidateData.user_id,
            deviceId: deviceId, // <-- Передаем явно
            decryptedTelegramId: null,
            method: 'password',
            platform: 'web',
            system: 'main',
            userAgent,
            ip,
            deviceInfo,
            status: 'success'
        });

        const permissions = await permissionService.getEffectivePermissions(client, candidateData.user_id);

        return {
            accessToken,
            refreshToken,
            sessionId,
            permissions // <-- ДОБАВЛЯЕМ ЭТО ПОЛЕ
        };
    }


    // Новый метод: завершение двухэтапной авторизации
    async verifySecondaryPassword(client, tempSessionToken, secondaryPassword, totpOrBackupCode, deviceInfo, userAgent, clientIp) {
        try {
            const decoded = jwt.verify(
                tempSessionToken,
                process.env.JWT_TEMP_SECRET || 'temp-secret-key-change-in-prod'
            );
            if (decoded.type !== 'SECONDARY_AUTH') {
                throw apiError.BadRequest('INVALID_TOKEN', 'Невалидный тип токена');
            }
            const userId = decoded.userId;
            const deviceFingerprint = decoded.deviceFingerprint;
            const requiresTOTP = decoded.requiresTOTP === true;
            const requiresSecondaryPassword = decoded.requiresSecondaryPassword === true;

            // === Ветвление по типу 2FA ===
            if (requiresTOTP) {
                if (!totpOrBackupCode) {
                    throw apiError.BadRequest('MISSING_CODE', 'Не указан код TOTP или аварийный код');
                }

                // 1. Сначала пробуем как TOTP
                let totpValid = false;
                try {
                    // Используем checkTOTP, который не требует пароль
                    await userSecurityService.checkTOTP(client, userId, totpOrBackupCode);
                    totpValid = true;
                } catch (e) {
                    totpValid = false;
                }

                if (!totpValid) {
                    // 2. Пробуем как аварийный код
                    const backupResult = await userSecurityService.verifyBackupCode(client, userId, totpOrBackupCode);
                    if (!backupResult.valid) {
                        throw apiError.BadRequest('INVALID_CODE', 'Неверный код TOTP или аварийный код');
                    }
                    // Успех через backup code
                    // (логируем ниже с method: 'backup_code')
                    decoded._usedBackupCode = true;
                    decoded._backupRemaining = backupResult.remaining;
                } else {
                    decoded._usedBackupCode = false;
                }
            } else if (requiresSecondaryPassword) {
                if (!secondaryPassword) {
                    throw apiError.BadRequest('MISSING_CODE', 'Не указан админский код');
                }
                await staffSecurityService.verifySecondaryPassword(client, userId, secondaryPassword, deviceInfo, userAgent, clientIp);
                decoded._usedBackupCode = false;
            } else {
                throw apiError.BadRequest('INVALID_FLOW', 'Неизвестный тип 2FA');
            }

            // === Получаем данные пользователя ===
            const userRes = await client.query(
                `SELECT u.user_id, u.login, s.code_name AS status, u.must_change_password
             FROM users u
             LEFT JOIN user_statuses s ON u.status = s.status_id
             WHERE u.user_id = $1`,
                [userId]
            );
            if (userRes.rows.length === 0) {
                throw apiError.NotFound('USER_NOT_FOUND', 'Пользователь не найден');
            }
            const user = userRes.rows[0];

            // === Управление устройством ===
            let deviceId = null;
            const fingerprint = deviceInfo?.fingerprint || deviceFingerprint;
            if (fingerprint) {
                const existing = await userDevicesService.isDeviceExist(client, userId, fingerprint);
                if (existing.rows.length > 0) {
                    deviceId = existing.rows[0].id;
                    await userDevicesService.updateDeviceAsTrusted(client, deviceId, decoded.ip);
                    await userDevicesService.updateUserDevicesLoginCount(client, decoded.ip, deviceId);
                } else {
                    deviceId = await userDevicesService.createUserDevice(client, userId, fingerprint, deviceInfo, decoded.ip, true);
                }
            } else {
                deviceId = await userDevicesService.createUserDevice(client, userId, null, {
                    device_name: 'API Client / Unknown', os: 'Unknown', browser: 'API', model: 'test', is_mobile: false
                }, decoded.ip, true);
            }
            await userSessionsService.revokeSessionsByDevice(client, userId, deviceId);

            // === Генерация токенов ===
            const userData = {
                id: user.user_id,
                login: user.login,
                status: user.status,
                must_change_password: user.must_change_password || false
            };
            const accessToken = tokenService.generateAccessToken(userData);
            const refreshToken = tokenService.generateRefreshToken({ id: user.user_id });
            const tokenHash = await hashData(refreshToken);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            const sessionId = await userRefreshTokenService.saveRefreshToken(client, user.user_id, tokenHash, deviceId, expiresAt);

            // === Логирование входа ===
            let method = 'password';
            if (requiresTOTP) {
                method = decoded._usedBackupCode ? 'backup_code' : 'totp';
            } else if (requiresSecondaryPassword) {
                method = 'secondary_password';
            }

            await userLoginTrackingService.registerLogin(client, {
                user_id: user.user_id,
                deviceId: deviceId,
                decryptedTelegramId: null,
                method,
                platform: 'web',
                system: 'main',
                userAgent: decoded.userAgent,
                ip: decoded.ip,
                deviceInfo,
                status: 'success'
            });

            const permissions = await permissionService.getEffectivePermissions(client, user.user_id);

            const response = {
                accessToken,
                refreshToken,
                sessionId,
                permissions,
                must_change_password: userData.must_change_password
            };

            // Если использован backup code — сообщим фронту сколько осталось
            if (decoded._usedBackupCode) {
                response.backupCodesRemaining = decoded._backupRemaining;
            }

            return response;
        } catch (err) {
            if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
                throw apiError.BadRequest('INVALID_TOKEN', 'Временный токен истёк или невалиден');
            }
            throw err;
        }
    }

    async loginSeed(client, seedPhrase, userAgent = '', ip = null, deviceInfo = null) {
        try {
            // 1. Проверка сид-фразы и получение пользователя
            const user = await userSecurityService.verifySeedPhrase(client, seedPhrase);

            // 2. Генерация токенов
            const userData = { id: user.user_id, login: user.login, status: user.status };
            const accessToken = tokenService.generateAccessToken(userData);
            const refreshToken = tokenService.generateRefreshToken({ id: user.user_id });
            const tokenHash = await hashData(refreshToken);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            // 3. Управление устройством (ВАЖНО: при входе по сид-фразе устройство СТАНОВИТСЯ ДОВЕРЕННЫМ)
            let deviceId = null;
            const fingerprint = deviceInfo?.fingerprint || null;

            if (fingerprint) {
                const existing = await userDevicesService.isDeviceExist(client, user.user_id, fingerprint);
                if (existing.rows.length > 0) {
                    deviceId = existing.rows[0].id;
                    await userDevicesService.updateDeviceAsTrusted(client, deviceId, ip);
                    await userDevicesService.updateUserDevicesLoginCount(client, ip, deviceId);
                } else {
                    // isTrusted = true (последний параметр)
                    deviceId = await userDevicesService.createUserDevice(client, user.user_id, fingerprint, deviceInfo, ip, true);
                }
            } else {
                deviceId = await userDevicesService.createUserDevice(client, user.user_id, null, { device_name: 'API Client / Unknown', os: 'Unknown', browser: 'API', model: 'test', is_mobile: false }, ip, true);
            }

            await userSessionsService.revokeSessionsByDevice(client, user.user_id, deviceId);

            // 4. Сохранение сессии (используем импортированный сервис)
            const sessionId = await userRefreshTokenService.saveRefreshToken(client, user.user_id, tokenHash, deviceId, expiresAt);

            // 5. Логирование (используем импортированный сервис)
            await userLoginTrackingService.registerLogin(client, {
                user_id: user.user_id,
                deviceId: deviceId,
                decryptedTelegramId: null,
                method: 'seed_phrase',
                platform: 'web',
                system: 'main',
                userAgent,
                ip,
                deviceInfo,
                status: 'success'
            });

            // Получение прав (используем импортированный сервис)
            const permissions = await permissionService.getEffectivePermissions(client, user.user_id);

            return {
                accessToken,
                refreshToken,
                sessionId,
                permissions,
                must_change_password: false
            };
        } catch (error) {
            throw error;
        }
    }

    async checkToken(client, refreshTokenOld, data, userAgent = '', clientIp = null) {
        const candidateRes = await client.query(
            `SELECT
                    u.user_id,
                    u.pass,
                    u.login,
                    s.code_name AS status
                FROM users u
                LEFT JOIN user_statuses s ON u.status = s.status_id
                WHERE u.user_id = $1`,
            [data.id]
        );

        if (candidateRes.rowCount === 0) return null;

        const candidate = candidateRes.rows[0];

        // //  ПРОВЕРКА БЛОКИРОВКИ - заблокированный пользователь не может пройти проверку
        // if (candidate.status === "PER_BLOCKED") {
        //     this._createLogger('US121_ERR', null, candidate.user_id, { subsegment: 'DIRECT_ACTIONS', type_of_action: 'GET' })
        //         .highAttention(`ЗАБЛОКИРОВАННЫЙ ПОЛЬЗОВАТЕЛЬ ПОПЫТАЛСЯ ПРОЙТИ ПРОВЕРКУ: ${candidate.login}`);
        //     throw apiError.UnauthorizedError('Пользователь заблокирован');
        // }

        const tokenHashOld = await hashData(refreshTokenOld);

        //  2. Ищем refreshToken в БД
        const refreshTokenRecord = await userRefreshTokenService.findRefreshToken(client, tokenHashOld);

        // ПРЕДЛОЖЕНИЕ А: Проверка на отозванный токен (findRefreshToken уже фильтрует revoked=FALSE, но если он не найден, значит он отозван или истек)
        if (!refreshTokenRecord) {
            await userLoginTrackingService.registerLogin(client, {
                user_id: data.id,
                method: 'refresh',
                platform: 'web',
                system: 'main',
                userAgent,
                ip: clientIp,
                status: 'fail',
                fail_reason: 'Attempt to use revoked or expired token'
            });
            throw apiError.Forbidden('SESSION_REVOKED', 'Сессия была завершена из соображений безопасности');
        }

        const decodedRefresh = tokenService.validateRefreshToken(refreshTokenOld);
        if (!decodedRefresh) {
            // Отзываем токен при невалидном JWT
            await userRefreshTokenService.revokeRefreshToken(client, tokenHashOld);
            // this._createLogger('US185', null, refreshTokenRecord.user_id, { subsegment: 'INDIRECT_ACTIONS', type_of_action: 'GET' })
            //     .inaccessible(`Попытка обновления с невалидным JWT refreshToken`);
            throw apiError.BadRequest('INVALID_REFRESH_TOKEN', 'Невалидный refresh токен 2');
        }

        //  4. Проверяем что пользователь в JWT соответствует записи в БД
        const userIdFromJWT = decodedRefresh.data.id;
        if (userIdFromJWT !== refreshTokenRecord.user_id) {
            await userRefreshTokenService.revokeRefreshToken(client, tokenHashOld);
            // this._createLogger('US186', null, refreshTokenRecord.user_id, { subsegment: 'SECURITY', type_of_action: 'GET' })
            //     .highAttention(`НЕСООТВЕТСТВИЕ USER_ID: JWT=${userIdFromJWT}, БД=${refreshTokenRecord.user_id}`);
            throw apiError.BadRequest('TOKEN_MISMATCH', 'Несоответствие токена');
        }

        // ПРЕДЛОЖЕНИЕ Б: Проверка, не удалено ли устройство (soft delete)
        const deviceCheck = await client.query(`SELECT is_deleted FROM public.user_devices WHERE id = $1`, [refreshTokenRecord.device_id]);
        if (deviceCheck.rows.length > 0 && deviceCheck.rows[0].is_deleted) {
            await userRefreshTokenService.revokeRefreshToken(client, tokenHashOld);
            await userLoginTrackingService.registerLogin(client, {
                user_id: refreshTokenRecord.user_id,
                method: 'refresh',
                platform: 'web',
                system: 'main',
                userAgent,
                ip: clientIp,
                status: 'fail',
                fail_reason: 'Device was deleted'
            });
            throw apiError.Forbidden('DEVICE_DELETED', 'Устройство было удалено, сессия завершена');
        }

        // ПРЕДЛОЖЕНИЕ Д: Обновляем last_used
        await userRefreshTokenService.updateLastUsed(client, tokenHashOld);

        // //  Расшифровываем telegram_id
        // let decryptedTelegramId = null;
        // try {
        //     decryptedTelegramId = await userEncriptionService.getTgIdDataDecrypted(
        //         candidate.telegram_id_encrypted,
        //         candidate.telegram_id_iv,
        //         candidate.telegram_id_auth_tag
        //     );
        // } catch (err) {
        //     this._createLogger('US121_ERR', null, candidate.user_id, { subsegment: 'DECRYPTION', type_of_action: 'ERROR' })
        //         .inaccessible(`Ошибка расшифровки Telegram ID при проверке токена для user_id=${candidate.user_id}`);
        // }

        // const decryptedName = await userEncriptionService.getNameDataDecrypted(
        //     candidate.name_encrypted,
        //     candidate.name_iv,
        //     candidate.name_auth_tag
        // );

        // //  Определяем повышенную безопасность
        // const main_admin = await settingsService.selectSetting(client, "main_admin");
        // const main_dev = await settingsService.selectSetting(client, "main_dev");
        // const higher_security = [main_admin, main_dev].includes(candidate.login);
        await userRefreshTokenService.revokeRefreshToken(client, tokenHashOld);

        //  Генерируем токены
        const userData = {
            id: candidate.user_id,
            login: candidate.login,
            status: candidate.status//,
            // name: decryptedName,
            // flag: candidate.flag,
            // telegram_id: decryptedTelegramId,
            // higher_security,
            // persona_help_type: candidate.persona_help_type,
            // gl: candidate.access.includes("GET_LOGS")
        };

        const accessToken = tokenService.generateAccessToken(userData);
        const refreshToken = tokenService.generateRefreshToken({ id: candidate.user_id });
        // const tokenAccess = tokenService.generateTokens({
        //     access: candidate.access || []
        // });

        //  СОХРАНЯЕМ REFRESHTOKEN В БД
        const tokenHash = await hashData(refreshToken);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 дней

        const sessionId = await userRefreshTokenService.saveRefreshToken(
            client,
            candidate.user_id,
            tokenHash,
            refreshTokenRecord.device_id, // Сохраняем привязку к тому же устройству
            expiresAt
        );

        //await this.updateOnline(candidate.user_id);

        const permissions = await permissionService.getEffectivePermissions(client, candidate.user_id);

        return {
            accessToken,
            refreshToken,
            sessionId,
            permissions // <-- ДОБАВЛЯЕМ ЭТО ПОЛЕ
        };
    }

    async refreshTokens(client, refreshToken, userAgent = '', clientIp = null) {
        try {
            //  1. Хешируем refreshToken для поиска в БД
            // console.log(refreshToken)
            const tokenHash = await hashData(refreshToken);

            //  2. Ищем refreshToken в БД
            // console.log(tokenHash)
            const refreshTokenRecord = await userRefreshTokenService.findRefreshToken(client, tokenHash);

            if (!refreshTokenRecord) {
                // Пытаемся извлечь user_id из JWT, чтобы залогировать, даже если токен не найден в БД
                let targetUserId = null;
                try {
                    const decodedRefresh = tokenService.validateRefreshToken(refreshToken);
                    if (decodedRefresh) targetUserId = decodedRefresh.data.id;
                } catch (e) { /* Игнорируем, если JWT совсем невалиден */ }

                await userLoginTrackingService.registerLogin(client, {
                    user_id: targetUserId,
                    method: 'refresh',
                    platform: 'web',
                    system: 'main',
                    userAgent,
                    ip: clientIp,
                    status: 'fail',
                    fail_reason: 'Attempt to use revoked or expired token'
                });
                throw apiError.Forbidden('SESSION_REVOKED', 'Сессия была завершена из соображений безопасности');
            }

            //  3. Проверяем refresh токен JWT
            const decodedRefresh = tokenService.validateRefreshToken(refreshToken);
            if (!decodedRefresh) {
                // Отзываем токен при невалидном JWT
                await userRefreshTokenService.revokeRefreshToken(client, tokenHash);
                // this._createLogger('US168', null, refreshTokenRecord.user_id, { subsegment: 'INDIRECT_ACTIONS', type_of_action: 'GET' })
                //     .inaccessible(`Попытка обновления с невалидным JWT refreshToken`);
                throw apiError.BadRequest('INVALID_REFRESH_TOKEN', 'Невалидный refresh токен 4');
            }

            //  4. Проверяем что пользователь в JWT соответствует записи в БД
            const userIdFromJWT = decodedRefresh.data.id;
            if (userIdFromJWT !== refreshTokenRecord.user_id) {
                await userRefreshTokenService.revokeRefreshToken(client, tokenHash);
                // this._createLogger('US169', null, refreshTokenRecord.user_id, { subsegment: 'SECURITY', type_of_action: 'GET' })
                //     .highAttention(`НЕСООТВЕТСТВИЕ USER_ID: JWT=${userIdFromJWT}, БД=${refreshTokenRecord.user_id}`);
                throw apiError.BadRequest('TOKEN_MISMATCH', 'Несоответствие токена');
            }

            const deviceCheck = await client.query(`SELECT is_deleted FROM public.user_devices WHERE id = $1`, [refreshTokenRecord.device_id]);
            if (deviceCheck.rows.length > 0 && deviceCheck.rows[0].is_deleted) {
                await userRefreshTokenService.revokeRefreshToken(client, tokenHash);
                await userLoginTrackingService.registerLogin(client, {
                    user_id: refreshTokenRecord.user_id,
                    method: 'refresh',
                    platform: 'web',
                    system: 'main',
                    userAgent,
                    ip: clientIp,
                    status: 'fail',
                    fail_reason: 'Device was deleted'
                });
                throw apiError.Forbidden('DEVICE_DELETED', 'Устройство было удалено, сессия завершена');
            }

            await userRefreshTokenService.updateLastUsed(client, tokenHash);

            //  5. Получаем актуальные данные пользователя из БД
            const userId = refreshTokenRecord.user_id;
            const candidateRes = await client.query(
                `SELECT
                    u.user_id,
                    u.pass,
                    u.login,
                    s.code_name AS status
                FROM users u
                LEFT JOIN user_statuses s ON u.status = s.status_id
                WHERE u.user_id = $1`,
                [userId]
            );

            if (candidateRes.rowCount === 0) {
                // Отзываем токен если пользователь не найден
                await userRefreshTokenService.revokeRefreshToken(client, tokenHash);
                // this._createLogger('US170', null, userId, { subsegment: 'INDIRECT_ACTIONS', type_of_action: 'GET' })
                //     .inaccessible(`Попытка обновления токена для несуществующего пользователя с ID: ${userId}`);
                throw apiError.BadRequest('USER_NOT_FOUND', 'Пользователь не найден');
            }

            const candidate = candidateRes.rows[0];

            // //  6. КРИТИЧЕСКАЯ ПРОВЕРКА БЛОКИРОВКИ
            // if (candidate.status === "PER_BLOCKED") {
            //     // Немедленно отзываем ВСЕ токены пользователя
            //     await this.#revokeAllUserRefreshTokens(userId);

            //     this._createLogger('US171', null, userId, { subsegment: 'DIRECT_ACTIONS', type_of_action: 'GET' })
            //         .highAttention(`ЗАБЛОКИРОВАННЫЙ ПОЛЬЗОВАТЕЛЬ ПОПЫТАЛСЯ ОБНОВИТЬ ТОКЕН: ${candidate.login}`);
            //     throw apiError.UnauthorizedError('Пользователь заблокирован');
            // }

            //  7. Расшифровываем данные пользователя
            // let decryptedTelegramId = null;
            // try {
            //     decryptedTelegramId = await userEncriptionService.getTgIdDataDecrypted(
            //         candidate.telegram_id_encrypted,
            //         candidate.telegram_id_iv,
            //         candidate.telegram_id_auth_tag
            //     );
            // } catch (err) {
            //     this._createLogger('US172', null, userId, { subsegment: 'DECRYPTION', type_of_action: 'ERROR' })
            //         .inaccessible(`Ошибка расшифровки Telegram ID при обновлении токена для user_id=${userId}`);
            // }

            // const decryptedName = await userEncriptionService.getNameDataDecrypted(
            //     candidate.name_encrypted,
            //     candidate.name_iv,
            //     candidate.name_auth_tag
            // );

            // //  8. Генерируем новые токены
            // const main_admin = await settingsService.selectSetting(client, "main_admin");
            // const main_dev = await settingsService.selectSetting(client, "main_dev");
            // const higher_security = [main_admin, main_dev].includes(candidate.login);

            const userData = {
                id: candidate.user_id,
                login: candidate.login,
                status: candidate.status//,
                // name: decryptedName,
                // flag: candidate.flag,
                // telegram_id: decryptedTelegramId,
                // higher_security,
                // persona_help_type: candidate.persona_help_type,
                // gl: candidate.access.includes("GET_LOGS")
            };

            const accessToken = tokenService.generateAccessToken(userData);
            const newRefreshToken = tokenService.generateRefreshToken({ id: candidate.user_id });
            // const tokenAccess = tokenService.generateTokens({
            //     access: candidate.access || []
            // });

            //  9. Отзываем старый refreshToken и сохраняем новый
            await userRefreshTokenService.revokeRefreshToken(client, tokenHash);

            // Рассчитываем дату истечения нового refreshToken (30 дней)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            const newTokenHash = await hashData(newRefreshToken);
            const sessionId = await userRefreshTokenService.saveRefreshToken(
                client,
                userId,
                newTokenHash,
                refreshTokenRecord.device_id, // Сохраняем привязку к тому же устройству
                expiresAt
            );

            //  10. Логируем успешное обновление
            // this._createLogger('US173', null, userId, { subsegment: 'DIRECT_ACTIONS', type_of_action: 'GET' })
            //     .action(`Успешное обновление токенов для пользователя: ${candidate.login}`);

            //  11. Возвращаем новые токены
            const permissions = await permissionService.getEffectivePermissions(client, candidate.user_id); // или userId

            return {
                accessToken,
                refreshToken,
                sessionId,
                permissions // <-- ДОБАВЛЯЕМ ЭТО ПОЛЕ
            };

        } catch (error) {
            // Логируем ошибку
            // this._createLogger('US174', null, null, { subsegment: 'ERROR', type_of_action: 'GET' })
            //     .inaccessible(`Ошибка обновления токенов: ${error.message}`);
            throw error;
        }
    }
}
module.exports = new userLoginService();