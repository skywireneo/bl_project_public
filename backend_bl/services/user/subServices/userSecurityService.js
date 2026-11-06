const bip39 = require('bip39');
const nacl = require('tweetnacl');
const speakeasy = require('speakeasy'); // ЗАМЕНЕНО: speakeasy вместо otplib для избежания ESM ошибки
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const apiError = require('../../../exceptions/apiError');
const { encrypt, decrypt, hashData } = require('../../systemServices/cryptoService');
const cacheService = require('../../systemServices/cacheService');
const userDevicesService = require('./userDevicesService');
const tokenService = require('../../systemServices/tokenService');
const pgdb = require('../../../pgdb');

// Импорты для корректной работы verifyDeviceCode
const userRefreshTokenService = require('../system/userRefreshTokenService');
const userSessionsService = require('../system/userSessionsService');
const userLoginTrackingService = require('../system/userLoginTrackingService');
const permissionService = require('../../systemServices/permissionService');

class userSecurityService {

    async initializeSecuritySettings(client, userId) {
        // Вставляем только user_id, остальные поля возьмут значения по умолчанию (FALSE или NULL)
        // из схемы таблицы, которую мы создали ранее
        await client.query(
            `INSERT INTO public.user_security_settings (user_id) 
             VALUES ($1)`,
            [userId]
        );
    }

    // ==========================================
    // УНИВЕРСАЛЬНЫЙ МЕТОД ЛОГИРОВАНИЯ ДЕЙСТВИЙ БЕЗОПАСНОСТИ
    // Использует существующую таблицу password_change_history
    // ==========================================
    async logSecurityAction(client, userId, actorUserId, changeType, reason = null) {
        await client.query(
            `INSERT INTO public.password_change_history (user_id, actor_user_id, change_type, reason)
             VALUES ($1, $2, $3, $4)`,
            [userId, actorUserId, changeType, reason]
        );
    }

    // УНИВЕРСАЛЬНАЯ ПРОВЕРКА ПАРОЛЯ
    async verifyUserPassword(client, userId, password) {
        const res = await client.query(
            `SELECT pass FROM public.users WHERE user_id = $1`,
            [userId]
        );
        if (res.rows.length === 0) {
            throw apiError.NotFound('USER_NOT_FOUND', 'Пользователь не найден');
        }
        const isValid = await bcrypt.compare(password, res.rows[0].pass.trim());
        if (!isValid) {
            throw apiError.BadRequest('INVALID_PASSWORD', 'Неверный пароль');
        }
        return true;
    }

    // 1. Генерация сид-фразы (теперь требует пароль)
    async generateSeedPhrase(client, userId, password) {
        await this.verifyUserPassword(client, userId, password);

        const mnemonic = bip39.generateMnemonic(128);
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const keyPair = nacl.sign.keyPair.fromSeed(seed.slice(0, 32));
        const publicKey = Buffer.from(keyPair.publicKey).toString('hex');

        await client.query(
            `UPDATE public.user_security_settings SET seed_public_key = $1, updated_at = NOW() WHERE user_id = $2`,
            [publicKey, userId]
        );

        await this.logSecurityAction(client, userId, userId, 'SEED_GENERATED', 'Генерация новой сид-фразы');
        return { mnemonic, publicKey };
    }

    // 2. Проверка сид-фразы при входе
    async verifySeedPhrase(client, mnemonic) {
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const keyPair = nacl.sign.keyPair.fromSeed(seed.slice(0, 32));
        const publicKey = Buffer.from(keyPair.publicKey).toString('hex');

        const res = await client.query(
            `SELECT u.user_id, u.login, s.code_name AS status 
             FROM users u 
             JOIN user_security_settings uss ON u.user_id = uss.user_id
             LEFT JOIN user_statuses s ON u.status = s.status_id
             WHERE uss.seed_public_key = $1`,
            [publicKey]
        );

        if (res.rows.length === 0) {
            throw apiError.BadRequest('INVALID_SEED', 'Неверная сид-фраза');
        }

        return res.rows[0];
    }

