const crypto = require('crypto');
const { UpdateStatusSend, addWm, deleteWm } = require('../grpc/clients/secureGrpcClient');
const { getWhitelist, updateWhitelist } = require('../grpc/handlers/accessGateHandler');

const apiError = require("../exceptions/apiError");
const tokenService = require("./systemServices/tokenService");
const settingsService = require("./systemSettings/settingsService");
const { getIo } = require('./systemServices/socket/socketServer');
const systemNotifier = require('./systemServices/socket/notifiers/systemNotifier');
const cacheService = require('./systemServices/cacheService');
const mainSettindsService = require('./systemSettings/mainSettindsService');
const userSessionsService = require('./user/system/userSessionsService');
const userDevicesService = require('./user/subServices/userDevicesService');

const LOG_STATUS = {
    FAILED: 0,
    SUCCESS: 1
};

class criticalActionsService {

    async _doHardClose(client) {
        await UpdateStatusSend("technical_work", true);

        const io = getIo();
        if (io) {
            const reason = 'Сайт закрыт на технические работы. Пожалуйста, попробуйте позже.';

            io.to('authorized_global').emit('session:force_logout', {
                targetType: 'all', targetSessionId: null, reason, delay: 2000, jitter: 3000
            });
            io.to('global_guests').emit('session:force_logout', {
                targetType: 'all', targetSessionId: null, reason, delay: 2000, jitter: 3000
            });

            setTimeout(() => {
                systemNotifier.notifyGlobalReload(reason, 3000, 4000);
            }, 1500);
        }

        const result = await client.query(`
            UPDATE user_refresh_tokens 
            SET revoked = true, revoked_at = NOW() 
            WHERE revoked = false
        `);
        console.log(`[CRITICAL_ACTION] _doHardClose: Отозвано токенов в БД: ${result.rowCount}`);
    }

    async executeScheduledCloseSite(client, message) {
        try {
            console.log(`[CRITICAL_ACTION] Scheduled closeSite: Начало жёсткого закрытия по расписанию...`);

            await this._doHardClose(client);

            await client.query(`
                UPDATE critical_actions 
                SET "lastExecuted" = NOW(), 
                    "executedBy" = 0, 
                    "executionCount" = "executionCount" + 1,
                    value = 'true'
                WHERE id_name = 'closeSite'
            `);

            const actionRes = await client.query(`SELECT id FROM critical_actions WHERE id_name = 'closeSite'`);
            const actionId = actionRes.rows.length > 0 ? actionRes.rows[0].id : 0;

            await this.addLog(client, actionId, 0, LOG_STATUS.SUCCESS, `Система: Автоматическое закрытие сайта по расписанию. Причина: ${message}`);

            console.log(`[CRITICAL_ACTION] Scheduled closeSite: Успешно выполнено.`);
        } catch (error) {
            console.error(`[CRITICAL_ACTION] Scheduled closeSite error:`, error.message);
            throw new Error('Не удалось выполнить автоматическое закрытие сайта');
        }
    }

    async getCriticalActions(client, token) {
        const decoded = tokenService.validateToken(token);
        try {
            const result = await client.query(
                `SELECT id, id_name, title, description, category, severity, "confirmText", consequences, icon, "lastExecuted", users.login AS "executedByUser", "executionCount", value, active, need_extra_confirmation, need_value
                FROM critical_actions
                LEFT JOIN users ON users.user_id = critical_actions."executedBy"
                WHERE active = true ORDER BY severity DESC, id ASC`, []
            );
            return result.rows;
        } catch (error) {
            throw apiError.Internal(`Ошибка получения критических действий: ${error.message}`, 'CA002');
        }
    }

