const apiError = require("../../../../exceptions/apiError");
const ValidateService = require("../../../systemServices/validate/validateService");
const createPhoneService = require("./createPhoneService");
const deletePhoneService = require("./deletePhoneService");
const getPhoneService = require("./getPhoneService");
const updatePhoneService = require("./updatePhoneService");

const validateService = new ValidateService();

class phoneService {

    async createPhone(client, phone) {
        return await createPhoneService.createPhone(client, phone);
    }

    async createPersonPhoneConnector(client, phoneId, personId) {
        return await createPhoneService.createPersonPhoneConnector(client, phoneId, personId);
    }

    async createPhonesForPerson(client, phoneList, personId) {
        return await createPhoneService.createPhonesForPerson(client, phoneList, personId);
    }

    async getPhonesByPersonId(client, personId, canGetAdmAccessData) {
        return await getPhoneService.getPhonesByPersonId(client, personId, canGetAdmAccessData);
    }

    async deletePersonPhoneConnector(client, personId, phoneId) {
        return await deletePhoneService.deletePersonPhoneConnector(client, personId, phoneId);
    }

    async deletePhonesByPersonId(client, personId) {
        return await deletePhoneService.deletePhonesByPersonId(client, personId);
    }

    async deletePhoneByPhoneId(client, personId, phoneId) {
        return await deletePhoneService.deletePhoneByPhoneId(client, personId, phoneId);
    }

    async deletePhoneCompletely(client, phoneId) {
        return await deletePhoneService.deletePhoneCompletely(client, phoneId);
    }

    async updatePhonesForPerson(client, personId, newPhoneList) {
        return await updatePhoneService.updatePhonesForPerson(client, personId, newPhoneList);
    }
}

module.exports = new phoneService();