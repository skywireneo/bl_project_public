
const apiError = require("../../../../exceptions/apiError");
const ValidateService = require("../../../systemServices/validate/validateService");

const validateService = new ValidateService();

class commonPhoneService {

    async checkPhoneExist(client, phoneHash, errExit = true) {
        let phone_db = await client.query(`
        SELECT 
            phone_id 
        FROM 
            persone_phones 
        WHERE 
            phone_hesh = $1
        `,
            [phoneHash])
        if (phone_db.rowCount > 0) {
            if (errExit) {
                throw apiError.BadRequest('PHONE_ALREADY_EXIST', `Телефон уже существует`)
            } else {
                return phone_db.rows[0].phone_id
            }
        }
        if (!errExit) {
            return null
        }
    }

    async checkPhoneExistById(client, phoneId, errExit = true) {
        let phone_db = await client.query(`
            SELECT 
                phone_id 
            FROM 
                persone_phones 
            WHERE 
                phone_id = $1
            `,
            [phoneId])
        if (phone_db.rowCount == 0) {
            if (errExit) {
                throw apiError.BadRequest('PHONE_NOT_EXIST', `Телефон не существует`)
            } else {
                return false
            }
        }
        if (!errExit) {
            return true
        }
    }

    async checkPhoneExistConnector(client, phoneId, personId, errExit = true) {
        let phone_db = await client.query(`
            SELECT 
                id 
            FROM 
                persone_phone_connector 
            WHERE 
                phone_id = $1
                AND person_id = $2
            `,
            [phoneId, personId])
        if (phone_db.rowCount > 0) {
            if (errExit) {
                throw apiError.BadRequest('PHONE_CONNECTOR_EXIST', `Связь телефона с персоной уже существует`)
            } else {
                return true
            }
        }
        if (!errExit) {
            return false
        }
    }
}

module.exports = new commonPhoneService();