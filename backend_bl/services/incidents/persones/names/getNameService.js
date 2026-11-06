const apiError = require("../../../../exceptions/apiError");
const ValidateService = require("../../../systemServices/validate/validateService");
const userEncriptionService = require("../../../systemServices/userEncriptionService");
const commonPersonService = require("../commonPersonService");
const { maskFIO } = require("../../../systemServices/mask");

const validateService = new ValidateService();

class getNameService {

    // Вспомогательная функция: делает первую букву каждого слова заглавной
    // "иванов иван иванович" → "Иванов Иван Иванович"
    capitalizeWords(str) {
        if (!str || typeof str !== 'string') return str;
        return str.split(' ')
            .filter(word => word.length > 0)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    async getNamesByPersonId(client, personId, canGetAdmAccessData) {
        if (!await commonPersonService.checkPersonExist(client, personId, false)) {
            throw apiError.BadRequest('PERSON_NOT_EXIST', `Персона с ID ${personId} не существует`);
        }

        const query = `
        SELECT 
            pn.name_id,
            pn.name_encrypted,
            pn.name_iv,
            pn.name_auth_tag,
            pn.name_phonetic_tokens,
            pn.date_add,
            pnc.id as connector_id
        FROM 
            persone_name_connector pnc
        INNER JOIN 
            persone_names pn ON pnc.name_id = pn.name_id
        WHERE 
            pnc.person_id = $1
        ORDER BY 
            pn.date_add DESC
        `;

        const result = await client.query(query, [personId]);

        if (result.rowCount === 0) {
            return [];
        }

        const nameList = await Promise.all(result.rows.map(async (row) => {
            const decryptedName = await userEncriptionService.getNameDataDecrypted(
                row.name_encrypted,
                row.name_iv,
                row.name_auth_tag
            );

            // Применяем капитализацию к расшифрованному имени
            const capitalizedName = this.capitalizeWords(decryptedName);

            let output = {
                id: row.name_id,
                name: canGetAdmAccessData
                    ? (capitalizedName || 'Имя не расшифровано')
                    : (maskFIO(capitalizedName) || 'Имя не расшифровано'),
                connector_id: row.connector_id
            };

            if (canGetAdmAccessData) {
                output.phonetic_tokens = row.name_phonetic_tokens;
                output.created_at = row.date_add;
            }

            return output;
        }));

        return nameList;
    }
}

module.exports = new getNameService();