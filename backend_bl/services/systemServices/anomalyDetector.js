const rateLimitRedisClient = require('../../rateLimitRedisClient');

class AnomalyDetector {
    constructor() {
        this.rules = [
            {
                name: 'BOT_FARM',
                description: 'Много разных устройств с одинаковым UA из одной подсети',
                groupBy: 'ip_subnet',
                countDistinct: 'device_id',
                filter: { ua_class: 'same' },
                threshold: 10,
                window: 5 * 60, // 5 минут в секундах
                action: 'BLOCK_SUBNET_1H'
            },
            {
                name: 'RAPID_FIRE',
                description: 'Слишком много запросов с одного устройства за короткое время',
                groupBy: 'device_id',
                countRequests: true,
                threshold: 50,
                window: 1 * 60, // 1 минута
                action: 'BLOCK_DEVICE_1H'
            }
        ];
    }

    async checkAnomalies(req, routeKey) {
        const identifiers = {
            device_id: req.headers['x-device-id'] || null,
            ip_subnet: this._getIpSubnet(req),
            ua_class: this._getUAClass(req)
        };

        for (const rule of this.rules) {
            const isAnomaly = await this._checkRule(rule, identifiers, routeKey);
            if (isAnomaly) {
                return {
                    isAnomaly: true,
                    rule: rule.name,
                    action: rule.action,
                    description: rule.description
                };
            }
        }

        return { isAnomaly: false };
    }

    async _checkRule(rule, identifiers, routeKey) {
        const groupValue = identifiers[rule.groupBy];
        if (!groupValue) return false;

        const key = `anomaly:${routeKey}:${rule.name}:${groupValue}`;

        if (rule.countDistinct) {
            const distinctValue = identifiers[rule.countDistinct];
            if (!distinctValue) return false;

            if (rule.filter?.ua_class === 'same') {
                const uaKey = `anomaly:${routeKey}:${rule.name}:${groupValue}:ua_class`;
                const existingUAClass = await rateLimitRedisClient.get(uaKey);

                if (existingUAClass && existingUAClass !== identifiers.ua_class) {
                    return false;
                }

                await rateLimitRedisClient.setex(uaKey, rule.window, identifiers.ua_class);
            }

            await rateLimitRedisClient.pfadd(key, distinctValue);
            const count = await rateLimitRedisClient.pfcount(key);
            await rateLimitRedisClient.expire(key, rule.window);

            return count > rule.threshold;
        }

        if (rule.countRequests) {
            const count = await rateLimitRedisClient.incr(key);

            if (count === 1) {
                await rateLimitRedisClient.expire(key, rule.window);
            }

            return count > rule.threshold;
        }

        return false;
    }

    _getIpSubnet(req) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress;
        return ip.includes(':') ? ip : ip.split('.').slice(0, 3).join('.') + '.*';
    }

    _getUAClass(req) {
        const ua = (req.headers['user-agent'] || '').toLowerCase();
        if (/bot|crawler|spider|python|curl|wget|go-http-client/i.test(ua)) return 'Bot';
        if (/mobile|android|iphone|ipad/i.test(ua)) return 'Mobile';
        if (/chrome|firefox|safari|edge|opera/i.test(ua)) return 'Desktop';
        return 'Unknown';
    }
}

module.exports = new AnomalyDetector();