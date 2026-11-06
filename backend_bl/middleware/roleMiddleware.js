// roleMiddleware.js (только проверка ролей)
// const logService = require('../services/logService'); // <-- добавлено

const { checkStatus } = require("../services/user/userService");

module.exports = function (role, needToSqlCheck = false) {
    return async function (req, res, next) {
        try {
            if (!req.user || !req.user.data) {
                //                 logService.forContext({
                //                     log_meta_id: 'US220',
                //                     segment: 'USER',
                //                     type_of_action: 'GET',
                //                     subsegment: 'INDIRECT_ACTIONS'
                //                 })
                //                     .inaccessible(`Попытка доступа без данных пользователя`);
                return res.status(403).json({ type: 'FORBIDDEN', message: 'Нет данных пользователя' });
            }

            const userData = req.user.data;
            //             console.log('[ROLE] User data:', userData);

            if (needToSqlCheck) {
                const result = await checkStatus(userData.id, userData.status);

                if (result === 'ERR') {
                    //                     logService.forContext({
                    //                         log_meta_id: 'US221',
                    //                         segment: 'USER',
                    //                         type_of_action: 'GET',
                    //                         subsegment: 'INDIRECT_ACTIONS',
                    //                         record_id: userData.id
                    //                     })
                    //                         .inaccessible(`Попытка доступа: не удалось проверить статус пользователя ID ${userData.id}`);
                    return res.status(403).json({ type: 'FORBIDDEN', message: 'Нет доступа' });
                }

                const hasAccess =
                    (result[0] === true && role.includes(userData.status)) ||
                    (result[0] === false && role.includes(result[1]));

                if (!hasAccess) {
                    //                     logService.forContext({
                    //                         log_meta_id: 'US222',
                    //                         segment: 'USER',
                    //                         type_of_action: 'GET',
                    //                         subsegment: 'INDIRECT_ACTIONS',
                    //                         record_id: userData.id
                    //                     })
                    //                         .inaccessible(`Попытка доступа пользователя ID ${userData.id} (статус: ${userData.status}) к ресурсу, требующему роли: ${JSON.stringify(role)}`);
                    return res.status(403).json({ type: 'FORBIDDEN', message: 'Нет доступа' });
                }
            } else {
                if (!role.includes(userData.status)) {
                    //                     logService.forContext({
                    //                         log_meta_id: 'US223',
                    //                         segment: 'USER',
                    //                         type_of_action: 'GET',
                    //                         subsegment: 'INDIRECT_ACTIONS',
                    //                         record_id: userData.id
                    //                     })
                    //                         .inaccessible(`Попытка доступа пользователя ID ${userData.id} (статус: ${userData.status}) к ресурсу, требующему роли: ${JSON.stringify(role)}`);
                    return res.status(403).json({ type: 'FORBIDDEN', message: 'Нет доступа' });
                }
            }

            next();
        } catch (err) {
            //             logService.forContext({
            //                 log_meta_id: 'US224',
            //                 segment: 'USER',
            //                 type_of_action: 'GET',
            //                 subsegment: 'INDIRECT_ACTIONS',
            //                 record_id: req.user?.data?.id || null
            //             })
            //                 .systemError(`Ошибка в roleMiddleware: ${err.message || err}`);
            //             console.error('[ROLE] Error:', err);
            return res.status(500).json({ type: 'ERROR', message: 'Ошибка проверки роли' });
        }
    };
};