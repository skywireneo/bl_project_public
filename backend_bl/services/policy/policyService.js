// const apiError = require('../exceptions/apiError');
// const tokenService = require('./systemServices/tokenService');
// const settingsService = require('./settingsService');
// const { tgNotificationSend } = require('../grpc/handlers/notificationSendHandler');
// const { generatePolicyPDF } = require('./pdf/policyPdfService');
// const queryService = require('./systemServices/queryService');
// const notificationsService = require('./notificationsService');
// const { getUserStatuses } = require('./userService');
// const logService = require('./logService');

const globalLogger = require("../utils/logger");
const policyMainVersionService = require("./policyMainVersionService");
const policyPdfService = require("./policyPdfService");
const policyUpdateService = require("./policyUpdateService");

class policyService {
    //     _createLogger(log_meta_id, decoded = null, record_id = null, overrides = {}) {
    //         if (!log_meta_id || typeof log_meta_id !== 'string') {
    //             throw apiError.BadRequest('LOG_META_ID_INVALID', 'log_meta_id должен быть строкой');
    //         }
    //         const baseContext = {
    //             log_meta_id: log_meta_id,
    //             segment: 'POLICY',
    //             type_of_action: 'EDIT',
    //             user_id: decoded?.data?.id ?? null,
    //             record_id: record_id,
    //             ...overrides
    //         };
    //         return logService.forContext(baseContext);
    //     }

    async updatePolicy(client, updateType, policyType, text, changeComment, current_user, reqLogger = null) {

        //  МАГИЯ: Если reqLogger передан (из контроллера), используем его. 
        // Если нет (фоновая задача), используем globalLogger.
        const log = reqLogger || globalLogger;

        // Теперь любой вызов log автоматически будет содержать req_id, user_id и т.д., 
        // если это был HTTP-запрос!
        log.info({
            segment: 'POLICY',
            action: 'UPDATE_START',
            policyType
        }, 'Начало процесса обновления политики');

        try {
            await client.query('BEGIN');
            log.debug({ segment: 'POLICY', action: 'DB_BEGIN' }, 'Транзакция БД начата');

            const output = await policyUpdateService.updatePolicy(
                client, updateType, policyType, text, changeComment, current_user
            );

            await client.query('COMMIT');
            log.info({ segment: 'POLICY', action: 'UPDATE_SUCCESS' }, 'Политика успешно обновлена');

            return output;
        } catch (error) {
            await client.query('ROLLBACK');

            //  При ошибке мы логируем сам объект ошибки. 
            // pino автоматически вытащит из него message и stack trace.
            log.error({
                segment: 'POLICY',
                action: 'UPDATE_FAILED',
                err: error // <--- pino красиво распарсит эту ошибку
            }, 'Ошибка при обновлении политики, выполнен откат транзакции');

            throw error;
        } finally {
            client.release();
        }
    }

    async getPolicyVersionDetail(client, policyType, version, reqLogger = null) {
        try {
            await client.query('BEGIN');
            const output = await policyUpdateService.getPolicyVersionDetail(client, policyType, version)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getPolicyVersions(client, policyType, reqLogger = null) {
        try {
            await client.query('BEGIN');
            const output = await policyUpdateService.getPolicyVersions(client, policyType)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getPolicy(client, policyType, current_user, reqLogger = null) {
        try {
            const log = reqLogger || globalLogger;
            await client.query('BEGIN');
            const output = await policyMainVersionService.getPolicy(client, policyType, current_user)
            log.error({
                segment: 'POLICY',
                action: 'UPDATE_FAILED',
                err: 'test' // <--- pino красиво распарсит эту ошибку
            }, 'Тестовая ошибка');
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getPDFPolicy(client, policyType, current_user, reqLogger = null) {
        try {
            await client.query('BEGIN');
            const output = await policyPdfService.getPDFPolicy(client, policyType, current_user)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new policyService();