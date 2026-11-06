const redisClient = require('../../redisClient')
const apiError = require('../../exceptions/apiError')

// Версия кеша. При изменении схемы данных увеличиваем - весь старый кеш автоматически инвалидируется
const CACHE_VERSION = 'v1'

class CacheService {

    constructor() {
        this.set = this.set.bind(this);
        this.get = this.get.bind(this);
        this.getOrSet = this.getOrSet.bind(this);
    }

    combineKey(type, key) {
        return `${CACHE_VERSION}:${type}:${key}`;
    }

    /**
     * Сохранение значения в Redis
     */
    async set(type, key, value, ttl = process.env.BACKEND_REDIS_STANDART_TTL) {
        try {
            const stringValue = JSON.stringify(value);
            const fullKey = this.combineKey(type, key);
            if (ttl) {
                await redisClient.set(fullKey, stringValue, { EX: ttl });
            } else {
                await redisClient.set(fullKey, stringValue);
            }
        } catch (error) {
            console.error('[CacheService.set] Ошибка:', error.message);
            // Не бросаем - приложение должно работать даже при падении Redis
        }
    }

    /**
     * Получение значения из Redis
     */
    async get(type, key) {
        try {
            const fullKey = this.combineKey(type, key);
            const value = await redisClient.get(fullKey);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('[CacheService.get] Ошибка:', error.message);
            return null; // При падении Redis возвращаем null
        }
    }

    /**
     *  Главный метод: get or set
     * Пытается получить из кеша, если нет - выполняет callback и кеширует результат
     * @param {string} type - namespace
     * @param {string} key - ключ
     * @param {Function} callback - async функция, которая вернёт данные при cache miss
     * @param {number} ttl - время жизни в секундах
     * @returns {*} - данные из кеша или из callback
     */
    async getOrSet(type, key, callback, ttl = process.env.BACKEND_REDIS_STANDART_TTL) {
        // Пробуем получить из кеша
        try {
            const cached = await this.get(type, key);
            if (cached !== null && cached !== undefined) {
                return cached;
            }
        } catch (error) {
            // Игнорируем ошибки чтения - идём в callback
        }

        // Кеша нет - выполняем callback
        const result = await callback();

        // Сохраняем в кеш (ошибки сохранения не ломают работу)
        try {
            await this.set(type, key, result, ttl);
        } catch (error) {
            console.error('[CacheService.getOrSet] Ошибка сохранения:', error.message);
        }

        return result;
    }

    /**
     * Удаление ключа
     */
    async delete(type, key) {
        try {
            const fullKey = this.combineKey(type, key);
            await redisClient.del(fullKey);
        } catch (error) {
            console.error('[CacheService.delete] Ошибка:', error.message);
        }
    }

    /**
     * Проверка существования ключа
     */
    async exists(type, key) {
        try {
            const fullKey = this.combineKey(type, key);
            const exists = await redisClient.exists(fullKey);
            return !!exists;
        } catch (error) {
            console.error('[CacheService.exists] Ошибка:', error.message);
            return false;
        }
    }

    /**
     * Установить только если ключа ещё нет
     */
    async setIfNotExists(type, key, value, ttl = process.env.BACKEND_REDIS_STANDART_TTL) {
        try {
            const fullKey = this.combineKey(type, key);
            const stringValue = JSON.stringify(value);
            const result = ttl
                ? await redisClient.set(fullKey, stringValue, { NX: true, EX: ttl })
                : await redisClient.set(fullKey, stringValue, { NX: true });
            return !!result;
        } catch (error) {
            console.error('[CacheService.setIfNotExists] Ошибка:', error.message);
            return false;
        }
    }

    /**
     * Получить TTL ключа
     */
    async ttl(type, key) {
        try {
            const fullKey = this.combineKey(type, key);
            const ttl = await redisClient.ttl(fullKey);
            if (ttl === -2) return null; // ключ не существует
            if (ttl === -1) return null; // ключ без TTL
            return ttl;
        } catch (error) {
            console.error('[CacheService.ttl] Ошибка:', error.message);
            return null;
        }
    }

    /**
     * Атомарный инкремент
     */
    async incr(type, key, ttl = process.env.BACKEND_REDIS_STANDART_TTL) {
        try {
            const fullKey = this.combineKey(type, key);
            const newVal = await redisClient.incr(fullKey);
            if (ttl) {
                await redisClient.expire(fullKey, ttl);
            }
            return Number(newVal);
        } catch (error) {
            throw apiError.BadRequest('CACHE_ERROR', 'Ошибка при инкременте: ' + (error.message || error));
        }
    }