    // 3. Настройка TOTP (ИСПРАВЛЕНО: используется speakeasy)
    async setupTOTP(client, userId, login) {
        const secret = speakeasy.generateSecret({
            length: 20,
            name: `BL:${login}`,
            issuer: 'BL'
        });
        const encrypted = encrypt(secret.base32, 'IDENTITY_KEY');
        // ИСПРАВЛЕНО: totp_enabled = false (включится только после верификации)
        await client.query(
            `UPDATE public.user_security_settings
         SET totp_secret_encrypted = $1, totp_iv = $2, totp_auth_tag = $3, totp_enabled = false, updated_at = NOW()
         WHERE user_id = $4`,
            [encrypted.encrypted, encrypted.iv, encrypted.authTag, userId]
        );
        return secret.otpauth_url;
    }

    // 4. Проверка и включение TOTP (теперь требует пароль)
    async verifyTOTP(client, userId, token, password) {
        await this.verifyUserPassword(client, userId, password);

        const res = await client.query(
            `SELECT totp_secret_encrypted, totp_iv, totp_auth_tag FROM public.user_security_settings WHERE user_id = $1`,
            [userId]
        );
        if (res.rows.length === 0 || !res.rows[0].totp_secret_encrypted) {
            throw apiError.BadRequest('TOTP_NOT_CONFIGURED', 'TOTP не настроен');
        }
        const row = res.rows[0];
        const secretBase32 = decrypt(
            { encrypted: row.totp_secret_encrypted, iv: row.totp_iv, authTag: row.totp_auth_tag },
            'IDENTITY_KEY'
        );

        const isValid = speakeasy.totp.verify({
            secret: secretBase32,
            encoding: 'base32',
            token: token,
            window: 1
        });

        if (!isValid) {
            throw apiError.BadRequest('INVALID_TOTP', 'Неверный код TOTP');
        }

        await client.query(
            `UPDATE public.user_security_settings SET totp_enabled = true, updated_at = NOW() WHERE user_id = $1`,
            [userId]
        );

        await this.logSecurityAction(client, userId, userId, 'TOTP_ENABLED', 'Успешная привязка и включение TOTP');
        return true;
    }

    // 4.1. Проверка TOTP при входе (БЕЗ пароля)
    // Используется на втором шаге 2FA, так как пароль уже был проверен ранее
    async checkTOTP(client, userId, token) {
        const res = await client.query(
            `SELECT totp_secret_encrypted, totp_iv, totp_auth_tag, totp_enabled 
             FROM public.user_security_settings WHERE user_id = $1`,
            [userId]
        );

        if (res.rows.length === 0 || !res.rows[0].totp_enabled || !res.rows[0].totp_secret_encrypted) {
            throw apiError.BadRequest('TOTP_NOT_CONFIGURED', 'TOTP не настроен или не включен');
        }

        const row = res.rows[0];
        const secretBase32 = decrypt(
            { encrypted: row.totp_secret_encrypted, iv: row.totp_iv, authTag: row.totp_auth_tag },
            'IDENTITY_KEY'
        );

        // 💡 window: 2 допускает рассинхронизацию часов до ±30 секунд (стандарт для продакшена)
        const isValid = speakeasy.totp.verify({
            secret: secretBase32,
            encoding: 'base32',
            token: token,
            window: 2
        });

        if (!isValid) {
            throw apiError.BadRequest('INVALID_TOTP', 'Неверный код TOTP');
        }

        return true;
    }

    // 5. Запрос кода для входа с другого устройства (вызывается с НОВОГО устройства)
    async requestDeviceCode(client, login, deviceInfo, clientIp, userAgent) {
        const userRes = await client.query(`SELECT user_id FROM users WHERE login = $1`, [login]);
        if (userRes.rows.length === 0) {
            throw apiError.BadRequest('USER_NOT_FOUND', 'Пользователь не найден');
        }
        const userId = userRes.rows[0].user_id;

        const trustedDeviceRes = await client.query(
            `SELECT id FROM public.user_devices WHERE user_id = $1 AND is_trusted = true AND is_deleted = false LIMIT 1`,
            [userId]
        );

        if (trustedDeviceRes.rows.length === 0) {
            throw apiError.BadRequest('NO_TRUSTED_DEVICES', 'Нет доверенных устройств. Используйте пароль или сид-фразу.');
        }

        // ИСПРАВЛЕНО: криптографически стойкая генерация
        const code = crypto.randomInt(100000, 999999).toString();

        // БЕЗОПАСНЕЕ: добавляем userId в ключ кэша для избежания коллизий
        const cacheKey = `device_auth_code:${userId}:${code}`;

        // СОХРАНЯЕМ ДАННЫЕ НОВОГО УСТРОЙСТВА В КЭШ
        await cacheService.set('device_auth', cacheKey, {
            userId,
            login,
            confirmed: false,
            tokens: null,
            newDeviceInfo: deviceInfo,   // Данные нового устройства
            newClientIp: clientIp,       // IP нового устройства
            newUserAgent: userAgent,     // User-Agent нового устройства
            createdAt: Date.now()
        }, 120);

        return { code, expiresIn: 120 };
    }

