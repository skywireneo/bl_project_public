const apiError = require('../../exceptions/apiError');
const redisClient = require('../../redisClient');
const crypto = require('crypto');
const cacheService = require('../systemServices/cacheService');
const incidentConditionStatusesCommon = require('../incidents/incidentConditionStatuses/incidentConditionStatusesCommon');

// ============================================================================
// РАЗДЕЛИТЕЛЬ ДЛЯ REDIS КЛЮЧЕЙ
// ============================================================================
// Используется вместо ':' чтобы metric_name и entity_id могли содержать ':'
// Например, metric_name = 'page:incidentList_view' содержит двоеточие
// Формат ключа: stats:raw|{metric_name}|{entity_id}|{bucketKey}
const KEY_SEPARATOR = '|';

// ============================================================================
// КОНФИГУРАЦИЯ МЕТРИК
// ============================================================================
// Каждая метрика описывается объектом со следующими полями:
//
// section        - раздел/категория сущности (incidents, page, users и т.д.)
//                  Используется как первый уровень группировки в БД
//
// metric_type    - тип действия (view, create, delete, transition и т.д.)
//                  Используется как второй уровень группировки в БД
//                  ВАЖНО: должен быть уникальным в пределах section
//
// granularity    - базовая гранулярность хранения данных
//                  'minute' - данные пишутся и хранятся поминутно (для частых событий)
//                  'hour'   - данные пишутся и хранятся по часам (для редких событий)
//                  'day'    - данные пишутся и хранятся по дням (для очень редких)
//                  От этой гранулярности зависит:
//                  - Размер ключей в Redis
//                  - Точность данных
//                  - Объём хранилища
//
// retention      - сроки хранения данных в Postgres
//                  minute: N - сколько ЧАСОВ хранить минутные записи
//                  hour: N   - сколько ЧАСОВ хранить часовые записи
//                  day: N    - сколько ДНЕЙ хранить дневные записи
//                  Значение 0 или отсутствие поля = не храним этот уровень
//
// track_unique   - нужно ли считать уникальные события (через HyperLogLog)
//                  true  - при вызове track() с unique_id будет вестись
//                          отдельный счётчик уникальных значений
//                  false - считается только общее количество вызовов
//
// cache          - настройки кеширования запросов на чтение
//   enabled              - включить/выключить кеш для этой метрики
//   ttl_history_minute   - TTL кеша для исторических данных с гранулярностью 'minute' (сек)
//   ttl_history_hour     - TTL кеша для исторических данных с гранулярностью 'hour' (сек)
//   ttl_history_day      - TTL кеша для исторических данных с гранулярностью 'day' (сек)
//   ttl_history_month    - TTL кеша для исторических данных с гранулярностью 'month' (сек)
//   ttl_history_year     - TTL кеша для исторических данных с гранулярностью 'year' (сек)
//   ttl_summary          - TTL кеша для запросов в формате 'summary' (сек)
//   Кеш применяется только для запросов, НЕ включающих текущий момент времени
// ============================================================================

const METRICS_CONFIG = {
    // Просмотр конкретного инцидента
    // Вызывается каждый раз когда пользователь открывает страницу инцидента
    'incidents:view': {
        section: 'incidents',
        metric_type: 'view',
        granularity: 'minute',      // просмотры частые - храним поминутно
        retention: {
            minute: 48,             // минуты храним 2 суток
            hour: 168,              // часы храним 7 дней
            day: 30                 // дни храним месяц
        },
        track_unique: true,         // считаем уникальных зрителей
        cache: {
            enabled: true,
            ttl_history_minute: 120,
            ttl_history_hour: 600,
            ttl_history_day: 1800,
            ttl_history_month: 3600,
            ttl_history_year: 7200,
            ttl_summary: 300
        }
    },

    // Создание инцидента
    // Вызывается один раз при создании инцидента
    'incidents:create': {
        section: 'incidents',
        metric_type: 'create',
        granularity: 'hour',        // создания редкие - минутная точность не нужна
        retention: {
            hour: 720,              // часы храним 30 дней
            day: 365                // дни храним год
        },
        track_unique: true,         // считаем уникальных создателей
        cache: {
            enabled: true,
            ttl_history_hour: 600,
            ttl_history_day: 1800,
            ttl_history_month: 3600,
            ttl_history_year: 7200,
            ttl_summary: 300
        }
    },

    'contestation:create': {
        section: 'contestation',
        metric_type: 'create',
        granularity: 'hour',        // создания редкие - минутная точность не нужна
        retention: {
            hour: 720,              // часы храним 30 дней
            day: 365                // дни храним год
        },
        track_unique: true,         // считаем уникальных создателей
        cache: {
            enabled: true,
            ttl_history_hour: 600,
            ttl_history_day: 1800,
            ttl_history_month: 3600,
            ttl_history_year: 7200,
            ttl_summary: 300
        }
    },

    'search:get': {
        section: 'persone',
        metric_type: 'get',
        granularity: 'hour',        // создания редкие - минутная точность не нужна
        retention: {
            hour: 720,              // часы храним 30 дней
            day: 365                // дни храним год
        },
        track_unique: true,         // считаем уникальных создателей
        cache: {
            enabled: true,
            ttl_history_hour: 600,
            ttl_history_day: 1800,
            ttl_history_month: 3600,
            ttl_history_year: 7200,
            ttl_summary: 300
        }
    },

    'search:get': {
        section: 'pvz',
        metric_type: 'get',
        granularity: 'hour',        // создания редкие - минутная точность не нужна
        retention: {
            hour: 720,              // часы храним 30 дней
            day: 365                // дни храним год
        },
        track_unique: true,         // считаем уникальных создателей
        cache: {
            enabled: true,
            ttl_history_hour: 600,
            ttl_history_day: 1800,
            ttl_history_month: 3600,
            ttl_history_year: 7200,
            ttl_summary: 300
        }
    },

    // Просмотр главной страницы
    // Вызывается при каждом открытии главной страницы
    'page:home_view': {
        section: 'page',
        metric_type: 'home_view',
        granularity: 'minute',
        retention: { minute: 48, hour: 168, day: 30 },
        track_unique: true,         // считаем уникальных посетителей
        cache: {
            enabled: true,
            ttl_history_minute: 120,
            ttl_history_hour: 600,
            ttl_history_day: 1800,
            ttl_history_month: 3600,
            ttl_history_year: 7200,
            ttl_summary: 300
        }
    },

    // Просмотр списка инцидентов
    // Вызывается при каждом открытии страницы со списком инцидентов
    'page:incidentList_view': {
        section: 'page',
        metric_type: 'incidentList_view',
        granularity: 'minute',
        retention: { minute: 48, hour: 168, day: 30 },
        track_unique: false,        // уникальные не нужны - только общее число просмотров
        cache: {
            enabled: true,
            ttl_history_minute: 120,
            ttl_history_hour: 600,
            ttl_history_day: 1800,
            ttl_history_month: 3600,
            ttl_history_year: 7200,
            ttl_summary: 300
        }
    }
};

// ============================================================================
// КОНСТАНТЫ РАБОТЫ СЕРВИСА
// ============================================================================

// Период запуска cron-задачи aggregateFromRedis (в минутах)
// Определяет как часто данные из Redis переносятся в Postgres
// ВАЖНО: должен быть меньше REDIS_TTL_MINUTES, иначе данные могут потеряться
const CRON_PERIOD_MINUTES = 5;

// Время жизни ключей в Redis (в минутах)
// Должно быть минимум в 2-3 раза больше CRON_PERIOD_MINUTES для надёжности
// Если cron не отработает вовремя - данные не успеют протухнуть
const REDIS_TTL_MINUTES = 15;

// Иерархия гранулярностей от самой мелкой к самой крупной
// Используется для валидации, авто-выбора и агрегации
const GRANULARITY_ORDER = ['minute', 'hour', 'day', 'month', 'year'];

