const apiError = require('../../exceptions/apiError');
const cryptoService = require('../systemServices/cryptoService');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class DonationActivationService {

    /**
     * Одобрение заявки с активацией плюшек
     */
    async approveRequest(client, requestId, actualAmount, notes, current_user) {
        // 1. Проверяем заявку
        const requestResult = await client.query(`
            SELECT * FROM donation_requests WHERE request_id = $1
        `, [requestId]);

        if (requestResult.rowCount === 0) {
            throw apiError.NotFound('REQUEST_NOT_FOUND', 'Заявка не найдена');
        }

        const request = requestResult.rows[0];

        if (request.status === 'approved') {
            throw apiError.BadRequest('ALREADY_APPROVED', 'Заявка уже одобрена');
        }

        if (request.status === 'rejected') {
            throw apiError.BadRequest('ALREADY_REJECTED', 'Заявка уже отклонена');
        }

        // 2. Определяем пакет по сумме
        const packageResult = await client.query(`
            SELECT * FROM donation_packages 
            WHERE is_active = true
              AND min_amount <= $1
              AND (max_amount IS NULL OR max_amount >= $1)
            ORDER BY min_amount DESC
            LIMIT 1
        `, [actualAmount]);

        if (packageResult.rowCount === 0) {
            // Получаем минимальную сумму
            const minResult = await client.query(`
                SELECT MIN(min_amount) as min FROM donation_packages WHERE is_active = true
            `);
            const minAmount = minResult.rows[0].min;

            throw apiError.BadRequest(
                'AMOUNT_TOO_LOW',
                `Сумма ${actualAmount}₽ меньше минимальной (${minAmount}₽). Заявка не может быть одобрена.`
            );
        }

        const packageR = packageResult.rows[0];

        // 3. Получаем плюшки пакета
        const perksResult = await client.query(`
            SELECT p.* FROM donation_perks p
            INNER JOIN donation_package_perks pp ON p.perk_id = pp.perk_id
            WHERE pp.package_id = $1 AND p.is_active = true
            ORDER BY p.sort_order
        `, [packageR.package_id]);

        const perks = perksResult.rows;

        // 4. Расшифровываем email
        const email = cryptoService.decrypt(
            {
                encrypted: request.email_encrypted,
                iv: request.email_iv,
                authTag: request.email_auth_tag
            },
            'USER_EMAIL'
        );

        // 5. Проверяем существующую активную активацию
        const existingActivation = await client.query(`
            SELECT * FROM donation_activations 
            WHERE email_hesh = $1 AND is_active = true
        `, [request.email_hesh]);

        let activation;
        const now = new Date();

        if (existingActivation.rowCount > 0) {
            // ПОВТОРНЫЙ ДОНАТ - продлеваем существующую активацию
            const existing = existingActivation.rows[0];
            const currentExpires = new Date(existing.expires_at);
            const newChecks = existing.checks_remaining + packageR.checks_granted;

            // Продлеваем срок от даты окончания текущего
            const newExpires = new Date(currentExpires);
            newExpires.setUTCDate(newExpires.getUTCDate() + packageR.duration_days);

            const updateResult = await client.query(`
                UPDATE donation_activations 
                SET 
                    checks_remaining = $1,
                    expires_at = $2,
                    updated_at = NOW() AT TIME ZONE 'UTC'
                WHERE activation_id = $3
                RETURNING *
            `, [newChecks, newExpires, existing.activation_id]);

            activation = updateResult.rows[0];
            activation.was_extended = true;
            activation.previous_expires = currentExpires;

            // Обновляем/добавляем плюшки
            for (const perk of perks) {
                await this._activatePerk(
                    client,
                    request,
                    activation.activation_id,
                    perk,
                    newExpires
                );
            }
        } else {
            // ПЕРВЫЙ ДОНАТ или прошлая активация истекла
            const expiresAt = new Date(now);
            expiresAt.setUTCDate(expiresAt.getUTCDate() + packageR.duration_days);
            // Устанавливаем время истечения в 23:59:59
            expiresAt.setUTCHours(23, 59, 59, 0);

            const insertResult = await client.query(`
                INSERT INTO donation_activations 
                    (email_hesh, email_encrypted, email_iv, email_auth_tag, 
                     request_id, package_id, checks_granted, checks_remaining,
                     activated_at, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `, [
                request.email_hesh, request.email_encrypted, request.email_iv, request.email_auth_tag,
                requestId, packageR.package_id, packageR.checks_granted, packageR.checks_granted,
                now, expiresAt
            ]);

            activation = insertResult.rows[0];
            activation.was_extended = false;

            // Активируем все плюшки пакета
            for (const perk of perks) {
                await this._activatePerk(
                    client,
                    request,
                    activation.activation_id,
                    perk,
                    expiresAt
                );
            }
        }

        // 6. Генерируем токен и кодовое слово
        const token = crypto.randomBytes(16).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const code = this._generateCode();
        const codeHash = await bcrypt.hash(code, 10);

        // 7. Обновляем заявку
        await client.query(`
            UPDATE donation_requests 
            SET 
                status = 'approved',
                actual_amount = $1,
                package_id = $2,
                processed_by = $3,
                processed_at = NOW() AT TIME ZONE 'UTC',
                access_token_hash = $4,
                access_code_hash = $5,
                notes = COALESCE($6, notes),
                updated_at = NOW() AT TIME ZONE 'UTC'
            WHERE request_id = $7
        `, [actualAmount, packageR.package_id, current_user.login, tokenHash, codeHash, notes, requestId]);

        // 8. Записываем в историю
        await client.query(`
            INSERT INTO donation_check_log 
                (email_hesh, email_encrypted, email_iv, email_auth_tag, 
                 activation_id, operation, amount, balance_after, comment)
            VALUES ($1, $2, $3, $4, $5, 'grant', $6, $7, $8)
        `, [
            request.email_hesh, request.email_encrypted, request.email_iv, request.email_auth_tag,
            activation.activation_id,
            packageR.checks_granted,
            activation.checks_remaining,
            `Одобрение заявки #${requestId}, пакет "${packageR.display_name}", сумма ${actualAmount}₽`
        ]);

        return {
            success: true,
            message: 'Заявка одобрена, плюшки активированы',
            activation: {
                activation_id: activation.activation_id,
                checks_granted: packageR.checks_granted,
                checks_remaining: activation.checks_remaining,
                activated_at: activation.activated_at,
                expires_at: activation.expires_at,
                was_extended: activation.was_extended,
                previous_expires: activation.previous_expires
            },
            packageR: {
                code: packageR.code_name,
                name: packageR.display_name,
                checks: packageR.checks_granted,
                duration_days: packageR.duration_days
            },
            perks: perks.map(p => ({
                code: p.code_name,
                name: p.display_name,
                description: p.description,
                icon: p.icon,
                color: p.color
            })),
            //  Токен и код возвращаются ОДИН РАЗ для отправки в письме
            access: {
                token: token,
                code: code,
                link: `${process.env.FRONTEND_URL || 'https://site.com'}/donation/my?token=${token}`
            },
            request_id: requestId,
            email: email
        };
    }

    /**
     * Активировать плюшку (или продлить существующую)
     */
    async _activatePerk(client, request, activationId, perk, expiresAt) {
        // Проверяем есть ли уже активная такая плюшка
        const existing = await client.query(`
            SELECT * FROM donation_active_perks 
            WHERE email_hesh = $1 AND perk_id = $2 AND is_active = true
        `, [request.email_hesh, perk.perk_id]);

        if (existing.rowCount > 0) {
            // Продлеваем существующую
            const currentExpires = new Date(existing.rows[0].expires_at);
            const newExpires = currentExpires > expiresAt ? currentExpires : expiresAt;

            await client.query(`
                UPDATE donation_active_perks 
                SET expires_at = $1
                WHERE active_perk_id = $2
            `, [newExpires, existing.rows[0].active_perk_id]);
        } else {
            // Создаём новую
            await client.query(`
                INSERT INTO donation_active_perks 
                    (email_hesh, email_encrypted, email_iv, email_auth_tag,
                     activation_id, perk_id, activated_at, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW() AT TIME ZONE 'UTC', $7)
            `, [
                request.email_hesh, request.email_encrypted, request.email_iv, request.email_auth_tag,
                activationId, perk.perk_id, expiresAt
            ]);
        }
    }

    /**
     * Генерация кодового слова в формате XXX-XXX-XXX
     */
    _generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // без I, O, 0, 1 для читаемости
        const part = () => {
            let result = '';
            for (let i = 0; i < 3; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };
        return `${part()}-${part()}-${part()}`;
    }

    /**
     * Отмена одобрения
     */
    async cancelApproval(client, requestId, reason, current_user) {
        // Проверяем заявку
        const requestResult = await client.query(`
            SELECT * FROM donation_requests WHERE request_id = $1 AND status = 'approved'
        `, [requestId]);

        if (requestResult.rowCount === 0) {
            throw apiError.NotFound('REQUEST_NOT_FOUND', 'Одобренная заявка не найдена');
        }

        const request = requestResult.rows[0];

        // Находим активацию
        const activationResult = await client.query(`
            SELECT * FROM donation_activations WHERE request_id = $1
        `, [requestId]);

        if (activationResult.rowCount === 0) {
            throw apiError.BadRequest('NO_ACTIVATION', 'Активация для этой заявки не найдена');
        }

        const activation = activationResult.rows[0];

        // Списываем начисленные проверки обратно
        await client.query(`
            INSERT INTO donation_check_log 
                (email_hesh, email_encrypted, email_iv, email_auth_tag,
                 activation_id, operation, amount, balance_after, admin_login, comment)
            VALUES ($1, $2, $3, $4, $5, 'adjust', $6, $7, $8, $9)
        `, [
            request.email_hesh, request.email_encrypted, request.email_iv, request.email_auth_tag,
            activation.activation_id,
            -activation.checks_granted,
            activation.checks_remaining - activation.checks_granted,
            current_user.login,
            `Отмена одобрения заявки #${requestId}: ${reason}`
        ]);

        // Обновляем баланс
        await client.query(`
            UPDATE donation_activations 
            SET checks_remaining = checks_remaining - $1
            WHERE activation_id = $2
        `, [activation.checks_granted, activation.activation_id]);

        // Деактивируем плюшки этой активации
        await client.query(`
            UPDATE donation_active_perks 
            SET is_active = false 
            WHERE activation_id = $1
        `, [activation.activation_id]);

        // Деактивируем саму активацию
        await client.query(`
            UPDATE donation_activations 
            SET is_active = false, updated_at = NOW() AT TIME ZONE 'UTC'
            WHERE activation_id = $1
        `, [activation.activation_id]);

        // Отмечаем заявку как pending обратно (чтобы можно было переодобрить)
        await client.query(`
            UPDATE donation_requests 
            SET 
                status = 'pending',
                actual_amount = NULL,
                package_id = NULL,
                processed_by = NULL,
                processed_at = NULL,
                access_token_hash = NULL,
                access_code_hash = NULL,
                email_sent = false,
                email_sent_at = NULL,
                email_sent_by = NULL,
                notes = COALESCE(notes, '') || E'\n[ОТМЕНА ' || $1 || ' ' || $2 || ']: ' || $3,
                updated_at = NOW() AT TIME ZONE 'UTC'
            WHERE request_id = $4
        `, [new Date().toISOString().split('T')[0], current_user.login, reason, requestId]);

        return {
            success: true,
            message: 'Одобрение отменено, плюшки деактивированы',
            request_id: requestId,
            cancelled_by: current_user.login,
            reason: reason
        };
    }
}

module.exports = new DonationActivationService();