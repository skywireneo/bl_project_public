const apiError = require("../../../exceptions/apiError");
const tokenService = require("../../systemServices/tokenService");
const { decrypt } = require('../../systemServices/cryptoService');
const userDevicesService = require('../subServices/userDevicesService');
const sessionNotifier = require("../../systemServices/socket/notifiers/sessionNotifier");

class userSessionsService {

    /**
     * Получить активные сессии пользователя
     */
    async getActiveSessions(client, userId, token, userStatus, userAgent = '', clientIp = null) {
        try {
            const decoded = tokenService.validateToken(token)

            const sessions = await client.query(`
                SELECT 
                    rt.token_id,
                    rt.created_at,
                    rt.expires_at,
                    rt.last_used,
                    rt.revoked,
                    rt.revoked_at,
                    d.device_name,
                    d.os,
                    d.browser,
                    d.model,
                    d.is_mobile,
                    d.ip_last,
                    d.ip_last_encrypted,
                    d.ip_last_iv,
                    d.ip_last_auth_tag
                FROM user_refresh_tokens rt
                INNER JOIN public.user_devices d ON rt.device_id = d.id
                WHERE rt.user_id = $1 
                AND rt.revoked = false 
                AND d.is_deleted = false
                AND rt.expires_at > NOW()
                ORDER BY rt.last_used DESC NULLS LAST, rt.created_at DESC
            `, [userId]);

            const isAdmin = ['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(userStatus);

            const processedSessions = sessions.rows.map(session => {
                let displayIp = session.ip_last || 'Неизвестно';

                if (isAdmin) {
                    if (session.ip_last_encrypted && session.ip_last_iv && session.ip_last_auth_tag) {
                        try {
                            displayIp = decrypt(
                                {
                                    encrypted: session.ip_last_encrypted,
                                    iv: session.ip_last_iv,
                                    authTag: session.ip_last_auth_tag
                                },
                                'IDENTITY_KEY'
                            );
                        } catch (err) {
                            console.error(`[ERROR] Не удалось расшифровать IP для сессии ${session.token_id}:`, err);
                            displayIp = 'Ошибка расшифровки';
                        }
                    }
                } else {
                    displayIp = userDevicesService.maskIpAddress(displayIp);
                }

                return {
                    token_id: session.token_id,
                    device_name: session.device_name,
                    os: session.os,
                    browser: session.browser,
                    model: session.model,
                    is_mobile: session.is_mobile,
                    ip_last: displayIp,
                    created_at: session.created_at,
                    expires_at: session.expires_at,
                    last_used: session.last_used,
                    // Проверяем, активна ли сессия (использовалась в последние 30 минут)
                    is_active: session.last_used ? (new Date() - new Date(session.last_used) < 30 * 60 * 1000) : false
                };
            });

            return processedSessions;

        } catch (error) {
            throw apiError.Internal('Ошибка получения активных сессий');
        }
    }

    /**
     * Отзыв токенов и отправка уведомлений
     * Выполняет отзыв токенов ПЕРЕД отправкой уведомлений для избежания проблемы конкурентности
     * @param {number} userId - ID пользователя
     * @param {string} type - тип: 'all', 'exclude', 'direct'
     * @param {number|null} excludeSessionId - ID сессии для исключения (при type='exclude') или конкретная сессия (при type='direct')
     * @returns {Promise<number>} - количество отозванных токенов
     */
    async revokeTokensAndNotify(client, userId, type = 'all', excludeSessionId = null) {
        let revokedTokenIds = [];

        if (type === 'all') {
            const result = await client.query(`
            UPDATE user_refresh_tokens SET revoked = TRUE, revoked_at = NOW()
            WHERE user_id = $1 AND revoked = FALSE AND expires_at > NOW() RETURNING token_id
        `, [userId]);
            revokedTokenIds = result.rows.map(r => r.token_id);

            if (revokedTokenIds.length > 0) {
                sessionNotifier.notifyLogout(userId, 'all', null, 'Все сессии завершены');
            }
        }
        else if (type === 'exclude' && excludeSessionId) {
            const result = await client.query(`
            UPDATE user_refresh_tokens SET revoked = TRUE, revoked_at = NOW()
            WHERE user_id = $1 AND token_id != $2 AND revoked = FALSE AND expires_at > NOW() RETURNING token_id
        `, [userId, excludeSessionId]);
            revokedTokenIds = result.rows.map(r => r.token_id);

            if (revokedTokenIds.length > 0) {
                // Говорим всем: "Кроме этой сессии, все вышли"
                sessionNotifier.notifyLogout(userId, 'exclude', excludeSessionId, 'Другие сессии завершены');
            }
        }
        else if (type === 'direct' && excludeSessionId) {
            const result = await client.query(`
            UPDATE user_refresh_tokens SET revoked = TRUE, revoked_at = NOW()
            WHERE token_id = $1 AND user_id = $2 AND revoked = FALSE RETURNING token_id
        `, [excludeSessionId, userId]);
            revokedTokenIds = result.rows.map(r => r.token_id);

            if (revokedTokenIds.length > 0) {
                // Говорим всем: "Вот эта конкретная сессия должна выйти"
                sessionNotifier.notifyLogout(userId, 'specific', excludeSessionId, 'Сессия завершена вручную');
            }
        }

        return revokedTokenIds.length;
    }

    /**
     * Отправка уведомления о необходимости обновить данные пользователя
     * Используется для случаев когда токены уже отозваны (например, при редактировании данных)
     */
    async sendUpdateDataUserFlag(client, userId, type = 'direct', sessionId = null) {
        // Получаем массив socketId для пользователя
        const socketIds = global.userSockets?.[userId] || [];

        // Получаем токены для уведомления (уже отозванные)
        let tokenIds = [];

        if (type === 'direct' && sessionId) {
            tokenIds = [sessionId];
        }
        else if (type === 'exclude' && sessionId) {
            // Для exclude получаем токены которые ещё НЕ отозваны (чтобы уведомить те, которые останутся)
            const result = await client.query(`
                SELECT token_id FROM user_refresh_tokens 
                WHERE user_id = $1 AND token_id != $2 AND revoked = FALSE AND expires_at > NOW()
            `, [userId, sessionId]);
            tokenIds = result.rows.map(r => r.token_id);
        }
        else if (type === 'all') {
            // Для 'all' получаем все токены
            const result = await client.query(`
                SELECT token_id FROM user_refresh_tokens 
                WHERE user_id = $1 AND revoked = FALSE AND expires_at > NOW()
            `, [userId]);
            tokenIds = result.rows.map(r => r.token_id);
        }

        // // Отправляем уведомления
        // if (socketIds.length > 0 && global.io) {
        //     tokenIds.forEach(tokenId => {
        //         socketIds.forEach(socketId => {
        //             global.io.to(socketId).emit('updateUserDataForSession' + tokenId, {
        //                 status: true
        //             });
        //         });
        //     });
        // }
    }

    /**
     * Выйти из определённой сессии
     */
    async logoutFromSession(client, userId, sessionId, token) {
        try {
            const decoded = tokenService.validateToken(token);

            // Проверяем, что сессия принадлежит пользователю
            const sessionCheck = await client.query(
                'SELECT user_id FROM user_refresh_tokens WHERE token_id = $1 AND revoked = false',
                [sessionId]
            );

            if (sessionCheck.rows.length === 0) {
                throw apiError.BadRequest('SESSION_NOT_FOUND', 'Сессия не найдена или уже завершена');
            }

            if (sessionCheck.rows[0].user_id !== userId && !['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(decoded.data.status)) {
                throw apiError.BadRequest('ACCESS_DENIED', 'Доступ запрещён');
            }

            const revokedCount = await this.revokeTokensAndNotify(client, userId, "direct", sessionId);

            return {
                success: true,
                message: 'Сессия успешно завершена',
                session_id: sessionId
            };

        } catch (error) {
            //     this._createLogger('US181', null, userId, { subsegment: 'DATABASE', type_of_action: 'UPDATE' })
            //         .inaccessible(`Ошибка завершения сессии: ${error.message}`);
            throw apiError.Internal('Ошибка завершения сессии ' + error);
        }
    }

    /**
     * Выйти из всех сессий
     */
    async logoutFromAllSessions(client, userId, token, user_id = null, system = false) {
        try {
            const decoded = system ? null : tokenService.validateToken(token);
            if (user_id)
                userId = user_id

            const revokedCount = await this.revokeTokensAndNotify(client, userId, "all");

            return {
                success: true,
                message: `Все сессии завершены (${revokedCount} токенов отозвано)`,
                revoked_sessions: revokedCount
            };

        } catch (error) {
            throw apiError.Internal('Ошибка завершения всех сессий ' + error);
        }
    }

    /**
     * Выйти из всех сессий кроме текущей
     */
    async logoutFromAllSessionsExceptCurrent(client, userId, currentSessionId, token, userAgent = '', clientIp = null) {
        try {
            const decoded = tokenService.validateToken(token);

            // Проверяем, что текущая сессия принадлежит пользователю
            const currentSessionCheck = await client.query(
                'SELECT token_id FROM user_refresh_tokens WHERE token_id = $1 AND user_id = $2 AND revoked = false',
                [currentSessionId, userId]
            );

            if (currentSessionCheck.rows.length === 0) {
                throw apiError.BadRequest('CURRENT_SESSION_NOT_FOUND', 'Текущая сессия не найдена');
            }

            const revokedCount = await this.revokeTokensAndNotify(client, userId, "exclude", currentSessionId);

            return {
                success: true,
                message: `Завершены все сессии кроме текущей (${revokedCount} токенов отозвано)`,
                revoked_sessions: revokedCount,
                current_session_preserved: true
            };

        } catch (error) {
            throw apiError.Internal('Ошибка завершения всех сессий кроме текущей ' + error);
        }
    }

    /**
     * Глобальное завершение всех сессий всех пользователей
     * Используется для экстренной ситуации (например, при обнаружении взлома)
     */
    async logoutAllUsersFromAllSessions(client) {
        try {
            // Используем systemNotifier для глобального события
            const systemNotifier = require('../../systemServices/socket/notifiers/systemNotifier');
            systemNotifier.notifyGlobalReload('Глобальный сброс сессий администратором');

            const result = await client.query(`
            UPDATE user_refresh_tokens SET revoked = true, revoked_at = NOW() WHERE revoked = false RETURNING user_id
        `);
            return result.rows.length;
        } catch (error) {
            throw apiError.Internal('Ошибка глобального завершения всех сессий ' + error);
        }
    }

    /**
     * Отзыв всех активных сессий для конкретного устройства пользователя.
     * Используется при новом входе, чтобы обеспечить правило "1 активная сессия на 1 устройство".
     * @param {object} client - клиент базы данных
     * @param {number} userId - ID пользователя
     * @param {number} deviceId - ID устройства
     * @returns {Promise<number>} - количество отозванных сессий
     */
    async revokeSessionsByDevice(client, userId, deviceId) {
        if (!deviceId) return 0;

        const result = await client.query(`
            UPDATE user_refresh_tokens 
            SET revoked = TRUE, revoked_at = NOW() AT TIME ZONE 'UTC'
            WHERE user_id = $1 
              AND device_id = $2 
              AND revoked = FALSE 
              AND expires_at > NOW()
            RETURNING token_id
        `, [userId, deviceId]);

        return result.rows.length;
    }

    /**
* Отзыв всех активных сессий для конкретного устройства пользователя С уведомлением через сокеты.
* @param {object} client - клиент базы данных
* @param {number} userId - ID пользователя
* @param {number} deviceId - ID устройства
* @param {number|null} currentSessionId - ID текущей сессии (чтобы не выкинуть того, кто удаляет)
* @returns {Promise<number>} - количество отозванных сессий
*/
    async revokeSessionsByDeviceAndNotify(client, userId, deviceId, currentSessionId = null) {
        if (!deviceId) return 0;

        const result = await client.query(`
            UPDATE user_refresh_tokens 
            SET revoked = TRUE, revoked_at = NOW() AT TIME ZONE 'UTC'
            WHERE user_id = $1 
              AND device_id = $2 
              AND revoked = FALSE 
              AND expires_at > NOW()
            RETURNING token_id
        `, [userId, deviceId]);

        const revokedCount = result.rows.length;

        if (revokedCount > 0) {
            // Уведомляем пользователя. 
            // Используем 'exclude', чтобы выкинуть все сессии, КРОМЕ той, с которой было произведено удаление.
            // Устройство, которое удалили, не имеет valid session, поэтому оно просто отвалится при следующем запросе,
            // а остальные устройства пользователя обновят список сессий.
            sessionNotifier.notifyLogout(userId, 'exclude', currentSessionId, 'Одно из ваших устройств было удалено');
        }

        return revokedCount;
    }
}

module.exports = new userSessionsService();