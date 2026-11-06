const apiError = require("../../../exceptions/apiError");
const dictionaryService = require("../../dictionary/dictionaryService");
const ValidateService = require("../../systemServices/validate/validateService");
const usersEmailService = require("../../users/usersEmailService");
const userTgService = require("../../users/userTgService");
const incidentCheckAndGeneratedDataService = require("../incidentCreate/incidentCheckAndGeneratedDataService");
const commonPvzService = require("./commonPvzService");

const validateService = new ValidateService();

class createPvzService {

    async createPVZ(client, type, address) {
        if (!address || !type) {
            throw apiError.BadRequest('PVZ_NO_DATA', `Недостаточно данных для добавления ПВЗ`)
        }
        validateService.pvzValidation.validateAddress(address)
        address = commonPvzService.transferAddress(address)

        address = address.map(part => (part || '').toLowerCase());

        const pvzTypeId = await dictionaryService.getElementIdByName(client, 'pvz_type', type)
        let pvzId = await commonPvzService.checkPVZExist(client, address[0], address[1], address[2], pvzTypeId, false)
        if (!pvzId) {
            const pvzResult = await client.query(
                `INSERT INTO incident_pvz (addr_city, addr_street, addr_home, type_id, date_first_add) VALUES ($1, $2, $3, $4, (NOW() AT TIME ZONE 'UTC')) RETURNING pvz_id`,
                [address[0], address[1], address[2], pvzTypeId]
            );
            pvzId = pvzResult.rows[0].pvz_id
        }
        return pvzId
    }

    async createIncidentPVZConnector(client, pvzId, incidentId) {
        if (!pvzId || !incidentId) {
            throw apiError.BadRequest('PVZ_NO_DATA', `Недостаточно данных для добавления ПВЗ коннектора`)
        }
        if (await commonPvzService.checkPVZExistConnector(client, pvzId, incidentId, false)) {
            return
        }
        await commonPvzService.checkPVZExistById(client, pvzId, true)
        if (!await incidentCheckAndGeneratedDataService.checkIncidentExist(client, incidentId, false)) {
            throw apiError.BadRequest('PVZ_NO_DATA', `Инцидент для связи с ПВЗ не существует`)
        }
        const pvzResult = await client.query(
            `INSERT INTO incident_pvz_connector (incident_id, pvz_id) VALUES ($1, $2) RETURNING id`,
            [incidentId, pvzId]
        );
        return pvzResult.rows[0].id
    }

    async createPVZForIncident(client, pvzList, incidentId) {
        validateService.incidentValidation.validateIncidentId(incidentId)
        if (!pvzList || !Array.isArray(pvzList) || pvzList.length === 0) {
            return
        }
        for (const pvz of pvzList) {
            if (!pvz.type || !pvz.address) {
                throw apiError.BadRequest('INVALID_PVZ_DATA', `Отсутствуют обязательные поля для ПВЗ: ${JSON.stringify(pvz)}`);
            }
            const pvzType = pvz.type
            const pvzAddress = pvz.address
            const pvzId = await this.createPVZ(client, pvzType, pvzAddress)
            const pvzIncidentConnectorId = await this.createIncidentPVZConnector(client, pvzId, incidentId)
        }
    }
}

module.exports = new createPvzService();