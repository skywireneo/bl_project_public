const { RateLimiterRedis, RateLimiterPostgres, RateLimiterMemory } = require('rate-limiter-flexible');
const pgdb = require('../../pgdb');
const rateLimitRedisClient = require('../../rateLimitRedisClient');

const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const createLimiter = (type, points, duration) => {
    const opts = { points, duration };
    if (type === 'redis') {
        return new RateLimiterRedis({ ...opts, storeClient: rateLimitRedisClient, keyPrefix: 'rl:' });
    }
    if (type === 'postgres') {
        return new RateLimiterPostgres({ ...opts, storeClient: pgdb, tableName: 'rate_limits' });
    }
    throw new Error(`Unknown rate limit store type: ${type}`);
};

const createSlidingWindowLimiter = (points, duration) => {
    return new RateLimiterMemory({ points, duration, execEvenly: false, execEvenlyMinDelayMs: Math.round(duration * 1000 / points) });
};

const PROGRESSIVE_ENFORCEMENT = {
    enabled: true,
    thresholds: { suspicious: 3, blocked: 10 },
    multipliers: { NORMAL: 1.0, SUSPICIOUS: 0.5, BLOCKED: 0 }
};

const SLIDING_WINDOW_CONFIG = { enabled: false };

// ====================================================================
// 1. ОПИСАНИЕ ЛИМИТЕРОВ
// ====================================================================
const LIMITERS = {
    // === 🛡️ УРОВЕНЬ 1: ГЛОБАЛЬНЫЙ ЩИТ ===
    GLOBAL_SEARCH_PERSONE: createLimiter('redis', 5000, 1 * MINUTE),
    GLOBAL_SEARCH_PVZ: createLimiter('redis', 5000, 1 * MINUTE),
    GLOBAL_PUBLIC_API: createLimiter('redis', 15000, 1 * MINUTE), // Общий щит для всех публичных эндпоинтов

    // === 👤 УРОВЕНЬ 2: ПОИСК (Существующие) ===
    PERSONE_DEVICE_PER_DAY: createLimiter('postgres', 1, 1 * DAY),
    PERSONE_SUBNET_PER_DAY: createLimiter('postgres', 30, 1 * DAY),
    PERSONE_EMAIL_PER_DAY: createLimiter('postgres', 1, 1 * DAY),

    PVZ_DEVICE_PER_DAY: createLimiter('postgres', 1, 1 * DAY),
    PVZ_SUBNET_PER_DAY: createLimiter('postgres', 30, 1 * DAY),
    PVZ_EMAIL_PER_DAY: createLimiter('postgres', 1, 1 * DAY),

    // === 🔐 КАТЕГОРИЯ А: Аутентификация (Защита от брутфорса) ===
    // Очень строгие лимиты. Боты будут заблокированы быстро, но обычный пользователь не пострадает.
    AUTH_IP_PER_MINUTE: createLimiter('redis', 5, 1 * MINUTE),
    AUTH_IP_PER_HOUR: createLimiter('redis', 15, 1 * HOUR),
    AUTH_DEVICE_PER_HOUR: createLimiter('redis', 10, 1 * HOUR),

    // === КАТЕГОРИЯ Б: Создание/Изменение данных (Защита от спама) ===
    // /createIncident, /createContestation, /updateIncident и т.д.
    CREATE_DEVICE_PER_MINUTE: createLimiter('redis', 5, 1 * MINUTE),
    CREATE_DEVICE_PER_DAY: createLimiter('postgres', 50, 1 * DAY),
    CREATE_IP_PER_MINUTE: createLimiter('redis', 15, 1 * MINUTE),
    CREATE_SUBNET_PER_DAY: createLimiter('postgres', 300, 1 * DAY), // Запас для офисов

    // === КАТЕГОРИЯ В: Чтение данных (Защита от скрейпинга) ===
    // /getIncidents, /getPolicy, /getCreateIncidentData и т.д.
    READ_DEVICE_PER_MINUTE: createLimiter('redis', 100, 1 * MINUTE),
    READ_DEVICE_PER_DAY: createLimiter('postgres', 700, 1 * DAY),
    READ_IP_PER_MINUTE: createLimiter('redis', 300, 1 * MINUTE),
    READ_SUBNET_PER_DAY: createLimiter('postgres', 10000, 1 * DAY), // Очень мягкий лимит для подсети

    // === КАТЕГОРИЯ Г: Проверка токенов (Защита от перебора) ===
    // /verify/:token
    VERIFY_IP_PER_MINUTE: createLimiter('redis', 15, 1 * MINUTE),
    VERIFY_DEVICE_PER_HOUR: createLimiter('redis', 50, 1 * HOUR),

    // === ⚙️ СИСТЕМНЫЕ ===
    VIOLATIONS_TRACKER: createLimiter('redis', 100, 1 * HOUR),
    TEMPORARY_BLOCK: createLimiter('redis', 0, 1 * HOUR),
    ...(SLIDING_WINDOW_CONFIG.enabled ? {
        PERSONE_DEVICE_SLIDING: createSlidingWindowLimiter(3, 1 * DAY),
        PVZ_DEVICE_SLIDING: createSlidingWindowLimiter(10, 1 * DAY),
    } : {}),
};

