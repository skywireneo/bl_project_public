const apiError = require("../../../exceptions/apiError");
const ValidateService = require("../../systemServices/validate/validateService");
const createPersonService = require("./createPersonService");
const deletePersonService = require("./deletePersonService");
const getPersonService = require("./getPersonService");
const updatePersonService = require("./updatePersonService");

const validateService = new ValidateService();

class personService {

    async createPerson(client, birthDate, position) {
        return await createPersonService.createPerson(client, birthDate, position);
    }

    async createIncidentPersonConnector(client, personId, incidentId) {
        return await createPersonService.createIncidentPersonConnector(client, personId, incidentId);
    }

    async createPersonsForIncident(client, personsList, incidentId, importInc) {
        return await createPersonService.createPersonsForIncident(client, personsList, incidentId, importInc);
    }

    async getPersonsByIncidentId(client, incidentId, canGetAdmAccessData) {
        return await getPersonService.getPersonsByIncidentId(client, incidentId, canGetAdmAccessData);
    }

    async deleteIncidentPersonConnector(client, incidentId, personId) {
        return await deletePersonService.deleteIncidentPersonConnector(client, incidentId, personId);
    }

    async deletePersonsByIncidentId(client, incidentId) {
        return await deletePersonService.deletePersonsByIncidentId(client, incidentId);
    }

    async deletePersonByPersonId(client, incidentId, personId) {
        return await deletePersonService.deletePersonByPersonId(client, incidentId, personId);
    }

    async deletePersonCompletely(client, personId) {
        return await deletePersonService.deletePersonCompletely(client, personId);
    }

    async updatePersonsForIncident(client, incidentId, newPersonsList) {
        return await updatePersonService.updatePersonsForIncident(client, incidentId, newPersonsList);
    }
}

module.exports = new personService();