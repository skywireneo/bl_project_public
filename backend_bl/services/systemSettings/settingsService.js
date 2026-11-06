// const tokenService = require('./systemServices/tokenService');
// const apiError = require('../exceptions/apiError');
// const { validateString } = require('./systemServices/validate/validateStrsService');
// const queryService = require('./systemServices/queryService');
// const ValidateService = require('./systemServices/validate/validateService');
// const logService = require('./logService');

const mainSettindsService = require("./mainSettindsService");

// const validateService = new ValidateService();

class settingsService {
    //     _createLogger(log_meta_id, decoded = null, record_id = null, overrides = {}) {
    //         if (!log_meta_id || typeof log_meta_id !== 'string') {
    //             throw new Error('log_meta_id обязателен и должен быть строкой (например, "ST001")');
    //         }
    //         const baseContext = {
    //             log_meta_id: log_meta_id,
    //             segment: 'SETTINGS',
    //             type_of_action: 'EDIT',
    //             user_id: decoded?.data?.id ?? null,
    //             user_login: decoded?.data?.login ?? null,
    //             user_role: decoded?.data?.status ?? null,
    //             record_id: record_id,
    //             ...overrides
    //         };
    //         return logService.forContext(baseContext);
    //     }

    //     /**
    //      * Получить все настройки, которые зависят от данной (рекурсивно по цепочке)
    //      * @param {string} settingName - имя настройки
    //      * @returns {Promise<string[]>} - массив имен зависимых настроек
    //      */
    //     async _getDependentSettingsChain(settingName) {
    //         const result = await queryService.query(
    //             'SELECT name FROM settings WHERE dependence_name = $1',
    //             [settingName]
    //         );

    //         const directDependents = result.rows.map(row => row.name);
    //         const allDependents = [...directDependents];

    //         // Рекурсивно получаем зависимые от зависимых
    //         for (const dependent of directDependents) {
    //             const nestedDependents = await this._getDependentSettingsChain(dependent);
    //             allDependents.push(...nestedDependents);
    //         }

    //         return allDependents;
    //     }

    //     /**
    //      * Получить цепочку зависимостей вверх (от чего зависит данная настройка)
    //      * @param {string} settingName - имя настройки
    //      * @returns {Promise<string[]>} - массив имен настроек, от которых зависит данная (снизу вверх)
    //      */
    //     async _getDependenceChain(settingName) {
    //         const result = await queryService.query(
    //             'SELECT dependence_name FROM settings WHERE name = $1',
    //             [settingName]
    //         );

    //         if (!result.rows.length || !result.rows[0].dependence_name) {
    //             return [];
    //         }

    //         const dependenceName = result.rows[0].dependence_name;
    //         const upperChain = await this._getDependenceChain(dependenceName);

    //         return [dependenceName, ...upperChain];
    //     }

    //     /**
    //      * Обновить active статус для зависимых настроек при изменении BOOL настройки
    //      * @param {string} settingName - имя измененной настройки
    //      * @param {string} newValue - новое значение ('true' или 'false')
    //      */
    //     async _updateDependentActive(settingName, newValue, decoded, setting_id) {
    //         if (newValue === 'false') {
    //             // Если ставим в false - все зависимые по цепочке ставим в active=false
    //             const allDependents = await this._getDependentSettingsChain(settingName);

    //             if (allDependents.length > 0) {
    //                 await queryService.query(
    //                     'UPDATE settings SET active = false WHERE name = ANY($1::varchar[])',
    //                     [allDependents]
    //                 );

    //                 this._createLogger('ST014', decoded, setting_id, {
    //                     subsegment: 'INDIRECT_ACTIONS',
    //                     type_of_action: 'EDIT'
    //                 }).action(`Деактивированы зависимые настройки: ${allDependents.join(', ')}`);
    //             }
    //         } else if (newValue === 'true') {
    //             // При активации - активируем все возможные настройки в цепочке зависимостей
    //             await this._activateDependentChain(settingName, decoded, setting_id);
    //         }
    //     }

    //     /**
    //      * Активирует цепочку зависимых настроек рекурсивно
    //      * @param {string} settingName - имя настройки, от которой активируем зависимых
    //      * @param {object} decoded - декодированный токен
    //      * @param {number} setting_id - ID настройки для логирования
    //      */
    //     async _activateDependentChain(settingName, decoded, setting_id) {
    //         // Получаем все зависимые настройки (независимо от их текущего active статуса)
    //         const dependents = await queryService.query(
    //             'SELECT name, value, type, active FROM settings WHERE dependence_name = $1',
    //             [settingName]
    //         );