// Namespace для кеширования запросов статистики в Redis
const STATS_CACHE_TYPE = 'stats_query';

// Максимум точек данных в одном ответе API
// При превышении этого лимита ответ обрезается до последних N точек
// и в ответ добавляется поле warning с информацией об обрезке
const MAX_POINTS_PER_RESPONSE = 1500;

// Гранулярности, которые поддерживаются в Redis (только мелкие)
// month и year агрегируются на лету из записей Postgres
const REDIS_GRANULARITIES = ['minute', 'hour', 'day'];

class statisticService {
    constructor() {
        this.track = this.track.bind(this);
        this.get = this.get.bind(this);
        this.aggregateFromRedis = this.aggregateFromRedis.bind(this);
        this.aggregateToHigherGranularity = this.aggregateToHigherGranularity.bind(this);
        this.cleanup = this.cleanup.bind(this);
    }

    // ========================================================================
    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    // ========================================================================

    /**
     * Получить текущий временной бакет, округлённый до начала периода
     * @param {string} granularity - 'minute' | 'hour' | 'day' | 'month' | 'year'
     * @returns {Date} - округлённая дата
     */
    getCurrentBucket(granularity = 'minute') {
        return this.roundToGranularity(new Date(), granularity);
    }

    /**
     *  Округлить дату до начала периода указанной гранулярности
     * Используется для агрегации и формирования ключей
     * @param {Date} date - исходная дата
     * @param {string} granularity - целевая гранулярность
     * @returns {Date} - округлённая дата
     */
    roundToGranularity(date, granularity) {
        const result = new Date(date);
        result.setUTCSeconds(0, 0);

        if (granularity === 'hour') {
            result.setUTCMinutes(0);
        } else if (granularity === 'day') {
            result.setUTCHours(0, 0);
        } else if (granularity === 'month') {
            result.setUTCDate(1);
            result.setUTCHours(0, 0, 0, 0);
        } else if (granularity === 'year') {
            result.setUTCMonth(0, 1);
            result.setUTCHours(0, 0, 0, 0);
        }

        return result;
    }

    /**
     * Форматировать дату в строку для Redis ключа (bucketKey)
     * minute: "2026-08-10:14:23"
     * hour:   "2026-08-10:14"
     * day:    "2026-08-10"
     * month:  "2026-08"
     * year:   "2026"
     * 
     *  Внутри bucketKey используется ':' как разделитель даты/времени
     * Это безопасно, т.к. bucketKey всегда в конце ключа и парсится отдельно
     */
    formatBucketKey(bucket, granularity) {
        const year = bucket.getUTCFullYear();
        const month = String(bucket.getUTCMonth() + 1).padStart(2, '0');
        const day = String(bucket.getUTCDate()).padStart(2, '0');
        const hour = String(bucket.getUTCHours()).padStart(2, '0');
        const minute = String(bucket.getUTCMinutes()).padStart(2, '0');

        if (granularity === 'minute') return `${year}-${month}-${day}:${hour}:${minute}`;
        if (granularity === 'hour') return `${year}-${month}-${day}:${hour}`;
        if (granularity === 'day') return `${year}-${month}-${day}`;
        if (granularity === 'month') return `${year}-${month}`;
        if (granularity === 'year') return `${year}`;
        return `${year}-${month}-${day}`;
    }

    /**
     * Проверить, является ли гранулярность test более мелкой чем base
     */
    isGranularityFiner(test, base) {
        return GRANULARITY_ORDER.indexOf(test) < GRANULARITY_ORDER.indexOf(base);
    }

    /**
     * Получить следующий (более крупный) уровень гранулярности
     */
    getNextGranularity(granularity) {
        const idx = GRANULARITY_ORDER.indexOf(granularity);
        return idx < GRANULARITY_ORDER.length - 1 ? GRANULARITY_ORDER[idx + 1] : null;
    }

    /**
     * Сгенерировать массив временных бакетов в диапазоне [from, to)
     */
    generateBuckets(from, to, granularity) {
        const buckets = [];
        const current = this.roundToGranularity(new Date(from), granularity);
        const endDate = new Date(to);

        while (current < endDate) {
            buckets.push(new Date(current));

            if (granularity === 'minute') {
                current.setUTCMinutes(current.getUTCMinutes() + 1);
            } else if (granularity === 'hour') {
                current.setUTCHours(current.getUTCHours() + 1);
            } else if (granularity === 'day') {
                current.setUTCDate(current.getUTCDate() + 1);
            } else if (granularity === 'month') {
                current.setUTCMonth(current.getUTCMonth() + 1);
            } else if (granularity === 'year') {
                current.setUTCFullYear(current.getUTCFullYear() + 1);
            }
        }

        return buckets;
    }

