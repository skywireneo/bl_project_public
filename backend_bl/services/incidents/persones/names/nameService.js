const apiError = require("../../../../exceptions/apiError");
const ValidateService = require("../../../systemServices/validate/validateService");
const createNameService = require("./createNameService");
const deleteNameService = require("./deleteNameService");
const getNameService = require("./getNameService");
const updateNameService = require("./updateNameService");

const validateService = new ValidateService();

class nameService {

    async createName(client, name) {
        return await createNameService.createName(client, name);
    }

    async createPersonNameConnector(client, nameId, personId) {
        return await createNameService.createPersonNameConnector(client, nameId, personId);
    }

    async createNamesForPerson(client, nameList, personId) {
        return await createNameService.createNamesForPerson(client, nameList, personId);
    }

    async getNamesByPersonId(client, personId, canGetAdmAccessData) {
        return await getNameService.getNamesByPersonId(client, personId, canGetAdmAccessData);
    }

    async deletePersonNameConnector(client, personId, nameId) {
        return await deleteNameService.deletePersonNameConnector(client, personId, nameId);
    }

    async deleteNamesByPersonId(client, personId) {
        return await deleteNameService.deleteNamesByPersonId(client, personId);
    }

    async deleteNameByNameId(client, personId, nameId) {
        return await deleteNameService.deleteNameByNameId(client, personId, nameId);
    }

    async deleteNameCompletely(client, nameId) {
        return await deleteNameService.deleteNameCompletely(client, nameId);
    }

    async updateNamesForPerson(client, personId, newNameList) {
        return await updateNameService.updateNamesForPerson(client, personId, newNameList);
    }
}

module.exports = new nameService();