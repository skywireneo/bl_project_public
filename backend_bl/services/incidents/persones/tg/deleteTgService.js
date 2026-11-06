const apiError = require("../../../../exceptions/apiError");
const ValidateService = require("../../../systemServices/validate/validateService");
const incidentCheckAndGeneratedDataService = require("../../incidentCreate/incidentCheckAndGeneratedDataService");
const commonPersonService = require("../commonPersonService");
const commonTgService = require("./commonTgService");
const getTgService = require("./getTgService");

const validateService = new ValidateService();

class deleteTgService {

    async deletePersonTgConnector(client, personId, tgId) {
        // validateService.personValidation.validatePersonId(personId);
        if (!tgId) {
            throw apiError.BadRequest('INVALID_TG_ID', 'Некорректный ID Telegram аккаунта 1');
        }

        if (!await commonPersonService.checkPersonExist(client, personId, false)) {
            throw apiError.BadRequest('PERSON_NOT_EXIST', `Персона с ID ${personId} не существует`);
        }

        await commonTgService.checkTgExistById(client, tgId, true);
        // console.log(8888)
        // console.log(tgId, personId)
        const exists = await commonTgService.checkTgExistConnector(client, tgId, personId, false);
        if (!exists) {
            throw apiError.BadRequest('CONNECTOR_NOT_EXIST', `Связь между персоной ${personId} и Telegram аккаунтом ${tgId} не найдена`);
        }
        // console.log(8889)
        // console.log(personId, tgId)
        const query = `
        DELETE FROM persone_telegramm_accaunt_connector 
        WHERE person_id = $1 AND telegramm_accaunt_id = $2
        RETURNING id
    `;

        const result = await client.query(query, [personId, tgId]);

        if (result.rowCount === 0) {
            throw apiError.BadRequest('DELETE_FAILED', 'Не удалось удалить связь Telegram аккаунта с персоной');
        }

        return true;
    }

    async deleteTgsByPersonId(client, personId) {
        // validateService.personValidation.validatePersonId(personId);

        if (!await commonPersonService.checkPersonExist(client, personId, false)) {
            throw apiError.BadRequest('PERSON_NOT_EXIST', `Персона с ID ${personId} не существует`);
        }

        const tgList = await getTgService.getTgsByPersonId(client, personId, false);

        if (tgList.length === 0) {
            return {
                success: true,
                message: 'Нет Telegram аккаунтов для удаления',
                deletedCount: 0,
                tgIds: []
            };
        }

        const deletedTgIds = [];

        for (const tg of tgList) {
            await this.deletePersonTgConnector(client, personId, tg.id);
            deletedTgIds.push(tg.id);

            const checkQuery = `
            SELECT COUNT(*) as count 
            FROM persone_telegramm_accaunt_connector 
            WHERE telegramm_accaunt_id = $1
        `;
            const checkResult = await client.query(checkQuery, [tg.id]);
            const hasOtherConnections = parseInt(checkResult.rows[0].count) > 0;

            if (!hasOtherConnections) {
                const deleteTgQuery = `
                DELETE FROM persone_telegramm_accaunts 
                WHERE tg_id = $1
                RETURNING tg_id
            `;
                await client.query(deleteTgQuery, [tg.id]);
            }
        }

        return {
            success: true,
            message: `Удалено ${deletedTgIds.length} Telegram аккаунтов`,
            deletedCount: deletedTgIds.length,
            tgIds: deletedTgIds
        };
    }

    async deleteTgByTgId(client, personId, tgId) {
        // validateService.personValidation.validatePersonId(personId);
        if (!tgId) {
            throw apiError.BadRequest('INVALID_TG_ID', 'Некорректный ID Telegram аккаунта 2');
        }

        if (!await commonPersonService.checkPersonExist(client, personId, false)) {
            throw apiError.BadRequest('PERSON_NOT_EXIST', `Персона с ID ${personId} не существует`);
        }

        await commonTgService.checkTgExistById(client, tgId, true);

        await this.deletePersonTgConnector(client, personId, tgId);

        const checkQuery = `
        SELECT COUNT(*) as count 
        FROM persone_telegramm_accaunt_connector 
        WHERE telegramm_accaunt_id = $1
    `;
        const checkResult = await client.query(checkQuery, [tgId]);
        const hasOtherConnections = parseInt(checkResult.rows[0].count) > 0;

        let tgDeleted = false;
        if (!hasOtherConnections) {
            const deleteTgQuery = `
            DELETE FROM persone_telegramm_accaunts 
            WHERE tg_id = $1
            RETURNING tg_id
        `;
            const deleteResult = await client.query(deleteTgQuery, [tgId]);
            tgDeleted = deleteResult.rowCount > 0;
        }

        return {
            success: true,
            message: `Telegram аккаунт с ID ${tgId} успешно удален из персоны ${personId}`,
            personId: personId,
            tgId: tgId,
            tgDeleted: tgDeleted
        };
    }

    async deleteTgCompletely(client, tgId) {
        if (!tgId) {
            throw apiError.BadRequest('INVALID_TG_ID', 'Некорректный ID Telegram аккаунта 3');
        }

        await commonTgService.checkTgExistById(client, tgId, true);

        const deleteConnectorsQuery = `
        DELETE FROM persone_telegramm_accaunt_connector 
        WHERE telegramm_accaunt_id = $1
        RETURNING id
    `;
        const connectorsResult = await client.query(deleteConnectorsQuery, [tgId]);
        const deletedConnectors = connectorsResult.rowCount;

        const deleteTgQuery = `
        DELETE FROM persone_telegramm_accaunts 
        WHERE tg_id = $1
        RETURNING tg_id
    `;
        const tgResult = await client.query(deleteTgQuery, [tgId]);

        if (tgResult.rowCount === 0) {
            throw apiError.BadRequest('DELETE_FAILED', `Не удалось удалить Telegram аккаунт с ID ${tgId}`);
        }

        return {
            success: true,
            message: `Telegram аккаунт с ID ${tgId} полностью удален`,
            tgId: tgId,
            deletedConnectors: deletedConnectors
        };
    }
}

module.exports = new deleteTgService();