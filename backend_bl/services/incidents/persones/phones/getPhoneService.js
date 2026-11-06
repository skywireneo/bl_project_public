const apiError = require("../../../../exceptions/apiError");
const ValidateService = require("../../../systemServices/validate/validateService");
const userEncriptionService = require("../../../systemServices/userEncriptionService");
const commonPersonService = require("../commonPersonService");
const { maskPhone } = require("../../../systemServices/mask");

const validateService = new ValidateService();

class getPhoneService {

    async getPhonesByPersonId(client, personId, canGetAdmAccessData) {
        if (!await commonPersonService.checkPersonExist(client, personId, false)) {
            throw apiError.BadRequest('PERSON_NOT_EXIST', `Персона с ID ${personId} не существует`);
        }

        const query = `
        SELECT 
            pp.phone_id,
            pp.phone_encrypted,
            pp.phone_iv,
            pp.phone_auth_tag,
            pp.phone_last_six,
            pp.date_add,
            ppc.id as connector_id
        FROM 
            persone_phone_connector ppc
        INNER JOIN 
            persone_phones pp ON ppc.phone_id = pp.phone_id
        WHERE 
            ppc.person_id = $1
        ORDER BY 
            pp.date_add DESC
        `;

        const result = await client.query(query, [personId]);

        if (result.rowCount === 0) {
            return [];
        }

        const phoneList = await Promise.all(result.rows.map(async (row) => {
            const decryptedPhone = await userEncriptionService.getPhoneDataDecrypted(
                row.phone_encrypted,
                row.phone_iv,
                row.phone_auth_tag
            );

            let output = {
                id: row.phone_id,
                phone: canGetAdmAccessData
                    ? (decryptedPhone || 'Телефон не расшифрован')
                    : (maskPhone(decryptedPhone) || 'Телефон не расшифрован'),
                phone_last_six: row.phone_last_six,
                connector_id: row.connector_id
            };

            if (canGetAdmAccessData) {
                output.created_at = row.date_add;
            }

            return output;
        }));

        return phoneList;
    }
}

module.exports = new getPhoneService();