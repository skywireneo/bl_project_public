const crypto = require('crypto');

const HMAC_SECRET = process.env.CRYPTO_KEY_IDENTITY_KEY || 'blpvz_default_hmac_secret_change_me_in_production';
const HMAC_ALGORITHM = 'sha256';

class HmacService {
    /**
     * Генерация HMAC-подписи для данных
     * @param {Object} data - данные для подписи
     * @returns {string} - hex-подпись
     */
    sign(data) {
        const canonical = this._canonicalize(data);
        return crypto
            .createHmac(HMAC_ALGORITHM, HMAC_SECRET)
            .update(canonical, 'utf8')
            .digest('hex');
    }

    /**
     * Проверка HMAC-подписи
     * @param {Object} data - данные для проверки
     * @param {string} signature - подпись для сравнения
     * @returns {boolean} - валидна ли подпись
     */
    verify(data, signature) {
        if (!signature || typeof signature !== 'string') return false;
        const expected = this.sign(data);
        // Timing-safe comparison to prevent timing attacks
        try {
            const a = Buffer.from(expected, 'hex');
            const b = Buffer.from(signature, 'hex');
            if (a.length !== b.length) return false;
            return crypto.timingSafeEqual(a, b);
        } catch {
            return false;
        }
    }

    /**
     * Каноническая сериализация (стабильный порядок ключей)
     */
    _canonicalize(data) {
        return JSON.stringify(data, Object.keys(data).sort());
    }

    /**
     * Извлечение ключевых полей из результата поиска ПЕРСОНЫ для подписи
     */
    extractPersonSignData(groupData) {
        if (!groupData) return null;
        return {
            type: 'person',
            group_id: groupData.group_id || 0,
            reliability_score: groupData.reliability_score ?? 100,
            risk_level: groupData.risk_level || 'low',
            total_incidents: groupData.stats?.total_incidents || 0,
            total_violation_balls: groupData.stats?.total_violation_balls || 0,
            as_administration: groupData.stats?.as_administration || 0,
            as_employee: groupData.stats?.as_employee || 0,
            person_ids: (groupData.person_ids || []).sort().join(','),
            persons_count: groupData.persons?.length || 0
        };
    }

    /**
     * Извлечение ключевых полей из результата поиска ПВЗ для подписи
     */
    extractPvzSignData(pvzData) {
        if (!pvzData) return null;
        return {
            type: 'pvz',
            pvz_id: pvzData.pvz_id || '',
            reliability_score: pvzData.reliability_score ?? 100,
            risk_level: pvzData.risk_level || 'low',
            total_incidents: pvzData.stats?.total_incidents || 0,
            total_violation_balls: pvzData.stats?.total_violation_balls || 0,
            admin_fault_count: pvzData.stats?.admin_fault_count || 0,
            employee_fault_count: pvzData.stats?.employee_fault_count || 0,
            address: pvzData.address || '',
            pvz_type: pvzData.type || ''
        };
    }
}

module.exports = new HmacService();