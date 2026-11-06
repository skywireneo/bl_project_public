const userS = require('../services/user/userService')
const pgdb = require('../pgdb')
const apiError = require('../exceptions/apiError')
const { decryptFrontCBC } = require('../services/systemServices/cryptoService')
const { getClientIp } = require('../services/utils/ip')
const tokenService = require('../services/systemServices/tokenService')

class UserController {


    async createUser(req, res, next) {
        try {
            const { login, pass } = req.body
            const token = req.headers.authorization.split(' ')[1]
            const client = await pgdb.connect();
            const newPerson = await userS.createUserAdm(client, login, pass, token)
            res.json(newPerson)
        } catch (e) {
            next(e);
        }
    }



    async loginUser(req, res, next) {
        try {
            const { login, pass, passD, deviceInfo } = req.body;
            const userAgent = req.headers['user-agent'] || '';

            // Расшифровка AES-CBC
            const decryptedPass = passD ? passD : decryptFrontCBC(pass, "FRONT_KEY_1");
            const decryptedDeviceInfo = deviceInfo ? decryptFrontCBC(deviceInfo, "FRONT_KEY_1") : null;

            const clientIp = getClientIp(req);

            const client = await pgdb.connect();
            const loginResult = await userS.loginUser(client, login, passD ? passD : decryptedPass.pass, userAgent, clientIp, decryptedDeviceInfo);

            res.json(loginResult);
        } catch (e) {
            console.error("[ERROR] loginUser failed:", e);
            next(e);
        }
    }


    async changeUserStatus(req, res, next) {
        try {
            const { login, newStatusCodeName } = req.body;
            const token = req?.headers?.authorization?.split(' ')[1]
            const decoded = token ? tokenService.validateToken(token) : null
            const current_user = decoded ? decoded?.data : null;
            const current_user_status = decoded ? current_user?.status : null;
            const client = await pgdb.connect();
            const out = await userS.changeUserStatus(client, login, newStatusCodeName, current_user, current_user_status);

            res.json(out);
        } catch (e) {
            next(e);
        }
    }

    async cleanupOldRoleHistory(req, res, next) {
        try {
            const client = await pgdb.connect();
            const out = await userS.cleanupOldRoleHistory(client);

            res.json(out);
        } catch (e) {
            next(e);
        }
    }

    async deleteOldLoginLogs(req, res, next) {
        try {
            const client = await pgdb.connect();
            const out = await userS.deleteOldLoginLogs(client);
            res.json(out);
        } catch (e) {
            next(e);
        }
    }

    async deleteOldDevices(req, res, next) {
        try {
            const client = await pgdb.connect();
            const out = await userS.deleteOldDevices(client);
            res.json(out);
        } catch (e) {
            next(e);
        }
    }

    // ... существующие методы ...

    async getSystemStats(req, res, next) {
        try {
            const client = await pgdb.connect();
            const stats = await userS.getSystemStats(client);
            res.json(stats);
        } catch (e) {
            console.error("[ERROR] getSystemStats failed:", e);
            next(e);
        }
    }



    async getUser(req, res, next) {
        try {
            let data = []
            const { login } = req.query;
            const token = req?.headers?.authorization?.split(' ')[1]
            const decoded = token ? tokenService.validateToken(token) : null
            const current_user = decoded ? decoded?.data : null;
            const current_user_status = decoded ? current_user?.status : null;
            const client = await pgdb.connect();
            data[0] = await userS.getUser(client, login, current_user, current_user_status)
            res.json(data)
        } catch (e) {
            next(e);
        }
    }

    async getRoleHistory(req, res, next) {
        try {
            let data = []
            const { targetUserId, actorUserId, page, limit } = req.query;
            // const token = req?.headers?.authorization?.split(' ')[1]
            // const decoded = token ? tokenService.validateToken(token) : null
            // const current_user = decoded ? decoded?.data : null;
            // const current_user_status = decoded ? current_user?.status : null;
            const client = await pgdb.connect();
            data = await userS.getRoleHistory(client, targetUserId, actorUserId, page, limit)
            res.json(data)
        } catch (e) {
            next(e);
        }
    }

