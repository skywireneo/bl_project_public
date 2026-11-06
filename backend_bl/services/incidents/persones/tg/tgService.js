const apiError = require("../../../../exceptions/apiError");
const ValidateService = require("../../../systemServices/validate/validateService");
const createTgService = require("./createTgService");
const deleteTgService = require("./deleteTgService");
const getTgService = require("./getTgService");
const updateTgService = require("./updateTgService");

const validateService = new ValidateService();

class tgService {

    async createTg(client, tgUsername, tgId = null) {
        return await createTgService.createTg(client, tgUsername, tgId);
    }

    async createPersonTgConnector(client, tgId, personId) {
        return await createTgService.createPersonTgConnector(client, tgId, personId);
    }

    async createTgsForPerson(client, tgList, personId) {
        return await createTgService.createTgsForPerson(client, tgList, personId);
    }

    async getTgsByPersonId(client, personId, canGetAdmAccessData) {
        return await getTgService.getTgsByPersonId(client, personId, canGetAdmAccessData);
    }

    async deletePersonTgConnector(client, personId, tgId) {
        return await deleteTgService.deletePersonTgConnector(client, personId, tgId);
    }

    async deleteTgsByPersonId(client, personId) {
        return await deleteTgService.deleteTgsByPersonId(client, personId);
    }

    async deleteTgByTgId(client, personId, tgId) {
        return await deleteTgService.deleteTgByTgId(client, personId, tgId);
    }

    async deleteTgCompletely(client, tgId) {
        return await deleteTgService.deleteTgCompletely(client, tgId);
    }

    async updateTgsForPerson(client, personId, newTgList) {
        return await updateTgService.updateTgsForPerson(client, personId, newTgList);
    }
}

module.exports = new tgService();