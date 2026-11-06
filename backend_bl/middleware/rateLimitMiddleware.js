const apiError = require('../exceptions/apiError');
const { LIMITERS, ROUTE_RULES, PROGRESSIVE_ENFORCEMENT } = require('../router/config/rateLimitConfig');
const anomalyDetector = require('../services/systemServices/anomalyDetector');
const tokenService = require('../services/systemServices/tokenService');

const ANOMALY_DETECTION_CONFIG = {
    enabled: false,
    logAnomalies: true
};

const getIdentifiers = {
    email: (req) => req.user?.email || req.query?.email || 'anonymous',
    device_id: (req) => req.headers['x-device-id'] || null,
    ip: (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress,
    ip_subnet: (req) => {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress;
        return ip.includes(':') ? ip : ip.split('.').slice(0, 3).join('.') + '.*';
    },
    ua_class: (req) => {
        const ua = (req.headers['user-agent'] || '').toLowerCase();
        if (/bot|crawler|spider|python|curl|wget|go-http-client/i.test(ua)) return 'Bot';
        if (/mobile|android|iphone|ipad/i.test(ua)) return 'Mobile';
        if (/chrome|firefox|safari|edge|opera/i.test(ua)) return 'Desktop';
        return 'Unknown';
    }
};

async function getEnforcementLevel(identifier, routeKey) {
    if (!PROGRESSIVE_ENFORCEMENT.enabled) return 'NORMAL';

    const trackerKey = `violations:${routeKey}:${identifier}`;
    const tracker = LIMITERS.VIOLATIONS_TRACKER;

    try {
        const res = await tracker.get(trackerKey);
        const violations = res ? (100 - res.remainingPoints) : 0;

        if (violations >= PROGRESSIVE_ENFORCEMENT.thresholds.blocked) {
            return 'BLOCKED';
        } else if (violations >= PROGRESSIVE_ENFORCEMENT.thresholds.suspicious) {
            return 'SUSPICIOUS';
        }
        return 'NORMAL';
    } catch (err) {
        console.error('[RateLimit] Error getting enforcement level:', err);
        return 'NORMAL';
    }
}

async function registerViolation(identifier, routeKey) {
    if (!PROGRESSIVE_ENFORCEMENT.enabled) return;

    const trackerKey = `violations:${routeKey}:${identifier}`;
    const tracker = LIMITERS.VIOLATIONS_TRACKER;

    try {
        await tracker.consume(trackerKey);
        console.warn(`[RateLimit] Violation registered for ${identifier} on ${routeKey}`);
    } catch (err) {
        console.error('[RateLimit] Error registering violation:', err);
    }
}

async function checkTemporaryBlock(identifier, routeKey) {
    if (!PROGRESSIVE_ENFORCEMENT.enabled) return false;

    const blockKey = `block:${routeKey}:${identifier}`;
    const blocker = LIMITERS.TEMPORARY_BLOCK;

    try {
        await blocker.consume(blockKey);
        return false; // Блокировка не активна (есть свободные точки)
    } catch (err) {
        if (err && typeof err.msBeforeNext !== 'undefined') {
            return true; // Блокировка активна
        }
        throw err;
    }
}

async function activateTemporaryBlock(identifier, routeKey) {
    if (!PROGRESSIVE_ENFORCEMENT.enabled) return;

    const blockKey = `block:${routeKey}:${identifier}`;
    const blocker = LIMITERS.TEMPORARY_BLOCK;

    try {
        await blocker.consume(blockKey);
        console.error(`[RateLimit] TEMPORARY BLOCK activated for ${identifier} on ${routeKey}`);
    } catch (err) {
    }
}

module.exports = function rateLimitMiddleware(routeRuleKey) {
    const routeRules = ROUTE_RULES[routeRuleKey];
    if (!routeRules) throw new Error(`Rate limit rule not found for: ${routeRuleKey}`);

    return async (req, res, next) => {
        try {
            // 0. Исключение для привилегированных пользователей
            if (req?.headers?.authorization) {
                const token = req.headers.authorization.split(' ')[1]
                if (token) {
                    const decoded = tokenService.validateToken(token);
                    if (['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(decoded?.data?.status)) {
                        return next();
                    }
                }
            }

            // УРОВЕНЬ 1: ГЛОБАЛЬНЫЙ ЩИТ
            if (routeRules.global?.enabled) {
                const globalLimiter = LIMITERS[routeRules.global.key];
                const globalKey = routeRules.global.key;

                try {
                    await globalLimiter.consume(globalKey);
                } catch (err) {
                    if (err && typeof err.msBeforeNext !== 'undefined') {
                        const retryAfterSec = Math.ceil(err.msBeforeNext / 1000);
                        const message = routeRules.global.message.replace('{retryAfter}', retryAfterSec);
                        console.warn(`[RateLimit] GLOBAL SHIELD TRIGGERED: ${routeRuleKey}`);
                        return next(apiError.BadRequest('RATE_LIMIT_EXCEEDED', message, 'RL001', [], { retryAfter: retryAfterSec }));
                    }
                    throw err;
                }
            }

            // УРОВЕНЬ 1.5: ДЕТЕКЦИЯ АНОМАЛИЙ
            if (ANOMALY_DETECTION_CONFIG.enabled) {
                const anomalyResult = await anomalyDetector.checkAnomalies(req, routeRuleKey);

                if (anomalyResult.isAnomaly) {
                    if (ANOMALY_DETECTION_CONFIG.logAnomalies) {
                        console.error(`[RateLimit] ANOMALY DETECTED: ${anomalyResult.rule} - ${anomalyResult.description}`);
                    }

                    if (anomalyResult.action === 'BLOCK_SUBNET_1H') {
                        const subnet = getIdentifiers.ip_subnet(req);
                        await activateTemporaryBlock(subnet, routeRuleKey);
                        return next(apiError.BadRequest(
                            'RATE_LIMIT_EXCEEDED',
                            'Обнаружена подозрительная активность. Повторите через 1 час.',
                            'RL002',
                            [],
                            { retryAfter: 3600, reason: 'ANOMALY_DETECTED', anomaly: anomalyResult.rule }
                        ));
                    }

                    if (anomalyResult.action === 'BLOCK_DEVICE_1H') {
                        const deviceId = getIdentifiers.device_id(req);
                        await activateTemporaryBlock(deviceId, routeRuleKey);
                        return next(apiError.BadRequest(
                            'RATE_LIMIT_EXCEEDED',
                            'Обнаружена подозрительная активность. Повторите через 1 час.',
                            'RL003',
                            [],
                            { retryAfter: 3600, reason: 'ANOMALY_DETECTED', anomaly: anomalyResult.rule }
                        ));
                    }
                }
            }

            // УРОВЕНЬ 1.7: ПРОВЕРКА ПРОГРЕССИВНОГО УЖЕСТОЧЕНИЯ
            if (PROGRESSIVE_ENFORCEMENT.enabled) {
                const identifiersToCheck = ['email', 'device_id', 'ip_subnet'];
                for (const idType of identifiersToCheck) {
                    const identifier = getIdentifiers[idType](req);
                    if (!identifier || identifier === 'anonymous') continue;

                    const isBlocked = await checkTemporaryBlock(identifier, routeRuleKey);
                    if (isBlocked) {
                        const level = await getEnforcementLevel(identifier, routeRuleKey);
                        if (level === 'BLOCKED') {
                            return next(apiError.BadRequest(
                                'RATE_LIMIT_EXCEEDED',
                                'Вы временно заблокированы из-за многократных нарушений лимитов. Повторите через 1 час.',
                                'RL004',
                                [],
                                { retryAfter: 3600, reason: 'TEMPORARY_BLOCK' }
                            ));
                        }
                    }
                }
            }

            // УРОВЕНЬ 2: ПЕРСОНАЛЬНАЯ ЗАЩИТА
            const checkMode = routeRules.checkMode || 'STRICT';
            const activeBuckets = routeRules.buckets.filter(b => b.enabled);

            const enforcementLevels = {};
            if (PROGRESSIVE_ENFORCEMENT.enabled) {
                for (const idType of ['email', 'device_id', 'ip_subnet']) {
                    const identifier = getIdentifiers[idType](req);
                    if (identifier && identifier !== 'anonymous') {
                        enforcementLevels[idType] = await getEnforcementLevel(identifier, routeRuleKey);
                    }
                }
            }

            if (checkMode === 'FAIL_FAST') {
                for (const rule of activeBuckets) {
                    const identifier = getIdentifiers[rule.identifier](req);
                    if (!identifier || (identifier === 'anonymous' && rule.identifier !== 'ip_subnet' && rule.identifier !== 'ua_class')) continue;

                    const limiter = LIMITERS[rule.key];
                    const key = `${rule.key}:${identifier}`;

                    const level = enforcementLevels[rule.identifier] || 'NORMAL';
                    const multiplier = PROGRESSIVE_ENFORCEMENT.multipliers[level];

                    if (multiplier === 0) {
                        await registerViolation(identifier, routeRuleKey);
                        await activateTemporaryBlock(identifier, routeRuleKey);
                        return next(apiError.BadRequest(
                            'RATE_LIMIT_EXCEEDED',
                            'Вы временно заблокированы из-за многократных нарушений лимитов. Повторите через 1 час.',
                            'RL005',
                            [],
                            { retryAfter: 3600, reason: 'TEMPORARY_BLOCK' }
                        ));
                    }

                    try {
                        await limiter.consume(key);
                    } catch (err) {
                        if (err && typeof err.msBeforeNext !== 'undefined') {
                            const retryAfterSec = Math.ceil(err.msBeforeNext / 1000);
                            await registerViolation(identifier, routeRuleKey);

                            const message = routeRules.message.replace('{retryAfter}', retryAfterSec);
                            return next(apiError.BadRequest('RATE_LIMIT_EXCEEDED', message, 'RL006', [], { retryAfter: retryAfterSec }));
                        }
                        throw err;
                    }
                }
                return next();
            }

            // Режим STRICT
            const checks = [];
            for (const rule of activeBuckets) {
                const identifier = getIdentifiers[rule.identifier](req);
                if (!identifier || (identifier === 'anonymous' && rule.identifier !== 'ip_subnet' && rule.identifier !== 'ua_class')) continue;

                const limiter = LIMITERS[rule.key];
                const key = `${rule.key}:${identifier}`;

                checks.push(
                    limiter.consume(key).catch(async err => {
                        if (err && typeof err.msBeforeNext !== 'undefined') {
                            await registerViolation(identifier, routeRuleKey);
                            return { rejected: true, msBeforeNext: err.msBeforeNext, identifier };
                        }
                        throw err;
                    })
                );
            }

            const results = await Promise.allSettled(checks);
            let maxMsBeforeNext = 0;
            let isRejected = false;

            for (const res of results) {
                if (res.status === 'fulfilled' && res.value?.rejected) {
                    isRejected = true;
                    if (res.value.msBeforeNext > maxMsBeforeNext) {
                        maxMsBeforeNext = res.value.msBeforeNext;
                    }
                } else if (res.status === 'rejected') {
                    console.error('[RateLimit] Storage error:', res.reason);
                    return next(res.reason);
                }
            }

            if (isRejected) {
                const retryAfterSec = Math.ceil(maxMsBeforeNext / 1000);
                const message = routeRules.message.replace('{retryAfter}', retryAfterSec);
                return next(apiError.BadRequest('RATE_LIMIT_EXCEEDED', message, 'RL007', [], { retryAfter: retryAfterSec }));
            }

            next();

        } catch (error) {
            next(error);
        }
    };
};