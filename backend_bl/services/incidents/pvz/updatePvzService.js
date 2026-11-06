const apiError = require("../../../exceptions/apiError");
const dictionaryService = require("../../dictionary/dictionaryService");
const ValidateService = require("../../systemServices/validate/validateService");
const usersEmailService = require("../../users/usersEmailService");
const userTgService = require("../../users/userTgService");
const incidentCheckAndGeneratedDataService = require("../incidentCreate/incidentCheckAndGeneratedDataService");
const commonPvzService = require("./commonPvzService");
const createPvzService = require("./createPvzService");
const deletePvzService = require("./deletePvzService");
const getPvzService = require("./getPvzService");

const validateService = new ValidateService();

class updatePvzService {

    getPVZKey(type, address) {
        const normalized = commonPvzService.transferAddress(address);
        const lowerNormalized = normalized.map(p => (p || '').toLowerCase());
        return `${type.toLowerCase()}_${lowerNormalized.join('_')}`;
    }

    isAddressEqual(pvz, newAddress) {
        return (pvz.address_parts.city || '').toLowerCase() === (newAddress[0] || '').toLowerCase() &&
            (pvz.address_parts.street || '').toLowerCase() === (newAddress[1] || '').toLowerCase() &&
            (pvz.address_parts.home || '').toLowerCase() === (newAddress[2] || '').toLowerCase();
    }

    async hasOtherConnections(client, pvzId, excludeIncidentId) {
        const query = `
        SELECT COUNT(*) as count 
        FROM incident_pvz_connector 
        WHERE pvz_id = $1 AND incident_id != $2
    `;
        const result = await client.query(query, [pvzId, excludeIncidentId]);
        return parseInt(result.rows[0].count) > 0;
    }

    async updatePVZ(client, pvzId, type, address) {
        const normalized = commonPvzService.transferAddress(address);

        const lowerAddress = normalized.map(part => (part || '').toLowerCase());

        const pvzTypeId = await dictionaryService.getElementIdByName(client, 'pvz_type', type);

        const query = `
        UPDATE incident_pvz 
        SET type_id = $1, 
            addr_city = $2, 
            addr_street = $3, 
            addr_home = $4
        WHERE pvz_id = $5
        RETURNING pvz_id
    `;
        const result = await client.query(query, [pvzTypeId, lowerAddress[0], lowerAddress[1], lowerAddress[2], pvzId]);

        if (result.rowCount === 0) {
            throw apiError.BadRequest('UPDATE_FAILED', `Не удалось обновить ПВЗ с ID ${pvzId}`);
        }

        return result.rows[0].pvz_id;
    }

    async deletePVZById(client, pvzId) {
        const query = `
        DELETE FROM incident_pvz 
        WHERE pvz_id = $1 
        RETURNING pvz_id
    `;
        const result = await client.query(query, [pvzId]);
        return result.rowCount > 0;
    }

