const apiError = require("../../../../exceptions/apiError");
const ValidateService = require("../../../systemServices/validate/validateService");
const userEncriptionService = require("../../../systemServices/userEncriptionService");
const incidentCheckAndGeneratedDataService = require("../../incidentCreate/incidentCheckAndGeneratedDataService");
const commonPhoneService = require("./commonPhoneService");
const commonPersonService = require("../commonPersonService");

const validateService = new ValidateService();

class createPhoneService {

    getLastSixDigits(phone) {
        const digits = phone.replace(/\D/g, '');
        return digits.slice(-6);
    }

    async createPhone(client, phone) {
        if (!phone) {
            throw apiError.BadRequest('PHONE_NO_DATA', `Недостаточно данных для добавления телефона`)
        }
        validateService.personeValidation.validatePhone(phone);

        const encryptedData = await userEncriptionService.getPhoneDataEncrypted(phone);
        const lastSix = this.getLastSixDigits(phone);

        let phoneId = await commonPhoneService.checkPhoneExist(client, encryptedData.heshPhone, false);

        if (!phoneId) {
            const phoneResult = await client.query(
                `INSERT INTO persone_phones (phone_hesh, phone_encrypted, phone_iv, phone_auth_tag, phone_last_six, date_add) 
                 VALUES ($1, $2, $3, $4, $5, (NOW() AT TIME ZONE 'UTC')) 
                 RETURNING phone_id`,
                [
                    encryptedData.heshPhone,
                    encryptedData.encryptedDataPhoneEncrypted,
                    encryptedData.encryptedDataPhoneIv,
                    encryptedData.encryptedDataPhoneAuthTag,
                    lastSix
                ]
            );
            phoneId = phoneResult.rows[0].phone_id;
        }
        return phoneId;
    }

    async createPersonPhoneConnector(client, phoneId, personId) {
        if (!phoneId || !personId) {
            throw apiError.BadRequest('PHONE_NO_DATA', `Недостаточно данных для добавления связи телефона с персоной`)
        }
        if (await commonPhoneService.checkPhoneExistConnector(client, phoneId, personId, false)) {
            return
        }
        await commonPhoneService.checkPhoneExistById(client, phoneId, true);
        if (!await commonPersonService.checkPersonExist(client, personId, false)) {
            throw apiError.BadRequest('PHONE_NO_DATA', `Персона для связи с телефоном не существует`)
        }
        const connectorResult = await client.query(
            `INSERT INTO persone_phone_connector (person_id, phone_id) VALUES ($1, $2) RETURNING id`,
            [personId, phoneId]
        );
        return connectorResult.rows[0].id;
    }

    async createPhonesForPerson(client, phoneList, personId) {
        // // validateService.personValidation.validatePersonId(personId);
        if (!phoneList || !Array.isArray(phoneList) || phoneList.length === 0) {
            return
        }
        for (const phone of phoneList) {
            if (!phone || typeof phone !== 'string') {
                throw apiError.BadRequest('INVALID_PHONE_DATA', `Отсутствуют обязательные поля для телефона: ${JSON.stringify(phone)}`);
            }
            const phoneId = await this.createPhone(client, phone);
            await this.createPersonPhoneConnector(client, phoneId, personId);
        }
    }
}

module.exports = new createPhoneService();