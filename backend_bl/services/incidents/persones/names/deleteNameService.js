const apiError = require("../../../../exceptions/apiError");
const ValidateService = require("../../../systemServices/validate/validateService");
const incidentCheckAndGeneratedDataService = require("../../incidentCreate/incidentCheckAndGeneratedDataService");
const commonPersonService = require("../commonPersonService");
const commonNameService = require("./commonNameService");
const getNameService = require("./getNameService");

const validateService = new ValidateService();

class deleteNameService {

    async deletePersonNameConnector(client, personId, nameId) {
        // validateService.personValidation.validatePersonId(personId);
        if (!nameId) {
            throw apiError.BadRequest('INVALID_NAME_ID', 'Некорректный ID имени');
        }

        if (!await commonPersonService.checkPersonExist(client, personId, false)) {
            throw apiError.BadRequest('PERSON_NOT_EXIST', `Персона с ID ${personId} не существует`);
        }

        await commonNameService.checkNameExistById(client, nameId, true);

        const exists = await commonNameService.checkNameExistConnector(client, nameId, personId, false);
        if (!exists) {
            throw apiError.BadRequest('CONNECTOR_NOT_EXIST', `Связь между персоной ${personId} и именем ${nameId} не найдена`);
        }

        const query = `
        DELETE FROM persone_name_connector 
        WHERE person_id = $1 AND name_id = $2
        RETURNING id
    `;

        const result = await client.query(query, [personId, nameId]);

        if (result.rowCount === 0) {
            throw apiError.BadRequest('DELETE_FAILED', 'Не удалось удалить связь имени с персоной');
        }

        return true;
    }

    async deleteNamesByPersonId(client, personId) {
        // validateService.personValidation.validatePersonId(personId);

        if (!await commonPersonService.checkPersonExist(client, personId, false)) {
            throw apiError.BadRequest('PERSON_NOT_EXIST', `Персона с ID ${personId} не существует`);
        }

        const nameList = await getNameService.getNamesByPersonId(client, personId, false);

        if (nameList.length === 0) {
            return {
                success: true,
                message: 'Нет имен для удаления',
                deletedCount: 0,
                nameIds: []
            };
        }

        const deletedNameIds = [];

        for (const name of nameList) {
            await this.deletePersonNameConnector(client, personId, name.id);
            deletedNameIds.push(name.id);

            const checkQuery = `
            SELECT COUNT(*) as count 
            FROM persone_name_connector 
            WHERE name_id = $1
        `;
            const checkResult = await client.query(checkQuery, [name.id]);
            const hasOtherConnections = parseInt(checkResult.rows[0].count) > 0;

            if (!hasOtherConnections) {
                const deleteNameQuery = `
                DELETE FROM persone_names 
                WHERE name_id = $1
                RETURNING name_id
            `;
                await client.query(deleteNameQuery, [name.id]);
            }
        }

        return {
            success: true,
            message: `Удалено ${deletedNameIds.length} имен`,
            deletedCount: deletedNameIds.length,
            nameIds: deletedNameIds
        };
    }

    async deleteNameByNameId(client, personId, nameId) {
        // validateService.personValidation.validatePersonId(personId);
        if (!nameId) {
            throw apiError.BadRequest('INVALID_NAME_ID', 'Некорректный ID имени');
        }

        if (!await commonPersonService.checkPersonExist(client, personId, false)) {
            throw apiError.BadRequest('PERSON_NOT_EXIST', `Персона с ID ${personId} не существует`);
        }

        await commonNameService.checkNameExistById(client, nameId, true);

        await this.deletePersonNameConnector(client, personId, nameId);

        const checkQuery = `
        SELECT COUNT(*) as count 
        FROM persone_name_connector 
        WHERE name_id = $1
    `;
        const checkResult = await client.query(checkQuery, [nameId]);
        const hasOtherConnections = parseInt(checkResult.rows[0].count) > 0;

        let nameDeleted = false;
        if (!hasOtherConnections) {
            const deleteNameQuery = `
            DELETE FROM persone_names 
            WHERE name_id = $1
            RETURNING name_id
        `;
            const deleteResult = await client.query(deleteNameQuery, [nameId]);
            nameDeleted = deleteResult.rowCount > 0;
        }

        return {
            success: true,
            message: `Имя с ID ${nameId} успешно удалено из персоны ${personId}`,
            personId: personId,
            nameId: nameId,
            nameDeleted: nameDeleted
        };
    }

    async deleteNameCompletely(client, nameId) {
        if (!nameId) {
            throw apiError.BadRequest('INVALID_NAME_ID', 'Некорректный ID имени');
        }

        await commonNameService.checkNameExistById(client, nameId, true);

        const deleteConnectorsQuery = `
        DELETE FROM persone_name_connector 
        WHERE name_id = $1
        RETURNING id
    `;
        const connectorsResult = await client.query(deleteConnectorsQuery, [nameId]);
        const deletedConnectors = connectorsResult.rowCount;

        const deleteNameQuery = `
        DELETE FROM persone_names 
        WHERE name_id = $1
        RETURNING name_id
    `;
        const nameResult = await client.query(deleteNameQuery, [nameId]);

        if (nameResult.rowCount === 0) {
            throw apiError.BadRequest('DELETE_FAILED', `Не удалось удалить имя с ID ${nameId}`);
        }

        return {
            success: true,
            message: `Имя с ID ${nameId} полностью удалено`,
            nameId: nameId,
            deletedConnectors: deletedConnectors
        };
    }
}

module.exports = new deleteNameService();