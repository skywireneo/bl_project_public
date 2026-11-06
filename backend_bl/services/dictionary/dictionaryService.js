const apiError = require("../../exceptions/apiError");

class dictionaryService {
    /**
     * Типы справочников, для которых обязательно поле onPvz в addonData
     */
    _TYPES_REQUIRE_ONPVZ = ['posts', 'reasons'];

    /**
     * Типы справочников, для которых обязательно поле description в addonData
     */
    _TYPES_REQUIRE_DESCRIPTION = ['reasons'];

    /**
     * Максимальная длина описания
     */
    _MAX_DESCRIPTION_LENGTH = 1000;

    _validateType(type) {
        const validTypes = ['posts', 'reasons', 'pvz_type'];
        if (!validTypes.includes(type)) {
            throw apiError.BadRequest('NOT_CORRECT', `Недопустимый тип справочника: ${type}. Допустимые значения: ${validTypes.join(', ')}`);
        }
    }

    _validateAndNormalizeAddonData(type, addonData, isCreate = false) {
        // Если addonData не передан
        if (!addonData || typeof addonData !== 'object') {
            if (isCreate) {
                if (this._TYPES_REQUIRE_ONPVZ.includes(type) || this._TYPES_REQUIRE_DESCRIPTION.includes(type)) {
                    throw apiError.BadRequest('NOT_CORRECT', `Для типа "${type}" необходимо передать addonData`);
                }
            }
            return null;
        }

        const normalized = { ...addonData };

        if (this._TYPES_REQUIRE_ONPVZ.includes(type)) {
            if (normalized.onPvz === undefined || normalized.onPvz === null) {
                if (isCreate) {
                    normalized.onPvz = false;
                }
            } else if (typeof normalized.onPvz !== 'boolean') {
                if (normalized.onPvz === 'true' || normalized.onPvz === 1) {
                    normalized.onPvz = true;
                } else if (normalized.onPvz === 'false' || normalized.onPvz === 0) {
                    normalized.onPvz = false;
                } else {
                    throw apiError.BadRequest('NOT_CORRECT',
                        `Поле onPvz для типа "${type}" должно быть булевым (true/false)`);
                }
            }
        }

        if (this._TYPES_REQUIRE_DESCRIPTION.includes(type)) {
            if (normalized.description === undefined || normalized.description === null) {
                if (isCreate) {
                    throw apiError.BadRequest('NOT_CORRECT',
                        `Поле "description" обязательно для типа "${type}"`);
                }
            } else {
                const trimmed = String(normalized.description).trim();
                if (isCreate && trimmed.length === 0) {
                    throw apiError.BadRequest('NOT_CORRECT',
                        `Описание причины не может быть пустым`);
                }
                if (trimmed.length > this._MAX_DESCRIPTION_LENGTH) {
                    throw apiError.BadRequest('NOT_CORRECT',
                        `Описание не может быть длиннее ${this._MAX_DESCRIPTION_LENGTH} символов (сейчас: ${trimmed.length})`);
                }
                normalized.description = trimmed;
            }
        }

        return normalized;
    }

    _releaseClient(client) {
        if (client && typeof client.release === 'function') {
            client.release();
        }
    }

    async checkElementExistByName(client, type, name) {
        this._validateType(type);
        const cleanName = name.trim();
        const query = `
                SELECT 1 
                FROM incidents_data_dictionary 
                WHERE type = $1 
                  AND name = $2 
                  AND (deleted IS NULL OR deleted = false)
                LIMIT 1
            `;
        const res = await client.query(query, [type, cleanName]);
        if (res.rowCount == 0) {
            throw apiError.BadRequest('NOT_EXIST', `Такого ${type} (${name}) не существует`);
        }
        return true;
    }

    async checkElementExistById(client, id) {
        const query = `
                SELECT 1 
                FROM incidents_data_dictionary 
                WHERE element_id = $1 
                  AND (deleted IS NULL OR deleted = false)
                LIMIT 1
            `;
        const res = await client.query(query, [id]);
        if (res.rowCount == 0) {
            throw apiError.BadRequest('NOT_EXIST', `Такого ${id} не существует`);
        }
        return true;
    }

    async getElementIdByName(client, type, name) {
        this._validateType(type);
        await this.checkElementExistByName(client, type, name);
        const cleanName = name.trim();
        const query = `
                SELECT element_id 
                FROM incidents_data_dictionary 
                WHERE type = $1 
                  AND name = $2 
                  AND (deleted IS NULL OR deleted = false)
                LIMIT 1
            `;
        const res = await client.query(query, [type, cleanName]);
        if (res.rowCount === 0) return null;
        return res.rows[0].element_id;
    }

    async getElementNameById(client, id) {
        await this.checkElementExistById(client, id);
        const query = `
                SELECT name 
                FROM incidents_data_dictionary 
                WHERE element_id = $1 
                  AND (deleted IS NULL OR deleted = false)
                LIMIT 1
            `;
        const res = await client.query(query, [id]);
        if (res.rowCount === 0) return null;
        return res.rows[0].name;
    }

    async createElement(client, type, name, ball, addonData, current_user) {
        this._validateType(type);
        try {
            await client.query('BEGIN');

            const userId = current_user.user_id || current_user.id;
            const cleanName = name.trim();

            const normalizedAddonData = this._validateAndNormalizeAddonData(type, addonData, true);

            const checkQuery = `
                SELECT element_id 
                FROM incidents_data_dictionary 
                WHERE type = $1 AND name = $2 AND (deleted IS NULL OR deleted = false)
                LIMIT 1
            `;
            const checkRes = await client.query(checkQuery, [type, cleanName]);
            if (checkRes.rowCount > 0) {
                throw apiError.BadRequest('NOT_CORRECT', `Элемент с именем "${cleanName}" уже существует в справочнике типа "${type}"`);
            }

            const insertQuery = `
                INSERT INTO incidents_data_dictionary (type, name, active, ball, addon_data, create_at, created_by, deleted)
                VALUES ($1, $2, $3, $4, $5, NOW(), $6, false)
                RETURNING *
            `;
            const res = await client.query(insertQuery, [
                type,
                cleanName,
                true,
                ball || 0,
                normalizedAddonData ? JSON.stringify(normalizedAddonData) : null,
                userId
            ]);

            await client.query('COMMIT');
            return res.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            this._releaseClient(client);
        }
    }

