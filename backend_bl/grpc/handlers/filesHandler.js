const grpc = require('@grpc/grpc-js');
const secureGrpcClient = require('../clients/secureGrpcClient');
const incidentGetService = require('../../services/incidents/incidentGet/incidentGetService');
const incidentUpdateService = require('../../services/incidents/incidentUpdate/incidentUpdateService');
const pgdb = require('../../pgdb');

// const settingsService = require('../../services/settingsService'); // Логика работы с настройками
// const tokenService = require('../../services/systemServices/tokenService');
// const userService = require('../../services/userService');

// // Функция обработки запроса с метаданными
// async function avDetectedString(call, callback) {
//     try {

//         // Получаем настройку по имени из запроса
//         const { id } = call.request;
//         const finalRes = userService.suspendAccount(id, true, false, "Попытка загрузить вредоносный файл", null, true)
//         console.log("-----------")
//         console.log(id)

//         if (!finalRes.success) {
//             return callback({
//                 code: grpc.status.NOT_FOUND,
//                 message: 'Ошибка',
//             });
//         }

// Если всё в порядке, отправляем результат
// callback(null, { status: true });

//     } catch (error) {
//         // Если произошла ошибка на сервере
//         callback({
//             code: grpc.status.INTERNAL,
//             message: error.message,
//         });
//     }
// }

// Функция обработки запроса с метаданными
async function CanSeeHandler(call, callback) {
    try {
        const { moduleName, recordId, userId, userStatus } = call.request;

        // console.log(`[CanSeeHandler] Запрос: module=${moduleName}, record=${recordId}, user=${userId}`);

        let output = false;

        if (moduleName === "incident_evidence") {
            const client = await pgdb.connect();
            try {
                //  Убрана транзакция - это read-only операция, она не нужна
                output = await incidentGetService.checkCanGetIncidentById(client, recordId, userId, userStatus, true, null, true);
            } catch (error) {
                console.error('[CanSeeHandler] Ошибка БД:', error.message);
                client.release();
                return callback({
                    code: grpc.status.INTERNAL,
                    message: 'Ошибка при проверке доступа: ' + error.message,
                });
            } finally {
                client.release();
            }
        } else if (moduleName === "incident_evidence") {
            // const client = await pgdb.connect();
            // try {
            //     const contestationService = require('../../services/incidents/contestation/contestationService');
            //     // Проверяем доступ к оспариванию
            //     const contestation = await client.query(
            //         `SELECT i.incident_id, i.condition_id, i.publish_on_success, cs.status_code_name
            //          FROM incidents_main_info i
            //          JOIN incident_conditions_statuses cs ON i.condition_id = cs.status_id
            //          WHERE i.incident_id = $1 AND i.type = 2`,
            //         [recordId]
            //     );

            //     if (contestation.rows.length > 0) {
            //         output = await contestationService._checkContestationAccess(
            //             client,
            //             {
            //                 incident_id: contestation.rows[0].incident_id,
            //                 condition_id: contestation.rows[0].condition_id,
            //                 status_code_name: contestation.rows[0].status_code_name,
            //                 publish_on_success: contestation.rows[0].publish_on_success
            //             },
            //             { id: userId },
            //             userStatus,
            //             null
            //         );
            //     }
            // } catch (error) {
            //     console.error('[CanSeeHandler] Ошибка БД при проверке оспаривания:', error.message);
            //     client.release();
            //     return callback({
            //         code: grpc.status.INTERNAL,
            //         message: 'Ошибка при проверке доступа к оспариванию: ' + error.message,
            //     });
            // } finally {
            //     client.release();
            // }
        }

        // console.log(`[CanSeeHandler] Результат: ${output}`);

        if (!output) {
            return callback({
                code: grpc.status.PERMISSION_DENIED,  // ← Лучше NOT_FOUND
                message: 'Доступ запрещён',
            });
        }

        //  ПРАВИЛЬНЫЙ вызов callback с результатом
        callback(null, { status: true });

    } catch (error) {
        console.error('[CanSeeHandler] Необработанная ошибка:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: error.message,
        });
    }
}

// Функция обработки запроса с метаданными
async function CanEditHandler(call, callback) {
    try {
        const { moduleName, recordId, userId, userStatus } = call.request;

        console.log(`[CanEditHandler] Запрос: module=${moduleName}, record=${recordId}, user=${userId}`);

        let output = false;

        if (moduleName === "incident_evidence" || moduleName === "contestation_evidence") {
            const client = await pgdb.connect();
            try {
                //  Убрана транзакция - это read-only проверка прав
                console.log(55658525)
                console.log(recordId, userId, userStatus)
                output = await incidentUpdateService.checkCanEditIncidentById(client, recordId, userId, userStatus, true, null, true);
            } catch (error) {
                console.error('[CanEditHandler] Ошибка БД:', error.message);
                client.release();
                return callback({
                    code: grpc.status.INTERNAL,
                    message: 'Ошибка при проверке доступа: ' + error.message,
                });
            } finally {
                client.release();
            }
        } else if (moduleName === "contestation_evidence") {
            // Для оспариваний редактирование доступно только в первые 15 минут с owner token
            // Эта проверка осуществляется на уровне API, здесь просто возвращаем false
            output = false;
        }

        // console.log(`[CanEditHandler] Результат: ${output}`);

        if (!output) {
            return callback({
                code: grpc.status.PERMISSION_DENIED,
                message: 'Доступ запрещён',
            });
        }

        //  ПРАВИЛЬНЫЙ вызов callback с результатом
        callback(null, { status: true });

    } catch (error) {
        console.error('[CanEditHandler] Необработанная ошибка:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: error.message,
        });
    }
}

async function DeleteIncidentSend(moduleName, id) {
    return await secureGrpcClient.DeleteIncidentSend(moduleName, id);
}

async function FileCount(moduleName, id) {
    return await secureGrpcClient.FileCountSend(moduleName, id);
}

module.exports = {
    //     avDetectedString
    CanSeeHandler,
    CanEditHandler,
    DeleteIncidentSend,
    FileCount
};