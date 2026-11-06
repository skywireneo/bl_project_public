const apiError = require("../../../../exceptions/apiError");
const ValidateService = require("../../../systemServices/validate/validateService");
const incidentCheckAndGeneratedDataService = require("../../incidentCreate/incidentCheckAndGeneratedDataService");
const commonPersonService = require("../commonPersonService");
const commonPhoneService = require("./commonPhoneService");
const getPhoneService = require("./getPhoneService");

const validateService = new ValidateService();

class deletePhoneService {

    async deletePersonPhoneConnector(client, personId, phoneId) {
        // validateService.personValidation.validatePersonId(personId);
        if (!phoneId) {
            throw apiError.BadRequest('INVALID_PHONE_ID', 'Некорректный ID телефона');
        }

        if (!await commonPersonService.checkPersonExist(client, personId, false)) {
            throw apiError.BadRequest('PERSON_NOT_EXIST', `Персона с ID ${personId} не существует`);
        }

        await commonPhoneService.checkPhoneExistById(client, phoneId, true);

        const exists = await commonPhoneService.checkPhoneExistConnector(client, phoneId, personId, false);
        if (!exists) {
            throw apiError.BadRequest('CONNECTOR_NOT_EXIST', `Связь между персоной ${personId} и телефоном ${phoneId} не найдена`);
        }

        const query = `
        DELETE FROM persone_phone_connector 
        WHERE person_id = $1 AND phone_id = $2
        RETURNING id
    `;

        const result = await client.query(query, [personId, phoneId]);

        if (result.rowCount === 0) {
            throw apiError.BadRequest('DELETE_FAILED', 'Не удалось удалить связь телефона с персоной');
        }

        return true;
    }

    async deletePhonesByPersonId(client, personId) {
        // validateService.personValidation.validatePersonId(personId);

        if (!await commonPersonService.checkPersonExist(client, personId, false)) {
            throw apiError.BadRequest('PERSON_NOT_EXIST', `Персона с ID ${personId} не существует`);
        }

        const phoneList = await getPhoneService.getPhonesByPersonId(client, personId, false);

        if (phoneList.length === 0) {
            return {
                success: true,
                message: 'Нет телефонов для удаления',
                deletedCount: 0,
                phoneIds: []
            };
        }

        const deletedPhoneIds = [];

        for (const phone of phoneList) {
            await this.deletePersonPhoneConnector(client, personId, phone.id);
            deletedPhoneIds.push(phone.id);

            const checkQuery = `
            SELECT COUNT(*) as count 
            FROM persone_phone_connector 
            WHERE phone_id = $1
        `;
            const checkResult = await client.query(checkQuery, [phone.id]);
            const hasOtherConnections = parseInt(checkResult.rows[0].count) > 0;

            if (!hasOtherConnections) {
                const deletePhoneQuery = `
                DELETE FROM persone_phones 
                WHERE phone_id = $1
                RETURNING phone_id
            `;
                await client.query(deletePhoneQuery, [phone.id]);
            }
        }

        return {
            success: true,
            message: `Удалено ${deletedPhoneIds.length} телефонов`,
            deletedCount: deletedPhoneIds.length,
            phoneIds: deletedPhoneIds
        };
    }

    async deletePhoneByPhoneId(client, personId, phoneId) {
        // validateService.personValidation.validatePersonId(personId);
        if (!phoneId) {
            throw apiError.BadRequest('INVALID_PHONE_ID', 'Некорректный ID телефона');
        }

        if (!await commonPersonService.checkPersonExist(client, personId, false)) {
            throw apiError.BadRequest('PERSON_NOT_EXIST', `Персона с ID ${personId} не существует`);
        }

        await commonPhoneService.checkPhoneExistById(client, phoneId, true);

        await this.deletePersonPhoneConnector(client, personId, phoneId);

        const checkQuery = `
        SELECT COUNT(*) as count 
        FROM persone_phone_connector 
        WHERE phone_id = $1
    `;
        const checkResult = await client.query(checkQuery, [phoneId]);
        const hasOtherConnections = parseInt(checkResult.rows[0].count) > 0;

        let phoneDeleted = false;
        if (!hasOtherConnections) {
            const deletePhoneQuery = `
            DELETE FROM persone_phones 
            WHERE phone_id = $1
            RETURNING phone_id
        `;
            const deleteResult = await client.query(deletePhoneQuery, [phoneId]);
            phoneDeleted = deleteResult.rowCount > 0;
        }

        return {
            success: true,
            message: `Телефон с ID ${phoneId} успешно удален из персоны ${personId}`,
            personId: personId,
            phoneId: phoneId,
            phoneDeleted: phoneDeleted
        };
    }

    async deletePhoneCompletely(client, phoneId) {
        if (!phoneId) {
            throw apiError.BadRequest('INVALID_PHONE_ID', 'Некорректный ID телефона');
        }

        await commonPhoneService.checkPhoneExistById(client, phoneId, true);

        const deleteConnectorsQuery = `
        DELETE FROM persone_phone_connector 
        WHERE phone_id = $1
        RETURNING id
    `;
        const connectorsResult = await client.query(deleteConnectorsQuery, [phoneId]);
        const deletedConnectors = connectorsResult.rowCount;

        const deletePhoneQuery = `
        DELETE FROM persone_phones 
        WHERE phone_id = $1
        RETURNING phone_id
    `;
        const phoneResult = await client.query(deletePhoneQuery, [phoneId]);

        if (phoneResult.rowCount === 0) {
            throw apiError.BadRequest('DELETE_FAILED', `Не удалось удалить телефон с ID ${phoneId}`);
        }

        return {
            success: true,
            message: `Телефон с ID ${phoneId} полностью удален`,
            phoneId: phoneId,
            deletedConnectors: deletedConnectors
        };
    }
}

module.exports = new deletePhoneService();