    async getLoginHistory(req, res, next) {
        try {
            let data = []
            const { user_id, limit, page } = req.query;
            const token = req?.headers?.authorization?.split(' ')[1]
            const decoded = token ? tokenService.validateToken(token) : null
            const current_user = decoded ? decoded?.data : null;
            const current_user_status = decoded ? current_user?.status : null;
            let userIdProcess = current_user?.id
            if (user_id && ['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(current_user_status))
                userIdProcess = user_id
            const client = await pgdb.connect();
            data = await userS.getLoginHistory(client, userIdProcess, current_user_status, limit, page)
            res.json(data)
        } catch (e) {
            next(e);
        }
    }


    async getUserDevices(req, res, next) {
        try {
            const { user_id } = req.query;
            const token = req?.headers?.authorization?.split(' ')[1];
            const decoded = token ? tokenService.validateToken(token) : null;
            const current_user = decoded ? decoded?.data : null;
            const current_user_status = decoded ? current_user?.status : null;

            let targetUserId = current_user?.id;
            if (user_id && ['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(current_user_status)) {
                targetUserId = user_id;
            }

            const client = await pgdb.connect();
            const devices = await userS.getUserDevices(client, targetUserId, current_user_status);
            res.json(devices);
        } catch (e) {
            next(e);
        }
    }


    async deleteDevice(req, res, next) {
        try {
            const { device_id, currentSessionId } = req.body;
            const token = req?.headers?.authorization?.split(' ')[1];
            const decoded = token ? tokenService.validateToken(token) : null;
            const current_user = decoded ? decoded?.data : null;
            const current_user_status = decoded ? current_user?.status : null;

            const client = await pgdb.connect();
            await userS.deleteDevice(client, current_user.id, device_id, current_user_status, currentSessionId);
            res.json({ success: true, message: 'Устройство удалено' });
        } catch (e) {
            next(e);
        }
    }

    async selectUsers(req, res, next) {
        try {
            let data = []
            const token = req.headers.authorization.split(' ')[1]
            const client = await pgdb.connect();
            data[0] = await userS.selectUsers(client, req.query.limit, req.query.page, req.query.filter, token)
            const client2 = await pgdb.connect();
            data[1] = await userS.countAllUsers(client2, req.query.filter, token)
            res.json(data)
        } catch (e) {
            next(e);
        }
    }



    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({ type: 'BAD_REQUEST', message: 'Refresh токен обязателен' });
            }
            const client = await pgdb.connect();
            const tokenData = await userS.refreshTokens(client, refreshToken);

            if (!tokenData) {
                return res.status(401).json({ type: 'UNAUTHORIZED', message: 'Невалидный refresh токен 0' });
            }

            return res.json(tokenData);
        } catch (err) {
            console.error('[REFRESH] Ошибка:', err);
            return res.status(500).json({ type: 'SERVER_ERROR', message: 'Ошибка при обновлении токена' });
        }
    }

    async check(req, res, next) {
        try {
            const { data } = req.user;

            if (!data) {
                return res.status(401).json({ type: 'UNAUTHORIZED', message: 'Нет данных пользователя' });
            }

            const userAgent = req.headers['user-agent'] || '';
            const clientIp = getClientIp(req);
            const refreshTokenOld = req.query.refreshTokenOld

            const client = await pgdb.connect();
            const token = await userS.checkToken(client, refreshTokenOld, data, userAgent, clientIp);

            if (!token) {
                return res.status(404).json({ type: 'NOT_FOUND', message: 'Пользователь не найден' });
            }

            return res.json(token);
        } catch (err) {
            console.error('[CHECK] Ошибка:', err);
            return res.status(500).json({ type: 'SERVER_ERROR', message: 'Ошибка сервера' });
        }
    }

    async getPasswordHistory(req, res, next) {
        try {
            const { targetUserId } = req.query;
            if (!targetUserId) {
                return res.status(400).json({ message: 'Не указан targetUserId' });
            }
            const client = await pgdb.connect();
            const history = await userS.getPasswordHistory(client, targetUserId);
            res.json(history);
        } catch (e) {
            next(e);
        }
    }

    async getPasswordChangeInfo(req, res, next) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const userId = decoded.data.id;
            const userStatus = decoded.data.status;

