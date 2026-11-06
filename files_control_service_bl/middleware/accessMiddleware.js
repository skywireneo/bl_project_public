// middleware/accessMiddleware.js
// const apiError = require('../exceptions/apiError');
// const logService = require('../services/logService');
// const { getUserAccesses, checkAccess } = require('../services/systemServices/accessService');

/**
 * Middleware для проверки доступов пользователя через БД.
 *
 * @param {string[]|string} requiredAccesses - массив коднеймов доступов или одиночный коднейм.
 * @param {Object} [options]
 * @param {'all'|'any'} [options.mode='all'] - 'all' = проверяем наличие всех requiredAccesses, 'any' = хотя бы одного.
 */
module.exports = function (requiredAccesses = [], options = {}) {
    const { mode = 'all' } = options;

    // нормализуем requiredAccesses в массив строк
    const required = Array.isArray(requiredAccesses) ? requiredAccesses : (requiredAccesses ? [requiredAccesses] : []);

    return async function (req, res, next) {
        // try {
        //     const userData = req.user?.data; // authMiddleware кладёт сюда данные из токена
        //     if (!userData) {
        //         return next(apiError.BadRequest('NO_ACCESS', 'Нет данных о пользователе'));
        //     }

        //     // Если включен флаг higher_security — доступ без проверок
        //     if (userData.higher_security) {
        //         return next();
        //     }

        //     // Получаем актуальные доступы пользователя из БД через AccessService
        //     const dbAccesses = await getUserAccesses(userData.id);

        //     // Если нет требований — пропускаем
        //     if (!required.length) return next();

        //     // Проверка доступов
        //     const hasAccess = checkAccess(dbAccesses, required, mode);

        //     if (!hasAccess) {
        //         // Формируем контекст для логгера
        //         logService.forContext({
        //             log_meta_id: 'US201',
        //             segment: 'USER',
        //             type_of_action: 'GET',
        //             user_id: userData.id,
        //             user_login: userData.login,
        //             user_role: userData.status,
        //             subsegment: 'INDIRECT_ACTIONS'
        //         })
        //             .inaccessible(`Попытка доступа к защищённому действию без необходимых прав. Требуемые доступы: ${JSON.stringify(required)}, режим: "${mode}"`);

        //         return next(apiError.BadRequest(
        //             'NO_ACCESS',
        //             'Доступ запрещён по ограничениям (Попробуйте перезагрузить страницу, если не выйдет, значит не судьба :( )'
        //         ));
        //     }

        next();
        // } catch (e) {
        //     console.error('Access middleware error:', e);
        //     return next(apiError.BadRequest('NO_ACCESS', 'Ошибка при проверке доступа'));
        // }
    };
};