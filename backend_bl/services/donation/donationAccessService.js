const apiError = require('../../exceptions/apiError');
const cryptoService = require('../systemServices/cryptoService');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class DonationAccessService {

    /**
     * Доступ к "Моим плюшкам" по токену
     */
    async getMyDonation(client, token, ipAddress, userAgent) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Ищем заявку с таким токеном
        const requestResult = await client.query(`
            SELECT * FROM donation_requests 
            WHERE access_token_hash = $1 AND status = 'approved'
        `, [tokenHash]);

        if (requestResult.rowCount === 0) {
            await this._logAttempt(client, null, ipAddress, userAgent, 'token', false, 'invalid_token');
            throw apiError.BadRequest('INVALID_TOKEN', 'Неверные данные для входа');
        }

        const request = requestResult.rows[0];
        await this._logAttempt(client, request, ipAddress, userAgent, 'token', true, null);

        // Возвращаем данные пользователя
        return await this._getUserData(client, request);
    }

    /**
     * Вход по email + кодовому слову
     */
    async loginWithCode(client, email, code, ipAddress, userAgent) {
        const emailHesh = cryptoService.hashData(email.toLowerCase(), 'USER_EMAIL');

        // Rate limiting по IP
        await this._checkRateLimit(client, ipAddress);

        // Ищем заявку с таким email
        const requestResult = await client.query(`
            SELECT * FROM donation_requests 
            WHERE email_hesh = $1 AND status = 'approved' AND access_code_hash IS NOT NULL
            ORDER BY processed_at DESC
            LIMIT 1
        `, [emailHesh]);

        if (requestResult.rowCount === 0) {
            await this._logAttempt(client, null, ipAddress, userAgent, 'code', false, 'email_not_found');
            throw apiError.BadRequest('INVALID_CREDENTIALS', 'Неверные данные для входа');
        }

        const request = requestResult.rows[0];

        // Проверяем код
        const codeMatch = await bcrypt.compare(code.toUpperCase(), request.access_code_hash);
        if (!codeMatch) {
            await this._logAttempt(client, request, ipAddress, userAgent, 'code', false, 'invalid_code');
            throw apiError.BadRequest('INVALID_CREDENTIALS', 'Неверные данные для входа');
        }

        await this._logAttempt(client, request, ipAddress, userAgent, 'code', true, null);

        // Генерируем НОВЫЙ токен
        const newToken = crypto.randomBytes(16).toString('hex');
        const newTokenHash = crypto.createHash('sha256').update(newToken).digest('hex');

        await client.query(`
            UPDATE donation_requests 
            SET access_token_hash = $1, updated_at = NOW() AT TIME ZONE 'UTC'
            WHERE request_id = $2
        `, [newTokenHash, request.request_id]);

        const userData = await this._getUserData(client, request);
        userData.access = {
            token: newToken,
            link: `${process.env.FRONTEND_URL || 'https://site.com'}/donation/my?token=${newToken}`
        };

        return userData;
    }

    /**
     * Получить информацию о пользователе по email_hesh
     */
    async getUserInfo(client, emailHesh, current_user) {
        // Расшифровываем email
        const requestResult = await client.query(`
            SELECT email_encrypted, email_iv, email_auth_tag 
            FROM donation_requests 
            WHERE email_hesh = $1 
            LIMIT 1
        `, [emailHesh]);

        if (requestResult.rowCount === 0) {
            throw apiError.NotFound('USER_NOT_FOUND', 'Пользователь не найден');
        }

        const row = requestResult.rows[0];
        const email = cryptoService.decrypt(
            {
                encrypted: row.email_encrypted,
                iv: row.email_iv,
                authTag: row.email_auth_tag
            },
            'USER_EMAIL'
        );

        // История заявок
        const requestsResult = await client.query(`
            SELECT r.*, p.code_name as package_code, p.display_name as package_name
            FROM donation_requests r
            LEFT JOIN donation_packages p ON r.package_id = p.package_id
            WHERE r.email_hesh = $1
            ORDER BY r.requested_at DESC
        `, [emailHesh]);

        // Активные активации
        const activationsResult = await client.query(`
            SELECT 
                a.*,
                p.code_name as package_code,
                p.display_name as package_name,
                p.duration_days
            FROM donation_activations a
            LEFT JOIN donation_packages p ON a.package_id = p.package_id
            WHERE a.email_hesh = $1
            ORDER BY a.activated_at DESC
        `, [emailHesh]);

        // Активные плюшки
        const perksResult = await client.query(`
            SELECT ap.*, p.code_name, p.display_name, p.description, p.icon, p.color
            FROM donation_active_perks ap
            INNER JOIN donation_perks p ON ap.perk_id = p.perk_id
            WHERE ap.email_hesh = $1 AND ap.is_active = true
            ORDER BY p.sort_order
        `, [emailHesh]);

        // История проверок
        const checkLogResult = await client.query(`
            SELECT * FROM donation_check_log 
            WHERE email_hesh = $1 
            ORDER BY created_at DESC 
            LIMIT 100
        `, [emailHesh]);

        // Попытки доступа
        const attemptsResult = await client.query(`
            SELECT * FROM donation_access_attempts 
            WHERE email_hesh = $1 
            ORDER BY created_at DESC 
            LIMIT 20
        `, [emailHesh]);

        // Статистика
        const statsResult = await client.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN operation = 'grant' THEN amount ELSE 0 END), 0) as total_granted,
                COALESCE(SUM(CASE WHEN operation = 'spend' THEN ABS(amount) ELSE 0 END), 0) as total_spent,
                COUNT(DISTINCT CASE WHEN operation = 'spend' THEN activation_id END) as activations_used
            FROM donation_check_log 
            WHERE email_hesh = $1
        `, [emailHesh]);

        // Общая сумма донатов
        const totalDonated = await client.query(`
            SELECT COALESCE(SUM(actual_amount), 0) as total
            FROM donation_requests 
            WHERE email_hesh = $1 AND status = 'approved'
        `, [emailHesh]);

        return {
            email: email,
            email_hesh: emailHesh,
            stats: {
                total_granted: parseInt(statsResult.rows[0].total_granted),
                total_spent: parseInt(statsResult.rows[0].total_spent),
                total_donated: parseFloat(totalDonated.rows[0].total),
                activations_used: parseInt(statsResult.rows[0].activations_used)
            },
            activations: activationsResult.rows,
            active_perks: perksResult.rows,
            requests: requestsResult.rows,
            recent_check_log: checkLogResult.rows,
            access_attempts: attemptsResult.rows
        };
    }

    /**
     * Перегенерация доступа (токен/код)
     */
    async regenerateAccess(client, emailHesh, type, current_user) {
        const result = {};

        // Генерируем новый токен
        if (type === 'token' || type === 'both') {
            const newToken = crypto.randomBytes(16).toString('hex');
            const newTokenHash = crypto.createHash('sha256').update(newToken).digest('hex');

            await client.query(`
                UPDATE donation_requests 
                SET access_token_hash = $1, updated_at = NOW() AT TIME ZONE 'UTC'
                WHERE email_hesh = $2 AND status = 'approved'
            `, [newTokenHash, emailHesh]);

            result.token = newToken;
            result.link = `${process.env.FRONTEND_URL || 'https://site.com'}/donation/my?token=${newToken}`;
        }

        // Генерируем новый код
        if (type === 'code' || type === 'both') {
            const newCode = this._generateCode();
            const newCodeHash = await bcrypt.hash(newCode, 10);

            await client.query(`
                UPDATE donation_requests 
                SET access_code_hash = $1, updated_at = NOW() AT TIME ZONE 'UTC'
                WHERE email_hesh = $2 AND status = 'approved'
            `, [newCodeHash, emailHesh]);

            result.code = newCode;
        }

        return {
            success: true,
            message: 'Доступ перегенерирован',
            ...result
        };
    }

    /**
     * Отзыв доступа
     */
    async revokeAccess(client, emailHesh, reason, current_user) {
        // Деактивируем все активации
        await client.query(`
            UPDATE donation_activations 
            SET is_active = false, updated_at = NOW() AT TIME ZONE 'UTC'
            WHERE email_hesh = $1 AND is_active = true
        `, [emailHesh]);

        // Деактивируем все плюшки
        await client.query(`
            UPDATE donation_active_perks 
            SET is_active = false
            WHERE email_hesh = $1 AND is_active = true
        `, [emailHesh]);

        // Обнуляем токены и коды
        await client.query(`
            UPDATE donation_requests 
            SET 
                access_token_hash = NULL,
                access_code_hash = NULL,
                notes = COALESCE(notes, '') || E'\n[ОТЗЫВ ДОСТУПА ' || $1 || ' ' || $2 || ']: ' || $3,
                updated_at = NOW() AT TIME ZONE 'UTC'
            WHERE email_hesh = $4 AND status = 'approved'
        `, [new Date().toISOString().split('T')[0], current_user.login, reason, emailHesh]);

        return {
            success: true,
            message: 'Доступ отозван',
            email_hesh: emailHesh,
            revoked_by: current_user.login,
            reason: reason
        };
    }

    // ========================================================================
    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    // ========================================================================

    /**
     * Получить данные пользователя для "Моих плюшек"
     */
    async _getUserData(client, request) {
        const email = cryptoService.decrypt(
            {
                encrypted: request.email_encrypted,
                iv: request.email_iv,
                authTag: request.email_auth_tag
            },
            'USER_EMAIL'
        );

        // Активная активация
        const activationResult = await client.query(`
            SELECT 
                a.*,
                p.code_name as package_code,
                p.display_name as package_name
            FROM donation_activations a
            LEFT JOIN donation_packages p ON a.package_id = p.package_id
            WHERE a.email_hesh = $1 AND a.is_active = true
            ORDER BY a.activated_at DESC
            LIMIT 1
        `, [request.email_hesh]);

        let activation = null;
        if (activationResult.rowCount > 0) {
            activation = activationResult.rows[0];
        }

        // Активные плюшки
        const perksResult = await client.query(`
            SELECT ap.*, p.code_name, p.display_name, p.description, p.icon, p.color
            FROM donation_active_perks ap
            INNER JOIN donation_perks p ON ap.perk_id = p.perk_id
            WHERE ap.email_hesh = $1 AND ap.is_active = true
            ORDER BY p.sort_order
        `, [request.email_hesh]);

        // Все доступные плюшки (для отображения с замком)
        const allPerksResult = await client.query(`
            SELECT perk_id, code_name, display_name, description, icon, color, sort_order
            FROM donation_perks 
            WHERE is_active = true
            ORDER BY sort_order
        `);

        // Объединяем: активные + неактивные
        const activePerkIds = new Set(perksResult.rows.map(p => p.perk_id));
        const allPerks = allPerksResult.rows.map(p => ({
            ...p,
            is_active: activePerkIds.has(p.perk_id),
            active_data: perksResult.rows.find(ap => ap.perk_id === p.perk_id) || null
        }));

        // Статистика
        const statsResult = await client.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN operation = 'grant' THEN amount ELSE 0 END), 0) as total_granted,
                COALESCE(SUM(CASE WHEN operation = 'spend' THEN ABS(amount) ELSE 0 END), 0) as total_spent
            FROM donation_check_log 
            WHERE email_hesh = $1
        `, [request.email_hesh]);

        const totalDonated = await client.query(`
            SELECT COALESCE(SUM(actual_amount), 0) as total
            FROM donation_requests 
            WHERE email_hesh = $1 AND status = 'approved'
        `, [request.email_hesh]);

        // Маскируем email для безопасности
        const maskedEmail = email.replace(/^(.{2})(.*)(@.*)$/, (m, p1, p2, p3) => {
            return p1 + '*'.repeat(Math.min(p2.length, 3)) + p3.replace(/(.{1})(.*)(\..*)$/, '$1***$3');
        });

        return {
            email: maskedEmail,
            activation: activation ? {
                activation_id: activation.activation_id,
                package: {
                    code: activation.package_code,
                    name: activation.package_name
                },
                checks_granted: activation.checks_granted,
                checks_remaining: activation.checks_remaining,
                activated_at: activation.activated_at,
                expires_at: activation.expires_at,
                days_remaining: Math.max(0, Math.ceil((new Date(activation.expires_at) - new Date()) / (1000 * 60 * 60 * 24)))
            } : null,
            perks: allPerks,
            stats: {
                total_granted: parseInt(statsResult.rows[0].total_granted),
                total_spent: parseInt(statsResult.rows[0].total_spent),
                total_donated: parseFloat(totalDonated.rows[0].total)
            }
        };
    }

    /**
     * Проверка rate limit
     */
    async _checkRateLimit(client, ipAddress) {
        const result = await client.query(`
            SELECT COUNT(*) as count 
            FROM donation_access_attempts 
            WHERE ip_address = $1 
              AND success = false
              AND created_at > NOW() - INTERVAL '15 minutes'
        `, [ipAddress]);

        const count = parseInt(result.rows[0].count);
        if (count >= 5) {
            throw apiError.BadRequest(
                'RATE_LIMIT_EXCEEDED',
                'Слишком много неудачных попыток. Попробуйте через 15 минут.'
            );
        }
    }

    /**
     * Логирование попытки доступа
     */
    async _logAttempt(client, request, ipAddress, userAgent, method, success, failureReason) {
        try {
            await client.query(`
                INSERT INTO donation_access_attempts 
                    (email_hesh, email_encrypted, email_iv, email_auth_tag,
                     method, success, failure_reason, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                request?.email_hesh || null,
                request?.email_encrypted || null,
                request?.email_iv || null,
                request?.email_auth_tag || null,
                method,
                success,
                failureReason,
                ipAddress,
                userAgent
            ]);
        } catch (e) {
            console.error('[DonationAccess] Failed to log attempt:', e.message);
        }
    }

    _generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const part = () => {
            let result = '';
            for (let i = 0; i < 3; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };
        return `${part()}-${part()}-${part()}`;
    }
}

module.exports = new DonationAccessService();