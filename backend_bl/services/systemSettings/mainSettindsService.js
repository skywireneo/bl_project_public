// const tokenService = require('./systemServices/tokenService');
// const queryService = require('./systemServices/queryService');
const apiError = require('../../exceptions/apiError');
const cacheService = require('../systemServices/cacheService');
const { validateString } = require('../systemServices/validate/addonService');
const appSettings = require('../utils/appSettings');
// const ValidateService = require('./systemServices/validate/validateService');
// const logService = require('./logService');

// const validateService = new ValidateService();

// Время жизни кеша настроек: 3 дня (в секундах)
const SETTINGS_CACHE_TTL = 3 * 24 * 60 * 60;

class mainSettindsService {
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

    /**
     * Сохраняет историю изменения настройки в БД
     * @param {object} client - клиент базы данных (или транзакция)
     * @param {number} settingId - ID настройки (setting_id)
     * @param {string} settingName - имя настройки
     * @param {number|string|null} userId - ID пользователя, внесшего изменение
     * @param {string[]|null} oldValue - старое значение (массив)
     * @param {string[]} newValue - новое значение (массив)
     */
    async _saveSettingHistory(client, settingId, settingName, userId, oldValue, newValue) {
        await client.query(
            `INSERT INTO public.settings_history (setting_id, setting_name, user_id, old_value, new_value, changed_at)
             VALUES ($1, $2, $3, $4, $5, (NOW() AT TIME ZONE 'UTC'))`,
            [settingId, settingName, userId, oldValue, newValue]
        );
    }

    /**
     * Получить все настройки, которые зависят от данной (рекурсивно по цепочке)
     * @param {string} settingName - имя настройки
     * @returns {Promise<string[]>} - массив имен зависимых настроек
     */
    async _getDependentSettingsChain(client, settingName) {
        const result = await client.query(
            'SELECT name FROM settings WHERE dependence_name = $1',
            [settingName]
        );

        const directDependents = result.rows.map(row => row.name);
        const allDependents = [...directDependents];

        // Рекурсивно получаем зависимые от зависимых
        for (const dependent of directDependents) {
            const nestedDependents = await this._getDependentSettingsChain(client, dependent);
            allDependents.push(...nestedDependents);
        }

        return allDependents;
    }

    /**
     * Получить цепочку зависимостей вверх (от чего зависит данная настройка)
     * @param {string} settingName - имя настройки
     * @returns {Promise<string[]>} - массив имен настроек, от которых зависит данная (снизу вверх)
     */
    async _getDependenceChain(client, settingName) {
        const result = await client.query(
            'SELECT dependence_name FROM settings WHERE name = $1',
            [settingName]
        );

        if (!result.rows.length || !result.rows[0].dependence_name) {
            return [];
        }

        const dependenceName = result.rows[0].dependence_name;
        const upperChain = await this._getDependenceChain(client, dependenceName);

        return [dependenceName, ...upperChain];
    }

    /**
     * Обновить active статус для зависимых настроек при изменении BOOL настройки
     * @param {string} settingName - имя измененной настройки
     * @param {string} newValue - новое значение ('true' или 'false')
     */
    async _updateDependentActive(client, settingName, newValue, current_user, setting_id) {
        if (newValue === 'false') {
            // Если ставим в false - все зависимые по цепочке ставим в active=false
            const allDependents = await this._getDependentSettingsChain(client, settingName);

            if (allDependents.length > 0) {
                await client.query(
                    'UPDATE settings SET active = false WHERE name = ANY($1::varchar[])',
                    [allDependents]
                );

                // this._createLogger('ST014', decoded, setting_id, {
                //     subsegment: 'INDIRECT_ACTIONS',
                //     type_of_action: 'EDIT'
                // }).action(`Деактивированы зависимые настройки: ${allDependents.join(', ')}`);
            }
        } else if (newValue === 'true') {
            // При активации - активируем все возможные настройки в цепочке зависимостей
            await this._activateDependentChain(client, settingName, current_user, setting_id);
        }
    }

