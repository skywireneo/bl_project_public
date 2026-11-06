const apiError = require("../../../../exceptions/apiError");
const ValidateService = require("../../../systemServices/validate/validateService");

const validateService = new ValidateService();

class commonTgService {

    async checkTgExist(client, tgUsernameHash, errExit = true) {
        let tg_db = await client.query(`
        SELECT 
            tg_id 
        FROM 
            persone_telegramm_accaunts 
        WHERE 
            tg_username_hesh = $1
        `,
            [tgUsernameHash])
        if (tg_db.rowCount > 0) {
            if (errExit) {
                throw apiError.BadRequest('TG_ALREADY_EXIST', `Telegram аккаунт уже существует`)
            } else {
                return tg_db.rows[0].tg_id
            }
        }
        if (!errExit) {
            return null
        }
    }

    async checkTgExistById(client, tgId, errExit = true) {
        let tg_db = await client.query(`
            SELECT 
                tg_id 
            FROM 
                persone_telegramm_accaunts 
            WHERE 
                tg_id = $1
            `,
            [tgId])
        if (tg_db.rowCount == 0) {
            if (errExit) {
                throw apiError.BadRequest('TG_NOT_EXIST', `Telegram аккаунт не существует`)
            } else {
                return false
            }
        }
        if (!errExit) {
            return true
        }
    }

    async checkTgExistConnector(client, tgId, personId, errExit = true) {
        let tg_db = await client.query(`
            SELECT 
                id 
            FROM 
                persone_telegramm_accaunt_connector 
            WHERE 
                telegramm_accaunt_id = $1
                AND person_id = $2
            `,
            [tgId, personId])
        if (tg_db.rowCount > 0) {
            if (errExit) {
                throw apiError.BadRequest('TG_CONNECTOR_EXIST', `Связь Telegram аккаунта с персоной уже существует`)
            } else {
                return true
            }
        }
        if (!errExit) {
            return false
        }
    }
}

module.exports = new commonTgService();