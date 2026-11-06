const apiError = require("../../../../exceptions/apiError");
const userEncriptionService = require("../../../systemServices/userEncriptionService");
const ValidateService = require("../../../systemServices/validate/validateService");
const translitService = require("../../../systemServices/translitService");
const commonNameService = require("./commonNameService");
const createNameService = require("./createNameService");
const deleteNameService = require("./deleteNameService");
const getNameService = require("./getNameService");
const incidentCheckAndGeneratedDataService = require("../../incidentCreate/incidentCheckAndGeneratedDataService");
const commonPersonService = require("../commonPersonService");

const validateService = new ValidateService();

class updateNameService {

    getNameKey(name) {
        return name.toLowerCase().trim();
    }

    async hasOtherConnections(client, nameId, excludePersonId) {
        const query = `
        SELECT COUNT(*) as count 
        FROM persone_name_connector 
        WHERE name_id = $1 AND person_id != $2
    `;
        const result = await client.query(query, [nameId, excludePersonId]);
        return parseInt(result.rows[0].count) > 0;
    }

    async updateName(client, nameId, name) {
        name = name.toLowerCase();

        const encryptedData = await userEncriptionService.getNameDataEncrypted(name);
        const phoneticTokens = await translitService.getPhoneticTokenHashes(name);

        const query = `
        UPDATE persone_names 
        SET name_hesh = $1, 
            name_encrypted = $2, 
            name_iv = $3, 
            name_auth_tag = $4,
            name_phonetic_tokens = $5
        WHERE name_id = $6
        RETURNING name_id
    `;
        const result = await client.query(query, [
            encryptedData.heshName,
            encryptedData.encryptedDataNameEncrypted,
            encryptedData.encryptedDataNameIv,
            encryptedData.encryptedDataNameAuthTag,
            phoneticTokens,
            nameId
        ]);

        if (result.rowCount === 0) {
            throw apiError.BadRequest('UPDATE_FAILED', `Не удалось обновить имя с ID ${nameId}`);
        }

        return result.rows[0].name_id;
    }

    async deleteNameById(client, nameId) {
        const query = `
        DELETE FROM persone_names 
        WHERE name_id = $1 
        RETURNING name_id
    `;
        const result = await client.query(query, [nameId]);
        return result.rowCount > 0;
    }

    async updateNamesForPerson(client, personId, newNameList) {
        if (!newNameList || !Array.isArray(newNameList)) {
            throw apiError.BadRequest('INVALID_NAME_LIST', 'Список имен должен быть массивом');
        }

        if (!await commonPersonService.checkPersonExist(client, personId, false)) {
            throw apiError.BadRequest('PERSON_NOT_EXIST', `Персона с ID ${personId} не существует`);
        }

        if (newNameList.length === 0) {
            return await deleteNameService.deleteNamesByPersonId(client, personId);
        }

        const currentNameList = await getNameService.getNamesByPersonId(client, personId, true);

        const currentMap = new Map();
        for (const name of currentNameList) {
            const key = this.getNameKey(name.name);
            currentMap.set(key, {
                ...name,
                key: key
            });
        }

        const result = {
            created: [],
            updated: [],
            deleted: [],
            unchanged: []
        };

        for (let newName of newNameList) {
            if (!newName || typeof newName !== 'string') {
                throw apiError.BadRequest('INVALID_NAME_DATA', `Отсутствуют обязательные поля для имени: ${JSON.stringify(newName)}`);
            }

            validateService.personeValidation.validateFIO(newName);
            newName = newName.toLowerCase();

            const key = this.getNameKey(newName);

            const duplicates = newNameList.filter(n =>
                this.getNameKey(n) === key
            );
            if (duplicates.length > 1) {
                throw apiError.BadRequest('DUPLICATE_NAME', `Обнаружены дубликаты имен: ${newName}`);
            }

            if (currentMap.has(key)) {
                const currentName = currentMap.get(key);

                if (currentName.name === newName) {
                    result.unchanged.push({
                        id: currentName.id,
                        name: newName
                    });
                    currentMap.delete(key);
                } else {
                    const hasOtherConnections = await this.hasOtherConnections(
                        client,
                        currentName.id,
                        personId
                    );

                    if (hasOtherConnections) {
                        const newNameId = await createNameService.createName(client, newName);
                        await createNameService.createPersonNameConnector(client, newNameId, personId);
                        await deleteNameService.deletePersonNameConnector(client, personId, currentName.id);

                        result.created.push({
                            id: newNameId,
                            name: newName,
                            replaced_name_id: currentName.id
                        });
                    } else {
                        const updatedNameId = await this.updateName(
                            client,
                            currentName.id,
                            newName
                        );

                        result.updated.push({
                            id: updatedNameId,
                            name: newName
                        });
                    }
                    currentMap.delete(key);
                }
            } else {
                const newNameId = await createNameService.createName(client, newName);
                await createNameService.createPersonNameConnector(client, newNameId, personId);

                result.created.push({
                    id: newNameId,
                    name: newName
                });
            }
        }

        for (const [key, name] of currentMap) {

            const hasOtherConnections = await this.hasOtherConnections(client, name.id, personId);

            let nameDeleted = false;
            if (!hasOtherConnections) {
                nameDeleted = await deleteNameService.deleteNameByNameId(client, personId, name.id);
            } else {
                await deleteNameService.deletePersonNameConnector(client, personId, name.id);
            }

            result.deleted.push({
                id: name.id,
                name: name.name,
                name_deleted: nameDeleted
            });
        }

        return {
            success: true,
            message: `Обновление имен завершено. Создано: ${result.created.length}, Обновлено: ${result.updated.length}, Удалено: ${result.deleted.length}, Без изменений: ${result.unchanged.length}`,
            personId: personId,
            ...result
        };
    }
}

module.exports = new updateNameService();