    /**
     * Распарсить bucketKey обратно в объект Date
     * @returns {Date|null}
     */
    parseBucketKey(bucketKey, granularity) {
        try {
            if (granularity === 'minute') {
                const parts = bucketKey.split(':');
                const [year, month, day] = parts[0].split('-').map(Number);
                return new Date(Date.UTC(year, month - 1, day, parseInt(parts[1]), parseInt(parts[2]), 0));
            } else if (granularity === 'hour') {
                const [date, hourStr] = bucketKey.split(':');
                const [year, month, day] = date.split('-').map(Number);
                return new Date(Date.UTC(year, month - 1, day, parseInt(hourStr), 0, 0));
            } else if (granularity === 'day') {
                const [year, month, day] = bucketKey.split('-').map(Number);
                return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
            } else if (granularity === 'month') {
                const [year, month] = bucketKey.split('-').map(Number);
                return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
            } else if (granularity === 'year') {
                return new Date(Date.UTC(parseInt(bucketKey), 0, 1, 0, 0, 0));
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Автоматический выбор оптимальной гранулярности на основе диапазона
     * > 365 дней -> year
     * > 31 день  -> month
     * > 7 дней   -> day
     * > 24 часа  -> hour
     * иначе      -> базовая гранулярность метрики
     */
    getAutoGranularity(fromDate, toDate, baseGranularity) {
        const diffMs = toDate.getTime() - fromDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = diffHours / 24;

        let autoGranularity;
        if (diffDays > 365) {
            autoGranularity = 'year';
        } else if (diffDays > 31) {
            autoGranularity = 'month';
        } else if (diffDays > 7) {
            autoGranularity = 'day';
        } else if (diffHours > 24) {
            autoGranularity = 'hour';
        } else {
            autoGranularity = baseGranularity;
        }

        // Не можем быть мельче базовой гранулярности метрики
        if (this.isGranularityFiner(autoGranularity, baseGranularity)) {
            autoGranularity = baseGranularity;
        }

        return autoGranularity;
    }

    /**
     *  ПОСТРОЕНИЕ REDIS КЛЮЧА
     * Формат: {prefix}|{metric_name}|{entity_id}|{bucketKey}
     * Пример: stats:raw|page:incidentList_view|incidentList|2026-08-09:23:05
     * 
     * Использует KEY_SEPARATOR ('|') вместо ':' чтобы metric_name и entity_id
     * могли содержать двоеточия без конфликта парсинга
     */
    buildRedisKey(prefix, metric_name, entity_id, bucketKey) {
        return [prefix, metric_name, entity_id, bucketKey].join(KEY_SEPARATOR);
    }

    /**
     *  ПАРСИНГ REDIS КЛЮЧА
     * Формат: {prefix}|{metric_name}|{entity_id}|{bucketKey}
     * @returns {Object|null} - { prefix, metric_name, entity_id, bucketKey }
     */
    parseRedisKey(key) {
        const parts = key.split(KEY_SEPARATOR);
        // Минимум: prefix|metric|entity|bucket = 4 части
        if (parts.length < 4) return null;

        return {
            prefix: parts[0],
            metric_name: parts[1],
            entity_id: parts[2],
            bucketKey: parts[3]
        };
    }

    /**
     *  Сформировать meta-информацию о метрике для ответа
     * Содержит настройки метрики для отображения на фронтенде
     */
    buildMeta(config, metric_name, requestedGranularity, effectiveGranularity) {
        return {
            metric_name,
            section: config.section,
            metric_type: config.metric_type,
            base_granularity: config.granularity,
            requested_granularity: requestedGranularity,
            effective_granularity: effectiveGranularity,
            retention: { ...config.retention },
            track_unique: config.track_unique,
            cache: {
                enabled: config.cache?.enabled || false,
                ttl_history_minute: config.cache?.ttl_history_minute || null,
                ttl_history_hour: config.cache?.ttl_history_hour || null,
                ttl_history_day: config.cache?.ttl_history_day || null,
                ttl_history_month: config.cache?.ttl_history_month || null,
                ttl_history_year: config.cache?.ttl_history_year || null,
                ttl_summary: config.cache?.ttl_summary || null
            },
            max_points_per_response: MAX_POINTS_PER_RESPONSE,
            granularities_available: GRANULARITY_ORDER
        };
    }

    // ========================================================================
    // ВНЕШНИЕ МЕТОДЫ (для использования из бизнес-логики)
    // ========================================================================

    /**
     * Записать событие в статистику
     * Вызывается из бизнес-логики при наступлении события
     * 
     * @param {string} metric_name - имя метрики из METRICS_CONFIG
     * @param {string} entity_id - ID сущности (текст)
     * @param {Object} options
     * @param {string|number} options.unique_id - ID для подсчёта уникальных (user_id, session_id)
     * @param {number} options.count - количество событий (по умолчанию 1)
     */
    async track(metric_name, entity_id, options = {}) {
        const config = METRICS_CONFIG[metric_name];
        if (!config) {
            console.warn(`[Stats] Unknown metric: ${metric_name}`);
            return;
        }
        if (!entity_id) {
            console.warn(`[Stats] Missing entity_id for ${metric_name}`);
            return;
        }

        const count = options.count || 1;
        const uniqueId = options.unique_id;

        try {
            const bucket = this.getCurrentBucket(config.granularity);
            const bucketKey = this.formatBucketKey(bucket, config.granularity);

            //  Новый формат ключа с разделителем |
            const rawKey = this.buildRedisKey('stats:raw', metric_name, entity_id, bucketKey);

            // Инкремент обычного счётчика (всегда)
            await redisClient.incrBy(rawKey, count);
            await redisClient.expire(rawKey, REDIS_TTL_MINUTES * 60);

            // Если нужно считать уникальные и передан unique_id
            if (config.track_unique && uniqueId !== undefined && uniqueId !== null) {
                const uniqKey = this.buildRedisKey('stats:uniq', metric_name, entity_id, bucketKey);
                await redisClient.pfadd(uniqKey, String(uniqueId));
                await redisClient.expire(uniqKey, REDIS_TTL_MINUTES * 60);
            }
        } catch (error) {
            // Graceful degradation: статистика не должна ломать основное приложение
            console.error(`[Stats] Track failed for ${metric_name}:${entity_id}:`, error.message);
        }
    }

    /**
     * ========================================================================
     * ПОЛУЧИТЬ СТАТИСТИКУ ЗА ПЕРИОД
     * ========================================================================
     * 
     * Основной метод для чтения статистических данных. Объединяет данные из
     * Postgres (исторические) и Redis (свежие, ещё не агрегированные),
     * выполняет агрегацию к нужной гранулярности и кеширует результат.
     * 
     * Поддерживает ЛЮБУЮ гранулярность (minute, hour, day, month, year)
     * даже если в БД данные только в минутах - агрегация происходит на лету.
     * 
     * @param {Object} client - клиент PostgreSQL (из пула соединений)
     * 
     * @param {string} metric_name - имя метрики из METRICS_CONFIG
     *        Примеры: 'incidents:view', 'incidents:create', 'page:home_view'
     *        Если метрика не найдена - бросается ошибка INVALID_METRIC
     * 
     * @param {string} entity_id - ID сущности, для которой получаем статистику
     *        Это текстовый идентификатор, который передавался в track()
     *        Примеры: '09082026-QHEBN' (инцидент), 'home' (главная страница)
     * 
     * @param {Object} params - параметры запроса
     * 
     * @param {string} params.from - ОБОЯЗАТЕЛЬНО. Дата начала периода в ISO формате
     *        Пример: '2026-08-01T00:00:00Z'
     *        Влияние: определяет левую границу запрашиваемого диапазона
     * 
     * @param {string} params.to - ОБОЯЗАТЕЛЬНО. Дата конца периода в ISO формате
     *        Пример: '2026-08-10T23:59:59Z'
     *        Влияние: определяет правую границу диапазона
     *        ВАЖНО: если to >= текущего момента, данные НЕ кешируются
     *        (они ещё меняются в реальном времени)
     * 
     * @param {string} params.granularity - детализация данных в ответе
     *        Значения:
     *          'minute' - данные по минутам (максимальная детализация)
     *          'hour'   - данные по часам
     *          'day'    - данные по дням
     *          'month'  - данные по месяцам (агрегируются из доступных данных)
     *          'year'   - данные по годам (агрегируются из доступных данных)
     *          'auto'   - автоматический выбор на основе диапазона:
     *                     > 365 дней -> year
     *                     > 31 день  -> month
     *                     > 7 дней   -> day
     *                     > 24 часа  -> hour
     *                     иначе      -> базовая гранулярность метрики
     *        По умолчанию: 'auto'
     *        Влияние: определяет сколько точек будет в ответе и их размер
     *        Ограничение: нельзя запросить гранулярность мельче базовой
     *        (например, если метрика хранится по часам, minute вернёт hour)
     * 
     * @param {string} params.format - формат ответа
     *        Значения:
     *          'array'   - объект с массивом точек данных (по умолчанию)
     *                      { data: [...], meta: {...}, warning? }
     *          'summary' - только суммарные значения
     *                      { total_count, total_unique, data_points, meta, warning? }
     *          'both'    - и summary, и массив точек
     *                      { summary: {...}, data: [...], meta: {...}, warning? }
     *        Влияние: определяет структуру и объём ответа
     *        ВАЖНО: во всех форматах присутствует поле meta (если include_meta=true)
     * 
     * @param {boolean} params.force_refresh - принудительное обновление
     *        По умолчанию: false
     *        Влияние: если true - обходит кеш и запрашивает данные напрямую
     *        Полезно для админки или когда нужны максимально свежие данные
     * 
     * @param {boolean} params.include_meta - включать ли meta-информацию в ответ
     *        По умолчанию: true
     *        Влияние: если false - поле meta не добавляется в ответ
     *        Полезно для уменьшения размера ответа, если meta не нужна
     * 
     * @returns {Object} - статистика в запрошенном формате (всегда объект)
     *        Поле meta содержит настройки метрики для отображения на фронте
     *        Если точек больше MAX_POINTS_PER_RESPONSE - ответ обрезается
     *        и добавляется поле warning с информацией об обрезке
     * 
     * @throws {apiError.BadRequest} - при некорректных параметрах
     * 
     * СТРУКТУРА META:
     * {
     *   metric_name: 'incidents:view',          // имя метрики
     *   section: 'incidents',                    // раздел
     *   metric_type: 'view',                     // тип действия
     *   base_granularity: 'minute',              // базовая гранулярность хранения
     *   requested_granularity: 'auto',           // запрошенная гранулярность
     *   effective_granularity: 'hour',           // фактически использованная
     *   retention: { minute: 48, hour: 168, day: 30 },  // сроки хранения
     *   track_unique: true,                      // считаются ли уникальные
     *   cache: {                                 // настройки кеша
     *     enabled: true,
     *     ttl_history_minute: 120,
     *     ttl_history_hour: 600,
     *     ttl_history_day: 1800,
     *     ttl_history_month: 3600,
     *     ttl_history_year: 7200,
     *     ttl_summary: 300
     *   },
     *   max_points_per_response: 1500,           // лимит точек в ответе
     *   granularities_available: [...]           // доступные гранулярности
     * }
     * 
     * ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ:
     * 
     * // Статистика просмотров за последний день по часам
     * await statisticService.get(client, 'incidents:view', '09082026-QHEBN', {
     *     from: '2026-08-09T00:00:00Z',
     *     to: '2026-08-09T23:59:59Z',
     *     granularity: 'hour'
     * });
     * 
     * // Статистика за месяц по дням с суммарными значениями
     * await statisticService.get(client, 'page:home_view', 'home', {
     *     from: '2026-07-10T00:00:00Z',
     *     to: '2026-08-10T00:00:00Z',
     *     granularity: 'day',
     *     format: 'both'
     * });
     * 
     * // Статистика за год по месяцам (даже если в БД только минуты)
     * await statisticService.get(client, 'incidents:create', 'all', {
     *     from: '2025-08-10T00:00:00Z',
     *     to: '2026-08-10T00:00:00Z',
     *     granularity: 'month'
     * });
     * 
     * // Автоматическая гранулярность (определяется по диапазону)
     * await statisticService.get(client, 'incidents:view', '09082026-QHEBN', {
     *     from: '2026-08-01T00:00:00Z',
     *     to: '2026-08-10T00:00:00Z'
     * });
     * ========================================================================
     */
    async get(client, metric_name, entity_id, params = {}) {
        const config = METRICS_CONFIG[metric_name];
        if (!config) throw apiError.BadRequest('INVALID_METRIC', `Неизвестная метрика: ${metric_name}`);
        if (!entity_id) throw apiError.BadRequest('MISSING_ENTITY_ID', 'Отсутствует entity_id');

        const {
            from,
            to,
            granularity = 'auto',
            format = 'array',
            force_refresh = false,
            include_meta = true
        } = params;

        if (!from || !to) throw apiError.BadRequest('MISSING_DATE_RANGE', 'Необходимо указать from и to');

        const fromDate = new Date(from);
        const toDate = new Date(to);

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            throw apiError.BadRequest('INVALID_DATE', 'Некорректный формат даты');
        }
        if (fromDate >= toDate) {
            throw apiError.BadRequest('INVALID_DATE_RANGE', 'from должен быть меньше to');
        }

        // Валидация гранулярности
        if (!GRANULARITY_ORDER.includes(granularity) && granularity !== 'auto') {
            throw apiError.BadRequest(
                'INVALID_GRANULARITY',
                `Некорректная гранулярность: ${granularity}. Допустимые значения: ${GRANULARITY_ORDER.join(', ')}, auto`
            );
        }

        // Валидация формата
        const validFormats = ['array', 'summary', 'both'];
        if (!validFormats.includes(format)) {
            throw apiError.BadRequest(
                'INVALID_FORMAT',
                `Некорректный формат: ${format}. Допустимые значения: ${validFormats.join(', ')}`
            );
        }

        // Определяем целевую гранулярность
        let targetGranularity;
        if (granularity === 'auto') {
            targetGranularity = this.getAutoGranularity(fromDate, toDate, config.granularity);
        } else {
            targetGranularity = granularity;
            // Нельзя запросить гранулярность мельче базовой
            if (this.isGranularityFiner(targetGranularity, config.granularity)) {
                targetGranularity = config.granularity;
            }
        }

        // Формируем meta-информацию
        const meta = include_meta
            ? this.buildMeta(config, metric_name, granularity, targetGranularity)
            : null;

        // Кеширование запроса
        const cacheInfo = this.shouldCache(config, fromDate, toDate, targetGranularity, format);

        let result;
        if (cacheInfo.shouldCache && !force_refresh) {
            const cacheKey = this.buildCacheKey(metric_name, entity_id, params);
            result = await cacheService.getOrSet(
                STATS_CACHE_TYPE,
                cacheKey,
                async () => await this.fetchStats(client, config, metric_name, entity_id, fromDate, toDate, targetGranularity, format),
                cacheInfo.ttl
            );
        } else {
            result = await this.fetchStats(client, config, metric_name, entity_id, fromDate, toDate, targetGranularity, format);
        }

        // Добавляем meta в ответ
        if (include_meta && result && typeof result === 'object') {
            result.meta = meta;
        }

        return result;
    }

    /**
     * Определить, нужно ли кешировать запрос и с каким TTL
     */
    shouldCache(config, fromDate, toDate, granularity, format) {
        if (!config.cache?.enabled) return { shouldCache: false };
        // Данные, включающие текущий момент, не кешируем (они меняются)
        if (toDate >= new Date()) return { shouldCache: false };

        if (format === 'summary') return { shouldCache: true, ttl: config.cache.ttl_summary || 300 };
        if (granularity === 'year') return { shouldCache: true, ttl: config.cache.ttl_history_year || 7200 };
        if (granularity === 'month') return { shouldCache: true, ttl: config.cache.ttl_history_month || 3600 };
        if (granularity === 'day') return { shouldCache: true, ttl: config.cache.ttl_history_day || 1800 };
        if (granularity === 'hour') return { shouldCache: true, ttl: config.cache.ttl_history_hour || 600 };
        if (granularity === 'minute') return { shouldCache: true, ttl: config.cache.ttl_history_minute || 120 };

        return { shouldCache: false };
    }

    /**
     * Построить уникальный ключ кеша из параметров запроса
     */
    buildCacheKey(metric_name, entity_id, params) {
        const paramsHash = crypto.createHash('md5')
            .update(JSON.stringify(params))
            .digest('hex')
            .substring(0, 12);
        return `${metric_name}:${entity_id}:${paramsHash}`;
    }

    /**
     * Основная логика получения статистики
     * Читает из Postgres с универсальной агрегацией, из Redis - только свежие данные
     */
    async fetchStats(client, config, metric_name, entity_id, fromDate, toDate, targetGranularity, format) {
        // 1. Читаем из Postgres с универсальной агрегацией к целевой гранулярности
        const postgresData = await this.getFromPostgres(
            client, config, entity_id, fromDate, toDate, targetGranularity
        );

        // 2. Читаем свежие данные из Redis (ещё не агрегированы в Postgres)
        let redisData = [];
        if (REDIS_GRANULARITIES.includes(config.granularity)) {
            redisData = await this.getFreshFromRedis(config, metric_name, entity_id);
        }

        // 3. Агрегируем Redis данные к целевой гранулярности если нужно
        let redisAggregated = redisData;
        if (redisData.length > 0 && config.granularity !== targetGranularity) {
            redisAggregated = this.aggregateData(redisData, config.granularity, targetGranularity);
        }

        // 4. Объединяем Postgres и Redis
        // Redis имеет приоритет для свежих данных (они ещё не в Postgres)
        const combined = this.mergeWithPriority(redisAggregated, postgresData);

        // 5. Обрезаем при превышении лимита
        const { data: truncated, warning } = this.truncateIfNeeded(combined);

        // 6. Форматируем ответ
        return this.formatResponse(truncated, format, warning);
    }

    /**
     * Обрезка данных при превышении лимита точек
     * Возвращает самые свежие MAX_POINTS_PER_RESPONSE точек + warning
     */
    truncateIfNeeded(data) {
        if (data.length <= MAX_POINTS_PER_RESPONSE) {
            return { data, warning: null };
        }

        // Берём самые свежие точки (конец массива, т.к. данные отсортированы по возрастанию)
        const truncated = data.slice(-MAX_POINTS_PER_RESPONSE);

        const warning = {
            truncated: true,
            original_count: data.length,
            returned_count: MAX_POINTS_PER_RESPONSE,
            max_allowed: MAX_POINTS_PER_RESPONSE,
            hint: `Ответ обрезан. Вернулись последние ${MAX_POINTS_PER_RESPONSE} точек. Для большего диапазона используйте более крупную гранулярность (hour/day/month/year).`
        };

        return { data: truncated, warning };
    }

    // ========================================================================
    // МЕТОДЫ ПОЛУЧЕНИЯ ДАННЫХ ИЗ ХРАНИЛИЩ
    // ========================================================================

    /**
     *  УНИВЕРСАЛЬНОЕ получение данных из Postgres
     * 
     * Работает для ЛЮБОЙ целевой гранулярности (minute, hour, day, month, year)
     * даже если в БД данные только в более мелких гранулярностях.
     * 
     * Алгоритм:
     * 1. Читаем ВСЕ записи с гранулярностью мельче или равной целевой
     * 2. Агрегируем к целевой гранулярности с приоритетом более крупных
     * 3. Если для периода есть hour-запись, minute-записи за тот же час игнорируются
     * 
     * Это гарантирует корректный результат даже если cron-агрегация ещё не отработала
     */
    async getFromPostgres(client, config, entity_id, from, to, targetGranularity) {
        try {
            // Определяем какие гранулярности нужно читать
            // Все мельче или равные целевой
            const targetIdx = GRANULARITY_ORDER.indexOf(targetGranularity);
            const granularitiesToRead = GRANULARITY_ORDER.slice(0, targetIdx + 1);

            // Читаем все записи одним запросом
            const query = `
                SELECT time_bucket, bucket_type, count, unique_count
                FROM stats_records
                WHERE section = $1
                  AND metric_type = $2
                  AND entity_id = $3
                  AND bucket_type = ANY($4)
                  AND time_bucket >= $5
                  AND time_bucket < $6
            `;

            const result = await client.query(query, [
                config.section,
                config.metric_type,
                entity_id,
                granularitiesToRead,
                from,
                to
            ]);

            // Группируем записи по гранулярности
            const byGranularity = {};
            for (const row of result.rows) {
                if (!byGranularity[row.bucket_type]) {
                    byGranularity[row.bucket_type] = [];
                }
                byGranularity[row.bucket_type].push({
                    time: row.time_bucket,
                    count: parseInt(row.count),
                    unique_count: parseInt(row.unique_count),
                    granularity: row.bucket_type,
                    source: 'postgres'
                });
            }

            // Агрегируем к целевой гранулярности с учётом приоритетов
            return this.aggregateToTarget(byGranularity, targetGranularity);

        } catch (error) {
            console.error('[Stats] Postgres query failed:', error.message);
            return [];
        }
    }

    /**
     *  УНИВЕРСАЛЬНАЯ АГРЕГАЦИЯ К ЦЕЛЕВОЙ ГРАНУЛЯРНОСТИ
     * 
     * Обрабатывает данные из разных гранулярностей и агрегирует к целевой,
     * избегая двойного счёта благодаря приоритету более крупных гранулярностей.
     * 
     * Пример: если есть hour-запись за 23:00 и minute-записи за 23:05, 23:06,
     * то при агрегации в day будет использована только hour-запись (она уже
     * включает в себя minute-данные), а minute-записи будут проигнорированы.
     * 
     * @param {Object} byGranularity - данные, сгруппированные по гранулярности
     * @param {string} targetGranularity - целевая гранулярность
     * @returns {Array} - агрегированные данные
     */
    aggregateToTarget(byGranularity, targetGranularity) {
        const targetIdx = GRANULARITY_ORDER.indexOf(targetGranularity);
        const result = new Map();

        // Для каждой гранулярности отслеживаем покрытые периоды
        // Это нужно чтобы избежать двойного счёта
        const coveredPeriods = {};
        for (const gran of GRANULARITY_ORDER) {
            coveredPeriods[gran] = new Set();
        }

        // Идём от самой крупной гранулярности к самой мелкой
        // Крупные имеют приоритет и "покрывают" более мелкие
        for (let i = targetIdx; i >= 0; i--) {
            const gran = GRANULARITY_ORDER[i];
            const data = byGranularity[gran] || [];

            for (const item of data) {
                const itemTime = new Date(item.time);

                // Проверяем, покрыт ли этот период более крупной гранулярностью
                let isCovered = false;
                for (let j = i + 1; j <= targetIdx; j++) {
                    const largerGran = GRANULARITY_ORDER[j];
                    const largerTime = this.roundToGranularity(itemTime, largerGran);
                    if (coveredPeriods[largerGran].has(largerTime.toISOString())) {
                        isCovered = true;
                        break;
                    }
                }

                // Если период уже покрыт более крупной гранулярностью - пропускаем
                if (isCovered) continue;

                // ИСПРАВЛЕНО: Округляем время перед добавлением в Set
                const roundedItemTime = this.roundToGranularity(itemTime, gran);
                coveredPeriods[gran].add(roundedItemTime.toISOString());

                // Агрегируем в целевую гранулярность
                const targetTime = this.roundToGranularity(itemTime, targetGranularity);
                const targetKey = targetTime.toISOString();

                if (!result.has(targetKey)) {
                    result.set(targetKey, {
                        time: targetTime,
                        count: 0,
                        unique_count: 0,
                        granularity: targetGranularity,
                        source: 'aggregated'
                    });
                }

                const agg = result.get(targetKey);
                agg.count += item.count;
                agg.unique_count = Math.max(agg.unique_count, item.unique_count);
            }
        }

        return Array.from(result.values()).sort((a, b) => new Date(a.time) - new Date(b.time));
    }

    /**
     * Получить свежие данные из Redis (за последние REDIS_TTL_MINUTES минут)
     * Эти данные ещё не агрегированы в Postgres
     */
    async getFreshFromRedis(config, metric_name, entity_id) {
        try {
            const now = new Date();
            const freshWindowMs = REDIS_TTL_MINUTES * 60 * 1000;
            const freshFrom = new Date(now.getTime() - freshWindowMs);

            const buckets = this.generateBuckets(freshFrom, now, config.granularity);
            const currentBucket = this.getCurrentBucket(config.granularity);
            const validBuckets = buckets.filter(b => b <= currentBucket);

            if (validBuckets.length === 0) return [];

            //  Новый формат ключа с разделителем |
            const rawKeys = validBuckets.map(b => {
                const bucketKey = this.formatBucketKey(b, config.granularity);
                return this.buildRedisKey('stats:raw', metric_name, entity_id, bucketKey);
            });

            // Защита от пустого массива (mGet с пустым массивом может выдать ошибку)
            if (rawKeys.length === 0) return [];

            // Batch GET для обычных счётчиков
            const countResults = await redisClient.mGet(rawKeys);

            // Batch PF COUNT для уникальных (если нужно)
            let uniqResults = [];
            if (config.track_unique) {
                const uniqKeys = validBuckets.map(b => {
                    const bucketKey = this.formatBucketKey(b, config.granularity);
                    return this.buildRedisKey('stats:uniq', metric_name, entity_id, bucketKey);
                });
                uniqResults = await this.batchPfCount(uniqKeys);
            }

            // Собираем результаты
            const data = [];
            for (let i = 0; i < validBuckets.length; i++) {
                const count = countResults[i] ? parseInt(countResults[i]) : 0;
                const unique_count = config.track_unique ? (uniqResults[i] || 0) : 0;

                if (count > 0 || unique_count > 0) {
                    data.push({
                        time: validBuckets[i],
                        count,
                        unique_count,
                        granularity: config.granularity,
                        source: 'redis'
                    });
                }
            }

            return data;
        } catch (error) {
            console.error('[Stats] Fresh Redis query failed:', error.message);
            return [];
        }
    }

    /**
     * Batch подсчёт HyperLogLog через pipeline
     * Значительно быстрее чем последовательные pfcount
     */
    async batchPfCount(keys) {
        if (!keys || keys.length === 0) return [];

        try {
            // Используем pipeline если поддерживается
            if (typeof redisClient.multi === 'function') {
                const pipeline = redisClient.multi();
                for (const key of keys) {
                    pipeline.pfcount(key);
                }
                const results = await pipeline.exec();
                // node-redis/ioredis возвращают массив [err, result] для каждой команды
                return results.map(r => Array.isArray(r) ? (r[1] || 0) : (r || 0));
            }

            // Fallback: параллельные запросы
            const results = await Promise.all(
                keys.map(key => redisClient.pfcount(key).catch(() => 0))
            );
            return results.map(r => r || 0);
        } catch (error) {
            console.error('[Stats] Batch PF COUNT failed:', error.message);
            return keys.map(() => 0);
        }
    }

    /**
 * Объединить два набора данных с приоритетом
 * При совпадении времени и гранулярности - суммирует значения
 * Используется для merge Redis (приоритет) + Postgres (fallback)
 */
    mergeWithPriority(priorityData, fallbackData) {
        const merged = new Map();

        // Сначала fallback (Postgres данные)
        for (const item of fallbackData) {
            const key = `${new Date(item.time).toISOString()}:${item.granularity}`;
            merged.set(key, { ...item }); // Клонируем объект
        }

        // Потом priority (Redis данные) - суммируем при совпадении
        for (const item of priorityData) {
            const key = `${new Date(item.time).toISOString()}:${item.granularity}`;

            if (merged.has(key)) {
                // Суммируем значения для одинаковых периодов
                const existing = merged.get(key);
                existing.count += item.count;
                // Для unique_count берём максимум (приближённо, точное значение требует HLL MERGE)
                existing.unique_count = Math.max(existing.unique_count, item.unique_count);
                existing.source = 'merged'; // Отмечаем, что данные объединены
            } else {
                merged.set(key, { ...item });
            }
        }

        return Array.from(merged.values()).sort((a, b) => new Date(a.time) - new Date(b.time));
    }

    /**
     * Агрегировать данные из мелкой гранулярности в крупную
     * Используется для агрегации Redis данных к целевой гранулярности
     */
    aggregateData(data, fromGranularity, toGranularity) {
        if (fromGranularity === toGranularity) return data;

        const aggregated = new Map();

        for (const item of data) {
            const bucketTime = this.roundToGranularity(new Date(item.time), toGranularity);
            const key = bucketTime.toISOString();

            if (!aggregated.has(key)) {
                aggregated.set(key, {
                    time: bucketTime,
                    count: 0,
                    unique_count: 0,
                    granularity: toGranularity,
                    source: 'aggregated'
                });
            }

            const agg = aggregated.get(key);
            agg.count += item.count;
            // Для unique_count при агрегации берём максимум (приближённо)
            // Точное значение требует HyperLogLog MERGE, но это сложно
            agg.unique_count = Math.max(agg.unique_count, item.unique_count);
        }

        return Array.from(aggregated.values()).sort((a, b) => new Date(a.time) - new Date(b.time));
    }

    /**
     * Форматировать ответ с учётом предупреждения об обрезке
     * Всегда возвращает объект для единообразия
     */
    formatResponse(data, format, warning = null) {
        if (format === 'summary') {
            const result = {
                total_count: data.reduce((sum, item) => sum + item.count, 0),
                total_unique: data.reduce((sum, item) => Math.max(sum, item.unique_count), 0),
                data_points: data.length
            };
            if (warning) result.warning = warning;
            return result;
        }

        if (format === 'both') {
            const result = {
                summary: {
                    total_count: data.reduce((sum, item) => sum + item.count, 0),
                    total_unique: data.reduce((sum, item) => Math.max(sum, item.unique_count), 0),
                    data_points: data.length
                },
                data
            };
            if (warning) result.warning = warning;
            return result;
        }

        // format === 'array' (по умолчанию)
        const result = { data };
        if (warning) result.warning = warning;
        return result;
    }

    // ========================================================================
    // CRON МЕТОДЫ (вызываются по расписанию извне)
    // ========================================================================

    /**
     * CRON: Перенос данных из Redis в Postgres
     * Вызывается каждые CRON_PERIOD_MINUTES минут
     * 
     * Логика:
     * 1. Находим все ключи stats:raw|* в Redis
     * 2. Для каждого завершённого бакета: читаем значение, удаляем из Redis, пишем в Postgres
     * 3. Текущие (незавершённые) бакеты не трогаем
     */
    async aggregateFromRedis(client) {
        try {
            const now = new Date();
            now.setUTCSeconds(0, 0);
            // Берём завершённые бакеты (не текущий)
            const cutoffTime = new Date(now.getTime() - CRON_PERIOD_MINUTES * 60 * 1000);

            // Обрабатываем каждую метрику
            for (const [metric_name, config] of Object.entries(METRICS_CONFIG)) {
                await this.aggregateMetricFromRedis(client, metric_name, config, cutoffTime);
            }

            // console.log(`[Stats] Aggregation completed at ${now.toISOString()}`);
        } catch (error) {
            console.error('[Stats] Aggregation failed:', error);
            throw error;
        }
    }

    /**
     * Агрегация одной метрики из Redis в Postgres
     * Использует SCAN для итерации по ключам (безопасно для прода)
     *  Паттерн с разделителем | для корректного поиска
     */
    async aggregateMetricFromRedis(client, metric_name, config, cutoffTime) {
        try {
            //  Паттерн с новым разделителем |
            // stats:raw|{metric_name}|*
            const pattern = `stats:raw${KEY_SEPARATOR}${metric_name}${KEY_SEPARATOR}*`;
            // Курсор как строка (node-redis v4+ требует string)
            let cursor = '0';
            const processedKeys = new Set();

            do {
                const reply = await redisClient.scan(cursor, {
                    MATCH: pattern,
                    COUNT: 100
                });

                // node-redis v4: { cursor, keys }, ioredis: [cursor, keys]
                const nextCursor = Array.isArray(reply) ? reply[0] : reply.cursor;
                const keys = Array.isArray(reply) ? reply[1] : reply.keys;

                if (keys && keys.length > 0) {
                    for (const key of keys) {
                        await this.processRedisKey(client, key, config, cutoffTime, processedKeys);
                    }
                }

                // Конвертируем в строку для следующей итерации
                cursor = String(nextCursor);
            } while (cursor !== '0');

        } catch (error) {
            console.error(`[Stats] Failed to aggregate ${metric_name}:`, error.message);
        }
    }

    /**
     * Обработать один Redis ключ: прочитать, удалить, записать в Postgres
     *  Использует parseRedisKey с разделителем | для корректного парсинга
     */
    async processRedisKey(client, rawKey, config, cutoffTime, processedKeys) {
        try {
            //  Новый парсер с разделителем |
            const parsed = this.parseRedisKey(rawKey);
            if (!parsed) {
                console.warn(`[Stats] Cannot parse key: ${rawKey}`);
                return;
            }

            const { metric_name, entity_id, bucketKey } = parsed;

            // Парсим время из bucketKey
            const bucketTime = this.parseBucketKey(bucketKey, config.granularity);
            // Пропускаем текущие/будущие бакеты
            if (!bucketTime || bucketTime > cutoffTime) return;

            // Проверяем, не обрабатывали ли уже этот ключ
            const processKey = `${entity_id}:${bucketKey}`;
            if (processedKeys.has(processKey)) return;
            processedKeys.add(processKey);

            // Читаем и сразу удаляем из Redis
            const countStr = await redisClient.get(rawKey);
            const count = countStr ? parseInt(countStr) : 0;

            let unique_count = 0;
            if (config.track_unique) {
                //  Новый формат uniq-ключа
                const uniqKey = this.buildRedisKey('stats:uniq', metric_name, entity_id, bucketKey);
                try {
                    unique_count = await redisClient.pfcount(uniqKey);
                    await redisClient.del(uniqKey);
                } catch (e) {
                    unique_count = 0;
                }
            }

            await redisClient.del(rawKey);

            // Записываем в Postgres (UPSERT)
            if (count > 0 || unique_count > 0) {
                await client.query(`
                    INSERT INTO stats_records (section, metric_type, entity_id, time_bucket, bucket_type, count, unique_count, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() AT TIME ZONE 'UTC')
                    ON CONFLICT (section, metric_type, entity_id, time_bucket, bucket_type)
                    DO UPDATE SET 
                        count = stats_records.count + EXCLUDED.count,
                        unique_count = GREATEST(stats_records.unique_count, EXCLUDED.unique_count),
                        updated_at = NOW() AT TIME ZONE 'UTC'
                `, [
                    config.section,
                    config.metric_type,
                    entity_id,
                    bucketTime,
                    config.granularity,
                    count,
                    unique_count
                ]);
            }
        } catch (error) {
            console.error(`[Stats] Failed to process key ${rawKey}:`, error.message);
        }
    }

    /**
     * CRON: Агрегация данных в более крупную гранулярность
     * Вызывается каждый час
     * 
     * Логика:
     * - minute -> hour: агрегируем минутные записи в часовые
     * - hour -> day: агрегируем часовые записи в дневные (только в полночь)
     */
    async aggregateToHigherGranularity(client) {
        try {
            const now = new Date();

            for (const [metric_name, config] of Object.entries(METRICS_CONFIG)) {
                // Агрегируем minute → hour (за последний завершённый час)
                if (config.granularity === 'minute') {
                    await this.aggregateGranularity(
                        client, config, 'minute', 'hour',
                        new Date(now.getTime() - 60 * 60 * 1000)
                    );
                }

                // Агрегируем hour → day (раз в день, в полночь)
                if (now.getUTCHours() === 0) {
                    const currentGranularity = config.granularity === 'minute' ? 'hour' : config.granularity;
                    if (currentGranularity === 'hour') {
                        await this.aggregateGranularity(
                            client, config, 'hour', 'day',
                            new Date(now.getTime() - 24 * 60 * 60 * 1000)
                        );
                    }
                }
            }

            // console.log(`[Stats] Higher granularity aggregation completed`);
        } catch (error) {
            console.error('[Stats] Higher granularity aggregation failed:', error);
            throw error;
        }
    }

    /**
     * Агрегация данных из одной гранулярности в другую через SQL GROUP BY
     */
    async aggregateGranularity(client, config, fromGranularity, toGranularity, cutoffTime) {
        try {
            const query = `
                SELECT 
                    entity_id,
                    DATE_TRUNC('${toGranularity}', time_bucket) as aggregated_time,
                    SUM(count) as total_count,
                    MAX(unique_count) as total_unique
                FROM stats_records
                WHERE section = $1
                  AND metric_type = $2
                  AND bucket_type = $3
                  AND time_bucket < $4
                GROUP BY entity_id, DATE_TRUNC('${toGranularity}', time_bucket)
            `;

            const result = await client.query(query, [
                config.section,
                config.metric_type,
                fromGranularity,
                cutoffTime
            ]);

            // Записываем агрегированные данные
            for (const row of result.rows) {
                await client.query(`
                    INSERT INTO stats_records (section, metric_type, entity_id, time_bucket, bucket_type, count, unique_count, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() AT TIME ZONE 'UTC')
                     ON CONFLICT (section, metric_type, entity_id, time_bucket, bucket_type)
                    DO UPDATE SET 
                        -- ИСПРАВЛЕНО: Перезаписываем значение, так как EXCLUDED.count уже содержит полную сумму
                        count = EXCLUDED.count, 
                        unique_count = GREATEST(stats_records.unique_count, EXCLUDED.unique_count),
                        updated_at = NOW() AT TIME ZONE 'UTC'
                `, [
                    config.section,
                    config.metric_type,
                    row.entity_id,
                    row.aggregated_time,
                    toGranularity,
                    parseInt(row.total_count),
                    parseInt(row.total_unique)
                ]);
            }
        } catch (error) {
            console.error(`[Stats] Failed to aggregate ${fromGranularity} → ${toGranularity}:`, error.message);
        }
    }

    /**
     * CRON: Очистка старых данных согласно retention
     * Вызывается каждый день (рекомендуется в 00:05)
     */
    async cleanup(client) {
        try {
            const now = new Date();
            let totalDeleted = 0;

            for (const [metric_name, config] of Object.entries(METRICS_CONFIG)) {
                // Удаляем старые минуты
                if (config.retention.minute > 0) {
                    const cutoff = new Date(now.getTime() - config.retention.minute * 60 * 60 * 1000);
                    const result = await client.query(`
                        DELETE FROM stats_records 
                        WHERE section = $1 AND metric_type = $2 AND bucket_type = 'minute' AND time_bucket < $3
                    `, [config.section, config.metric_type, cutoff]);
                    totalDeleted += result.rowCount;
                }

                // Удаляем старые часы
                if (config.retention.hour > 0) {
                    const cutoff = new Date(now.getTime() - config.retention.hour * 60 * 60 * 1000);
                    const result = await client.query(`
                        DELETE FROM stats_records 
                        WHERE section = $1 AND metric_type = $2 AND bucket_type = 'hour' AND time_bucket < $3
                    `, [config.section, config.metric_type, cutoff]);
                    totalDeleted += result.rowCount;
                }

                // Удаляем старые дни
                if (config.retention.day > 0) {
                    const cutoff = new Date(now.getTime() - config.retention.day * 24 * 60 * 60 * 1000);
                    const result = await client.query(`
                        DELETE FROM stats_records 
                        WHERE section = $1 AND metric_type = $2 AND bucket_type = 'day' AND time_bucket < $3
                    `, [config.section, config.metric_type, cutoff]);
                    totalDeleted += result.rowCount;
                }
            }

            // console.log(`[Stats] Cleanup completed, deleted ${totalDeleted} records`);
        } catch (error) {
            console.error('[Stats] Cleanup failed:', error);
            throw error;
        }
    }

    // ========================================================================
    // СЕРВИСНЫЕ МЕТОДЫ (для миграции и чистки)
    // ========================================================================

    /**
     * Удалить все Redis ключи статистики
     * Использовать при переходе со старого формата ключа (с ':') на новый (с '|')
     */
    async flushRedisKeys() {
        try {
            let totalDeleted = 0;
            const patterns = ['stats:raw*', 'stats:uniq*'];

            for (const pattern of patterns) {
                let cursor = '0';
                do {
                    const reply = await redisClient.scan(cursor, {
                        MATCH: pattern,
                        COUNT: 100
                    });
                    const nextCursor = Array.isArray(reply) ? reply[0] : reply.cursor;
                    const keys = Array.isArray(reply) ? reply[1] : reply.keys;

                    if (keys && keys.length > 0) {
                        const deleted = await redisClient.del(keys);
                        totalDeleted += deleted;
                    }
                    cursor = String(nextCursor);
                } while (cursor !== '0');
            }

            // console.log(`[Stats] Flushed ${totalDeleted} Redis keys`);
            return totalDeleted;
        } catch (error) {
            console.error('[Stats] Flush Redis keys failed:', error);
            return 0;
        }
    }

    /**
     * Удалить битые записи из Postgres (где entity_id содержит часть metric_name)
     * Использовать для очистки после бага с ':' разделителем
     */
    async cleanupBrokenRecords(client) {
        try {
            let totalDeleted = 0;

            // Находим все некорректные entity_id (те, что содержат ':')
            // Это артефакт старого парсинга через split(':')
            for (const [metric_name, config] of Object.entries(METRICS_CONFIG)) {
                if (metric_name.includes(':')) {
                    // entity_id начинается с части metric_name
                    const prefix = metric_name.split(':')[1]; // например 'incidentList_view'
                    const result = await client.query(`
                        DELETE FROM stats_records 
                        WHERE section = $1 AND metric_type = $2 AND entity_id LIKE $3
                    `, [config.section, config.metric_type, `${prefix}:%`]);
                    totalDeleted += result.rowCount;
                    // console.log(`[Stats] Cleaned broken records for ${metric_name}: ${result.rowCount}`);
                }
            }

            // console.log(`[Stats] Total broken records deleted: ${totalDeleted}`);
            return totalDeleted;
        } catch (error) {
            console.error('[Stats] Cleanup broken records failed:', error);
            return 0;
        }
    }

    /**
 * ========================================================================
 * УДАЛИТЬ ВСЕ ДАННЫЕ СТАТИСТИКИ ДЛЯ СУЩНОСТИ
 * ========================================================================
 * 
 * Полностью удаляет все записи статистики для указанной метрики и entity_id
 * как из Postgres (исторические данные), так и из Redis (свежие данные).
 * 
 * @param {Object} client - клиент PostgreSQL
 * @param {string} metric_name - имя метрики из METRICS_CONFIG
 * @param {string} entity_id - ID сущности
 * @returns {Object} - результат удаления { deleted_pg: number, deleted_redis: number }
 * @throws {apiError.BadRequest} - при некорректных параметрах
 */
    async delete(client, metric_name, entity_id) {
        const config = METRICS_CONFIG[metric_name];
        if (!config) {
            throw apiError.BadRequest('INVALID_METRIC', `Неизвестная метрика: ${metric_name}`);
        }
        if (!entity_id) {
            throw apiError.BadRequest('MISSING_ENTITY_ID', 'Отсутствует entity_id');
        }

        let deleted_pg = 0;
        let deleted_redis = 0;

        // 1. Удаление из Postgres
        try {
            const query = `
            DELETE FROM stats_records
            WHERE section = $1 
              AND metric_type = $2 
              AND entity_id = $3
        `;
            const result = await client.query(query, [
                config.section,
                config.metric_type,
                entity_id
            ]);
            deleted_pg = result.rowCount || 0;
        } catch (error) {
            console.error(`[Stats] Delete from Postgres failed for ${metric_name}:${entity_id}:`, error.message);
            throw apiError.BadRequest('DELETE_FAILED', `Ошибка удаления из БД: ${error.message}`);
        }

        // 2. Удаление из Redis
        try {
            const patterns = [
                `stats:raw${KEY_SEPARATOR}${metric_name}${KEY_SEPARATOR}${entity_id}${KEY_SEPARATOR}*`,
                `stats:uniq${KEY_SEPARATOR}${metric_name}${KEY_SEPARATOR}${entity_id}${KEY_SEPARATOR}*`
            ];

            for (const pattern of patterns) {
                let cursor = '0';
                do {
                    const reply = await redisClient.scan(cursor, {
                        MATCH: pattern,
                        COUNT: 100
                    });

                    const nextCursor = Array.isArray(reply) ? reply[0] : reply.cursor;
                    const keys = Array.isArray(reply) ? reply[1] : reply.keys;

                    if (keys && keys.length > 0) {
                        const deleted = await redisClient.del(keys);
                        deleted_redis += deleted;
                    }

                    cursor = String(nextCursor);
                } while (cursor !== '0');
            }
        } catch (error) {
            console.error(`[Stats] Delete from Redis failed for ${metric_name}:${entity_id}:`, error.message);
            // Не бросаем ошибку - данные из Postgres уже удалены
        }

        // console.log(`[Stats] Deleted stats for ${metric_name}:${entity_id} (PG: ${deleted_pg}, Redis: ${deleted_redis})`);

        return {
            deleted_pg,
            deleted_redis
        };
    }

    /**
 * ========================================================================
 * ПОЛУЧИТЬ ОБЩУЮ СВОДНУЮ СТАТИСТИКУ ПО СИСТЕМЕ
 * ========================================================================
 * 
 * Возвращает числовые показатели:
 * - incidents_total:       все активные (не удалённые) инциденты
 * - incidents_resolved:    инциденты в статусе 'resolved'
 * - persons_names_total:   количество записей имён в БД (persone_names)
 * - pvz_total:             количество адресов ПВЗ в БД (incident_pvz)
 * 
 * Результат кешируется на 5 минут, так как это "тяжёлый" запрос
 * и данные не меняются каждую секунду.
 * 
 * @param {Object} client - клиент PostgreSQL
 * @param {boolean} force_refresh - принудительное обновление (обход кеша)
 * @returns {Object} - объект с числовой статистикой
 */
    async getOverviewStats(client, force_refresh = false) {
        const CACHE_KEY = 'overview_stats';
        const CACHE_TTL = 300; // 5 минут

        const fetchFromDB = async () => {
            //  Ленивый require во избежание циклических зависимостей
            const allStatuses = await incidentConditionStatusesCommon.getAllStatuses(client);
            const resolvedStatus = allStatuses.find(s => s.status_code_name === 'resolved');
            const resolvedStatusId = resolvedStatus ? resolvedStatus.status_id : null;

            // === Формируем запросы ===

            // 1. Все активные инциденты
            const totalIncidentsQuery = client.query(
                `SELECT COUNT(*) as count FROM incidents_main_info WHERE deleted = false  AND type = 1`
            );

            // 2. Инциденты в статусе resolved
            const resolvedIncidentsQuery = resolvedStatusId
                ? client.query(
                    `SELECT COUNT(*) as count 
                     FROM incidents_main_info 
                     WHERE deleted = false AND condition_id = $1 AND type = 1`,
                    [resolvedStatusId]
                )
                : Promise.resolve({ rows: [{ count: '0' }] });

            // 3. Количество имён в БД (persone_names)
            const personsQuery = client.query(
                `SELECT COUNT(*) as count FROM persone_names`
            );

            // 4. Количество ПВЗ (адресов) в БД
            const pvzQuery = client.query(
                `SELECT COUNT(*) as count FROM incident_pvz`
            );

            // Выполняем параллельно для скорости
            const [totalIncidents, resolvedIncidents, persons, pvz] = await Promise.all([
                totalIncidentsQuery,
                resolvedIncidentsQuery,
                personsQuery,
                pvzQuery
            ]);

            return {
                incidents_total: parseInt(totalIncidents.rows[0].count) || 0,
                incidents_resolved: parseInt(resolvedIncidents.rows[0].count) || 0,
                persons_names_total: parseInt(persons.rows[0].count) || 0,
                pvz_total: parseInt(pvz.rows[0].count) || 0
            };
        };

        try {
            if (force_refresh) {
                return await fetchFromDB();
            }

            return await cacheService.getOrSet(
                STATS_CACHE_TYPE,
                CACHE_KEY,
                fetchFromDB,
                CACHE_TTL
            );
        } catch (error) {
            console.error('[Stats] Overview stats failed:', error.message);
            throw apiError.BadRequest('STATS_FETCH_FAILED', `Не удалось получить общую статистику: ${error.message}`);
        }
    }

    /**
     * Принудительно сбросить кеш общей статистики
     * Вызывается после создания/удаления инцидентов, персон или ПВЗ,
     * если нужны максимально свежие данные
     */
    async invalidateOverviewStatsCache() {
        try {
            await cacheService.deleteKey(STATS_CACHE_TYPE, 'overview_stats');
            // console.log('[Stats] Overview stats cache invalidated');
            return true;
        } catch (error) {
            console.error('[Stats] Failed to invalidate overview stats cache:', error.message);
            return false;
        }
    }
}

module.exports = new statisticService();