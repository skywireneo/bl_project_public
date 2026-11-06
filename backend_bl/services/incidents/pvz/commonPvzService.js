// const apiError = require('../exceptions/apiError');
// const tokenService = require('./systemServices/tokenService');
// const queryService = require('./systemServices/queryService');
// const personService = require('./incidentSubServices/personService');
// const pvzService = require('./incidentSubServices/pvzService');
// const { hashData } = require('./systemServices/cryptoService');

// const dictionaryService = require("../../dictionary/dictionaryService");
// const userEncriptionService = require("../../systemServices/userEncriptionService");
const apiError = require("../../../exceptions/apiError");
const dictionaryService = require("../../dictionary/dictionaryService");
const ValidateService = require("../../systemServices/validate/validateService");
const usersEmailService = require("../../users/usersEmailService");
const userTgService = require("../../users/userTgService");
const incidentCheckAndGeneratedDataService = require("../incidentCreate/incidentCheckAndGeneratedDataService");
// const usersEmailService = require("../../users/usersEmailService");
// const incidentCheckAndGeneratedDataService = require("./incidentCheckAndGeneratedDataService");

const validateService = new ValidateService();

class commonPvzService {

    transferAddress(address) {
        const parts = address.split(",").map(p => p.trim());
        let [city, street, house] = parts;
        if (city) city = city.replace(/^(г\.?|город|гор\.)\s*/i, "").trim().toLowerCase();
        if (street) street = street.replace(/^(ул\.?|улица)\s*/i, "").trim().toLowerCase();
        if (house) house = house
            .replace(/^(д\.?|дом|корпус|к\.?)\s*/i, "")
            .replace(/\s+/g, "")
            .trim().toLowerCase();
        return [
            city,
            street,
            house
        ];
    }

    async checkPVZExist(client, city, street, home, type_id, errExit = true) {
        let name_db = await client.query(`
        SELECT 
            pvz_id 
        FROM 
            incident_pvz 
        WHERE 
            type_id = $1
            AND addr_city = $2
            AND addr_street = $3
            AND addr_home = $4
        `,
            [type_id, city, street, home])
        if (name_db.rowCount > 0) {
            if (errExit) {
                throw apiError.BadRequest('INCIDENT_NOT_EXIST', `PVZ уже существует`)
            } else {
                return name_db.rows[0].pvz_id
            }
        }
        if (!errExit) {
            return null
        }
    }

    async checkPVZExistById(client, pvzId, errExit = true) {
        let name_db = await client.query(`
            SELECT 
                pvz_id 
            FROM 
                incident_pvz 
            WHERE 
                pvz_id = $1
            `,
            [pvzId])
        if (name_db.rowCount == 0) {
            if (errExit) {
                throw apiError.BadRequest('INCIDENT_NOT_EXIST', `PVZ не существует`)
            } else {
                return false
            }
        }
        if (!errExit) {
            return true
        }
    }

    async checkPVZExistConnector(client, pvzId, incidentId, errExit = true) {
        let name_db = await client.query(`
            SELECT 
                id 
            FROM 
                incident_pvz_connector 
            WHERE 
                pvz_id = $1
                AND incident_id = $2
            `,
            [pvzId, incidentId])
        if (name_db.rowCount > 0) {
            if (errExit) {
                throw apiError.BadRequest('INCIDENT_NOT_EXIST', `Коннектор существует`)
            } else {
                return true
            }
        }
        if (!errExit) {
            return false
        }
    }
}

module.exports = new commonPvzService();
