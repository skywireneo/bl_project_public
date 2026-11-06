const pgdb = require('../pgdb');
const searchHistoryService = require('../services/search/searchHistoryService');
const cacheService = require('../services/systemServices/cacheService');

class verifyController {
    /**
     * GET /api/verify/:token
     * Публичный endpoint верификации PDF-отчёта
     * НЕ требует авторизации — QR может сканировать любой человек
     */
    async verifyDocument(req, res, next) {
        const client = await pgdb.connect();
        try {
            const { token } = req.params;

            if (!token) {
                return res.status(400).json({
                    valid: false,
                    error: 'MISSING_TOKEN',
                    message: 'Токен верификации не указан'
                });
            }

            // Rate limit: 20 запросов в минуту на IP
            const requestIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                || req.ip
                || req.socket.remoteAddress;

            try {
                const key = `verify:${requestIp}`;
                const count = await cacheService.rollingIncr('rl_verify_ip', key, 60);
                if (count > 20) {
                    return res.status(429).json({
                        valid: false,
                        error: 'RATE_LIMITED',
                        message: 'Слишком много запросов. Попробуйте позже.'
                    });
                }
            } catch (e) { /* Redis недоступен */ }

            const record = await searchHistoryService.getByVerifyToken(client, token);

            if (!record) {
                return res.json({
                    valid: false,
                    error: 'NOT_FOUND',
                    message: 'Запись с данным идентификатором не найдена в системе'
                });
            }

            // Достаём счётчик просмотров
            let verifyCount = 0;
            try {
                const countRes = await client.query(
                    `SELECT result_summary FROM search_history WHERE id = $1`,
                    [token]
                );
                if (countRes.rowCount > 0) {
                    let summary = countRes.rows[0].result_summary;
                    if (typeof summary === 'string') { try { summary = JSON.parse(summary); } catch { } }
                    verifyCount = parseInt(summary?.verify_count || 0);
                }
            } catch (e) {
                console.error('[Verify] Failed to read verify_count:', e.message);
            }

            return res.json({
                valid: true,
                data: {
                    id: record.id,
                    created_at: record.created_at,
                    expires_at: record.expires_at,
                    expired: record.expired,
                    search_type: record.search_type,
                    search_type_label: record.search_type_label,
                    result_status: record.result_status,
                    result_status_label: {
                        found: 'Найдены записи в базе',
                        not_found: 'Записей не найдено',
                        error: 'Ошибка при выполнении',
                        rate_limited: 'Запрос был ограничен'
                    }[record.result_status] || record.result_status,
                    requester_email_masked: record.requester_email_masked,
                    verify_code: record.verify_code,
                    data_fingerprint: record.data_fingerprint,
                    display_data: record.display_data,
                    verify_count: verifyCount
                }
            });
        } catch (error) {
            console.error('[Verify] Error:', error.message);
            return res.status(500).json({
                valid: false,
                error: 'INTERNAL_ERROR',
                message: 'Внутренняя ошибка при проверке документа'
            });
        } finally {
            client.release();
        }
    }
}

module.exports = new verifyController();