// ====================================================================
// 2. ПРАВИЛА ДЛЯ МАРШРУТОВ
// ====================================================================
const ROUTE_RULES = {
    // --- СУЩЕСТВУЮЩИЕ ---
    SEARCH_PERSONE: {
        global: { enabled: true, key: 'GLOBAL_SEARCH_PERSONE', message: 'Сервис перегружен. Повторите через {retryAfter} сек.' },
        checkMode: 'STRICT',
        buckets: [
            { enabled: true, key: 'PERSONE_EMAIL_PER_DAY', identifier: 'email' },
            { enabled: true, key: 'PERSONE_DEVICE_PER_DAY', identifier: 'device_id' },
            { enabled: true, key: 'PERSONE_SUBNET_PER_DAY', identifier: 'ip_subnet' }
        ],
        message: 'Превышен дневной лимит поиска персон. Повторите через {retryAfter}.'
    },
    SEARCH_PVZ: {
        global: { enabled: true, key: 'GLOBAL_SEARCH_PVZ', message: 'Сервис перегружен. Повторите через {retryAfter} сек.' },
        checkMode: 'STRICT',
        buckets: [
            { enabled: true, key: 'PVZ_EMAIL_PER_DAY', identifier: 'email' },
            { enabled: true, key: 'PVZ_DEVICE_PER_DAY', identifier: 'device_id' },
            { enabled: true, key: 'PVZ_SUBNET_PER_DAY', identifier: 'ip_subnet' }
        ],
        message: 'Превышен дневной лимит поиска ПВЗ. Повторите через {retryAfter}.'
    },

    // --- НОВЫЕ ПРАВИЛА ДЛЯ ПУБЛИЧНЫХ МАРШРУТОВ ---

    // 1. Аутентификация (Критично!)
    AUTH_LOGIN: {
        global: { enabled: true, key: 'GLOBAL_PUBLIC_API', message: 'Сервис перегружен.' },
        checkMode: 'FAIL_FAST', // Быстрая блокировка при подборе паролей
        buckets: [
            { enabled: true, key: 'AUTH_IP_PER_MINUTE', identifier: 'ip' },
            { enabled: true, key: 'AUTH_IP_PER_HOUR', identifier: 'ip' },
            { enabled: true, key: 'AUTH_DEVICE_PER_HOUR', identifier: 'device_id' }
        ],
        message: 'Слишком много попыток входа. Подождите {retryAfter} сек.'
    },

    // 2. Создание инцидентов/оспариваний (Защита от спама)
    CREATE_DATA: {
        global: { enabled: true, key: 'GLOBAL_PUBLIC_API', message: 'Сервис перегружен.' },
        checkMode: 'STRICT',
        buckets: [
            { enabled: true, key: 'CREATE_DEVICE_PER_MINUTE', identifier: 'device_id' },
            { enabled: true, key: 'CREATE_DEVICE_PER_DAY', identifier: 'device_id' },
            { enabled: true, key: 'CREATE_IP_PER_MINUTE', identifier: 'ip' },
            { enabled: true, key: 'CREATE_SUBNET_PER_DAY', identifier: 'ip_subnet' }
        ],
        message: 'Превышен лимит создания записей. Повторите через {retryAfter}.'
    },

    // 3. Чтение списков и данных (Защита от скрейпинга, но мягко для пользователей)
    READ_DATA: {
        global: { enabled: true, key: 'GLOBAL_PUBLIC_API', message: 'Сервис перегружен.' },
        checkMode: 'FAIL_FAST',
        buckets: [
            { enabled: true, key: 'READ_DEVICE_PER_MINUTE', identifier: 'device_id' },
            { enabled: true, key: 'READ_IP_PER_MINUTE', identifier: 'ip' },
            { enabled: true, key: 'READ_SUBNET_PER_DAY', identifier: 'ip_subnet' }
        ],
        message: 'Превышен лимит запросов. Повторите через {retryAfter}.'
    },

    // 4. Проверка документов по токену
    VERIFY_TOKEN: {
        global: { enabled: true, key: 'GLOBAL_PUBLIC_API', message: 'Сервис перегружен.' },
        checkMode: 'STRICT',
        buckets: [
            { enabled: true, key: 'VERIFY_IP_PER_MINUTE', identifier: 'ip' },
            { enabled: true, key: 'VERIFY_DEVICE_PER_HOUR', identifier: 'device_id' }
        ],
        message: 'Слишком много проверок. Повторите через {retryAfter}.'
    }
};

module.exports = { LIMITERS, ROUTE_RULES, PROGRESSIVE_ENFORCEMENT, SLIDING_WINDOW_CONFIG };