    /**
     * Rolling window counter
     */
    async rollingIncr(type, key, windowSeconds) {
        try {
            const fullKey = this.combineKey(type, key);
            const exists = await redisClient.exists(fullKey);

            if (!exists) {
                await redisClient.set(fullKey, 1, { EX: windowSeconds });
                return 1;
            } else {
                const newVal = await redisClient.incr(fullKey);
                return Number(newVal);
            }
        } catch (error) {
            throw apiError.BadRequest('CACHE_ERROR', 'Ошибка rolling increment: ' + (error.message || error));
        }
    }

    /**
     * Получить значение счётчика без увеличения
     */
    async getCounter(type, key) {
        try {
            const fullKey = this.combineKey(type, key);
            const value = await redisClient.get(fullKey);
            return value ? Number(value) : null;
        } catch (error) {
            console.error('[CacheService.getCounter] Ошибка:', error.message);
            return null;
        }
    }

    /**
     *  Безопасное удаление по паттерну через SCAN (для прода)
     * @param {string} type - namespace
     * @param {string} pattern - паттерн (например "user:*" или просто "*")
     * @returns {number} - количество удалённых ключей
     */
    async deletePattern(type, pattern) {
        try {
            const fullPattern = `${CACHE_VERSION}:${type}:${pattern}`;
            let cursor = '0';
            let deletedCount = 0;

            do {
                // SCAN cursor MATCH pattern COUNT 100
                const reply = await redisClient.scan(cursor, {
                    MATCH: fullPattern,
                    COUNT: 100
                });

                // node-redis v4 возвращает { cursor, keys }, ioredis - [cursor, keys]
                const nextCursor = Array.isArray(reply) ? reply[0] : reply.cursor;
                const keys = Array.isArray(reply) ? reply[1] : reply.keys;

                if (keys && keys.length > 0) {
                    const deleted = await redisClient.del(keys);
                    deletedCount += deleted;
                }

                cursor = String(nextCursor);
            } while (cursor !== '0');

            return deletedCount;
        } catch (error) {
            console.error('[CacheService.deletePattern] Ошибка:', error.message);
            return 0;
        }
    }

    /**
     * Подсчёт ключей по паттерну
     */
    async countKeysByPattern(pattern) {
        try {
            const fullPattern = `${CACHE_VERSION}:${pattern}`;
            let cursor = '0';
            let count = 0;

            do {
                const reply = await redisClient.scan(cursor, {
                    MATCH: fullPattern,
                    COUNT: 100
                });

                const nextCursor = Array.isArray(reply) ? reply[0] : reply.cursor;
                const keys = Array.isArray(reply) ? reply[1] : reply.keys;

                count += keys ? keys.length : 0;
                cursor = String(nextCursor);
            } while (cursor !== '0');

            return count;
        } catch (error) {
            console.error('[CacheService.countKeysByPattern] Ошибка:', error.message);
            return 0;
        }
    }

    /**
 *  Подсчёт ключей по паттерну БЕЗ добавления версии (v1)
 * Используется для корневых ключей, например 'rl:*'
 */
    async countKeysByPatternRaw(pattern) {
        try {
            let cursor = '0';
            let count = 0;

            do {
                const reply = await redisClient.scan(cursor, {
                    MATCH: pattern,
                    COUNT: 100
                });

                const nextCursor = Array.isArray(reply) ? reply[0] : reply.cursor;
                const keys = Array.isArray(reply) ? reply[1] : reply.keys;

                count += keys ? keys.length : 0;
                cursor = String(nextCursor);
            } while (cursor !== '0');

            return count;
        } catch (error) {
            console.error('[CacheService.countKeysByPatternRaw] Ошибка:', error.message);
            return 0;
        }
    }

    /**
     *  Безопасное удаление по паттерну БЕЗ добавления версии (v1)
     */
    async deletePatternRaw(pattern) {
        try {
            let cursor = '0';
            let deletedCount = 0;

            do {
                const reply = await redisClient.scan(cursor, {
                    MATCH: pattern,
                    COUNT: 100
                });

                const nextCursor = Array.isArray(reply) ? reply[0] : reply.cursor;
                const keys = Array.isArray(reply) ? reply[1] : reply.keys;

                if (keys && keys.length > 0) {
                    const deleted = await redisClient.del(keys);
                    deletedCount += deleted;
                }

                cursor = String(nextCursor);
            } while (cursor !== '0');

            return deletedCount;
        } catch (error) {
            console.error('[CacheService.deletePatternRaw] Ошибка:', error.message);
            return 0;
        }
    }
}

module.exports = new CacheService();