    async updateElement(client, element_id, type, name, ball, active, addonData, current_user) {
        this._validateType(type);
        try {
            await client.query('BEGIN');

            const checkRes = await client.query(
                'SELECT element_id, addon_data FROM incidents_data_dictionary WHERE element_id = $1 AND (deleted IS NULL OR deleted = false)',
                [element_id]
            );
            if (checkRes.rowCount === 0) {
                throw apiError.BadRequest('NOT_FOUND', 'Элемент не найден или уже удален');
            }

            const existingAddonData = checkRes.rows[0].addon_data || {};

            let normalizedAddonData;
            if (addonData !== undefined) {
                const mergedAddonData = { ...existingAddonData, ...addonData };
                normalizedAddonData = this._validateAndNormalizeAddonData(type, mergedAddonData, false);
            } else {
                normalizedAddonData = this._validateAndNormalizeAddonData(type, existingAddonData, false);
            }

            const query = `
                UPDATE incidents_data_dictionary
                SET type = $1, name = $2, ball = $3, active = $4, addon_data = $5
                WHERE element_id = $6
                RETURNING *
            `;
            const res = await client.query(query, [
                type,
                name,
                ball,
                active,
                normalizedAddonData ? JSON.stringify(normalizedAddonData) : null,
                element_id
            ]);

            await client.query('COMMIT');
            return res.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            this._releaseClient(client);
        }
    }

    async deleteElement(client, type, name, current_user) {
        try {
            await client.query('BEGIN');
            const userId = current_user.user_id || current_user.id;
            const query = `
                UPDATE incidents_data_dictionary
                SET deleted = true, deleted_at = NOW(), deleted_by = $1
                WHERE name = $2 AND (deleted IS NULL OR deleted = false)
                RETURNING name
            `;
            const res = await client.query(query, [userId, name]);
            if (res.rowCount === 0) {
                throw apiError.BadRequest('NOT_FOUND', 'Элемент не найден или уже удален');
            }
            await client.query('COMMIT');
            return { success: true, name };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            this._releaseClient(client);
        }
    }

    async getAdm(client, type, current_user) {
        this._validateType(type);
        try {
            const query = `
                SELECT 
                    d.element_id,
                    d.type,
                    d.name,
                    d.active,
                    d.ball,
                    d.addon_data AS "addonData",
                    d.create_at,
                    d.created_by,
                    u.login AS created_by_login,
                    d.deleted,
                    d.deleted_at,
                    d.deleted_by,
                    u2.login AS deleted_by_login
                FROM incidents_data_dictionary d
                LEFT JOIN users u ON d.created_by = u.user_id
                LEFT JOIN users u2 ON d.deleted_by = u2.user_id
                WHERE d.type = $1 AND (d.deleted IS NULL OR d.deleted = false)
                ORDER BY d.element_id DESC
            `;
            const res = await client.query(query, [type]);
            return res.rows;
        } catch (error) {
            throw error;
        } finally {
            this._releaseClient(client);
        }
    }

    async getNonSecure(client, type) {
        this._validateType(type);
        try {
            return await this.getNonSecureIndor(client, type);
        } catch (error) {
            throw error;
        } finally {
            this._releaseClient(client);
        }
    }

    async getNonSecureIndor(client, type) {
        this._validateType(type);
        const query = `
                SELECT 
                    element_id AS id,
                    name,
                    addon_data AS "addonData"
                FROM incidents_data_dictionary
                WHERE type = $1 
                  AND active = true 
                  AND (deleted IS NULL OR deleted = false)
                ORDER BY element_id DESC
            `;
        const res = await client.query(query, [type]);
        return res.rows;
    }

    async getElementFullById(client, id) {
        const query = `
        SELECT 
            element_id AS id,
            type,
            name,
            active,
            ball,
            addon_data AS "addonData"
        FROM incidents_data_dictionary 
        WHERE element_id = $1 
          AND (deleted IS NULL OR deleted = false)
        LIMIT 1
    `;
        const res = await client.query(query, [id]);
        if (res.rowCount === 0) return null;
        return this._normalizeAddonData(res.rows[0]);
    }

    async getElementsFullByIds(client, ids) {
        const map = new Map();
        if (!ids || ids.length === 0) return map;
        const uniqueIds = [...new Set(ids.filter(Boolean))];
        if (uniqueIds.length === 0) return map;

        const query = `
        SELECT 
            element_id AS id,
            type,
            name,
            active,
            ball,
            addon_data AS "addonData"
        FROM incidents_data_dictionary 
        WHERE element_id = ANY($1) 
          AND (deleted IS NULL OR deleted = false)
    `;
        const res = await client.query(query, [uniqueIds]);
        for (const row of res.rows) {
            map.set(String(row.id), this._normalizeAddonData(row));
        }
        return map;
    }

    _normalizeAddonData(row) {
        if (!row) return row;
        if (row.addonData && typeof row.addonData === 'string') {
            try {
                row.addonData = JSON.parse(row.addonData);
            } catch {
                row.addonData = {};
            }
        }
        return row;
    }
}

module.exports = new dictionaryService();