    async executeCriticalAction(client, id_name, value, token) {
        const decoded = tokenService.validateToken(token);
        try {
            const actionResult = await client.query('SELECT * FROM critical_actions WHERE id_name = $1 AND active = true', [id_name]);
            if (actionResult.rows.length === 0) {
                throw apiError.BadRequest('ACTION_NOT_FOUND', `Критическое действие "${id_name}" не найдено`, 'CA003');
            }

            const action = actionResult.rows[0];
            const userId = decoded.data.id;

            if (action.need_value && (value === undefined || value === null || value === '')) {
                throw apiError.BadRequest('VALUE_REQUIRED', `Для выполнения действия "${action.title}" требуется указать значение`, 'CA006');
            }

            await this._executeActionMethod(client, id_name, value, userId);

            const updateResult = await client.query(
                `UPDATE critical_actions SET "lastExecuted" = NOW(), "executedBy" = $1, "executionCount" = "executionCount" + 1, value = COALESCE($2, value) WHERE id_name = $3 RETURNING *`,
                [userId, value || null, id_name]
            );

            const userLogin = await this._getUserLogin(client, userId);
            const actionText = await this._formatActionText(client, action.id, userLogin, value);
            await this.addLog(client, action.id, userId, LOG_STATUS.SUCCESS, actionText);

            return { success: true, message: `Действие "${action.title}" выполнено`, data: updateResult.rows[0] };
        } catch (error) {
            const actionResult = await client.query('SELECT id FROM critical_actions WHERE id_name = $1', [id_name]);
            if (actionResult.rows.length > 0) {
                await this.addLog(client, actionResult.rows[0].id, decoded.data.id, LOG_STATUS.FAILED, error.message);
            }
            if (!(error instanceof apiError)) {
                throw apiError.Internal(`Ошибка выполнения критического действия: ${error.message}`, 'CA005');
            }
            throw error;
        }
    }

    async _executeActionMethod(client, id_name, value, userId) {
        switch (id_name) {
            case 'addWm':
                await addWm();
                break;
            case 'deleteWm':
                await deleteWm();
                break;

            case 'closeSite':
                try {
                    const isClosing = value === "true";
                    if (isClosing) {
                        console.log(`[CRITICAL_ACTION] closeSite: ЖЁСТКОЕ закрытие сайта вручную...`);
                        await this._doHardClose(client);
                    } else {
                        await UpdateStatusSend("technical_work", false);
                        console.log(`[CRITICAL_ACTION] closeSite: Сайт открыт для доступа.`);
                    }
                } catch (error) {
                    console.error(`[CRITICAL_ACTION] closeSite error:`, error.message);
                    throw new Error('Не удалось обновить статус сайта');
                }
                break;

            case 'setGeoMode':
                await UpdateStatusSend("geo_block_mode", value);
                break;

            case 'setTimeWindow':
                if (value === 'false' || value === 'off' || value === '') {
                    await UpdateStatusSend("time_window_enabled", "false");
                } else {
                    await UpdateStatusSend("time_window_config", value);
                }
                break;

            case 'setRateLimitGuest':
                await UpdateStatusSend("rate_limit_guest", value);
                break;

            case 'setBlockedCountries':
                await UpdateStatusSend("blocked_countries", value);
                break;

            case 'exitAll':
                try {
                    console.log(`[CRITICAL_ACTION] exitAll: Начало глобального выхода...`);
                    const io = getIo();
                    if (io) {
                        const payload = { targetType: 'all', targetSessionId: null, reason: 'Глобальный выход из всех сессий инициирован администратором', delay: 2000, jitter: 5000 };
                        io.to('authorized_global').emit('session:force_logout', payload);
                        io.to('global_guests').emit('session:force_logout', payload);
                    }
                    const result = await client.query(`UPDATE user_refresh_tokens SET revoked = true, revoked_at = NOW() WHERE revoked = false`);
                    console.log(`[CRITICAL_ACTION] exitAll: Успешно. Отозвано токенов: ${result.rowCount}`);
                } catch (error) {
                    console.error(`[CRITICAL_ACTION] exitAll error:`, error.message);
                    throw new Error('Не удалось выполнить глобальный выход из сессий');
                }
                break;

            case 'reloadAll':
                try {
                    console.log(`[CRITICAL_ACTION] reloadAll: Отправка команды на перезагрузку...`);
                    systemNotifier.notifyGlobalReload('Плановая перезагрузка страницы инициирована администратором', 2000, 5000);
                } catch (error) {
                    console.error(`[CRITICAL_ACTION] reloadAll error:`, error.message);
                    throw new Error('Не удалось отправить команду на перезагрузку');
                }
                break;

            case 'untrustAllDevices':
                try {
                    console.log(`[CRITICAL_ACTION] untrustAllDevices: Начало глобального снятия доверия со всех устройств...`);

                    const untrustResult = await userDevicesService.untrustAllDevicesGlobally(client);
                    console.log(`[CRITICAL_ACTION] untrustAllDevices: Устройств переведено в недоверенные: ${untrustResult.untrusted}`);

                    const revokeResult = await userSessionsService.logoutAllUsersFromAllSessions(client);
                    console.log(`[CRITICAL_ACTION] untrustAllDevices: Отозвано токенов: ${revokeResult}`);

                    const io = getIo();
                    if (io) {
                        const reason = 'В целях безопасности доверие ко всем устройствам было снято администратором. Потребуется повторная авторизация или подтверждение устройства.';

                        io.to('authorized_global').emit('session:force_logout', {
                            targetType: 'all', targetSessionId: null, reason, delay: 2000, jitter: 3000
                        });

                        setTimeout(() => {
                            systemNotifier.notifyGlobalReload(reason, 3000, 4000);
                        }, 1500);
                    }

                    console.log(`[CRITICAL_ACTION] untrustAllDevices: Успешно выполнено.`);
                } catch (error) {
                    console.error(`[CRITICAL_ACTION] untrustAllDevices error:`, error.message);
                    throw new Error('Не удалось выполнить глобальное снятие доверия с устройств');
                }
                break;

            case 'lockdownMode':
                try {
                    console.log(`[CRITICAL_ACTION] lockdownMode: Активация режима блокировки...`);

                    const result = await client.query(`
                        UPDATE user_refresh_tokens 
                        SET revoked = true, revoked_at = NOW() 
                        WHERE revoked = false
                    `);

                    const io = getIo();
                    if (io) {
                        const payload = {
                            targetType: 'all',
                            targetSessionId: null,
                            reason: 'Система переведена в режим блокировки. Все сессии завершены.',
                            delay: 2000,
                            jitter: 5000
                        };
                        io.to('authorized_global').emit('session:force_logout', payload);
                        io.to('global_guests').emit('session:force_logout', payload);
                    }

                    await mainSettindsService.updateValue(client, 'lockdown_mode', ['true'], { id: userId });

                    console.log(`[CRITICAL_ACTION] lockdownMode: Успешно. Отозвано токенов: ${result.rowCount}`);
                } catch (error) {
                    console.error(`[CRITICAL_ACTION] lockdownMode error:`, error.message);
                    throw new Error('Не удалось активировать режим блокировки');
                }
                break;

            default:
                console.log(`[CRITICAL_ACTION] Unknown action: ${id_name}, value: ${value}`);
        }
    }