    /**
     * Активирует цепочку зависимых настроек рекурсивно
     * @param {string} settingName - имя настройки, от которой активируем зависимых
     * @param {object} decoded - декодированный токен
     * @param {number} setting_id - ID настройки для логирования
     */
    async _activateDependentChain(client, settingName, current_user, setting_id) {
        // Получаем все зависимые настройки (независимо от их текущего active статуса)
        const dependents = await client.query(
            'SELECT name, value, type, active FROM settings WHERE dependence_name = $1',
            [settingName]
        );

        // Активируем все прямые зависимые, которые еще не активны
        const dependentsToActivate = dependents.rows
            .filter(dependent => dependent.active === false)
            .map(row => row.name);

        if (dependentsToActivate.length > 0) {
            await client.query(
                'UPDATE settings SET active = true WHERE name = ANY($1::varchar[])',
                [dependentsToActivate]
            );

            // this._createLogger('ST015', decoded, setting_id, {
            //     subsegment: 'INDIRECT_ACTIONS',
            //     type_of_action: 'EDIT'
            // }).action(`Активированы зависимые настройки: ${dependentsToActivate.join(', ')}`);
        }

        // Рекурсивно активируем зависимых от всех прямых зависимых, если их значение = 'true'
        for (const dependent of dependents.rows) {
            if (dependent.type === 'BOOL' && dependent.value[0] === 'true') {
                await this._activateDependentChain(client, dependent.name, current_user, setting_id);
            }
        }
    }

