const apiError = require('../../exceptions/apiError');

class DonationStatsService {

    async getPayments(client, params, current_user) {
        const { limit = 50, offset = 0 } = params;

        const result = await client.query(`
            SELECT 
                r.request_id,
                r.email_hesh,
                r.actual_amount,
                r.processed_at,
                r.processed_by,
                r.email_sent,
                p.code_name as package_code,
                p.display_name as package_name
            FROM donation_requests r
            LEFT JOIN donation_packages p ON r.package_id = p.package_id
            WHERE r.status = 'approved'
            ORDER BY r.processed_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const totalResult = await client.query(`
            SELECT COUNT(*) as count FROM donation_requests WHERE status = 'approved'
        `);

        return {
            payments: result.rows.map(r => ({
                ...r,
                actual_amount: parseFloat(r.actual_amount)
            })),
            total: parseInt(totalResult.rows[0].count)
        };
    }

    async getStats(client, period, current_user) {
        let dateFilter = '';
        switch (period) {
            case 'day':
                dateFilter = "AND processed_at > NOW() - INTERVAL '1 day'";
                break;
            case 'week':
                dateFilter = "AND processed_at > NOW() - INTERVAL '7 days'";
                break;
            case 'month':
                dateFilter = "AND processed_at > NOW() - INTERVAL '30 days'";
                break;
            case 'year':
                dateFilter = "AND processed_at > NOW() - INTERVAL '365 days'";
                break;
            default:
                dateFilter = '';
        }

        // Общая статистика
        const totalStats = await client.query(`
            SELECT 
                COUNT(*) as total_requests,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COALESCE(SUM(CASE WHEN status = 'approved' THEN actual_amount ELSE 0 END), 0) as total_amount
            FROM donation_requests
            WHERE 1=1 ${dateFilter}
        `);

        // Статистика по пакетам
        const packageStats = await client.query(`
            SELECT 
                p.display_name,
                p.code_name,
                COUNT(*) as count,
                SUM(r.actual_amount) as total_amount
            FROM donation_requests r
            INNER JOIN donation_packages p ON r.package_id = p.package_id
            WHERE r.status = 'approved' ${dateFilter}
            GROUP BY p.package_id, p.display_name, p.code_name
            ORDER BY count DESC
        `);

        // Статистика по дням
        const dailyStats = await client.query(`
            SELECT 
                DATE(processed_at) as date,
                COUNT(*) as count,
                SUM(actual_amount) as total_amount
            FROM donation_requests
            WHERE status = 'approved' ${dateFilter}
            GROUP BY DATE(processed_at)
            ORDER BY date DESC
        `);

        // Топ донатеров
        const topDonors = await client.query(`
            SELECT 
                email_hesh,
                COUNT(*) as donations_count,
                SUM(actual_amount) as total_amount,
                MAX(processed_at) as last_donation
            FROM donation_requests
            WHERE status = 'approved' ${dateFilter}
            GROUP BY email_hesh
            ORDER BY total_amount DESC
            LIMIT 10
        `);

        // Конверсия
        const conversionStats = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
                ROUND(
                    100.0 * COUNT(CASE WHEN status = 'approved' THEN 1 END) / 
                    NULLIF(COUNT(CASE WHEN status IN ('approved', 'rejected') THEN 1 END), 0),
                    2
                ) as conversion_rate
            FROM donation_requests
            WHERE status IN ('approved', 'rejected') ${dateFilter}
        `);

        return {
            period,
            totals: {
                total_requests: parseInt(totalStats.rows[0].total_requests),
                approved: parseInt(totalStats.rows[0].approved),
                rejected: parseInt(totalStats.rows[0].rejected),
                pending: parseInt(totalStats.rows[0].pending),
                total_amount: parseFloat(totalStats.rows[0].total_amount)
            },
            by_package: packageStats.rows.map(r => ({
                ...r,
                total_amount: parseFloat(r.total_amount)
            })),
            by_day: dailyStats.rows.map(r => ({
                ...r,
                total_amount: parseFloat(r.total_amount)
            })),
            top_donors: topDonors.rows.map(r => ({
                ...r,
                total_amount: parseFloat(r.total_amount)
            })),
            conversion: conversionStats.rows[0] ? {
                total: parseInt(conversionStats.rows[0].total),
                approved: parseInt(conversionStats.rows[0].approved),
                conversion_rate: parseFloat(conversionStats.rows[0].conversion_rate || 0)
            } : null
        };
    }

    async getSettings(client) {
        const result = await client.query(`
            SELECT * FROM donation_settings ORDER BY setting_key
        `);

        const settings = {};
        for (const row of result.rows) {
            settings[row.setting_key] = {
                value: row.setting_value,
                description: row.description,
                updated_at: row.updated_at,
                updated_by: row.updated_by
            };
        }

        return { settings };
    }

    async updateSettings(client, settings, current_user) {
        for (const [key, value] of Object.entries(settings)) {
            await client.query(`
                INSERT INTO donation_settings (setting_key, setting_value, description, updated_by, updated_at)
                VALUES ($1, $2::jsonb, COALESCE((SELECT description FROM donation_settings WHERE setting_key = $1), ''), $3, NOW() AT TIME ZONE 'UTC')
                ON CONFLICT (setting_key) 
                DO UPDATE SET 
                    setting_value = $2::jsonb,
                    updated_by = $3,
                    updated_at = NOW() AT TIME ZONE 'UTC'
            `, [key, JSON.stringify(value), current_user.login]);
        }

        return {
            success: true,
            message: 'Настройки обновлены',
            updated_keys: Object.keys(settings)
        };
    }
}

module.exports = new DonationStatsService();