    // 6. Подтверждение кода с доверенного устройства
    async verifyDeviceCode(client, login, code, deviceInfo, userAgent, clientIp) {
        // Сначала получаем userId по login, чтобы сформировать ключ кэша
        const userRes = await client.query(`SELECT user_id FROM users WHERE login = $1`, [login]);
        if (userRes.rows.length === 0) {
            throw apiError.BadRequest('USER_NOT_FOUND', 'Пользователь не найден');
        }
        const userId = userRes.rows[0].user_id;
        const cacheKey = `device_auth_code:${userId}:${code}`;

        const cachedData = await cacheService.get('device_auth', cacheKey);

        if (!cachedData) {
            throw apiError.BadRequest('INVALID_OR_EXPIRED_CODE', 'Код неверный или истек');
        }

        if (cachedData.confirmed) {
            throw apiError.BadRequest('ALREADY_CONFIRMED', 'Код уже был использован');
        }

        // ИЗВЛЕКАЕМ ДАННЫЕ НОВОГО УСТРОЙСТВА
        const { newDeviceInfo, newClientIp, newUserAgent } = cachedData;

        try {
            // РАБОТАЕМ С УСТРОЙСТВОМ, КОТОРОЕ ЗАПРАШИВАЕТ ВХОД (НОВОЕ)
            const fingerprint = newDeviceInfo?.fingerprint || null;
            let deviceId = null;

            if (fingerprint) {
                const existing = await userDevicesService.isDeviceExist(client, userId, fingerprint);
                if (existing.rows.length > 0) {
                    deviceId = existing.rows[0].id;
                    await userDevicesService.updateDeviceAsTrusted(client, deviceId, newClientIp);
                    await userDevicesService.updateUserDevicesLoginCount(client, newClientIp, deviceId);
                } else {
                    deviceId = await userDevicesService.createUserDevice(client, userId, fingerprint, newDeviceInfo, newClientIp, true);
                }
            } else {
                deviceId = await userDevicesService.createUserDevice(client, userId, null, { device_name: 'API Client / Unknown', os: 'Unknown', browser: 'API', model: 'test', is_mobile: false }, newClientIp, true);
            }

            //  ВНИМАНИЕ: revokeSessionsByDevice для НОВОГО deviceId ничего не сделает (это правильно), 
            // но если вы хотели отозвать сессии на ДРУГИХ устройствах, логика должна быть другой.
            await userSessionsService.revokeSessionsByDevice(client, userId, deviceId);

            const userDataRes = await client.query(
                `SELECT u.user_id, u.login, s.code_name AS status FROM users u LEFT JOIN user_statuses s ON u.status = s.status_id WHERE u.user_id = $1`,
                [userId]
            );
            const user = userDataRes.rows[0];

            const userData = { id: user.user_id, login: user.login, status: user.status };
            const accessToken = tokenService.generateAccessToken(userData);
            const refreshToken = tokenService.generateRefreshToken({ id: user.user_id });
            const tokenHash = await hashData(refreshToken);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            const sessionId = await userRefreshTokenService.saveRefreshToken(client, userId, tokenHash, deviceId, expiresAt);

            // ЛОГИРУЕМ ВХОД ДЛЯ НОВОГО УСТРОЙСТВА
            await userLoginTrackingService.registerLogin(client, {
                user_id: userId,
                deviceId: deviceId,
                decryptedTelegramId: null,
                method: 'device_code',
                platform: 'web',
                system: 'main',
                userAgent: newUserAgent,       // Новое устройство
                ip: newClientIp,               // Новый IP
                deviceInfo: newDeviceInfo,     // Новые данные
                status: 'success'
            });

            const permissions = await permissionService.getEffectivePermissions(client, userId);

            // Сохраняем токены в Redis для получения новым устройством
            await cacheService.set('device_auth', cacheKey, {
                userId,
                login,
                confirmed: true,
                tokens: {
                    accessToken,
                    refreshToken,
                    sessionId,
                    permissions,
                    must_change_password: false
                },
                createdAt: cachedData.createdAt
            }, 60);

            return { success: true, message: 'Устройство успешно авторизовано' };
        } catch (error) {
            throw error;
        }
    }

