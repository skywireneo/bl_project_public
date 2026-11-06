const apiError = require("../../../exceptions/apiError");
const ValidateService = require("../../systemServices/validate/validateService");
const incidentCheckAndGeneratedDataService = require("../incidentCreate/incidentCheckAndGeneratedDataService");
const commonPersonService = require("./commonPersonService");
const getPersonService = require("./getPersonService");
const nameService = require("./names/nameService");
const phoneService = require("./phones/phoneService");
const tgService = require("./tg/tgService");

const validateService = new ValidateService();

class deletePersonService {

    async deleteIncidentPersonConnector(client, incidentId, personId) {
        if (!personId) {
            throw apiError.BadRequest('INVALID_PERSON_ID', 'Некорректный ID персоны');
        }

        if (!await incidentCheckAndGeneratedDataService.checkIncidentExist(client, incidentId, false)) {
            throw apiError.BadRequest('INCIDENT_NOT_EXIST', `Инцидент с ID ${incidentId} не существует`);
        }

        await commonPersonService.checkPersonExist(client, personId, true);

        const exists = await commonPersonService.checkPersonExistConnector(client, personId, incidentId, false);
        if (!exists) {
            throw apiError.BadRequest('CONNECTOR_NOT_EXIST', `Связь между инцидентом ${incidentId} и персоной ${personId} не найдена`);
        }

        const query = `
        DELETE FROM incident_persone_connector 
        WHERE incident_id = $1 AND person_id = $2
        RETURNING id
        `;

        const result = await client.query(query, [incidentId, personId]);

        if (result.rowCount === 0) {
            throw apiError.BadRequest('DELETE_FAILED', 'Не удалось удалить связь персоны с инцидентом');
        }

        return true;
    }

    async deletePersonsByIncidentId(client, incidentId) {
        if (!await incidentCheckAndGeneratedDataService.checkIncidentExist(client, incidentId, false)) {
            throw apiError.BadRequest('INCIDENT_NOT_EXIST', `Инцидент с ID ${incidentId} не существует`);
        }

        const personList = await getPersonService.getPersonsByIncidentId(client, incidentId, false);

        if (personList.length === 0) {
            return {
                success: true,
                message: 'Нет персон для удаления',
                deletedCount: 0,
                personIds: []
            };
        }

        const deletedPersonIds = [];

        for (const person of personList) {
            await this.deleteIncidentPersonConnector(client, incidentId, person.person_id);
            deletedPersonIds.push(person.person_id);

            const checkQuery = `
            SELECT COUNT(*) as count 
            FROM incident_persone_connector 
            WHERE person_id = $1
            `;
            const checkResult = await client.query(checkQuery, [person.person_id]);
            const hasOtherConnections = parseInt(checkResult.rows[0].count) > 0;

            if (!hasOtherConnections) {
                await nameService.deleteNamesByPersonId(client, person.person_id);
                await phoneService.deletePhonesByPersonId(client, person.person_id);
                await tgService.deleteTgsByPersonId(client, person.person_id);

                const deletePersonQuery = `
                DELETE FROM incident_persones 
                WHERE person_id = $1
                RETURNING person_id
                `;
                await client.query(deletePersonQuery, [person.person_id]);
            }
        }

        return {
            success: true,
            message: `Удалено ${deletedPersonIds.length} персон`,
            deletedCount: deletedPersonIds.length,
            personIds: deletedPersonIds
        };
    }

    async deletePersonByPersonId(client, incidentId, personId) {
        if (!personId) {
            throw apiError.BadRequest('INVALID_PERSON_ID', 'Некорректный ID персоны');
        }

        if (!await incidentCheckAndGeneratedDataService.checkIncidentExist(client, incidentId, false)) {
            throw apiError.BadRequest('INCIDENT_NOT_EXIST', `Инцидент с ID ${incidentId} не существует`);
        }

        await commonPersonService.checkPersonExist(client, personId, true);

        await this.deleteIncidentPersonConnector(client, incidentId, personId);

        const checkQuery = `
        SELECT COUNT(*) as count 
        FROM incident_persone_connector 
        WHERE person_id = $1
        `;
        const checkResult = await client.query(checkQuery, [personId]);
        const hasOtherConnections = parseInt(checkResult.rows[0].count) > 0;

        let personDeleted = false;
        if (!hasOtherConnections) {
            await nameService.deleteNamesByPersonId(client, personId);
            await phoneService.deletePhonesByPersonId(client, personId);
            await tgService.deleteTgsByPersonId(client, personId);

            const deletePersonQuery = `
            DELETE FROM incident_persones 
            WHERE person_id = $1
            RETURNING person_id
            `;
            const deleteResult = await client.query(deletePersonQuery, [personId]);
            personDeleted = deleteResult.rowCount > 0;
        }

        return {
            success: true,
            message: `Персона с ID ${personId} успешно удалена из инцидента ${incidentId}`,
            incidentId: incidentId,
            personId: personId,
            personDeleted: personDeleted
        };
    }

    async deletePersonCompletely(client, personId) {
        if (!personId) {
            throw apiError.BadRequest('INVALID_PERSON_ID', 'Некорректный ID персоны');
        }

        await commonPersonService.checkPersonExist(client, personId, true);

        const deleteConnectorsQuery = `
        DELETE FROM incident_persone_connector 
        WHERE person_id = $1
        RETURNING id
        `;
        const connectorsResult = await client.query(deleteConnectorsQuery, [personId]);
        const deletedConnectors = connectorsResult.rowCount;

        await nameService.deleteNamesByPersonId(client, personId);
        await phoneService.deletePhonesByPersonId(client, personId);
        await tgService.deleteTgsByPersonId(client, personId);

        const deletePersonQuery = `
        DELETE FROM incident_persones 
        WHERE person_id = $1
        RETURNING person_id
        `;
        const personResult = await client.query(deletePersonQuery, [personId]);

        if (personResult.rowCount === 0) {
            throw apiError.BadRequest('DELETE_FAILED', `Не удалось удалить персону с ID ${personId}`);
        }

        return {
            success: true,
            message: `Персона с ID ${personId} полностью удалена`,
            personId: personId,
            deletedConnectors: deletedConnectors
        };
    }
}

module.exports = new deletePersonService();