const apiError = require("../../../exceptions/apiError");
const ValidateService = require("../../systemServices/validate/validateService");
const dictionaryService = require("../../dictionary/dictionaryService");
const incidentCheckAndGeneratedDataService = require("../incidentCreate/incidentCheckAndGeneratedDataService");
const commonPersonService = require("./commonPersonService");
const nameService = require("./names/nameService");
const phoneService = require("./phones/phoneService");
const tgService = require("./tg/tgService");

const validateService = new ValidateService();

class createPersonService {

    async createPerson(client, birthDate, position) {
        if (!position) {
            throw apiError.BadRequest('PERSON_NO_DATA', `Недостаточно данных для добавления персоны (отсутствует должность)`)
        }
        const postId = await commonPersonService.getPostId(client, position);
        const normalizedBirthDate = commonPersonService.normalizeBirthDate(birthDate);

        const personResult = await client.query(
            `INSERT INTO incident_persones (birth_date, post_id, date_add) 
         VALUES ($1, $2, (NOW() AT TIME ZONE 'UTC')) 
         RETURNING person_id`,
            [normalizedBirthDate, postId]
        );
        return personResult.rows[0].person_id;
    }

    async createIncidentPersonConnector(client, personId, incidentId) {
        if (!personId || !incidentId) {
            throw apiError.BadRequest('PERSON_NO_DATA', `Недостаточно данных для добавления связи персоны с инцидентом`);
        }
        if (await commonPersonService.checkPersonExistConnector(client, personId, incidentId, false)) {
            return;
        }
        await commonPersonService.checkPersonExist(client, personId, true);
        if (!await incidentCheckAndGeneratedDataService.checkIncidentExist(client, incidentId, false)) {
            throw apiError.BadRequest('PERSON_NO_DATA', `Инцидент для связи с персоной не существует`);
        }
        const connectorResult = await client.query(
            `INSERT INTO incident_persone_connector (incident_id, person_id) VALUES ($1, $2) RETURNING id`,
            [incidentId, personId]
        );
        return connectorResult.rows[0].id;
    }

    async createPersonsForIncident(client, personsList, incidentId, importInc) {
        if (!personsList || !Array.isArray(personsList) || personsList.length === 0) {
            return;
        }

        for (const person of personsList) {
            if (!person || !person.position) {
                throw apiError.BadRequest('INVALID_PERSON_DATA', `Отсутствует должность (position): ${JSON.stringify(person)}`);
            }

            const personId = await this.createPerson(client, person.birthdate, person.position);
            await this.createIncidentPersonConnector(client, personId, incidentId);

            if (person.fios && Array.isArray(person.fios) && person.fios.length > 0) {
                await nameService.createNamesForPerson(client, person.fios, personId);
            } else {
                if (!importInc) {
                    throw apiError.BadRequest('INVALID_PERSON_DATA', `Имена для персон обязательны`);
                }
            }
            if (person.phones && Array.isArray(person.phones) && person.phones.length > 0) {
                await phoneService.createPhonesForPerson(client, person.phones, personId);
            }
            if (person.tgNicks && Array.isArray(person.tgNicks) && person.tgNicks.length > 0) {
                await tgService.createTgsForPerson(client, person.tgNicks, personId);
            }
        }
    }
}

module.exports = new createPersonService();