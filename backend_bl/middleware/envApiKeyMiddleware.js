// middleware/envApiKeyMiddleware.js
const apiError = require('../exceptions/apiError');

/**
 * Middleware для проверки API-ключа, хранящегося в .env
 * 
 * ВАЖНО: Ожидаемый заголовок изменён с 'x-api-key' на 'x-scheduler-token'
 * для скрытия от автоматических сканеров.
 *
 * Пример использования:
 * router.post('/internalTask', envApiKeyMiddleware('MONITORING_API_KEY_TO_BACKEND'), controller.handler)
 *
 * @param {string} envKey - Название переменной окружения, где хранится ключ
 */
const envApiKeyMiddleware = (envKey) => {
    if (!envKey) {
        throw new Error('envApiKeyMiddleware: Не передано имя переменной окружения');
    }

    const expectedKey = process.env[envKey];

    if (!expectedKey) {
        console.warn(`[envApiKeyMiddleware] ВНИМАНИЕ: переменная ${envKey} не установлена в .env`);
    }

    return (req, res, next) => {
        // ИЗМЕНЕНИЕ: переименован заголовок
        const providedKey = req.headers['x-scheduler-token'];

        if (!providedKey) {
            return next(apiError.BadRequest('API_KEY_REQUIRED', 'Требуется заголовок x-scheduler-token'));
        }

        if (!expectedKey) {
            return next(apiError.BadRequest('API_KEY_NOT_CONFIGURED', `Ключ ${envKey} не настроен на сервере`));
        }

        if (providedKey !== expectedKey) {
            return next(apiError.BadRequest('API_KEY_INVALID', 'Неверный API ключ'));
        }

        req.envApiKey = {
            name: envKey,
            verified: true,
        };

        next();
    };
};

module.exports = envApiKeyMiddleware;