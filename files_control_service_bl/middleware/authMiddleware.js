// authMiddleware.js
// const tokenService = require('../services/systemServices/tokenService');
// const userService = require('../services/userService');
// const logService = require('../services/logService'); // <-- добавлено

module.exports = async function (req, res, next) {
    // console.log(`[AUTH MIDDLEWARE] Начало обработки запроса: ${req.method} ${req.url}`);

    // if (req.method === "OPTIONS") {
    //     console.log("[AUTH MIDDLEWARE] Метод OPTIONS — пропускаем авторизацию");
    //     return next();
    // }

    // try {
    //     if ('authorization' in req.headers) {
    //         const authHeader = req.headers.authorization;
    //         const tokenParts = authHeader.split(' ');

    //         if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    //             logService.forContext({
    //                 log_meta_id: 'US210',
    //                 segment: 'USER',
    //                 type_of_action: 'GET',
    //                 subsegment: 'INDIRECT_ACTIONS'
    //             })
    //                 .inaccessible(`Попытка доступа с неверным форматом токена: "${authHeader}"`);
    //             return res.status(401).json({
    //                 type: 'UNAUTHORIZED',
    //                 message: 'Неверный формат токена'
    //             });
    //         }

    //         const token = tokenParts[1];
    //         const decoded = tokenService.validateToken(token);

    //         if (!decoded) {
    //             logService.forContext({
    //                 log_meta_id: 'US211',
    //                 segment: 'USER',
    //                 type_of_action: 'GET',
    //                 subsegment: 'INDIRECT_ACTIONS'
    //             })
    //                 .inaccessible(`Попытка доступа с недействительным токеном`);
    //             return res.status(401).json({
    //                 type: 'UNAUTHORIZED',
    //                 message: 'Токен недействителен'
    //             });
    //         }

    //         await userService.updateOnline(decoded?.data?.id);

    //         req.user = decoded;
    return next();
    //     } else {
    //         logService.forContext({
    //             log_meta_id: 'US212',
    //             segment: 'USER',
    //             type_of_action: 'GET',
    //             subsegment: 'INDIRECT_ACTIONS'
    //         })
    //             .inaccessible(`Попытка доступа без заголовка Authorization`);
    //         return res.status(401).json({
    //             type: 'UNAUTHORIZED',
    //             message: 'Заголовок Authorization отсутствует'
    //         });
    //     }
    // } catch (e) {
    //     logService.forContext({
    //         log_meta_id: 'US213',
    //         segment: 'USER',
    //         type_of_action: 'GET',
    //         subsegment: 'INDIRECT_ACTIONS'
    //     })
    //         .systemError(`Ошибка в authMiddleware: ${e.message || e}`);
    //     return res.status(401).json({
    //         type: 'UNAUTHORIZED',
    //         message: 'Ошибка авторизации'
    //     });
    // }
};