    async checkDeviceCodeStatus(client, login, code) {
        const userRes = await client.query(`SELECT user_id FROM users WHERE login = $1`, [login]);
        if (userRes.rows.length === 0) return { status: 'expired' };

        const cacheKey = `device_auth_code:${userRes.rows[0].user_id}:${code}`;
        const cachedData = await cacheService.get('device_auth', cacheKey);

        if (!cachedData) {
            return { status: 'expired' };
        }

        if (!cachedData.confirmed) {
            return { status: 'pending' };
        }

        const tokens = cachedData.tokens;
        await cacheService.delete('device_auth', cacheKey);

        return {
            status: 'confirmed',
            ...tokens
        };
    }

    // 7. Получение настроек безопасности пользователя
    async getSecuritySettings(client, userId) {
        const res = await client.query(
            `SELECT seed_public_key IS NOT NULL as has_seed, totp_enabled
         FROM public.user_security_settings WHERE user_id = $1`,
            [userId]
        );
        const base = res.rows[0] || { has_seed: false, totp_enabled: false };

        // Добавляем счётчик кодов
        const backupInfo = await this.getBackupCodesCount(client, userId);
        return {
            ...base,
            backup_codes_total: backupInfo.total,
            backup_codes_used: backupInfo.used,
            backup_codes_remaining: backupInfo.remaining
        };
    }

    async getPasswordHistory(client, targetUserId) {
        const res = await client.query(`
            SELECT 
                h.id,
                h.change_type,
                h.reason,
                h.created_at,
                actor.login AS actor_login,
                target.login AS target_login
            FROM public.password_change_history h
            LEFT JOIN public.users actor ON h.actor_user_id = actor.user_id
            LEFT JOIN public.users target ON h.user_id = target.user_id
            WHERE h.user_id = $1
            ORDER BY h.created_at DESC
            LIMIT 50
        `, [targetUserId]);

        return res.rows;
    }

    // 9. Отключение сид-фразы (теперь требует пароль)
    async disableSeedPhrase(client, userId, password) {
        await this.verifyUserPassword(client, userId, password);

        await client.query(
            `UPDATE public.user_security_settings SET seed_public_key = NULL, updated_at = NOW() WHERE user_id = $1`,
            [userId]
        );

        await this.logSecurityAction(client, userId, userId, 'SEED_DISABLED', 'Отключение и удаление сид-фразы');
        return { success: true, message: 'Сид-фраза успешно отключена и удалена' };
    }

    // 10. Отключение TOTP (теперь требует пароль)
    async disableTOTP(client, userId, password) {
        await this.verifyUserPassword(client, userId, password);

        await client.query(
            `UPDATE public.user_security_settings 
             SET totp_secret_encrypted = NULL, totp_iv = NULL, totp_auth_tag = NULL, totp_enabled = false, backup_codes_encrypted = NULL,
             backup_codes_iv = NULL,
             backup_codes_auth_tag = NULL, updated_at = NOW()
             WHERE user_id = $1`,
            [userId]
        );

        await this.logSecurityAction(client, userId, userId, 'TOTP_DISABLED', 'Отключение TOTP аутентификатора');
        return { success: true, message: 'TOTP успешно отключен и удален' };
    }

    // === В начало файла, рядом с другими импортами ===
    // (ничего нового не нужно, cryptoService уже импортирован)

    // === В класс userSecurityService добавить следующие методы ===

