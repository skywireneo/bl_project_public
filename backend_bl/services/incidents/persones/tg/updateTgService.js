const apiError = require("../../../../exceptions/apiError");
const ValidateService = require("../../../systemServices/validate/validateService");
const userEncriptionService = require("../../../systemServices/userEncriptionService");
const { encrypt, hashData } = require("../../../systemServices/cryptoService");
const incidentCheckAndGeneratedDataService = require("../../incidentCreate/incidentCheckAndGeneratedDataService");
const commonTgService = require("./commonTgService");
const createTgService = require("./createTgService");
const deleteTgService = require("./deleteTgService");
const getTgService = require("./getTgService");
const commonPersonService = require("../commonPersonService");

const validateService = new ValidateService();

class updateTgService {

    getTgKey(username) {
        return username.toLowerCase().trim();
    }

    async hasOtherConnections(client, tgId, excludePersonId) {
        const query = `
        SELECT COUNT(*) as count 
        FROM persone_telegramm_accaunt_connector 
        WHERE telegramm_accaunt_id = $1 AND person_id != $2
    `;
        const result = await client.query(query, [tgId, excludePersonId]);
        return parseInt(result.rows[0].count) > 0;
    }

    async getTgIdEncryptedData(tgId) {
        if (!tgId) {
            return {
                encryptedDataTgIdEncrypted: null,
                encryptedDataTgIdIv: null,
                encryptedDataTgIdAuthTag: null,
                heshTgId: null,
            };
        }
        const encryptedDataTgId = encrypt(String(tgId), "USER_TG");
        const heshTgId = hashData(String(tgId), "USER_TG");
        return {
            encryptedDataTgIdEncrypted: encryptedDataTgId.encrypted,
            encryptedDataTgIdIv: encryptedDataTgId.iv,
            encryptedDataTgIdAuthTag: encryptedDataTgId.authTag,
            heshTgId: heshTgId,
        };
    }

    async updateTg(client, tgId, tgUsername, tgIdValue = null) {
        const usernameEncryptedData = await userEncriptionService.getTgUsernameDataEncrypted(tgUsername);
        const tgIdEncryptedData = await this.getTgIdEncryptedData(tgIdValue);

        const query = `
        UPDATE persone_telegramm_accaunts 
        SET tg_username_hesh = $1, 
            tg_username_encrypted = $2, 
            tg_username_iv = $3, 
            tg_username_auth_tag = $4,
            tg_id_hesh = $5,
            tg_id_encrypted = $6,
            tg_id_iv = $7,
            tg_id_auth_tag = $8
        WHERE tg_id = $9
        RETURNING tg_id
    `;
        const result = await client.query(query, [
            usernameEncryptedData.heshTg,
            usernameEncryptedData.encryptedDataTgEncrypted,
            usernameEncryptedData.encryptedDataTgIv,
            usernameEncryptedData.encryptedDataTgAuthTag,
            tgIdEncryptedData.heshTgId,
            tgIdEncryptedData.encryptedDataTgIdEncrypted,
            tgIdEncryptedData.encryptedDataTgIdIv,
            tgIdEncryptedData.encryptedDataTgIdAuthTag,
            tgId
        ]);

        if (result.rowCount === 0) {
            throw apiError.BadRequest('UPDATE_FAILED', `Не удалось обновить Telegram аккаунт с ID ${tgId}`);
        }

        return result.rows[0].tg_id;
    }

    async updateTgIdOnly(client, tgId, tgIdValue = null) {
        const tgIdEncryptedData = await this.getTgIdEncryptedData(tgIdValue);

        const query = `
        UPDATE persone_telegramm_accaunts 
        SET tg_id_hesh = $1,
            tg_id_encrypted = $2,
            tg_id_iv = $3,
            tg_id_auth_tag = $4
        WHERE tg_id = $5
        RETURNING tg_id
    `;
        const result = await client.query(query, [
            tgIdEncryptedData.heshTgId,
            tgIdEncryptedData.encryptedDataTgIdEncrypted,
            tgIdEncryptedData.encryptedDataTgIdIv,
            tgIdEncryptedData.encryptedDataTgIdAuthTag,
            tgId
        ]);

        if (result.rowCount === 0) {
            throw apiError.BadRequest('UPDATE_FAILED', `Не удалось обновить Telegram ID для аккаунта с ID ${tgId}`);
        }

        return result.rows[0].tg_id;
    }

    async deleteTgById(client, tgId) {
        const query = `
        DELETE FROM persone_telegramm_accaunts 
        WHERE tg_id = $1 
        RETURNING tg_id
    `;
        const result = await client.query(query, [tgId]);
        return result.rowCount > 0;
    }