    async updateValue(client, name, value, current_user) {

        if (!validateString(name, ['E', 'e', 's'], [2, 120])) {
            // this._createLogger('ST005', decoded, null, { subsegment: 'INDIRECT_ACTIONS', type_of_action: 'EDIT' })
            //     .systemError(`Попытка обновить настройку с недопустимым именем: "${name}"`);
            throw apiError.BadRequest('VALIDATE_ERROR', 'Неправильный формат названия. Английские буквы от 2 до 120', 'ST005');
        }

        if (!Array.isArray(value)) {
            // this._createLogger('ST006', decoded, null, { subsegment: 'INDIRECT_ACTIONS', type_of_action: 'EDIT' })
            //     .systemError(`Попытка обновить настройку "${name}" с некорректным типом value`);
            throw apiError.BadRequest('VALIDATE_ERROR', 'Value должен быть массивом строк', 'ST006');
        }

        const settingRow = await client.query(
            'SELECT higher_security, type, setting_id FROM settings WHERE name = $1',
            [name]
        );

        if (!settingRow.rows.length) {
            // this._createLogger('ST007', decoded, null, { subsegment: 'INDIRECT_ACTIONS', type_of_action: 'EDIT' })
            //     .inaccessible(`Попытка обновить несуществующую настройку: "${name}"`);
            throw apiError.BadRequest('VALIDATE_ERROR', 'Не найден ключ', 'ST007');
        }

        const { higher_security, type, setting_id } = settingRow.rows[0];
        //             if (higher_security && !decoded.data.higher_security) {
        //                 this._createLogger('ST008', decoded, setting_id, { subsegment: 'INDIRECT_ACTIONS', type_of_action: 'EDIT' })
        //                     .inaccessible(`Попытка обновить защищённую настройку "${name}" без прав higher_security`);
        //                 throw apiError.BadRequest('ACCESS_ERROR', 'Нет доступа', 'ST008');
        //             }

        let transformedValue;
        switch (type) {
            case 'VARCHAR[]':
                transformedValue = value.map(val => {
                    if (!validateString(val, ['E', 'e', 'R', 'r', 'n', 's', 'p', '@'], [1, 300])) {
                        throw new Error(`Неверное значение: ${val}`);
                    }
                    return val;
                });
                break;
            case 'VARCHAR':
                if (!value[0] || !validateString(value[0], ['E', 'e', 'R', 'r', 'n', 's', 'p', '@'], [1, 300])) {
                    throw new Error('Неверное значение');
                }
                transformedValue = [value[0]];
                break;
            case 'INTEGER':
                const num = Number(value[0]);
                if (!Number.isInteger(num) || num < 0) {
                    throw new Error('Значение должно быть неотрицательным целым числом');
                }
                transformedValue = [num.toString()];
                break;
            case 'BOOL':
                const boolVal = value[0]?.toLowerCase();
                if (boolVal !== 'true' && boolVal !== 'false') {
                    throw new Error('Значение должно быть true или false');
                }
                transformedValue = [boolVal];
                break;
            default:
                // this._createLogger('ST009', decoded, setting_id, { subsegment: 'INDIRECT_ACTIONS', type_of_action: 'EDIT' })
                //     .systemError(`Попытка обновить настройку "${name}" с неизвестным типом: ${type}`);
                throw apiError.BadRequest('VALIDATE_ERROR', `Неизвестный тип настройки: ${type}`, 'ST009');
        }

        // 1. Получаем старое значение ДО обновления
        const oldData = await client.query('SELECT value FROM settings WHERE name = $1', [name]);
        const oldValue = oldData.rows.length > 0 ? oldData.rows[0].value : null;

        // 2. Обновляем настройку
        const updatedSetting = await client.query(
            'UPDATE settings SET value = $1 WHERE name = $2 RETURNING *',
            [transformedValue, name]
        );

        // 3. Сохраняем историю изменений
        // Убедитесь, что путь к ID пользователя верный (current_user.id или current_user.data.id)
        const userId = current_user?.id || current_user?.data?.id || null;
        await this._saveSettingHistory(client, setting_id, name, userId, oldValue, transformedValue);


        //             this._createLogger('ST001', decoded, setting_id, {
        //                 subsegment: 'DIRECT_ACTIONS',
        //                 type_of_action: 'EDIT'
        //             }).action(`Настройка "${name}" изменена с ${JSON.stringify(oldData.rows[0]?.value)} на ${JSON.stringify(transformedValue)}`);

        // Если это BOOL настройка и от нее зависят другие - обновляем их active статус
        if (type === 'BOOL') {
            await this._updateDependentActive(name, transformedValue[0], current_user, setting_id);
        }

        // 5. ИНВАЛИДАЦИЯ КЕША (как мы делали ранее)
        await cacheService.delete('settings', `one:${name}`);
        await cacheService.deletePattern('settings', 'all:*');

        // 6.  СИНХРОНИЗАЦИЯ IN-MEMORY СОСТОЯНИЯ 
        if (name === 'logging') {
            // transformedValue[0] будет 'true' или 'false' (строка)
            const isEnabled = transformedValue[0] === 'true';
            appSettings.setLoggingEnabled(isEnabled);
        }

        return updatedSetting.rows[0];
    }

    async selectSettings(client, current_user) {
        const hasHigherSecurity = current_user?.higher_security || false;
        // Формируем уникальный ключ кеша в зависимости от прав пользователя
        const cacheKey = `all:${hasHigherSecurity ? 'full' : 'restricted'}`;

        // getOrSet автоматически вернёт данные из Redis, а если их нет - выполнит callback и сохранит результат
        return await cacheService.getOrSet('settings', cacheKey, async () => {
            let addonStr = "";
            if (!hasHigherSecurity) {
                addonStr = " WHERE higher_security = false";
            }

            const settings = await client.query(`
                SELECT 
                    settings.name,
                    settings.value,
                    settings.type,
                    settings.name_text,
                    settings.descr,
                    settings.higher_security,
                    settings.group,
                    settings.dependence_name,
                    settings.active
                FROM settings 
                ${addonStr}
                ORDER BY setting_id
            `);

            // Собираем данные с зависимостями. 
            // При попадании в кеш этот тяжёлый блок с Promise.all и доп. запросами выполняться НЕ будет.
            const result = await Promise.all(settings.rows.map(async row => {
                const isCritical = row.higher_security == true;
                const dependentNames = await this._getDependentSettingsChain(client, row.name);
                const dependenceChain = await this._getDependenceChain(client, row.name);

                return {
                    name: row.name,
                    name_text: row.name_text,
                    descr: row.descr,
                    type: row.type,
                    group: row.group,
                    dependence_name: row.dependence_name,
                    dependence_chain: dependenceChain,
                    dependent_names: dependentNames,
                    active: row.active,
                    ...(isCritical && { crit: true }),
                    value: row.type === 'VARCHAR[]'
                        ? row.value
                        : (Array.isArray(row.value) ? row.value[0] : null)
                };
            }));

            return result;
        }, SETTINGS_CACHE_TTL);
    }