    async updatePVZForIncident(client, incidentId, newPvzList) {
        validateService.incidentValidation.validateIncidentId(incidentId);

        if (!newPvzList || !Array.isArray(newPvzList)) {
            throw apiError.BadRequest('INVALID_PVZ_LIST', 'Список ПВЗ должен быть массивом');
        }

        if (!await incidentCheckAndGeneratedDataService.checkIncidentExist(client, incidentId, false)) {
            throw apiError.BadRequest('INCIDENT_NOT_EXIST', `Инцидент с ID ${incidentId} не существует`);
        }

        if (newPvzList.length === 0) {
            return await deletePvzService.deletePVZByIncidentId(client, incidentId);
        }

        const currentPvzList = await getPvzService.getPVZByIncidentId(client, incidentId, false);

        const currentMap = new Map();
        for (const pvz of currentPvzList) {
            const key = this.getPVZKey(pvz.type, pvz.address);
            currentMap.set(key, {
                ...pvz,
                key: key
            });
        }

        const result = {
            created: [],
            updated: [],
            deleted: [],
            unchanged: []
        };

        for (const newPvz of newPvzList) {
            if (!newPvz.type || !newPvz.address) {
                throw apiError.BadRequest('INVALID_PVZ_DATA', `Отсутствуют обязательные поля для ПВЗ: ${JSON.stringify(newPvz)}`);
            }

            const normalizedAddress = commonPvzService.transferAddress(newPvz.address);
            const key = this.getPVZKey(newPvz.type, newPvz.address);

            const duplicates = newPvzList.filter(p =>
                this.getPVZKey(p.type, p.address) === key
            );
            if (duplicates.length > 1) {
                throw apiError.BadRequest('DUPLICATE_PVZ', `Обнаружены дубликаты ПВЗ: ${newPvz.address}`);
            }

            if (currentMap.has(key)) {
                const currentPvz = currentMap.get(key);

                if (this.isAddressEqual(currentPvz, normalizedAddress)) {
                    result.unchanged.push({
                        id: currentPvz.id,
                        type: newPvz.type,
                        address: newPvz.address
                    });
                    currentMap.delete(key);
                } else {
                    const hasOtherConnections = await this.hasOtherConnections(
                        client,
                        currentPvz.id,
                        incidentId
                    );

                    if (hasOtherConnections) {
                        const newPvzId = await createPvzService.createPVZ(client, newPvz.type, newPvz.address);
                        await createPvzService.createIncidentPVZConnector(client, newPvzId, incidentId);
                        await deletePvzService.deleteIncidentPVZConnector(client, incidentId, currentPvz.id);

                        result.created.push({
                            id: newPvzId,
                            type: newPvz.type,
                            address: newPvz.address,
                            replaced_pvz_id: currentPvz.id
                        });
                    } else {
                        const updatedPvzId = await this.updatePVZ(
                            client,
                            currentPvz.id,
                            newPvz.type,
                            newPvz.address
                        );

                        result.updated.push({
                            id: updatedPvzId,
                            type: newPvz.type,
                            address: newPvz.address
                        });
                    }
                    currentMap.delete(key);
                }
            } else {
                const newPvzId = await createPvzService.createPVZ(client, newPvz.type, newPvz.address);
                await createPvzService.createIncidentPVZConnector(client, newPvzId, incidentId);

                result.created.push({
                    id: newPvzId,
                    type: newPvz.type,
                    address: newPvz.address
                });
            }
        }

        for (const [key, pvz] of currentMap) {
            const hasOtherConnections = await this.hasOtherConnections(client, pvz.id, incidentId);

            let pvzDeleted = false;
            if (!hasOtherConnections) {
                pvzDeleted = await deletePvzService.deletePVZByPvzId(client, incidentId, pvz.id);
            } else {
                await deletePvzService.deleteIncidentPVZConnector(client, incidentId, pvz.id);
            }

            result.deleted.push({
                id: pvz.id,
                type: pvz.type,
                address: pvz.address,
                pvz_deleted: pvzDeleted
            });
        }

        return {
            success: true,
            message: `Обновление ПВЗ завершено. Создано: ${result.created.length}, Обновлено: ${result.updated.length}, Удалено: ${result.deleted.length}, Без изменений: ${result.unchanged.length}`,
            incidentId: incidentId,
            ...result
        };
    }

    async updateActiveInConnector(client, incidentId, active) {
        if (!incidentId) {
            throw apiError.BadRequest('NAME_NO_DATA', `Недостаточно данных для изменения active`)
        }
        const connectorResult = await client.query(
            `UPDATE incident_pvz_connector SET active = $1 WHERE incident_id = $2`,
            [active, incidentId]
        );
    }

    async verifyPvz(client, pvzId, isVerified) {
        if (!pvzId) {
            throw apiError.BadRequest('PVZ_ID_REQUIRED', 'ID ПВЗ обязателен');
        }

        const query = `
            UPDATE incident_pvz
            SET is_verified = $1
            WHERE pvz_id = $2
            RETURNING pvz_id, is_verified
        `;

        const result = await client.query(query, [isVerified, pvzId]);
        if (result.rowCount === 0) {
            throw apiError.BadRequest('PVZ_NOT_FOUND', `ПВЗ с ID ${pvzId} не найден`);
        }

        return result.rows[0];
    }
}

module.exports = new updatePvzService();