    _generateUUID() { return crypto.randomUUID(); }

    async _getUserLogin(client, userId) {
        if (!userId || userId === 0) return 'система';
        try {
            const result = await client.query('SELECT login FROM users WHERE user_id = $1', [userId]);
            return result.rows.length > 0 ? result.rows[0].login : 'неизвестно';
        } catch (error) {
            return 'неизвестно';
        }
    }

    async _formatActionText(client, criticalActionId, userLogin, value) {
        try {
            const result = await client.query('SELECT "logText" FROM critical_actions WHERE id = $1', [criticalActionId]);
            let actionText = result.rows.length > 0 && result.rows[0].logText ? result.rows[0].logText : 'Выполнено действие';
            let logEntry = `${userLogin}: ${actionText}`;
            if (value !== undefined && value !== null && value !== '') {
                logEntry += ` | Новое значение: ${value}`;
            }
            return logEntry;
        } catch (error) {
            return `${userLogin}: Выполнено действие`;
        }
    }

    async addLog(client, criticalActionId, userId, status, customText = null) {
        const uuid = this._generateUUID();
        let actionText = customText;
        if (!customText) {
            const userLogin = await this._getUserLogin(client, userId);
            actionText = await this._formatActionText(client, criticalActionId, userLogin, null);
        }
        try {
            await client.query(
                `INSERT INTO critical_actions_history (uuid, critical_action_id, "user", datetime, status, action_text) VALUES ($1, $2, $3, NOW(), $4, $5)`,
                [uuid, criticalActionId, userId, status, actionText]
            );
        } catch (error) {
            console.error('Error adding critical action log:', error.message);
        }
    }

