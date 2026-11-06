const apiError = require("../../../../exceptions/apiError");
const ValidateService = require("../../../systemServices/validate/validateService");
const userEncriptionService = require("../../../systemServices/userEncriptionService");
const incidentCheckAndGeneratedDataService = require("../../incidentCreate/incidentCheckAndGeneratedDataService");
const commonPhoneService = require("./commonPhoneService");
const createPhoneService = require("./createPhoneService");
const deletePhoneService = require("./deletePhoneService");
const getPhoneService = require("./getPhoneService");
const commonPersonService = require("../commonPersonService");

const validateService = new ValidateService();

class updatePhoneService {

    getPhoneKey(phone) {
        return phone.replace(/\D/g, '');
    }

    async hasOtherConnections(client, phoneId, excludePersonId) {
        const query = `
        SELECT COUNT(*) as count 
        FROM persone_phone_connector 
        WHERE phone_id = $1 AND person_id != $2
    `;
        const result = await client.query(query, [phoneId, excludePersonId]);
        return parseInt(result.rows[0].count) > 0;
    }

    async updatePhone(client, phoneId, phone) {
        const encryptedData = await userEncriptionService.getPhoneDataEncrypted(phone);
        const lastSix = new createPhoneService().getLastSixDigits(phone);

        const query = `
        UPDATE persone_phones 
        SET phone_hesh = $1, 
            phone_encrypted = $2, 
            phone_iv = $3, 
            phone_auth_tag = $4,
            phone_last_six = $5
        WHERE phone_id = $6
        RETURNING phone_id
    `;
        const result = await client.query(query, [
            encryptedData.heshPhone,
            encryptedData.encryptedDataPhoneEncrypted,
            encryptedData.encryptedDataPhoneIv,
            encryptedData.encryptedDataPhoneAuthTag,
            lastSix,
            phoneId
        ]);

        if (result.rowCount === 0) {
            throw apiError.BadRequest('UPDATE_FAILED', `Не удалось обновить телефон с ID ${phoneId}`);
        }

        return result.rows[0].phone_id;
    }

    async deletePhoneById(client, phoneId) {
        const query = `
        DELETE FROM persone_phones 
        WHERE phone_id = $1 
        RETURNING phone_id
    `;
        const result = await client.query(query, [phoneId]);
        return result.rowCount > 0;
    }

    async updatePhonesForPerson(client, personId, newPhoneList) {
        // validateService.personValidation.validatePersonId(personId);

        if (!newPhoneList || !Array.isArray(newPhoneList)) {
            throw apiError.BadRequest('INVALID_PHONE_LIST', 'Список телефонов должен быть массивом');
        }

        if (!await commonPersonService.checkPersonExist(client, personId, false)) {
            throw apiError.BadRequest('PERSON_NOT_EXIST', `Персона с ID ${personId} не существует`);
        }

        if (newPhoneList.length === 0) {
            return await deletePhoneService.deletePhonesByPersonId(client, personId);
        }

        const currentPhoneList = await getPhoneService.getPhonesByPersonId(client, personId, true);

        const currentMap = new Map();
        for (const phone of currentPhoneList) {
            const key = this.getPhoneKey(phone.phone);
            currentMap.set(key, {
                ...phone,
                key: key
            });
        }
        // console.log(currentMap)

        const result = {
            created: [],
            updated: [],
            deleted: [],
            unchanged: []
        };

        for (const newPhone of newPhoneList) {
            if (!newPhone || typeof newPhone !== 'string') {
                throw apiError.BadRequest('INVALID_PHONE_DATA', `Отсутствуют обязательные поля для телефона: ${JSON.stringify(newPhone)}`);
            }

            validateService.personeValidation.validatePhone(newPhone);

            const key = this.getPhoneKey(newPhone);

            const duplicates = newPhoneList.filter(p =>
                this.getPhoneKey(p) === key
            );
            if (duplicates.length > 1) {
                throw apiError.BadRequest('DUPLICATE_PHONE', `Обнаружены дубликаты телефонов: ${newPhone}`);
            }

            if (currentMap.has(key)) {
                const currentPhone = currentMap.get(key);

                if (currentPhone.phone === newPhone) {
                    result.unchanged.push({
                        id: currentPhone.id,
                        phone: newPhone
                    });
                    currentMap.delete(key);
                } else {
                    const hasOtherConnections = await this.hasOtherConnections(
                        client,
                        currentPhone.id,
                        personId
                    );

                    if (hasOtherConnections) {
                        const newPhoneId = await createPhoneService.createPhone(client, newPhone);
                        await createPhoneService.createPersonPhoneConnector(client, newPhoneId, personId);
                        await deletePhoneService.deletePersonPhoneConnector(client, personId, currentPhone.id);

                        result.created.push({
                            id: newPhoneId,
                            phone: newPhone,
                            replaced_phone_id: currentPhone.id
                        });
                    } else {
                        const updatedPhoneId = await this.updatePhone(
                            client,
                            currentPhone.id,
                            newPhone
                        );

                        result.updated.push({
                            id: updatedPhoneId,
                            phone: newPhone
                        });
                    }
                    currentMap.delete(key);
                }
            } else {
                const newPhoneId = await createPhoneService.createPhone(client, newPhone);
                await createPhoneService.createPersonPhoneConnector(client, newPhoneId, personId);

                result.created.push({
                    id: newPhoneId,
                    phone: newPhone
                });
            }
        }

        for (const [key, phone] of currentMap) {

            const hasOtherConnections = await this.hasOtherConnections(client, phone.id, personId);

            let phoneDeleted = false;
            if (!hasOtherConnections) {
                phoneDeleted = await deletePhoneService.deletePhoneByPhoneId(client, personId, phone.id);
            } else {
                await deletePhoneService.deletePersonPhoneConnector(client, personId, phone.id);
            }

            result.deleted.push({
                id: phone.id,
                phone: phone.phone,
                phone_deleted: phoneDeleted
            });
        }

        return {
            success: true,
            message: `Обновление телефонов завершено. Создано: ${result.created.length}, Обновлено: ${result.updated.length}, Удалено: ${result.deleted.length}, Без изменений: ${result.unchanged.length}`,
            personId: personId,
            ...result
        };
    }
}

module.exports = new updatePhoneService();