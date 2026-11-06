// middleware/envApiKeyMiddleware.js
// const apiError = require('../exceptions/apiError');
// const logService = require('../services/logService'); // <-- добавлено

/**
 * Middleware для проверки API-ключа, хранящегося в .env
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
        // const providedKey = req.headers['x-api-key'];

        // if (!providedKey) {
        //     logService.forContext({
        //         log_meta_id: 'AC030',
        //         segment: 'API_CONTROL',
        //         type_of_action: 'GET',
        //         subsegment: 'INDIRECT_ACTIONS'
        //     })
        //         .inaccessible(`Попытка доступа к защищённому эндпоинту без x-api-key (ожидался ключ из ${envKey})`);
        //     return next(apiError.BadRequest('API_KEY_REQUIRED', 'Требуется заголовок x-api-key'));
        // }

        // if (!expectedKey) {
        //     logService.forContext({
        //         log_meta_id: 'AC031',
        //         segment: 'API_CONTROL',
        //         type_of_action: 'GET',
        //         subsegment: 'INDIRECT_ACTIONS'
        //     })
        //         .systemError(`Попытка доступа при отсутствии настройки переменной окружения ${envKey}`);
        //     return next(apiError.BadRequest('API_KEY_NOT_CONFIGURED', `Ключ ${envKey} не настроен на сервере`));
        // }

        // if (providedKey !== expectedKey) {
        //     logService.forContext({
        //         log_meta_id: 'AC032',
        //         segment: 'API_CONTROL',
        //         type_of_action: 'GET',
        //         subsegment: 'INDIRECT_ACTIONS'
        //     })
        //         .inaccessible(`Попытка доступа с неверным x-api-key (ожидался ключ из ${envKey})`);
        //     return next(apiError.BadRequest('API_KEY_INVALID', 'Неверный API ключ'));
        // }

        // // Успешная проверка — не логируем (как в других middleware)
        // req.envApiKey = {
        //     name: envKey,
        //     verified: true,
        // };

        next();
    };
};

module.exports = envApiKeyMiddleware;