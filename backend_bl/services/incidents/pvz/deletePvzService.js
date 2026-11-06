// const apiError = require('../exceptions/apiError');
// const tokenService = require('./systemServices/tokenService');
// const queryService = require('./systemServices/queryService');
// const personService = require('./incidentSubServices/personService');
// const pvzService = require('./incidentSubServices/pvzService');
// const { hashData } = require('./systemServices/cryptoService');

// const dictionaryService = require("../../dictionary/dictionaryService");
// const userEncriptionService = require("../../systemServices/userEncriptionService");
const apiError = require("../../../exceptions/apiError");
const dictionaryService = require("../../dictionary/dictionaryService");
const ValidateService = require("../../systemServices/validate/validateService");
const usersEmailService = require("../../users/usersEmailService");
const userTgService = require("../../users/userTgService");
const incidentCheckAndGeneratedDataService = require("../incidentCreate/incidentCheckAndGeneratedDataService");
const commonPvzService = require("./commonPvzService");
const getPvzService = require("./getPvzService");
// const usersEmailService = require("../../users/usersEmailService");
// const incidentCheckAndGeneratedDataService = require("./incidentCheckAndGeneratedDataService");

const validateService = new ValidateService();

class deletePvzService {

    /**
  * Общий метод для удаления связи ПВЗ с инцидентом
  * @param {Object} client - Клиент БД
  * @param {number} incidentId - ID инцидента
  * @param {number} pvzId - ID ПВЗ
  * @returns {Promise<boolean>} - true если удаление успешно
  */
    async deleteIncidentPVZConnector(client, incidentId, pvzId) {
        // Валидация параметров
        validateService.incidentValidation.validateIncidentId(incidentId);
        if (!pvzId) {
            throw apiError.BadRequest('INVALID_PVZ_ID', 'Некорректный ID ПВЗ 1');
        }

        // Проверяем существование инцидента
        if (!await incidentCheckAndGeneratedDataService.checkIncidentExist(client, incidentId, false)) {
            throw apiError.BadRequest('INCIDENT_NOT_EXIST', `Инцидент с ID ${incidentId} не существует`);
        }

        // Проверяем существование ПВЗ
        await commonPvzService.checkPVZExistById(client, pvzId, true);

        // Проверяем существование связи
        const exists = await commonPvzService.checkPVZExistConnector(client, pvzId, incidentId, false);
        if (!exists) {
            throw apiError.BadRequest('CONNECTOR_NOT_EXIST', `Связь между инцидентом ${incidentId} и ПВЗ ${pvzId} не найдена`);
        }

        // Удаляем связь
        const query = `
        DELETE FROM incident_pvz_connector 
        WHERE incident_id = $1 AND pvz_id = $2
        RETURNING id
    `;

        const result = await client.query(query, [incidentId, pvzId]);

        if (result.rowCount === 0) {
            throw apiError.BadRequest('DELETE_FAILED', 'Не удалось удалить связь ПВЗ с инцидентом');
        }

        return true;
    }

    /**
     * Удаление всех ПВЗ по incidentId
     * @param {Object} client - Клиент БД
     * @param {number} incidentId - ID инцидента
     * @returns {Promise<Object>} - Результат удаления
     */
    async deletePVZByIncidentId(client, incidentId) {
        // Валидация параметров
        validateService.incidentValidation.validateIncidentId(incidentId);

        // Проверяем существование инцидента
        if (!await incidentCheckAndGeneratedDataService.checkIncidentExist(client, incidentId, false)) {
            throw apiError.BadRequest('INCIDENT_NOT_EXIST', `Инцидент с ID ${incidentId} не существует`);
        }

        // Получаем список всех ПВЗ для этого инцидента
        const pvzList = await getPvzService.getPVZByIncidentId(client, incidentId, false);

        if (pvzList.length === 0) {
            return {
                success: true,
                message: 'Нет ПВЗ для удаления',
                deletedCount: 0,
                pvzIds: []
            };
        }

        const deletedPvzIds = [];

        for (const pvz of pvzList) {
            // Удаляем связь
            await this.deleteIncidentPVZConnector(client, incidentId, pvz.id);
            deletedPvzIds.push(pvz.id);

            // Проверяем, есть ли еще связи у этого ПВЗ с другими инцидентами
            const checkQuery = `
            SELECT COUNT(*) as count 
            FROM incident_pvz_connector 
            WHERE pvz_id = $1
        `;
            const checkResult = await client.query(checkQuery, [pvz.id]);
            const hasOtherConnections = parseInt(checkResult.rows[0].count) > 0;

            // Если у ПВЗ нет других связей, удаляем сам ПВЗ
            if (!hasOtherConnections) {
                const deletePvzQuery = `
                DELETE FROM incident_pvz 
                WHERE pvz_id = $1
                RETURNING pvz_id
            `;
                await client.query(deletePvzQuery, [pvz.id]);
            }
        }

        return {
            success: true,
            message: `Удалено ${deletedPvzIds.length} ПВЗ`,
            deletedCount: deletedPvzIds.length,
            pvzIds: deletedPvzIds
        };
    }

