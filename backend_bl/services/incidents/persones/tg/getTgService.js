const apiError = require("../../../../exceptions/apiError");
const ValidateService = require("../../../systemServices/validate/validateService");
const userEncriptionService = require("../../../systemServices/userEncriptionService");
const commonPersonService = require("../commonPersonService");
const { maskTgName, maskTgId } = require("../../../systemServices/mask");

const validateService = new ValidateService();

class getTgService {

    async getTgsByPersonId(client, personId, canGetAdmAccessData) {
        if (!await commonPersonService.checkPersonExist(client, personId, false)) {
            throw apiError.BadRequest('PERSON_NOT_EXIST', `Персона с ID ${personId} не существует`);
        }

        const query = `
        SELECT 
            pta.tg_id,
            pta.tg_username_encrypted,
            pta.tg_username_iv,
            pta.tg_username_auth_tag,
            pta.tg_id_encrypted,
            pta.tg_id_iv,
            pta.tg_id_auth_tag,
            pta.date_add,
            ptac.id as connector_id
        FROM 
            persone_telegramm_accaunt_connector ptac
        INNER JOIN 
            persone_telegramm_accaunts pta ON ptac.telegramm_accaunt_id = pta.tg_id
        WHERE 
            ptac.person_id = $1
        ORDER BY 
            pta.date_add DESC
        `;

        const result = await client.query(query, [personId]);

        if (result.rowCount === 0) {
            return [];
        }

        const tgList = await Promise.all(result.rows.map(async (row) => {
            const decryptedUsername = await userEncriptionService.getTgUsernameDataDecrypted(
                row.tg_username_encrypted,
                row.tg_username_iv,
                row.tg_username_auth_tag
            );

            const decryptedTgId = await userEncriptionService.getTgIdDataDecrypted(
                row.tg_id_encrypted,
                row.tg_id_iv,
                row.tg_id_auth_tag
            );

            let output = {
                id: row.tg_id,
                username: canGetAdmAccessData
                    ? (decryptedUsername || 'Username не расшифрован')
                    : (maskTgName(decryptedUsername) || 'Username не расшифрован'),
                tg_id: canGetAdmAccessData
                    ? (decryptedTgId || null)
                    : (maskTgId(decryptedTgId) || null),
                connector_id: row.connector_id
            };

            if (canGetAdmAccessData) {
                output.created_at = row.date_add;
            }

            return output;
        }));

        return tgList;
    }
}

module.exports = new getTgService();