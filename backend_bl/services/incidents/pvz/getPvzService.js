const apiError = require("../../../exceptions/apiError");
const dictionaryService = require("../../dictionary/dictionaryService");
const ValidateService = require("../../systemServices/validate/validateService");
const usersEmailService = require("../../users/usersEmailService");
const userTgService = require("../../users/userTgService");
const incidentCheckAndGeneratedDataService = require("../incidentCreate/incidentCheckAndGeneratedDataService");

const validateService = new ValidateService();

class getPvzService {
    capitalizeWords(str) {
        if (!str || typeof str !== 'string') return str;
        return str.split(' ')
            .filter(word => word.length > 0)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    async getPVZByIncidentId(client, incidentId, canGetAdmAccessData) {
        validateService.incidentValidation.validateIncidentId(incidentId);
        if (!await incidentCheckAndGeneratedDataService.checkIncidentExist(client, incidentId, false)) {
            throw apiError.BadRequest('INCIDENT_NOT_EXIST', `Инцидент с ID ${incidentId} не существует`);
        }

        const query = `
            SELECT
                ip.pvz_id,
                ip.addr_city,
                ip.addr_street,
                ip.addr_home,
                ip.type_id,
                ip.date_first_add,
                ip.is_verified,
                ipc.id as connector_id,
                ipc.active as active
            FROM
                incident_pvz_connector ipc
            INNER JOIN
                incident_pvz ip ON ipc.pvz_id = ip.pvz_id
            WHERE
                ipc.incident_id = $1
            ORDER BY
                ip.date_first_add DESC
        `;

        const result = await client.query(query, [incidentId]);
        if (result.rowCount === 0) return [];

        const pvzList = await Promise.all(result.rows.map(async (row) => {
            const typeName = await dictionaryService.getElementNameById(client, row.type_id);
            const city = this.capitalizeWords(row.addr_city);
            const street = this.capitalizeWords(row.addr_street);
            const home = row.addr_home || '';

            const addressParts = [];
            if (city) addressParts.push(`г. ${city}`);
            if (street) addressParts.push(`ул. ${street}`);
            if (home) addressParts.push(`д. ${home}`);
            const fullAddress = addressParts.join(', ');

            let output = {
                id: row.pvz_id,
                type: typeName || 'Неизвестный тип',
                address: fullAddress,
                address_parts: { city, street, home },
                connector_id: row.connector_id,
                is_verified: row.is_verified || false
            };

            if (canGetAdmAccessData) {
                output.type_id = row.type_id;
                output.created_at = row.date_first_add;
                output.active = row.active;
            }
            return output;
        }));
        return pvzList;
    }
}
module.exports = new getPvzService();