const apiError = require('../../exceptions/apiError');
const crypto = require('crypto');

class SearchHistoryService {
    constructor() {
        this.addToHistory = this.addToHistory.bind(this);
        this.getHistory = this.getHistory.bind(this);
        this.cleanupOldHistory = this.cleanupOldHistory.bind(this);
        this.getStatistics = this.getStatistics.bind(this);
    }

    /**
     * Генерация короткого верификационного кода: BLP-XXXX-XXXX
     */
    _generateVerifyCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // без 0, O, I, 1 (визуально похожие)
        let code = '';
        const bytes = crypto.randomBytes(8);
        for (let i = 0; i < 8; i++) {
            code += chars[bytes[i] % chars.length];
            if (i === 3) code += '-';
        }
        return `BLP-${code}`;
    }

    /**
     * Генерация SHA-256 хэша от канонического JSON объекта (стабильный порядок ключей)
     */
    _generateDataFingerprint(data) {
        const canonical = JSON.stringify(data, Object.keys(data).sort());
        return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
    }

    /**
     * Маскирование email для публичного отображения
     */
    _maskEmail(email) {
        if (!email || typeof email !== 'string') return '***';
        const [local, domain] = email.split('@');
        if (!domain) return '***';
        const maskedLocal = local.length <= 1 ? local[0] + '***' : local[0] + '***';
        const domainParts = domain.split('.');
        const maskedDomain = domainParts.length >= 2
            ? domainParts[0][0] + '***.' + domainParts.slice(1).join('.')
            : domain[0] + '***';
        return `${maskedLocal}@${maskedDomain}`;
    }

    /**
     * Маскирование ФИО: Иванов Сергей Петрович → И*** С*** П***
     */
    _maskFIO(name) {
        if (!name) return '***';
        const parts = name.split(' ').filter(p => p.length > 0);
        return parts.map(p => p[0].toUpperCase() + '***').join(' ');
    }

    /**
     * Маскирование адреса ПВЗ: г. Москва, ул. Ленина, д. 42 → г. М***, ул. Л***, д. 4*
     */
    _maskAddress(address) {
        if (!address) return '***';
        return address
            .replace(/г\.\s*([А-Яа-яЁё])/g, 'г. $1***')
            .replace(/ул\.\s*([А-Яа-яЁё])/g, 'ул. $1***')
            .replace(/д\.\s*(\d)(\d*)/g, 'д. $1*');
    }

    /**
     * Построение отпечатка данных для верификации отчёта ПЕРСОНЫ
     */
    _buildPersonFingerprint(groupData) {
        const fingerprint = {
            reliability_score: groupData.reliability_score || 0,
            risk_level: groupData.risk_level || 'low',
            total_incidents: groupData.stats?.total_incidents || 0,
            as_administration: groupData.role_analysis?.stats?.admin_count || 0,
            as_employee: groupData.role_analysis?.stats?.employee_count || 0,
            total_violation_balls: Math.abs(groupData.stats?.total_violation_balls || 0),
            pvz_count: groupData.pvz_history?.length || 0,
            first_incident_date: groupData.trends?.first_incident || null,
            last_incident_date: groupData.trends?.last_incident || null
        };

        // Маскированные ФИО (отсортированные для стабильности хэша)
        const names = [];
        (groupData.persons || []).forEach(p => {
            (p.data?.names || []).forEach(n => {
                if (n?.name && !names.includes(n.name)) names.push(this._maskFIO(n.name));
            });
        });
        fingerprint.names_masked = names.sort();

        // Должности (отсортированные)
        const positions = (groupData.positions || [])
            .map(p => `${p.post_name || 'Неизвестная'}(${p.onPvz ? 'admin' : 'emp'})`)
            .sort();
        fingerprint.positions = positions;

        return fingerprint;
    }

    /**
     * Построение отпечатка данных для верификации отчёта ПВЗ
     */
    _buildPvzFingerprint(pvzData) {
        return {
            reliability_score: pvzData.reliability_score || 0,
            risk_level: pvzData.risk_level || 'low',
            address_masked: this._maskAddress(pvzData.address),
            type: pvzData.type || 'Неизвестный тип',
            total_incidents: pvzData.stats?.total_incidents || 0,
            admin_fault_percent: pvzData.stats?.admin_fault_percent || 0,
            employee_fault_percent: pvzData.stats?.employee_fault_percent || 0,
            total_violation_balls: Math.abs(pvzData.stats?.total_violation_balls || 0),
            last_incident_date: pvzData.stats?.last_incident_date || null,
            personnel_count: pvzData.personnel?.length || 0
        };
    }

    /**
     * Добавление записи в историю поисковых запросов (обычный поиск)
     */
    async addToHistory(client, data) {
        try {
            const {
                email,
                user_id = null,
                search_type,
                search_params,
                result_status,
                result_summary = null,
                request_ip = null,
                device_id = null,
                execution_time_ms = null
            } = data;
            const user_email = email;

            if (!user_email) { console.error('[SearchHistory] Missing user_email'); return; }
            if (!['person', 'pvz'].includes(search_type)) { console.error('[SearchHistory] Invalid search_type:', search_type); return; }
            if (!['found', 'not_found', 'error', 'rate_limited'].includes(result_status)) { console.error('[SearchHistory] Invalid result_status:', result_status); return; }

            const query = `
                INSERT INTO search_history (
                    user_email, user_id, search_type, search_params,
                    result_status, result_summary, request_ip, device_id, execution_time_ms
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `;
            const params = [
                user_email, user_id, search_type,
                JSON.stringify(search_params),
                result_status,
                result_summary ? JSON.stringify(result_summary) : null,
                request_ip, device_id, execution_time_ms
            ];
            await client.query(query, params);
        } catch (error) {
            console.error('[SearchHistory] Failed to add record:', error.message);
        }
    }

    async addToHistoryWithReturn(client, data) {
        const {
            email,
            user_id = null,
            search_type,
            search_params,
            result_status = 'found',
            result_summary = null,
            report_data = null,
            request_ip = null,
            device_id = null,
            expires_at = null
        } = data;

        if (!email) throw new Error('[SearchHistory] Missing email');
        if (!['person', 'pvz'].includes(search_type)) throw new Error('[SearchHistory] Invalid search_type');

        const verifyCode = this._generateVerifyCode();

        let fingerprint = null;
        let dataFingerprint = null;
        let displayData = null;

        if (report_data && search_type === 'person') {
            fingerprint = this._buildPersonFingerprint(report_data);
            dataFingerprint = this._generateDataFingerprint(fingerprint);
            displayData = fingerprint;
        } else if (report_data && search_type === 'pvz') {
            fingerprint = this._buildPvzFingerprint(report_data);
            dataFingerprint = this._generateDataFingerprint(fingerprint);
            displayData = fingerprint;
        }

        const enrichedSummary = {
            ...(result_summary || {}),
            type: 'pdf_export',
            report_type: search_type,
            verify_code: verifyCode,
            data_fingerprint: dataFingerprint,
            display_data: displayData,
            requester_email_masked: this._maskEmail(email),
            expires_at: expires_at
        };

        const query = `
        INSERT INTO search_history (
            user_email, user_id, search_type, search_params,
            result_status, result_summary, request_ip, device_id, execution_time_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)
        RETURNING id
    `;
        const params = [
            email, user_id, search_type,
            JSON.stringify(search_params),
            result_status,
            JSON.stringify(enrichedSummary),
            request_ip, device_id
        ];
        const result = await client.query(query, params);
        const historyId = result.rows[0].id;

        return {
            id: historyId,
            verify_code: verifyCode,
            data_fingerprint: dataFingerprint,
            display_data: displayData,
            expires_at: expires_at
        };
    }

    async getByVerifyToken(client, token) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(token)) return null;

            const query = `
            SELECT
                id, user_email, search_type, result_status,
                result_summary, execution_time_ms, created_at
            FROM search_history
            WHERE id = $1
            LIMIT 1
        `;
            const result = await client.query(query, [token]);
            if (result.rowCount === 0) return null;

            const row = result.rows[0];
            let summary = row.result_summary;
            if (typeof summary === 'string') {
                try { summary = JSON.parse(summary); } catch { summary = {}; }
            }
            summary = summary || {};

            if (summary.type !== 'pdf_export') return null;

            const expiresAt = summary.expires_at ? new Date(summary.expires_at) : null;
            const now = new Date();
            const isExpired = expiresAt && now > expiresAt;

            // Инкрементируем счётчик просмотров
            try {
                await this.incrementVerifyCount(client, token);
            } catch (e) {
                console.error('[SearchHistory] Failed to increment verify count:', e.message);
            }

            const baseResult = {
                valid: true,
                id: row.id,
                created_at: row.created_at,
                expires_at: expiresAt ? expiresAt.toISOString() : null,
                expired: isExpired,
                search_type: row.search_type,
                search_type_label: row.search_type === 'person' ? 'Проверка персоны' : 'Проверка ПВЗ',
                result_status: row.result_status,
                requester_email_masked: summary.requester_email_masked || this._maskEmail(row.user_email)
            };

            if (isExpired) {
                return baseResult;
            }

            return {
                ...baseResult,
                verify_code: summary.verify_code || null,
                data_fingerprint: summary.data_fingerprint || null,
                display_data: summary.display_data || null
            };
        } catch (error) {
            console.error('[SearchHistory] getByVerifyToken error:', error.message);
            return null;
        }
    }

    /**
 * Инкремент счётчика просмотров записи
 */
    async incrementVerifyCount(client, historyId) {
        try {
            const updateQuery = `
            UPDATE search_history
            SET result_summary = CASE
                WHEN result_summary IS NULL 
                    THEN '{"type": "pdf_export", "verify_count": 1}'::jsonb
                ELSE jsonb_set(
                    result_summary,
                    '{verify_count}',
                    to_jsonb(COALESCE((result_summary->>'verify_count')::int, 0) + 1)
                )
            END
            WHERE id = $1
        `;
            await client.query(updateQuery, [historyId]);
        } catch (e) {
            console.error('[SearchHistory] incrementVerifyCount error:', e.message);
        }
    }

    async getHistory(client, options = {}) {
        try {
            const {
                user_email, search_type, result_status, device_id,
                days = 7, limit = 50, offset = 0
            } = options;

            const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 1000);
            const safeOffset = Math.max(parseInt(offset) || 0, 0);
            const safeDays = Math.max(parseInt(days) || 7, 1);

            const conditions = [];
            const params = [];
            let paramIndex = 1;

            conditions.push(`created_at >= NOW() - INTERVAL '${safeDays} days'`);
            if (user_email) { conditions.push(`user_email = $${paramIndex++}`); params.push(user_email); }
            if (search_type && ['person', 'pvz'].includes(search_type)) {
                conditions.push(`search_type = $${paramIndex++}`);
                params.push(search_type);
            }
            if (result_status && ['found', 'not_found', 'error', 'rate_limited'].includes(result_status)) {
                conditions.push(`result_status = $${paramIndex++}`);
                params.push(result_status);
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

            const countQuery = `SELECT COUNT(*) as total FROM search_history ${whereClause}`;
            const countResult = await client.query(countQuery, params);
            const total = parseInt(countResult.rows[0].total);

            const dataQuery = `
                SELECT
                    id, user_email, user_id, search_type, search_params,
                    result_status, result_summary, request_ip, device_id,
                    execution_time_ms, created_at
                FROM search_history
                ${whereClause}
                ORDER BY created_at DESC
                LIMIT $${paramIndex++} OFFSET $${paramIndex++}
            `;
            params.push(safeLimit, safeOffset);
            const dataResult = await client.query(dataQuery, params);

            const items = dataResult.rows.map(row => {
                let searchParams = row.search_params;
                let resultSummary = row.result_summary;
                if (typeof searchParams === 'string') { try { searchParams = JSON.parse(searchParams); } catch { } }
                if (typeof resultSummary === 'string') { try { resultSummary = JSON.parse(resultSummary); } catch { } }
                return { ...row, search_params: searchParams, result_summary: resultSummary };
            });

            return {
                items, total,
                hasMore: (safeOffset + safeLimit) < total,
                limit: safeLimit, offset: safeOffset
            };
        } catch (error) {
            console.error('[SearchHistory] Failed to get history:', error.message);
            throw apiError.BadRequest('HISTORY_ERROR', 'Ошибка при получении истории: ' + error.message);
        }
    }

    async cleanupOldHistory(client, days = 10) {
        try {
            const safeDays = Math.max(parseInt(days) || 10, 1);
            const query = `DELETE FROM search_history WHERE created_at < NOW() - INTERVAL '${safeDays} days'`;
            const result = await client.query(query);
            return result.rowCount;
        } catch (error) {
            console.error('[SearchHistory] Failed to cleanup:', error.message);
            throw apiError.BadRequest('CLEANUP_ERROR', 'Ошибка при очистке истории: ' + error.message);
        }
    }

    async getStatistics(client, options = {}) {
        try {
            const { user_email, days = 7 } = options;
            const safeDays = Math.max(parseInt(days) || 7, 1);

            const conditions = [`created_at >= NOW() - INTERVAL '${safeDays} days'`];
            const params = [];
            let paramIndex = 1;
            if (user_email) { conditions.push(`user_email = $${paramIndex++}`); params.push(user_email); }
            const whereClause = `WHERE ${conditions.join(' AND ')}`;

            const totalQuery = `
                SELECT
                    COUNT(*) as total_requests,
                    COUNT(DISTINCT user_email) as unique_users,
                    COUNT(DISTINCT device_id) as unique_devices,
                    AVG(execution_time_ms) as avg_execution_time
                FROM search_history ${whereClause}
            `;
            const totalResult = await client.query(totalQuery, params);
            const totals = totalResult.rows[0];

            const typeQuery = `SELECT search_type, COUNT(*) as count FROM search_history ${whereClause} GROUP BY search_type`;
            const typeResult = await client.query(typeQuery, params);

            const statusQuery = `SELECT result_status, COUNT(*) as count FROM search_history ${whereClause} GROUP BY result_status`;
            const statusResult = await client.query(statusQuery, params);

            const dailyQuery = `SELECT DATE(created_at) as date, COUNT(*) as count FROM search_history ${whereClause} GROUP BY DATE(created_at) ORDER BY date DESC`;
            const dailyResult = await client.query(dailyQuery, params);

            return {
                totals: {
                    total_requests: parseInt(totals.total_requests) || 0,
                    unique_users: parseInt(totals.unique_users) || 0,
                    unique_devices: parseInt(totals.unique_devices) || 0,
                    avg_execution_time: parseFloat(totals.avg_execution_time) || 0
                },
                by_type: typeResult.rows.map(r => ({ search_type: r.search_type, count: parseInt(r.count) })),
                by_status: statusResult.rows.map(r => ({ result_status: r.result_status, count: parseInt(r.count) })),
                by_day: dailyResult.rows.map(r => ({ date: r.date, count: parseInt(r.count) })),
                period_days: safeDays
            };
        } catch (error) {
            console.error('[SearchHistory] Failed to get statistics:', error.message);
            throw apiError.BadRequest('STATS_ERROR', 'Ошибка при получении статистики: ' + error.message);
        }
    }
}

module.exports = new SearchHistoryService();