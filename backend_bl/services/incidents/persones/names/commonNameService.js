const apiError = require("../../../../exceptions/apiError");
const ValidateService = require("../../../systemServices/validate/validateService");
const userEncriptionService = require("../../../systemServices/userEncriptionService");

const validateService = new ValidateService();

class commonNameService {

    async checkNameExist(client, nameHash, errExit = true) {
        let name_db = await client.query(`
        SELECT 
            name_id 
        FROM 
            persone_names 
        WHERE 
            name_hesh = $1
        `,
            [nameHash])
        if (name_db.rowCount > 0) {
            if (errExit) {
                throw apiError.BadRequest('NAME_ALREADY_EXIST', `Имя уже существует`)
            } else {
                return name_db.rows[0].name_id
            }
        }
        if (!errExit) {
            return null
        }
    }

    async checkNameExistById(client, nameId, errExit = true) {
        let name_db = await client.query(`
            SELECT 
                name_id 
            FROM 
                persone_names 
            WHERE 
                name_id = $1
            `,
            [nameId])
        if (name_db.rowCount == 0) {
            if (errExit) {
                throw apiError.BadRequest('NAME_NOT_EXIST', `Имя не существует`)
            } else {
                return false
            }
        }
        if (!errExit) {
            return true
        }
    }

    async checkNameExistConnector(client, nameId, personId, errExit = true) {
        let name_db = await client.query(`
            SELECT 
                id 
            FROM 
                persone_name_connector 
            WHERE 
                name_id = $1
                AND person_id = $2
            `,
            [nameId, personId])
        if (name_db.rowCount > 0) {
            if (errExit) {
                throw apiError.BadRequest('NAME_CONNECTOR_EXIST', `Связь имени с персоной уже существует`)
            } else {
                return true
            }
        }
        if (!errExit) {
            return false
        }
    }
}

module.exports = new commonNameService();