    /**
     * Удаление конкретного ПВЗ по pvzId из инцидента
     * @param {Object} client - Клиент БД
     * @param {number} incidentId - ID инцидента
     * @param {number} pvzId - ID ПВЗ
     * @returns {Promise<Object>} - Результат удаления
     */
    async deletePVZByPvzId(client, incidentId, pvzId) {
        // Валидация параметров
        validateService.incidentValidation.validateIncidentId(incidentId);
        if (!pvzId) {
            throw apiError.BadRequest('INVALID_PVZ_ID', 'Некорректный ID ПВЗ 2');
        }

        // Проверяем существование инцидента
        if (!await incidentCheckAndGeneratedDataService.checkIncidentExist(client, incidentId, false)) {
            throw apiError.BadRequest('INCIDENT_NOT_EXIST', `Инцидент с ID ${incidentId} не существует`);
        }

        // Проверяем существование ПВЗ
        await commonPvzService.checkPVZExistById(client, pvzId, true);

        // Удаляем связь
        await this.deleteIncidentPVZConnector(client, incidentId, pvzId);

        // Проверяем, есть ли еще связи у этого ПВЗ с другими инцидентами
        const checkQuery = `
        SELECT COUNT(*) as count 
        FROM incident_pvz_connector 
        WHERE pvz_id = $1
    `;
        const checkResult = await client.query(checkQuery, [pvzId]);
        const hasOtherConnections = parseInt(checkResult.rows[0].count) > 0;

        // Если у ПВЗ нет других связей, удаляем сам ПВЗ
        let pvzDeleted = false;
        if (!hasOtherConnections) {
            const deletePvzQuery = `
            DELETE FROM incident_pvz 
            WHERE pvz_id = $1
            RETURNING pvz_id
        `;
            const deleteResult = await client.query(deletePvzQuery, [pvzId]);
            pvzDeleted = deleteResult.rowCount > 0;
        }

        return {
            success: true,
            message: `ПВЗ с ID ${pvzId} успешно удален из инцидента ${incidentId}`,
            incidentId: incidentId,
            pvzId: pvzId,
            pvzDeleted: pvzDeleted
        };
    }

    /**
     * Удаление ПВЗ и всех его связей (полное удаление ПВЗ)
     * @param {Object} client - Клиент БД
     * @param {number} pvzId - ID ПВЗ
     * @returns {Promise<Object>} - Результат удаления
     */
    async deletePVZCompletely(client, pvzId) {
        if (!pvzId) {
            throw apiError.BadRequest('INVALID_PVZ_ID', 'Некорректный ID ПВЗ 3');
        }

        // Проверяем существование ПВЗ
        await commonPvzService.checkPVZExistById(client, pvzId, true);

        // Удаляем все связи ПВЗ с инцидентами
        const deleteConnectorsQuery = `
        DELETE FROM incident_pvz_connector 
        WHERE pvz_id = $1
        RETURNING id
    `;
        const connectorsResult = await client.query(deleteConnectorsQuery, [pvzId]);
        const deletedConnectors = connectorsResult.rowCount;

        // Удаляем сам ПВЗ
        const deletePvzQuery = `
        DELETE FROM incident_pvz 
        WHERE pvz_id = $1
        RETURNING pvz_id
    `;
        const pvzResult = await client.query(deletePvzQuery, [pvzId]);

        if (pvzResult.rowCount === 0) {
            throw apiError.BadRequest('DELETE_FAILED', `Не удалось удалить ПВЗ с ID ${pvzId}`);
        }

        return {
            success: true,
            message: `ПВЗ с ID ${pvzId} полностью удален`,
            pvzId: pvzId,
            deletedConnectors: deletedConnectors
        };
    }
}

module.exports = new deletePvzService();