            const client = await pgdb.connect();
            const info = await userS.getPasswordChangeInfo(client, userId, userStatus);
            res.json(info);
        } catch (e) {
            next(e);
        }
    }

    async changePassword(req, res, next) {
        try {
            const { targetUserId, oldPassword, newPassword, autoGenerate, reason } = req.body;
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const actorId = decoded.data.id;
            const actorLogin = decoded.data.login;
            const userStatus = decoded.data.status;

            const userId = targetUserId || actorId;

            const client = await pgdb.connect();
            const result = await userS.changePassword(
                client,
                actorId,
                actorLogin,
                userId,
                oldPassword,
                newPassword,
                autoGenerate || false,
                reason,
                userStatus
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async regenerateSecondaryPassword(req, res, next) {
        try {
            const { targetUserId } = req.body;
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const actorId = decoded.data.id;
            const actorLogin = decoded.data.login;
            const userStatus = decoded.data.status;

            // Только DEVELOPER может генерировать доп. пароли
            if (!['DEVELOPER', 'TOP_LEVEL_DEVELOPER'].includes(userStatus)) {
                throw apiError.Forbidden('Только разработчик может генерировать доп. пароли');
            }

            const userId = targetUserId || actorId;

            const client = await pgdb.connect();
            const result = await userS.regenerateSecondaryPassword(client, actorId, actorLogin, userId);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async verifySecondaryPassword(req, res, next) {
        try {
            const { tempSessionToken, secondaryPassword, totpOrBackupCode, deviceInfo } = req.body;
            if (!tempSessionToken) {
                throw apiError.BadRequest('MISSING_DATA', 'Отсутствует tempSessionToken');
            }
            // Должен быть либо secondaryPassword (админский код), либо totpOrBackupCode
            if (!secondaryPassword && !totpOrBackupCode) {
                throw apiError.BadRequest('MISSING_DATA', 'Не указан код подтверждения');
            }

            const userAgent = req.headers['user-agent'] || '';
            const clientIp = getClientIp(req);
            const decryptedDeviceInfo = deviceInfo ? decryptFrontCBC(deviceInfo, "FRONT_KEY_1") : null;

            const client = await pgdb.connect();
            const result = await userS.verifySecondaryPassword(
                client,
                tempSessionToken,
                secondaryPassword || null,
                totpOrBackupCode || null,
                decryptedDeviceInfo,
                userAgent,
                clientIp
            );
            res.json(result);
        } catch (e) { next(e); }
    }

    async cleanupOldPasswordHistory(req, res, next) {
        try {
            const client = await pgdb.connect();
            const count = await userS.cleanupOldPasswordHistory(client);
            res.json({ deleted_count: count });
        } catch (e) {
            next(e);
        }
    }

    async deleteOldRevokedTokens(req, res, next) {
        try {
            const client = await pgdb.connect();
            const count = await userS.deleteOldRevokedTokens(client);
            res.json({ deleted_count: count });
        } catch (e) {
            next(e);
        }
    }

    // Получить активные сессии пользователя
    async getActiveSessions(req, res, next) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const user_id = req.query.user_id;
            const clientIp = getClientIp(req);
            const userAgent = req.headers['user-agent'] || '';

            if (user_id && !['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(decoded.data.status)) {
                // this._createLogger('US170', decoded, user_id)
                //     .inaccessible(`Попытка доступа к чужим активным сессиям`);
                throw apiError.BadRequest('US170', 'Попытка доступа к чужим активным сессиям');
            }

            const targetUserId = user_id ? user_id : decoded.data.id;
            const client = await pgdb.connect();
            // Передаем decoded.data.status для корректной маскировки/расшифровки IP в сервисе
            const sessions = await userS.getActiveSessions(client, targetUserId, token, decoded.data.status, userAgent, clientIp);
            res.json(sessions);
        } catch (e) {
            next(e);
        }
    }

    // Выйти из определённой сессии
    async logoutFromSession(req, res, next) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            let { session_id, user_id, current_session_id, type } = req.body;
            const clientIp = getClientIp(req);
            const userAgent = req.headers['user-agent'] || '';
            const client = await pgdb.connect();
            let result = null
            if (!user_id)
                user_id = decoded.data.id
            switch (type) {
                case 'all':
                    result = await userS.logoutFromAllSessions(client, decoded.data.id, token, user_id);
                    break;
                case 'current':
                    if (!session_id) {
                        throw apiError.BadRequest('SESSION_ID_REQUIRED', 'ID сессии обязателен');
                    }
                    result = await userS.logoutFromSession(client, user_id, session_id, token);
                    break;
                case 'allExeptCurrent':
                    if (!current_session_id) {
                        throw apiError.BadRequest('SESSION_ID_REQUIRED', 'ID текущей сессии обязателен');
                    }
                    result = await userS.logoutFromAllSessionsExceptCurrent(client, decoded.data.id, current_session_id, token, clientIp, userAgent);
                    break;
                default:
                    apiError.BadRequest('SESSION_ACTION_MISS', 'Такого действия для сессий не существует')
            }
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    // // Выйти из всех сессий
    // async logoutFromAllSessions(req, res, next) {
    //     try {
    //         const token = req.headers.authorization.split(' ')[1];
    //         const decoded = tokenService.validateToken(token);
    //         const user_id = req.query.user_id;
    //         const result = await userS.logoutFromAllSessions(decoded.data.id, token, user_id);
    //         res.json(result);
    //     } catch (e) {
    //         next(e);
    //     }
    // }

    // // Выйти из всех сессий кроме текущей
    // async logoutFromAllSessionsExceptCurrent(req, res, next) {
    //     try {
    //         const token = req.headers.authorization.split(' ')[1];
    //         const decoded = tokenService.validateToken(token);
    //         const { current_session_id } = req.body;
    //         const clientIp = getClientIp(req);
    //         const userAgent = req.headers['user-agent'] || '';

    //         if (!current_session_id) {
    //             throw apiError.BadRequest('CURRENT_SESSION_ID_REQUIRED', 'ID текущей сессии обязателен');
    //         }

    //         const result = await userS.logoutFromAllSessionsExceptCurrent(decoded.data.id, current_session_id, token, clientIp, userAgent);
    //         res.json(result);
    //     } catch (e) {
    //         next(e);
    //     }
    // }

    async getAllStatuses(req, res, next) {
        try {
            const client = await pgdb.connect();
            // Импортируем сервис, если он ещё не импортирован в контроллере
            const userStatusService = require('../services/user/subServices/userStatusService');
            const statuses = await userStatusService.getAllStatuses(client);
            res.json(statuses);
        } catch (e) {
            next(e);
        } finally {
            // В твоем контроллере autoBind, но client.release() лучше делать явно или через middleware
            // Если у тебя уже есть глобальная обработка, оставь как есть, иначе добавь client.release()
        }
    }

    async getPermissionHistory(req, res, next) {
        try {
            const { targetUserId, page = 1, limit = 20 } = req.query;
            if (!targetUserId) {
                return res.status(400).json({ message: 'Не указан targetUserId' });
            }
            const client = await pgdb.connect();
            const permissionService = require('../services/systemServices/permissionService');
            const history = await permissionService.getPermissionHistory(client, targetUserId, parseInt(page), parseInt(limit));
            res.json(history);
        } catch (e) {
            next(e);
        }
    }

    async cleanupOldPermissionHistory(req, res, next) {
        try {
            const client = await pgdb.connect();
            const permissionService = require('../services/systemServices/permissionService');
            const count = await permissionService.cleanupOldPermissionHistory(client);
            res.json({ deleted_count: count });
        } catch (e) {
            next(e);
        }
    }






    async updateDeviceTrust(req, res, next) {
        try {
            const { device_id, isTrusted, confirmPassword } = req.body;
            const token = req?.headers?.authorization?.split(' ')[1];
            const decoded = token ? tokenService.validateToken(token) : null;
            const current_user = decoded ? decoded?.data : null;

            if (!current_user) {
                throw apiError.Unauthorized('Не авторизован');
            }

            const client = await pgdb.connect();
            const result = await userS.updateDeviceTrust(client, current_user.id, device_id, isTrusted, confirmPassword);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async updateDeviceName(req, res, next) {
        try {
            const { device_id, customName, appendDeviceInfo } = req.body;
            const token = req?.headers?.authorization?.split(' ')[1];
            const decoded = token ? tokenService.validateToken(token) : null;
            const current_user = decoded ? decoded?.data : null;

            if (!current_user) {
                throw apiError.Unauthorized('Не авторизован');
            }

            const client = await pgdb.connect();
            const result = await userS.updateDeviceName(client, current_user.id, device_id, customName, appendDeviceInfo);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async downgradeOldTrustedDevices(req, res, next) {
        try {
            const client = await pgdb.connect();
            const result = await userS.downgradeOldTrustedDevices(client);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async generateSeedPhrase(req, res, next) {
        try {
            const { password } = req.body;
            if (!password) throw apiError.BadRequest('MISSING_PASSWORD', 'Требуется подтверждение паролем');

            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const client = await pgdb.connect();

            const result = await userS.generateSeedPhrase(client, decoded.data.id, password);
            res.json(result);
        } catch (e) { next(e); }
        finally { /* client.release() если не делается в userService */ }
    }

    async setupTOTP(req, res, next) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const client = await pgdb.connect();
            const otpUri = await userS.setupTOTP(client, decoded.data.id, decoded.data.login);
            res.json({ otpUri });
        } catch (e) { next(e); }
    }

    async verifyTOTP(req, res, next) {
        try {
            const { token: totpToken, password } = req.body;
            if (!password) throw apiError.BadRequest('MISSING_PASSWORD', 'Требуется подтверждение паролем');

            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const client = await pgdb.connect();

            await userS.verifyTOTP(client, decoded.data.id, totpToken, password);
            res.json({ success: true });
        } catch (e) { next(e); }
    }

    async requestDeviceCode(req, res, next) {
        try {
            const { login, deviceInfo } = req.body;
            const userAgent = req.headers['user-agent'] || '';
            const decryptedDeviceInfo = deviceInfo ? decryptFrontCBC(deviceInfo, "FRONT_KEY_1") : null;
            console.log(decryptedDeviceInfo)
            const clientIp = getClientIp(req);
            const client = await pgdb.connect();
            const result = await userS.requestDeviceCode(client, login, decryptedDeviceInfo, clientIp, userAgent);
            res.json(result);
        } catch (e) { next(e); }
    }

    async verifyDeviceCode(req, res, next) {
        try {
            const { login, code, deviceInfo } = req.body;
            const userAgent = req.headers['user-agent'] || '';
            const clientIp = getClientIp(req);
            const decryptedDeviceInfo = deviceInfo ? decryptFrontCBC(deviceInfo, "FRONT_KEY_1") : null;
            const client = await pgdb.connect();
            const result = await userS.verifyDeviceCode(client, login, code, decryptedDeviceInfo, userAgent, clientIp);
            res.json(result);
        } catch (e) { next(e); }
    }

    async getSecuritySettings(req, res, next) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const client = await pgdb.connect();
            const settings = await userS.getSecuritySettings(client, decoded.data.id);
            res.json(settings);
        } catch (e) { next(e); }
    }


    async loginSeed(req, res, next) {
        try {
            const { seedPhrase, deviceInfo } = req.body;
            const userAgent = req.headers['user-agent'] || '';
            const clientIp = getClientIp(req);

            // Расшифровка deviceInfo (как в обычном login)
            const decryptedDeviceInfo = deviceInfo ? decryptFrontCBC(deviceInfo, "FRONT_KEY_1") : null;

            const client = await pgdb.connect();
            const loginResult = await userS.loginSeed(client, seedPhrase, userAgent, clientIp, decryptedDeviceInfo);

            res.json(loginResult);
        } catch (e) {
            console.error("[ERROR] loginSeed failed:", e);
            next(e);
        }
    }

    async checkDeviceCodeStatus(req, res, next) {
        try {
            const { login, code } = req.body;
            const client = await pgdb.connect();
            const result = await userS.checkDeviceCodeStatus(client, login, code);
            res.json(result);
        } catch (e) { next(e); }
    }

    async disableSeedPhrase(req, res, next) {
        try {
            const { password } = req.body;
            if (!password) throw apiError.BadRequest('MISSING_PASSWORD', 'Требуется подтверждение паролем');

            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const client = await pgdb.connect();

            const result = await userS.disableSeedPhrase(client, decoded.data.id, password);
            res.json(result);
        } catch (e) { next(e); }
    }

    async disableTOTP(req, res, next) {
        try {
            const { password } = req.body;
            if (!password) throw apiError.BadRequest('MISSING_PASSWORD', 'Требуется подтверждение паролем');

            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const client = await pgdb.connect();

            const result = await userS.disableTOTP(client, decoded.data.id, password);
            res.json(result);
        } catch (e) { next(e); }
    }

    // === Новый метод в UserController ===
    async generateBackupCodes(req, res, next) {
        try {
            const { password } = req.body;
            if (!password) {
                throw apiError.BadRequest('MISSING_PASSWORD', 'Пароль обязателен');
            }
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const client = await pgdb.connect();
            const result = await userS.generateBackupCodes(client, decoded.data.id, password);
            res.json(result);
        } catch (e) { next(e); }
    }



}

function autoBind(obj) {
    const proto = Object.getPrototypeOf(obj);
    for (const key of Object.getOwnPropertyNames(proto)) {
        const val = obj[key];
        if (key !== 'constructor' && typeof val === 'function') {
            obj[key] = val.bind(obj);
        }
    }
    return obj;
}

module.exports = autoBind(new UserController());