    //         // Активируем все прямые зависимые, которые еще не активны
    //         const dependentsToActivate = dependents.rows
    //             .filter(dependent => dependent.active === false)
    //             .map(row => row.name);

    //         if (dependentsToActivate.length > 0) {
    //             await queryService.query(
    //                 'UPDATE settings SET active = true WHERE name = ANY($1::varchar[])',
    //                 [dependentsToActivate]
    //             );

    //             this._createLogger('ST015', decoded, setting_id, {
    //                 subsegment: 'INDIRECT_ACTIONS',
    //                 type_of_action: 'EDIT'
    //             }).action(`Активированы зависимые настройки: ${dependentsToActivate.join(', ')}`);
    //         }

    //         // Рекурсивно активируем зависимых от всех прямых зависимых, если их значение = 'true'
    //         for (const dependent of dependents.rows) {
    //             if (dependent.type === 'BOOL' && dependent.value[0] === 'true') {
    //                 await this._activateDependentChain(dependent.name, decoded, setting_id);
    //             }
    //         }
    //     }

    async updateValue(client, name, value, current_user) {
        try {
            await client.query('BEGIN');
            const output = await mainSettindsService.updateValue(client, name, value, current_user)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async selectSettings(client, current_user) {
        try {
            await client.query('BEGIN');
            const output = await mainSettindsService.selectSettings(client, current_user)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async selectSetting(client, name, current_user = null) {
        try {
            await client.query('BEGIN');
            const output = await mainSettindsService.selectSetting(client, name, current_user)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async cleanOldHistory(client) {
        try {
            await client.query('BEGIN');
            const output = await mainSettindsService.cleanOldHistory(client)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getSettingHistory(client, settingName) {
        try {
            await client.query('BEGIN');
            const output = await mainSettindsService.getSettingHistory(client, settingName)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    //     async getStatuses() {
    //         const settings = await queryService.query('SELECT * FROM statuses ORDER BY status_id');
    //         return settings.rows;
    //     }

    //     async addChatReason(name, code_name, descr, statuses_to_get, statuses_to_request, token) {
    //         const decoded = tokenService.validateToken(token);
    //         try {
    //             validateService.chatReasonService.validateCodeName(code_name);
    //             validateService.chatReasonService.validateName(name);
    //             validateService.chatReasonService.validateDescr(descr);
    //             validateService.chatReasonService.validateStatusesToGet(statuses_to_get);
    //             validateService.chatReasonService.validateStatusesToGet(statuses_to_request);

    //             let name_db = await queryService.query('SELECT name FROM chat_reasons WHERE name = $1', [name]);
    //             if (name_db.rowCount > 0) {
    //                 throw apiError.BadRequest('SETTING_EXIST', `Настройка chat_reasons с name "${name}" уже существует`, 'ST0199');
    //             }

    //             let code_name_db = await queryService.query('SELECT code_name FROM chat_reasons WHERE code_name = $1', [code_name]);
    //             if (code_name_db.rowCount > 0) {
    //                 throw apiError.BadRequest('SETTING_EXIST', `Настройка chat_reasons с code_name "${code_name}" уже существует`, 'ST0198');
    //             }

    //             const item = await queryService.query(
    //                 'INSERT INTO chat_reasons (name, code_name, descr, statuses_to_get, statuses_to_request) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    //                 [name, code_name, descr, statuses_to_get, statuses_to_request]
    //             );

    //             this._createLogger('ST002', decoded, item.rows[0].chat_reasons_id, {
    //                 subsegment: 'DIRECT_ACTIONS',
    //                 type_of_action: 'CREATE'
    //             }).action(`Создана причина чата "${name}" (${code_name}): доступ для ${JSON.stringify(statuses_to_request)}, назначение ${JSON.stringify(statuses_to_get)}`);

    //             return item.rows[0];
    //         } catch (error) {
    //             if (!(error instanceof apiError)) {
    //                 this._createLogger('ST019', decoded, null, { subsegment: 'INDIRECT_ACTIONS', type_of_action: 'CREATE' })
    //                     .systemError(`Ошибка при создании причины чата "${name}": ${error.message || error}`);
    //             }
    //             throw apiError.Internal(`Ошибка при создании причины чата "${name}": ${error.message || error}`, 'ST019')
    //         }
    //     }

    //     async getChatReasons() {
    //         const settings = await queryService.query('SELECT * FROM chat_reasons ORDER BY chat_reasons_id');
    //         return settings.rows;
    //     }

    //     async getChatReason(code_name) {
    //         const settings = await queryService.query('SELECT * FROM chat_reasons WHERE code_name = $1', [code_name]);
    //         return settings.rows[0];
    //     }

    //     async getChatReasonsV2(token) {
    //         const decoded = tokenService.validateToken(token);
    //         const userStatus = decoded.data.status;
    //         const result = await queryService.query(`
    //             SELECT name, code_name, statuses_to_request 
    //             FROM chat_reasons 
    //             ORDER BY chat_reasons_id
    //         `);
    //         const filtered = result.rows.filter(row => {
    //             try {
    //                 const allowedStatuses = JSON.parse(row.statuses_to_request);
    //                 return Array.isArray(allowedStatuses) && allowedStatuses.includes(userStatus);
    //             } catch (e) {
    //                 return false;
    //             }
    //         });
    //         return filtered.map(({ name, code_name }) => ({ name, code_name }));
    //     }

    //     async updateChatReason(code_name, name, descr, statuses_to_get, statuses_to_request, token) {
    //         const decoded = tokenService.validateToken(token);
    //         try {
    //             validateService.chatReasonService.validateCodeName(code_name);
    //             validateService.chatReasonService.validateName(name);
    //             validateService.chatReasonService.validateDescr(descr);
    //             validateService.chatReasonService.validateStatusesToGet(statuses_to_get);
    //             validateService.chatReasonService.validateStatusesToGet(statuses_to_request);

    //             let code_name_db = await queryService.query('SELECT code_name FROM chat_reasons WHERE code_name = $1', [code_name]);
    //             if (code_name_db.rowCount === 0) {
    //                 this._createLogger('ST023', decoded, null, { subsegment: 'INDIRECT_ACTIONS', type_of_action: 'EDIT' })
    //                     .inaccessible(`Попытка обновления несуществующей причины чата: "${code_name}"`);
    //                 throw apiError.BadRequest('SETTING_EXIST', `Настройка chat_reasons с code_name "${code_name}" не найдена`, 'ST023');
    //             }

    //             let name_db = await queryService.query('SELECT name FROM chat_reasons WHERE name = $1 AND code_name != $2', [name, code_name]);
    //             if (name_db.rowCount > 0) {
    //                 this._createLogger('ST024', decoded, null, { subsegment: 'INDIRECT_ACTIONS', type_of_action: 'EDIT' })
    //                     .inaccessible(`Попытка обновления причины чата с конфликтующим именем: "${name}"`);
    //                 throw apiError.BadRequest('SETTING_EXIST', `Настройка chat_reasons с name "${name}" уже существует`, 'ST042');
    //             }

    //             const oldData = await queryService.query('SELECT * FROM chat_reasons WHERE code_name = $1', [code_name]);
    //             const item = await queryService.query(
    //                 'UPDATE chat_reasons SET name = $1, descr = $2, statuses_to_get = $4, statuses_to_request = $5 WHERE code_name = $3 RETURNING *',
    //                 [name, descr, code_name, statuses_to_get, statuses_to_request]
    //             );

    //             this._createLogger('ST003', decoded, item.rows[0].chat_reasons_id, {
    //                 subsegment: 'DIRECT_ACTIONS',
    //                 type_of_action: 'EDIT'
    //             }).action(`Причина чата "${code_name}" изменена: доступ для ${JSON.stringify(statuses_to_request)}, назначение ${JSON.stringify(statuses_to_get)}`);

    //             return item.rows[0];
    //         } catch (error) {
    //             if (!(error instanceof apiError)) {
    //                 this._createLogger('ST025', decoded, null, { subsegment: 'INDIRECT_ACTIONS', type_of_action: 'EDIT' })
    //                     .systemError(`Ошибка при обновлении причины чата "${code_name}": ${error.message || error}`);
    //             }
    //             throw apiError.Internal(`Ошибка при обновлении причины чата "${code_name}": ${error.message || error}`, 'ST025')
    //         }
    //     }

    //     async deleteSQLLogs() {
    //         try {
    //             const res = await queryService.query(
    //                 `
    //                   SELECT pg_stat_statements_reset();
    //                   `
    //             );
    //             this._createLogger('STD001', null, null, { subsegment: 'SYSTEM_ACTIONS', type_of_action: 'DELETE' })
    //                 .isSystem(`Выполнена очистка старых логов SQL`);
    //             return { success: true };
    //         } catch (err) {
    //             this._createLogger('STD002', null, null, { subsegment: 'SYSTEM_ACTIONS', type_of_action: 'DELETE' })
    //                 .systemError(`Ошибка при очистке старых логов SQL`);
    //             return { success: false, error: err.message };
    //         }
    //     }
}

module.exports = new settingsService();