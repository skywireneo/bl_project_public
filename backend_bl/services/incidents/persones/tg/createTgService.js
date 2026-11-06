const apiError = require("../../../../exceptions/apiError");
const ValidateService = require("../../../systemServices/validate/validateService");
const userEncriptionService = require("../../../systemServices/userEncriptionService");
const { encrypt, hashData } = require("../../../systemServices/cryptoService");
const incidentCheckAndGeneratedDataService = require("../../incidentCreate/incidentCheckAndGeneratedDataService");
const commonTgService = require("./commonTgService");
const commonPersonService = require("../commonPersonService");

const validateService = new ValidateService();

class createTgService {

    async getTgIdEncryptedData(tgId) {
        if (!tgId) {
            return {
                encryptedDataTgIdEncrypted: null,
                encryptedDataTgIdIv: null,
                encryptedDataTgIdAuthTag: null,
                heshTgId: null,
            };
        }
        const encryptedDataTgId = encrypt(String(tgId), "USER_TG");
        const heshTgId = hashData(String(tgId), "USER_TG");
        return {
            encryptedDataTgIdEncrypted: encryptedDataTgId.encrypted,
            encryptedDataTgIdIv: encryptedDataTgId.iv,
            encryptedDataTgIdAuthTag: encryptedDataTgId.authTag,
            heshTgId: heshTgId,
        };
    }

    async createTg(client, tgUsername, tgId = null) {
        if (!tgUsername) {
            throw apiError.BadRequest('TG_NO_DATA', `Недостаточно данных для добавления Telegram аккаунта`)
        }
        validateService.validateTgUsername(tgUsername);

        const usernameEncryptedData = await userEncriptionService.getTgUsernameDataEncrypted(tgUsername);
        const tgIdEncryptedData = await this.getTgIdEncryptedData(tgId);

        let existingTgId = await commonTgService.checkTgExist(client, usernameEncryptedData.heshTg, false);

        if (!existingTgId) {
            const tgResult = await client.query(
                `INSERT INTO persone_telegramm_accaunts (
                    tg_username_hesh, tg_username_encrypted, tg_username_iv, tg_username_auth_tag,
                    tg_id_hesh, tg_id_encrypted, tg_id_iv, tg_id_auth_tag,
                    date_add
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, (NOW() AT TIME ZONE 'UTC')) 
                RETURNING tg_id`,
                [
                    usernameEncryptedData.heshTg,
                    usernameEncryptedData.encryptedDataTgEncrypted,
                    usernameEncryptedData.encryptedDataTgIv,
                    usernameEncryptedData.encryptedDataTgAuthTag,
                    tgIdEncryptedData.heshTgId,
                    tgIdEncryptedData.encryptedDataTgIdEncrypted,
                    tgIdEncryptedData.encryptedDataTgIdIv,
                    tgIdEncryptedData.encryptedDataTgIdAuthTag
                ]
            );
            existingTgId = tgResult.rows[0].tg_id;
        }
        return existingTgId;
    }

    async createPersonTgConnector(client, tgId, personId) {
        if (!tgId || !personId) {
            throw apiError.BadRequest('TG_NO_DATA', `Недостаточно данных для добавления связи Telegram аккаунта с персоной`)
        }
        if (await commonTgService.checkTgExistConnector(client, tgId, personId, false)) {
            return
        }
        await commonTgService.checkTgExistById(client, tgId, true);
        if (!await commonPersonService.checkPersonExist(client, personId, false)) {
            throw apiError.BadRequest('TG_NO_DATA', `Персона для связи с Telegram аккаунтом не существует`)
        }
        const connectorResult = await client.query(
            `INSERT INTO persone_telegramm_accaunt_connector (person_id, telegramm_accaunt_id) VALUES ($1, $2) RETURNING id`,
            [personId, tgId]
        );
        return connectorResult.rows[0].id;
    }

    async createTgsForPerson(client, tgList, personId) {
        // // validateService.personValidation.validatePersonId(personId);
        if (!tgList || !Array.isArray(tgList) || tgList.length === 0) {
            return
        }
        for (const tg of tgList) {
            if (!tg || !tg.username) {
                throw apiError.BadRequest('INVALID_TG_DATA', `Отсутствуют обязательные поля для Telegram: ${JSON.stringify(tg)}`);
            }
            const tgId = await this.createTg(client, tg.username, tg.id || null);
            await this.createPersonTgConnector(client, tgId, personId);
        }
    }
}

module.exports = new createTgService();