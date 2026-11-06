const apiError = require('../../exceptions/apiError');
const cryptoService = require('../systemServices/cryptoService');

class DonationRequestService {

    /**
     * Создание заявки на донат
     */
    async createRequest(client, email, ipAddress, userAgent) {
        try {
            // Rate limiting: не более 3 заявок с одного IP за час
            const rateLimitResult = await client.query(`
                SELECT COUNT(*) as count 
                FROM donation_requests 
                WHERE ip_address = $1 
                  AND created_at > NOW() - INTERVAL '1 hour'
            `, [ipAddress]);

            const requestCount = parseInt(rateLimitResult.rows[0].count);
            if (requestCount >= 3) {
                throw apiError.BadRequest(
                    'RATE_LIMIT_EXCEEDED',
                    'Слишком много заявок с вашего IP. Попробуйте через час.'
                );
            }

            // Хешируем и шифруем email
            const emailHesh = cryptoService.hashData(email.toLowerCase(), 'USER_EMAIL');
            const { encrypted, iv, authTag } = cryptoService.encrypt(email.toLowerCase(), 'USER_EMAIL');

            const result = await client.query(`
                INSERT INTO donation_requests 
                    (email_hesh, email_encrypted, email_iv, email_auth_tag, ip_address, user_agent, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'pending')
                RETURNING request_id, created_at
            `, [emailHesh, encrypted, iv, authTag, ipAddress, userAgent]);

            return {
                success: true,
                message: 'Заявка создана. После оплаты она будет обработана в течение 24 часов.',
                request_id: result.rows[0].request_id,
                requested_at: result.rows[0].created_at
            };
        } catch (error) {
            if (error.code === '23505') {
                // Нарушение уникального индекса - маловероятно для email_hesh, но на всякий случай
                throw apiError.BadRequest('DUPLICATE_REQUEST', 'Заявка с таким email уже существует');
            }
            throw error;
        }
    }

    /**
     * Получение списка заявок для админа
     */
    async getRequests(client, params, current_user) {
        const { status, limit = 50, offset = 0 } = params;

        let query = `
            SELECT 
                r.request_id,
                r.email_hesh,
                r.email_encrypted,
                r.email_iv,
                r.email_auth_tag,
                r.status,
                r.actual_amount,
                r.processed_by,
                r.processed_at,
                r.rejection_reason,
                r.email_sent,
                r.email_sent_at,
                r.email_sent_by,
                r.ip_address,
                r.notes,
                r.requested_at,
                p.code_name as package_code,
                p.display_name as package_name
            FROM donation_requests r
            LEFT JOIN donation_packages p ON r.package_id = p.package_id
        `;

        const queryParams = [];
        let paramIndex = 1;

        if (status) {
            query += ` WHERE r.status = $${paramIndex}`;
            queryParams.push(status);
            paramIndex++;
        }

        query += ` ORDER BY r.requested_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(limit, offset);

        const result = await client.query(query, queryParams);

        // Расшифровываем email для отображения
        const requests = result.rows.map(row => {
            let email = null;
            try {
                email = cryptoService.decrypt(
                    {
                        encrypted: row.email_encrypted,
                        iv: row.email_iv,
                        authTag: row.email_auth_tag
                    },
                    'USER_EMAIL'
                );
            } catch (e) {
                email = '[ошибка расшифровки]';
            }

            return {
                request_id: row.request_id,
                email: email,
                email_hesh: row.email_hesh,
                status: row.status,
                actual_amount: row.actual_amount ? parseFloat(row.actual_amount) : null,
                package: row.package_code ? {
                    code: row.package_code,
                    name: row.package_name
                } : null,
                processed_by: row.processed_by,
                processed_at: row.processed_at,
                rejection_reason: row.rejection_reason,
                email_sent: row.email_sent,
                email_sent_at: row.email_sent_at,
                email_sent_by: row.email_sent_by,
                ip_address: row.ip_address,
                notes: row.notes,
                requested_at: row.requested_at
            };
        });

        return { requests, total: result.rowCount };
    }

    /**
     * Получение деталей заявки
     */
    async getRequestDetail(client, requestId, current_user) {
        const result = await client.query(`
            SELECT 
                r.*,
                p.code_name as package_code,
                p.display_name as package_name,
                p.checks_granted,
                p.duration_days
            FROM donation_requests r
            LEFT JOIN donation_packages p ON r.package_id = p.package_id
            WHERE r.request_id = $1
        `, [requestId]);

        if (result.rowCount === 0) {
            throw apiError.NotFound('REQUEST_NOT_FOUND', 'Заявка не найдена');
        }

        const row = result.rows[0];
        const email = cryptoService.decrypt(
            {
                encrypted: row.email_encrypted,
                iv: row.email_iv,
                authTag: row.email_auth_tag
            },
            'USER_EMAIL'
        );

        return {
            ...row,
            email,
            actual_amount: row.actual_amount ? parseFloat(row.actual_amount) : null
        };
    }

    /**
     * Отклонение заявки
     */
    async rejectRequest(client, requestId, reason, current_user) {
        // Проверяем что заявка в статусе pending
        const checkResult = await client.query(`
            SELECT status FROM donation_requests WHERE request_id = $1
        `, [requestId]);

        if (checkResult.rowCount === 0) {
            throw apiError.NotFound('REQUEST_NOT_FOUND', 'Заявка не найдена');
        }

        if (checkResult.rows[0].status !== 'pending') {
            throw apiError.BadRequest(
                'INVALID_STATUS',
                'Заявка уже обработана. Можно только отменить одобрение.'
            );
        }

        const result = await client.query(`
            UPDATE donation_requests 
            SET 
                status = 'rejected',
                rejection_reason = $1,
                processed_by = $2,
                processed_at = NOW() AT TIME ZONE 'UTC',
                updated_at = NOW() AT TIME ZONE 'UTC'
            WHERE request_id = $3
            RETURNING *
        `, [reason, current_user.login, requestId]);

        return {
            success: true,
            message: 'Заявка отклонена',
            request: result.rows[0]
        };
    }

    /**
     * Отметить письмо как отправленное
     */
    async markEmailSent(client, requestId, current_user) {
        const result = await client.query(`
            UPDATE donation_requests 
            SET 
                email_sent = true,
                email_sent_at = NOW() AT TIME ZONE 'UTC',
                email_sent_by = $1,
                updated_at = NOW() AT TIME ZONE 'UTC'
            WHERE request_id = $2 AND status = 'approved'
            RETURNING *
        `, [current_user.login, requestId]);

        if (result.rowCount === 0) {
            throw apiError.NotFound('REQUEST_NOT_FOUND', 'Одобренная заявка не найдена');
        }

        return {
            success: true,
            message: 'Письмо отмечено как отправленное',
            request: result.rows[0]
        };
    }
}

module.exports = new DonationRequestService();