    async getLogs(client, page = 1, limit = 10, userId = null) {
        const offset = (page - 1) * limit;
        let whereClause = '';
        const params = [];
        if (userId !== null && userId !== undefined) {
            params.push(userId);
            whereClause = 'WHERE cah."user" = $1';
        }
        const countResult = await client.query(`SELECT COUNT(*) as total FROM critical_actions_history cah ${whereClause}`, params);
        const total = parseInt(countResult.rows[0].total);
        const logsParams = userId !== null && userId !== undefined ? [userId, limit, offset] : [limit, offset];
        const result = await client.query(
            `SELECT cah.uuid, cah.critical_action_id, cah."user", cah.datetime, cah.status, cah.action_text, ca.id_name, ca.title, CASE WHEN cah."user" = 0 THEN 'система' ELSE COALESCE(u.login, 'неизвестно') END as user_login
             FROM critical_actions_history cah
             LEFT JOIN critical_actions ca ON ca.id = cah.critical_action_id
             LEFT JOIN users u ON u.user_id = cah."user"
             ${whereClause}
             ORDER BY cah.datetime DESC
             LIMIT $${userId !== null && userId !== undefined ? 2 : 1} OFFSET $${userId !== null && userId !== undefined ? 3 : 2}`,
            logsParams
        );
        return { data: result.rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async addSystemLog(client, criticalActionId, status, actionText) {
        await this.addLog(client, criticalActionId, 0, status, actionText);
    }

    async addCustomLog(client, criticalActionId, userId, status, customText) {
        await this.addLog(client, criticalActionId, userId, status, customText);
    }

    async toggleCriticalActionLock(client, id_name, is_locked, token) {
        const decoded = tokenService.validateToken(token);
        try {
            const actionResult = await client.query('SELECT * FROM critical_actions WHERE id_name = $1', [id_name]);
            if (actionResult.rows.length === 0) {
                throw apiError.BadRequest('ACTION_NOT_FOUND', `Критическое действие "${id_name}" не найдено`, 'CA007');
            }
            const action = actionResult.rows[0];
            const userId = decoded.data.id;
            const userLogin = await this._getUserLogin(client, userId);
            const actionType = is_locked ? 'Заблокировал' : 'Разблокировал';
            const logText = `${userLogin}: ${actionType} доступ к действию "${action.title}"`;
            await this.addLog(client, action.id, userId, LOG_STATUS.SUCCESS, logText);
            return { success: true, message: `${is_locked ? 'Заблокировано' : 'Разблокировано'}: "${action.title}"` };
        } catch (error) {
            if (!(error instanceof apiError)) {
                throw apiError.Internal(`Ошибка переключения блокировки: ${error.message}`, 'CA009');
            }
            throw error;
        }
    }

    async deleteOldLogs(client) {
        let CRITICAL_ACTIONS_LOG_RETENTION_DAYS = await settingsService.selectSetting("delete_crit_act_logs");
        const result = await client.query(`DELETE FROM critical_actions_history WHERE datetime < NOW() - INTERVAL '${CRITICAL_ACTIONS_LOG_RETENTION_DAYS} days' RETURNING uuid`, []);
        await this.addLog(client, 0, 0, LOG_STATUS.SUCCESS, `Автоудалены логи старше ${CRITICAL_ACTIONS_LOG_RETENTION_DAYS} дней`);
        return { success: true, deletedCount: result.rowCount, message: `Удалено логов старше ${CRITICAL_ACTIONS_LOG_RETENTION_DAYS} дней: ${result.rowCount}` };
    }

    async getWhitelistItems(client, listType, token) {
        const decoded = tokenService.validateToken(token);
        const validTypes = ['logins', 'statuses', 'tokens', 'ip_blacklist', 'ip_whitelist', 'ua_blacklist', 'honeypot_paths', 'banned_tokens'];
        if (!validTypes.includes(listType)) {
            throw apiError.BadRequest('INVALID_LIST_TYPE', `Недопустимый тип списка. Допустимые: ${validTypes.join(', ')}`, 'CA010');
        }
        try {
            return await getWhitelist(listType);
        } catch (error) {
            throw apiError.Internal(`Ошибка получения whitelist: ${error.message}`, 'CA011');
        }
    }

    async updateWhitelistItems(client, listType, items, token) {
        const decoded = tokenService.validateToken(token);
        const validTypes = ['logins', 'statuses', 'tokens', 'ip_blacklist', 'ip_whitelist', 'ua_blacklist', 'honeypot_paths', 'banned_tokens'];
        if (!validTypes.includes(listType)) {
            throw apiError.BadRequest('INVALID_LIST_TYPE', `Недопустимый тип списка. Допустимые: ${validTypes.join(', ')}`, 'CA012');
        }
        if (listType === 'tokens') {
            for (const item of items) {
                if (item.length < 10 || item.length > 20) {
                    throw apiError.BadRequest('INVALID_TOKEN_LENGTH', `Токен "${item}" должен содержать от 10 до 20 символов`, 'CA013');
                }
            }
        }
        try {
            const cleanedItems = items.map(item => item.trim()).filter(item => item !== '');
            const result = await updateWhitelist(listType, cleanedItems);
            if (!result.success) throw new Error(result.message);
            return result;
        } catch (error) {
            throw apiError.Internal(`Ошибка обновления whitelist: ${error.message}`, 'CA013');
        }
    }

    async getCacheStats() {
        const knownTypes = [
            {
                id: 'settings',
                label: 'Настройки системы',
                hasPrefix: true,
                warning: 'Настройки будут загружаться напрямую из БД при следующем запросе. Может вызвать кратковременный рост нагрузки на базу данных.'
            },
            {
                id: 'stats',
                label: 'Статистика и дашборды',
                hasPrefix: true,
                warning: 'Сбросит кэшированную статистику. Может привести к частичной потере данных статистики.'
            },
            {
                id: 'incident_collections',
                label: 'Сборки коллекций инцидентов',
                hasPrefix: true,
                warning: 'Сбросит кэш списков и подборок инцидентов. Может замедлить загрузку главных страниц для пользователей.'
            },
            // {
            //     id: 'users',
            //     label: 'Данные пользователей',
            //     hasPrefix: true,
            //     warning: 'Сбросит кэшированные профили и права доступа. Пользователи могут заметить кратковременную задержку при авторизации.'
            // },
            {
                id: 'rl',
                label: 'Rate Limiting (Лимиты запросов)',
                hasPrefix: false,
                warning: ' ВНИМАНИЕ: Полностью сбросит все текущие счетчики запросов, временные блокировки IP и ограничения. Защитные механизмы начнут работу с нуля.'
            }
        ];

        const stats = await Promise.all(knownTypes.map(async (type) => {
            const scanPattern = `${type.id}:*`;

            const displayPattern = type.hasPrefix ? `v1:${type.id}:*` : `${type.id}:*`;

            const count = type.hasPrefix
                ? await cacheService.countKeysByPattern(scanPattern)
                : await cacheService.countKeysByPatternRaw(scanPattern);

            return {
                id: type.id,
                label: type.label,
                count: count,
                pattern: displayPattern,
                warning: type.warning
            };
        }));

        return stats;
    }

    async clearCache(type, triggerReload) {
        const knownTypes = ['settings', 'stats', 'users', 'rl'];
        if (!knownTypes.includes(type)) {
            throw apiError.BadRequest('INVALID_CACHE_TYPE', 'Недопустимый тип кеша', 'CA014');
        }

        const hasPrefix = type !== 'rl';
        let deletedCount = 0;

        if (hasPrefix) {
            deletedCount = await cacheService.deletePattern(type, '*');
        } else {
            deletedCount = await cacheService.deletePatternRaw(`${type}:*`);
        }

        console.log(`[CRITICAL_ACTION] clearCache: Очищено ключей для ${type}: ${deletedCount}`);

        if (triggerReload) {
            systemNotifier.notifyGlobalReload(`Кеш раздела "${type}" был очищен администратором`, 3000, 5000);
        }

        return { success: true, deletedCount, type };
    }
}

module.exports = new criticalActionsService();