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
const createPvzService = require("./createPvzService");
const deletePvzService = require("./deletePvzService");
const getPvzService = require("./getPvzService");
const updatePvzService = require("./updatePvzService");
// const usersEmailService = require("../../users/usersEmailService");
// const incidentCheckAndGeneratedDataService = require("./incidentCheckAndGeneratedDataService");

const validateService = new ValidateService();

class pvzService {

    async createPVZ(client, type, address) {
        return await createPvzService.createPVZ(client, type, address)
    }

    async createIncidentPVZConnector(client, pvzId, incidentId) {
        return await createPvzService.createIncidentPVZConnector(client, pvzId, incidentId)
    }

    async createPVZForIncident(client, pvzList, incidentId) {
        return await createPvzService.createPVZForIncident(client, pvzList, incidentId)
    }

    async getPVZByIncidentId(client, incidentId, canGetAdmAccessData) {
        return await getPvzService.getPVZByIncidentId(client, incidentId, canGetAdmAccessData)
    }

    async updatePVZForIncident(client, incidentId, newPvzList) {
        return await updatePvzService.updatePVZForIncident(client, incidentId, newPvzList)
    }



    /**
 * Общий метод для удаления связи ПВЗ с инцидентом
 * @param {Object} client - Клиент БД
 * @param {number} incidentId - ID инцидента
 * @param {number} pvzId - ID ПВЗ
 * @returns {Promise<boolean>} - true если удаление успешно
 */
    async deleteIncidentPVZConnector(client, incidentId, pvzId) {
        return await deletePvzService.deleteIncidentPVZConnector(client, incidentId, pvzId)
    }

    /**
     * Удаление всех ПВЗ по incidentId
     * @param {Object} client - Клиент БД
     * @param {number} incidentId - ID инцидента
     * @returns {Promise<Object>} - Результат удаления
     */
    async deletePVZByIncidentId(client, incidentId) {
        return await deletePvzService.deletePVZByIncidentId(client, incidentId)
    }

    /**
     * Удаление конкретного ПВЗ по pvzId из инцидента
     * @param {Object} client - Клиент БД
     * @param {number} incidentId - ID инцидента
     * @param {number} pvzId - ID ПВЗ
     * @returns {Promise<Object>} - Результат удаления
     */
    async deletePVZByPvzId(client, incidentId, pvzId) {
        return await deletePvzService.deletePVZByPvzId(client, incidentId, pvzId)
    }

    /**
     * Удаление ПВЗ и всех его связей (полное удаление ПВЗ)
     * @param {Object} client - Клиент БД
     * @param {number} pvzId - ID ПВЗ
     * @returns {Promise<Object>} - Результат удаления
     */
    async deletePVZCompletely(client, pvzId) {
        return await deletePvzService.deletePVZCompletely(client, pvzId)
    }
}

module.exports = new pvzService();
