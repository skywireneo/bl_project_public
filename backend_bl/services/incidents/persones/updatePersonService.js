const apiError = require("../../../exceptions/apiError");
const ValidateService = require("../../systemServices/validate/validateService");
const dictionaryService = require("../../dictionary/dictionaryService");
const incidentCheckAndGeneratedDataService = require("../incidentCreate/incidentCheckAndGeneratedDataService");
const commonPersonService = require("./commonPersonService");
const createPersonService = require("./createPersonService");
const deletePersonService = require("./deletePersonService");
const getPersonService = require("./getPersonService");
const nameService = require("./names/nameService");
const phoneService = require("./phones/phoneService");
const tgService = require("./tg/tgService");

const validateService = new ValidateService();

class updatePersonService {

    async hasOtherConnections(client, personId, excludeIncidentId) {
        const query = `
        SELECT COUNT(*) as count 
        FROM incident_persone_connector 
        WHERE person_id = $1 AND incident_id != $2
        `;
        const result = await client.query(query, [personId, excludeIncidentId]);
        return parseInt(result.rows[0].count) > 0;
    }

    async updatePerson(client, personId, birthDate, position) {
        const postId = await commonPersonService.getPostId(client, position);
        const normalizedBirthDate = commonPersonService.normalizeBirthDate(birthDate);

        const query = `
    UPDATE incident_persones 
    SET birth_date = $1, 
        post_id = $2
    WHERE person_id = $3
    RETURNING person_id
    `;
        const result = await client.query(query, [normalizedBirthDate, postId, personId]);

        if (result.rowCount === 0) {
            throw apiError.BadRequest('UPDATE_FAILED', `Не удалось обновить персону с ID ${personId}`);
        }

        return result.rows[0].person_id;
    }

    async updatePersonsForIncident(client, incidentId, newPersonsList) {
        if (!newPersonsList || !Array.isArray(newPersonsList)) {
            throw apiError.BadRequest('INVALID_PERSON_LIST', 'Список персон должен быть массивом');
        }

        if (!await incidentCheckAndGeneratedDataService.checkIncidentExist(client, incidentId, false)) {
            throw apiError.BadRequest('INCIDENT_NOT_EXIST', `Инцидент с ID ${incidentId} не существует`);
        }

        if (newPersonsList.length === 0) {
            return await deletePersonService.deletePersonsByIncidentId(client, incidentId);
        }

        const currentPersonsList = await getPersonService.getPersonsByIncidentId(client, incidentId, true);

        // console.log(currentPersonsList)

        const currentMap = new Map();
        for (const person of currentPersonsList) {
            currentMap.set(person.person_id, person);
        }

        const result = {
            created: [],
            updated: [],
            deleted: [],
            unchanged: []
        };

        const updatedPersonIds = new Set();

        for (const newPerson of newPersonsList) {
            if (!newPerson || !newPerson.position) {
                throw apiError.BadRequest('INVALID_PERSON_DATA', `Отсутствует должность (position): ${JSON.stringify(newPerson)}`);
            }

            const personId = newPerson.person_id;

            if (personId && currentMap.has(personId)) {
                // Персона существует — проверяем изменения и обновляем
                const currentPerson = currentMap.get(personId);

                const positionChanged = currentPerson.position !== newPerson.position;
                const currentBirthdate = commonPersonService.normalizeBirthDate(currentPerson.birthdate);
                const newBirthdate = commonPersonService.normalizeBirthDate(newPerson.birthdate);
                const birthdateChanged = currentBirthdate !== newBirthdate;

                let mainDataChanged = positionChanged || birthdateChanged;

                if (mainDataChanged) {
                    await this.updatePerson(client, personId, newPerson.birthdate, newPerson.position);
                }

                // Обновляем вложенные данные
                const namesResult = await nameService.updateNamesForPerson(
                    client,
                    personId,
                    newPerson.fios || []
                );
                const phonesResult = await phoneService.updatePhonesForPerson(
                    client,
                    personId,
                    newPerson.phones || []
                );
                const tgResult = await tgService.updateTgsForPerson(
                    client,
                    personId,
                    newPerson.tgNicks || []
                );

                const subChanges =
                    namesResult.created?.length > 0 || namesResult.updated?.length > 0 || namesResult.deleted?.length > 0 ||
                    phonesResult.created?.length > 0 || phonesResult.updated?.length > 0 || phonesResult.deleted?.length > 0 ||
                    tgResult.created?.length > 0 || tgResult.updated?.length > 0 || tgResult.deleted?.length > 0;

                if (!mainDataChanged && !subChanges) {
                    result.unchanged.push({
                        person_id: personId,
                        position: newPerson.position,
                        birthdate: newPerson.birthdate
                    });
                } else {
                    result.updated.push({
                        person_id: personId,
                        position: newPerson.position,
                        birthdate: newPerson.birthdate,
                        main_data_changed: mainDataChanged,
                        names: namesResult,
                        phones: phonesResult,
                        tgNicks: tgResult
                    });
                }

                updatedPersonIds.add(personId);
            } else {
                // Новая персона — создаём
                const newPersonId = await createPersonService.createPerson(client, newPerson.birthdate, newPerson.position);
                await createPersonService.createIncidentPersonConnector(client, newPersonId, incidentId);

                if (newPerson.fios && newPerson.fios.length > 0) {
                    await nameService.createNamesForPerson(client, newPerson.fios, newPersonId);
                }
                if (newPerson.phones && newPerson.phones.length > 0) {
                    await phoneService.createPhonesForPerson(client, newPerson.phones, newPersonId);
                }
                if (newPerson.tgNicks && newPerson.tgNicks.length > 0) {
                    await tgService.createTgsForPerson(client, newPerson.tgNicks, newPersonId);
                }

                result.created.push({
                    person_id: newPersonId,
                    position: newPerson.position,
                    birthdate: newPerson.birthdate
                });
            }
        }

        // Удаляем персоны, которых нет в новом списке
        for (const [personId, person] of currentMap) {
            if (!updatedPersonIds.has(personId)) {
                await deletePersonService.deleteIncidentPersonConnector(client, incidentId, personId);

                const hasOtherConnections = await this.hasOtherConnections(client, personId, incidentId);

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

                result.deleted.push({
                    person_id: personId,
                    position: person.position,
                    birthdate: person.birthdate,
                    person_deleted: personDeleted
                });
            }
        }

        return {
            success: true,
            message: `Обновление персон завершено. Создано: ${result.created.length}, Обновлено: ${result.updated.length}, Удалено: ${result.deleted.length}, Без изменений: ${result.unchanged.length}`,
            incidentId: incidentId,
            ...result
        };
    }

    async updateActiveInConnector(client, incidentId, active) {
        if (!incidentId) {
            throw apiError.BadRequest('NAME_NO_DATA', `Недостаточно данных для изменения active`)
        }
        const connectorResult = await client.query(
            `UPDATE incident_persone_connector SEt active = $1 WHERE incident_id = $2`,
            [active, incidentId]
        );
    }
}

module.exports = new updatePersonService();