    // ==========================================
    // 11. Генерация аварийных кодов (8 штук по 6 цифр)
    // ==========================================
    async generateBackupCodes(client, userId, password) {
        // 1. Получаем пользователя для проверки пароля
        const userRes = await client.query(
            `SELECT u.user_id, u.pass, u.login FROM users u WHERE u.user_id = $1`,
            [userId]
        );
        if (userRes.rows.length === 0) {
            throw apiError.NotFound('USER_NOT_FOUND', 'Пользователь не найден');
        }
        const user = userRes.rows[0];

        // 2. Проверяем пароль
        const isPassEquals = await bcrypt.compare(password, user.pass.trim());
        if (!isPassEquals) {
            throw apiError.BadRequest('INVALID_PASSWORD', 'Неверный пароль');
        }

        // 3. Генерируем 8 кодов по 6 цифр
        const rawCodes = [];
        for (let i = 0; i < 8; i++) {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            rawCodes.push(code);
        }

        // 4. Хешируем каждый код и формируем структуру
        const codesData = rawCodes.map(code => ({
            hash: hashData(code, 'IDENTITY_KEY'),
            used: false
        }));

        // 5. Шифруем весь массив
        const encrypted = encrypt(JSON.stringify(codesData), 'IDENTITY_KEY');

        // 6. Сохраняем в БД
        await client.query(
            `UPDATE public.user_security_settings
         SET backup_codes_encrypted = $1,
             backup_codes_iv = $2,
             backup_codes_auth_tag = $3,
             updated_at = NOW()
         WHERE user_id = $4`,
            [encrypted.encrypted, encrypted.iv, encrypted.authTag, userId]
        );

        // Логируем действие
        await this.logSecurityAction(client, userId, userId, 'BACKUP_CODES_GENERATED', 'Генерация или регенерация аварийных кодов');


        // 7. Возвращаем сырые коды (показать 1 раз!)
        return { codes: rawCodes, total: rawCodes.length };
    }

    // ==========================================
    // 12. Проверка аварийного кода (используется при входе)
    // Возвращает { valid: true, method: 'backup_code' } или { valid: false }
    // При успехе помечает код как использованный
    // ==========================================
    async verifyBackupCode(client, userId, code) {
        const res = await client.query(
            `SELECT backup_codes_encrypted, backup_codes_iv, backup_codes_auth_tag
         FROM public.user_security_settings WHERE user_id = $1`,
            [userId]
        );

        if (res.rows.length === 0 || !res.rows[0].backup_codes_encrypted) {
            return { valid: false };
        }

        const row = res.rows[0];
        let codesData;
        try {
            const decrypted = decrypt(
                { encrypted: row.backup_codes_encrypted, iv: row.backup_codes_iv, authTag: row.backup_codes_auth_tag },
                'IDENTITY_KEY'
            );
            codesData = JSON.parse(decrypted);
        } catch (e) {
            console.error('[ERROR] Failed to decrypt backup codes:', e);
            return { valid: false };
        }

        const codeHash = hashData(code, 'IDENTITY_KEY');

        // Ищем неиспользованный код с таким хешом
        const foundIndex = codesData.findIndex(c => !c.used && c.hash === codeHash);
        if (foundIndex === -1) {
            return { valid: false };
        }

        // Помечаем как использованный
        codesData[foundIndex].used = true;

        const encrypted = encrypt(JSON.stringify(codesData), 'IDENTITY_KEY');
        await client.query(
            `UPDATE public.user_security_settings
         SET backup_codes_encrypted = $1,
             backup_codes_iv = $2,
             backup_codes_auth_tag = $3,
             updated_at = NOW()
         WHERE user_id = $4`,
            [encrypted.encrypted, encrypted.iv, encrypted.authTag, userId]
        );

        // Считаем сколько осталось
        const remaining = codesData.filter(c => !c.used).length;

        return { valid: true, remaining };
    }

    // ==========================================
    // 13. Получить количество оставшихся кодов (для фронта)
    // ==========================================
    async getBackupCodesCount(client, userId) {
        const res = await client.query(
            `SELECT backup_codes_encrypted, backup_codes_iv, backup_codes_auth_tag
         FROM public.user_security_settings WHERE user_id = $1`,
            [userId]
        );

        if (res.rows.length === 0 || !res.rows[0].backup_codes_encrypted) {
            return { total: 0, used: 0, remaining: 0 };
        }

        const row = res.rows[0];
        try {
            const decrypted = decrypt(
                { encrypted: row.backup_codes_encrypted, iv: row.backup_codes_iv, authTag: row.backup_codes_auth_tag },
                'IDENTITY_KEY'
            );
            const codesData = JSON.parse(decrypted);
            const used = codesData.filter(c => c.used).length;
            return {
                total: codesData.length,
                used,
                remaining: codesData.length - used
            };
        } catch (e) {
            return { total: 0, used: 0, remaining: 0 };
        }
    }
}

module.exports = new userSecurityService();