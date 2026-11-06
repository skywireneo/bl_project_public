const crypto = require('crypto');
const { decryptFrontCBC } = require('../systemServices/cryptoService');

const IP_HASH_SALT = process.env.TELEMETRY_IP_SALT || 'my_super_secret_telemetry_salt_2024';

class ActionStatsService {
    async logAction(client, encryptedStats, requestIp) {
        if (!encryptedStats) return;

        try {
            const decrypted = decryptFrontCBC(encryptedStats, "FRONT_KEY_1");
            if (!decrypted || !decrypted.module || !decrypted.action) return;

            const ipHash = requestIp
                ? crypto.createHash('sha256').update(requestIp + IP_HASH_SALT).digest('hex')
                : null;

            await client.query(
                `INSERT INTO public.action_telemetry 
                (module, action, os, browser, browser_version, device_type, screen_resolution, connection_type, language, timezone, ip_hash)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    decrypted.module,
                    decrypted.action,
                    decrypted.os || null,
                    decrypted.browser || null,
                    decrypted.browserVersion || null,
                    decrypted.deviceType || null,
                    decrypted.screenResolution || null,
                    decrypted.connectionType || null,
                    decrypted.language || null,
                    decrypted.timezone || null,
                    ipHash
                ]
            );
        } catch (err) {
            console.error('[ActionStatsService] ❌ Ошибка логирования телеметрии (проверьте наличие колонок в БД):', err.message);
        }
    }

    async getModuleStats(client, module) {
        const res = await client.query(
            `SELECT 
                COUNT(*) as total_actions,
                
                (SELECT json_agg(json_build_object('name', os, 'count', cnt)) FROM (
                    SELECT os, COUNT(*) as cnt FROM public.action_telemetry 
                    WHERE module = $1 AND created_at >= NOW() - INTERVAL '30 days' AND os IS NOT NULL
                    GROUP BY os ORDER BY cnt DESC
                ) t_os) as by_os,

                (SELECT json_agg(json_build_object('name', browser, 'count', cnt)) FROM (
                    SELECT browser, COUNT(*) as cnt FROM public.action_telemetry 
                    WHERE module = $1 AND created_at >= NOW() - INTERVAL '30 days' AND browser IS NOT NULL
                    GROUP BY browser ORDER BY cnt DESC
                ) t_browser) as by_browser,

                (SELECT json_agg(json_build_object('name', device_type, 'count', cnt)) FROM (
                    SELECT device_type, COUNT(*) as cnt FROM public.action_telemetry 
                    WHERE module = $1 AND created_at >= NOW() - INTERVAL '30 days' AND device_type IS NOT NULL
                    GROUP BY device_type ORDER BY cnt DESC
                ) t_device) as by_device_type,

                (SELECT json_agg(json_build_object('name', connection_type, 'count', cnt)) FROM (
                    SELECT connection_type, COUNT(*) as cnt FROM public.action_telemetry 
                    WHERE module = $1 AND created_at >= NOW() - INTERVAL '30 days' AND connection_type IS NOT NULL
                    GROUP BY connection_type ORDER BY cnt DESC
                ) t_conn) as by_connection,

                (SELECT json_agg(json_build_object('name', language, 'count', cnt)) FROM (
                    SELECT language, COUNT(*) as cnt FROM public.action_telemetry 
                    WHERE module = $1 AND created_at >= NOW() - INTERVAL '30 days' AND language IS NOT NULL
                    GROUP BY language ORDER BY cnt DESC
                ) t_lang) as by_language,

                (SELECT json_agg(json_build_object('name', timezone, 'count', cnt)) FROM (
                    SELECT timezone, COUNT(*) as cnt FROM public.action_telemetry 
                    WHERE module = $1 AND created_at >= NOW() - INTERVAL '30 days' AND timezone IS NOT NULL
                    GROUP BY timezone ORDER BY cnt DESC
                ) t_tz) as by_timezone

             FROM public.action_telemetry 
             WHERE module = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
            [module]
        );

        return res.rows[0];
    }

    async cleanupOldStats(client, days = 30) {
        const res = await client.query(
            `DELETE FROM public.action_telemetry WHERE created_at < NOW() - INTERVAL '${days} days'`
        );
        return { success: true, deleted: res.rowCount };
    }
}

module.exports = new ActionStatsService();