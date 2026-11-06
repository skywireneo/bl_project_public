const apiError = require("../../../exceptions/apiError");
const ValidateService = require("../../systemServices/validate/validateService");
const dictionaryService = require("../../dictionary/dictionaryService");
const incidentCheckAndGeneratedDataService = require("../incidentCreate/incidentCheckAndGeneratedDataService");
const nameService = require("./names/nameService");
const phoneService = require("./phones/phoneService");
const tgService = require("./tg/tgService");
const { maskBirthDate } = require("../../systemServices/mask");

const validateService = new ValidateService();

class getPersonService {

    async getPersonsByIncidentId(client, incidentId, canGetAdmAccessData) {
        if (!await incidentCheckAndGeneratedDataService.checkIncidentExist(client, incidentId, false)) {
            throw apiError.BadRequest('INCIDENT_NOT_EXIST', `Инцидент с ID ${incidentId} не существует`);
        }

        const query = `
        SELECT 
            ip.person_id,
            ip.birth_date,
            ip.post_id,
            ip.date_add,
            ipc.id as connector_id,
            ipc.active as active
        FROM 
            incident_persone_connector ipc
        INNER JOIN 
            incident_persones ip ON ipc.person_id = ip.person_id
        WHERE 
            ipc.incident_id = $1
        ORDER BY 
            ip.date_add DESC
        `;

        const result = await client.query(query, [incidentId]);

        if (result.rowCount === 0) {
            return [];
        }

        const uniquePostIds = [...new Set(result.rows.map(r => r.post_id).filter(Boolean))];
        const positionsMap = await dictionaryService.getElementsFullByIds(client, uniquePostIds);

        const personList = await Promise.all(result.rows.map(async (row) => {
            const positionElement = positionsMap.get(String(row.post_id));
            const positionName = positionElement?.name || 'Неизвестная должность';
            const onPvz = !!(positionElement?.addonData && positionElement.addonData.onPvz);

            const names = await nameService.getNamesByPersonId(client, row.person_id, canGetAdmAccessData);
            const phones = await phoneService.getPhonesByPersonId(client, row.person_id, canGetAdmAccessData);
            const tgNicks = await tgService.getTgsByPersonId(client, row.person_id, canGetAdmAccessData);

            let output = {
                person_id: row.person_id,
                position: positionName,
                onPvz: onPvz,
                birthdate: canGetAdmAccessData ? row.birth_date : maskBirthDate(row.birth_date),
                fios: names.map(n => n.name),
                phones: phones.map(p => p.phone),
                tgNicks: tgNicks.map(t => ({ username: t.username, id: t.tg_id })),
                connector_id: row.connector_id
            };

            if (canGetAdmAccessData) {
                output.post_id = row.post_id;
                output.created_at = row.date_add;
                output.names_full = names;
                output.phones_full = phones;
                output.tgNicks_full = tgNicks;
                output.active = row.active;
            }

            return output;
        }));

        return personList;
    }
}

module.exports = new getPersonService();