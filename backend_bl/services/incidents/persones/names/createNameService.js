const apiError = require("../../../../exceptions/apiError");
const ValidateService = require("../../../systemServices/validate/validateService");
const userEncriptionService = require("../../../systemServices/userEncriptionService");
const translitService = require("../../../systemServices/translitService");
const incidentCheckAndGeneratedDataService = require("../../incidentCreate/incidentCheckAndGeneratedDataService");
const commonNameService = require("./commonNameService");
const commonPersonService = require("../commonPersonService");

const validateService = new ValidateService();

class createNameService {

    async createName(client, name) {
        if (!name) {
            throw apiError.BadRequest('NAME_NO_DATA', `Недостаточно данных для добавления имени`)
        }
        validateService.personeValidation.validateFIO(name);

        // Приводим имя к нижнему регистру перед шифрованием и сохранением
        name = name.toLowerCase();

        const encryptedData = await userEncriptionService.getNameDataEncrypted(name);
        const phoneticTokens = await translitService.getPhoneticTokenHashes(name);

        let nameId = await commonNameService.checkNameExist(client, encryptedData.heshName, false);

        if (!nameId) {
            const nameResult = await client.query(
                `INSERT INTO persone_names (name_hesh, name_encrypted, name_iv, name_auth_tag, name_phonetic_tokens, date_add) 
                 VALUES ($1, $2, $3, $4, $5, (NOW() AT TIME ZONE 'UTC')) 
                 RETURNING name_id`,
                [
                    encryptedData.heshName,
                    encryptedData.encryptedDataNameEncrypted,
                    encryptedData.encryptedDataNameIv,
                    encryptedData.encryptedDataNameAuthTag,
                    phoneticTokens
                ]
            );
            nameId = nameResult.rows[0].name_id;
        }
        return nameId;
    }

    async createPersonNameConnector(client, nameId, personId) {
        if (!nameId || !personId) {
            throw apiError.BadRequest('NAME_NO_DATA', `Недостаточно данных для добавления связи имени с персоной`)
        }
        if (await commonNameService.checkNameExistConnector(client, nameId, personId, false)) {
            return
        }
        await commonNameService.checkNameExistById(client, nameId, true);
        if (!await commonPersonService.checkPersonExist(client, personId, false)) {
            throw apiError.BadRequest('NAME_NO_DATA', `Персона для связи с именем не существует`)
        }
        const connectorResult = await client.query(
            `INSERT INTO persone_name_connector (person_id, name_id) VALUES ($1, $2) RETURNING id`,
            [personId, nameId]
        );
        return connectorResult.rows[0].id;
    }

    async createNamesForPerson(client, nameList, personId) {
        if (!nameList || !Array.isArray(nameList) || nameList.length === 0) {
            return
        }
        for (const name of nameList) {
            if (!name || typeof name !== 'string') {
                throw apiError.BadRequest('INVALID_NAME_DATA', `Отсутствуют обязательные поля для имени: ${JSON.stringify(name)}`);
            }
            const nameId = await this.createName(client, name);
            await this.createPersonNameConnector(client, nameId, personId);
        }
    }
}

module.exports = new createNameService();