    async selectSetting(client, name, current_user = null) {
        const cacheKey = `one:${name}`;

        // Получаем сырые данные из БД через кеш
        const dbResult = await cacheService.getOrSet('settings', cacheKey, async () => {
            const result = await client.query(
                `SELECT value, type, active FROM settings WHERE name = $1`,
                [name]
            );
            return result.rows.length > 0 ? result.rows[0] : null;
        }, SETTINGS_CACHE_TTL);

        if (!dbResult) {
            throw apiError.BadRequest('NOT_FOUND', 'Настройка не найдена', 'ST011');
        }

        const { value, type, active } = dbResult;

        // Проверяем, что настройка активна (эта логика выполняется поверх данных из кеша)
        if (!active) {
            throw apiError.BadRequest('SETTING_INACTIVE', 'Настройка неактивна', 'ST012');
        }

        return type === 'VARCHAR[]'
            ? value
            : (Array.isArray(value) ? value[0] : null);
    }


    /**
     * Получить историю изменений конкретной настройки
     * @param {object} client - клиент базы данных
     * @param {string} settingName - имя настройки
     * @param {number} limit - количество записей (по умолчанию 50)
     * @param {number} offset - смещение для пагинации (по умолчанию 0)
     * @returns {Promise<Array>} - массив записей истории
     */
    async getSettingHistory(client, settingName, limit = 50, offset = 0) {
        if (!validateString(settingName, ['E', 'e', 's'], [2, 120])) {
            throw apiError.BadRequest('VALIDATE_ERROR', 'Неправильный формат названия настройки', 'ST013');
        }

        const result = await client.query(
            `SELECT 
                sh.id,
                sh.setting_id,
                sh.setting_name,
                sh.user_id,
                sh.old_value,
                sh.new_value,
                sh.changed_at,
                u.login
             FROM public.settings_history sh
             LEFT JOIN users u ON u.user_id = sh.user_id
             WHERE setting_name = $1 
             ORDER BY changed_at DESC 
             LIMIT $2 OFFSET $3`,
            [settingName, limit, offset]
        );

        // Благодаря тому, что мы используем character varying(300)[], 
        // библиотека pg автоматически вернет old_value и new_value как JavaScript-массивы.
        // Дополнительный парсинг не требуется.
        return result.rows;
    }

    /**
 * Очистка истории изменений настроек
 * Удаляет все записи, которые старше заданного интервала.
 * @param {object} client - клиент базы данных (или транзакция)
 * @param {string} [interval='1 year'] - PostgreSQL-интервал ('1 year', '6 months', '30 days' и т.д.)
 * @returns {Promise<number>} - количество удалённых записей
 */
    async cleanOldHistory(client, interval = '1 year') {
        // Валидация интервала от SQL-инъекций: разрешаем только безопасные форматы
        // Допустимые единицы: year(s), month(s), day(s), hour(s), minute(s)
        const validIntervalRegex = /^(\d+)\s+(year|years|month|months|day|days|hour|hours|minute|minutes)$/i;

        if (!validIntervalRegex.test(interval)) {
            throw apiError.BadRequest(
                'VALIDATE_ERROR',
                `Некорректный формат интервала: "${interval}". Пример: "1 year", "30 days".`,
                'ST016'
            );
        }

        // Используем тот же часовой пояс (UTC), что и при записи changed_at
        const result = await client.query(
            `DELETE FROM public.settings_history 
         WHERE changed_at < (NOW() AT TIME ZONE 'UTC') - INTERVAL '${interval}'`,
        );

        return result.rowCount || 0;
    }
}

module.exports = new mainSettindsService();