    async updateTgsForPerson(client, personId, newTgList) {
        // validateService.personValidation.validatePersonId(personId);

        if (!newTgList || !Array.isArray(newTgList)) {
            throw apiError.BadRequest('INVALID_TG_LIST', 'Список Telegram аккаунтов должен быть массивом');
        }

        if (!await commonPersonService.checkPersonExist(client, personId, false)) {
            throw apiError.BadRequest('PERSON_NOT_EXIST', `Персона с ID ${personId} не существует`);
        }

        // console.log(9999)
        // console.log(newTgList.length)

        if (newTgList.length === 0) {
            return await deleteTgService.deleteTgsByPersonId(client, personId);
        }

        const currentTgList = await getTgService.getTgsByPersonId(client, personId, true);

        const currentMap = new Map();
        for (const tg of currentTgList) {
            const key = this.getTgKey(tg.username);
            currentMap.set(key, {
                ...tg,
                key: key
            });
        }

        const result = {
            created: [],
            updated: [],
            deleted: [],
            unchanged: []
        };

        for (const newTg of newTgList) {
            if (!newTg || !newTg.username) {
                throw apiError.BadRequest('INVALID_TG_DATA', `Отсутствуют обязательные поля для Telegram: ${JSON.stringify(newTg)}`);
            }

            validateService.validateTgUsername(newTg.username);

            const key = this.getTgKey(newTg.username);
            const newTgIdValue = newTg.id || null;

            const duplicates = newTgList.filter(t =>
                this.getTgKey(t.username) === key
            );
            if (duplicates.length > 1) {
                throw apiError.BadRequest('DUPLICATE_TG', `Обнаружены дубликаты Telegram аккаунтов: ${newTg.username}`);
            }

            if (currentMap.has(key)) {
                const currentTg = currentMap.get(key);

                const usernameUnchanged = currentTg.username === newTg.username;
                const tgIdUnchanged = (currentTg.tg_id || null) === newTgIdValue;

                if (usernameUnchanged && tgIdUnchanged) {
                    // Полностью без изменений
                    result.unchanged.push({
                        id: currentTg.id,
                        username: newTg.username,
                        tg_id: newTgIdValue
                    });
                    currentMap.delete(key);
                } else if (usernameUnchanged && !tgIdUnchanged) {
                    // Username тот же, но tg_id изменился - обновляем только tg_id
                    const hasOtherConnections = await this.hasOtherConnections(
                        client,
                        currentTg.id,
                        personId
                    );

                    if (hasOtherConnections) {
                        // Есть другие связи - создаем новый аккаунт с тем же username но новым tg_id
                        const newTgRecordId = await createTgService.createTg(client, newTg.username, newTgIdValue);
                        await createTgService.createPersonTgConnector(client, newTgRecordId, personId);
                        // console.log(123, personId, currentTg.id)
                        await deleteTgService.deletePersonTgConnector(client, personId, currentTg.id);

                        result.created.push({
                            id: newTgRecordId,
                            username: newTg.username,
                            tg_id: newTgIdValue,
                            replaced_tg_id: currentTg.id
                        });
                    } else {
                        // Нет других связей - обновляем только tg_id
                        const updatedTgId = await this.updateTgIdOnly(
                            client,
                            currentTg.id,
                            newTgIdValue
                        );

                        result.updated.push({
                            id: updatedTgId,
                            username: newTg.username,
                            tg_id: newTgIdValue,
                            changed_field: 'tg_id'
                        });
                    }
                    currentMap.delete(key);
                } else if (!usernameUnchanged) {
                    // Username изменился - работаем с ним как с новым
                    const hasOtherConnections = await this.hasOtherConnections(
                        client,
                        currentTg.id,
                        personId
                    );

                    if (hasOtherConnections) {
                        // Есть другие связи - создаем новый аккаунт
                        const newTgRecordId = await createTgService.createTg(client, newTg.username, newTgIdValue);
                        await createTgService.createPersonTgConnector(client, newTgRecordId, personId);
                        // console.log(124, personId, currentTg.id)
                        await deleteTgService.deletePersonTgConnector(client, personId, currentTg.id);

                        result.created.push({
                            id: newTgRecordId,
                            username: newTg.username,
                            tg_id: newTgIdValue,
                            replaced_tg_id: currentTg.id
                        });
                    } else {
                        // Нет других связей - обновляем существующий
                        const updatedTgId = await this.updateTg(
                            client,
                            currentTg.id,
                            newTg.username,
                            newTgIdValue
                        );

                        result.updated.push({
                            id: updatedTgId,
                            username: newTg.username,
                            tg_id: newTgIdValue,
                            changed_field: 'username'
                        });
                    }
                    currentMap.delete(key);
                }
            } else {
                // Новый Telegram аккаунт - создаем
                const newTgRecordId = await createTgService.createTg(client, newTg.username, newTgIdValue);
                await createTgService.createPersonTgConnector(client, newTgRecordId, personId);

                result.created.push({
                    id: newTgRecordId,
                    username: newTg.username,
                    tg_id: newTgIdValue
                });
            }
        }

        for (const [key, tg] of currentMap) {
            // console.log(125, personId, tg.id)

            const hasOtherConnections = await this.hasOtherConnections(client, tg.id, personId);
            let tgDeleted = false;
            if (!hasOtherConnections) {
                // console.log(1010)
                // console.log(personId, tg.id)
                tgDeleted = await deleteTgService.deleteTgByTgId(client, personId, tg.id);
            } else {
                await deleteTgService.deletePersonTgConnector(client, personId, tg.id);
            }

            result.deleted.push({
                id: tg.id,
                username: tg.username,
                tg_id: tg.tg_id || null,
                tg_deleted: tgDeleted
            });
        }

        return {
            success: true,
            message: `Обновление Telegram аккаунтов завершено. Создано: ${result.created.length}, Обновлено: ${result.updated.length}, Удалено: ${result.deleted.length}, Без изменений: ${result.unchanged.length}`,
            personId: personId,
            ...result
        };
    }
}

module.exports = new updateTgService();