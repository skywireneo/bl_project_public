const tokenService = require('../systemServices/tokenService')
const apiError = require('../../exceptions/apiError')
const { hashData } = require('../systemServices/cryptoService');
const bcrypt = require('bcryptjs');
const userLoginService = require('./subServices/userLoginService');
const userRegisterService = require('./subServices/userRegisterService');
const settingsService = require('../systemSettings/settingsService');
const userProfileService = require('./subServices/userProfileService');
const userStatusService = require('./subServices/userStatusService');
const userLoginTrackingService = require('./system/userLoginTrackingService');
const staffSecurityService = require('./subServices/staffSecurityService');
const userSecurityService = require('./subServices/userSecurityService');
const userDevicesService = require('./subServices/userDevicesService');
const userSessionsService = require('./system/userSessionsService');
const userRefreshTokenService = require('./system/userRefreshTokenService');

class userService {

    async createUserAdm(client, login, pass, token) {
        try {
            await client.query('BEGIN');
            const output = await userRegisterService.createUserAdm(client, login, pass, token)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async loginUser(client, login, pass, userAgent = '', ip = null, deviceInfo = null) {
        try {
            await client.query('BEGIN');
            const output = await userLoginService.loginUser(client, login, pass, userAgent, ip, deviceInfo)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async checkToken(client, refreshTokenOld, data, userAgent = '', clientIp = null) {
        try {
            await client.query('BEGIN');
            const output = await userLoginService.checkToken(client, refreshTokenOld, data, userAgent, clientIp)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async refreshTokens(client, refreshToken, userAgent = '', clientIp = null) {
        try {
            await client.query('BEGIN');
            const output = await userLoginService.refreshTokens(client, refreshToken, userAgent, clientIp)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getUser(client, login, user_data, user_status) {
        try {
            await client.query('BEGIN');
            const output = await userProfileService.getUserByLogin(client, login, user_data, user_status)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getRoleHistory(client, targetUserId, actorUserId, page = 1, limit = 20) {
        try {
            await client.query('BEGIN');
            const output = await userStatusService.getRoleHistory(client, targetUserId, actorUserId, page, limit)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getLoginHistory(client, userIdProcess, current_user_status, limit, page) {
        try {
            await client.query('BEGIN');
            const output = await userLoginTrackingService.getLoginHistory(client, userIdProcess, current_user_status, limit, page)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getUserDevices(client, targetUserId, current_user_status) {
        try {
            await client.query('BEGIN');
            const output = await userDevicesService.getUserDevices(client, targetUserId, current_user_status)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async deleteDevice(client, current_user, device_id, current_user_status, currentSessionId) {
        try {
            await client.query('BEGIN');
            const output = await userDevicesService.deleteDevice(client, current_user, device_id, current_user_status, currentSessionId)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async changeUserStatus(client, login, newStatusCodeName, user_data, user_status) {
        try {
            await client.query('BEGIN');
            const output = await userStatusService.changeUserStatus(client, login, newStatusCodeName, user_data, user_status)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async cleanupOldRoleHistory(client) {
        try {
            await client.query('BEGIN');
            const output = await userStatusService.cleanupOldRoleHistory(client)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async deleteOldLoginLogs(client) {
        try {
            await client.query('BEGIN');
            const output = await userLoginTrackingService.deleteOldLoginLogs(client)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async deleteOldDevices(client) {
        try {
            await client.query('BEGIN');
            const output = await userDevicesService.deleteOldDevices(client);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getSystemStats(client) {
        try {
            await client.query('BEGIN');
            // Статистика только читает данные, но для консистентности используем транзакцию клиента
            const output = await userLoginTrackingService.getSystemStats(client);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async selectUsers(client, count, page, filter, token) {
        try {
            await client.query('BEGIN');
            const decoded = tokenService.validateToken(token);
            const currentUserStatus = decoded.data.status;
            const currentUserLogin = decoded.data.login;
            // validateService._validateSearchStr(filter);
            // validateService._validatePegablePage(page);
            // validateService._validatePegableLimit(count);
            // const statuses = await client.query(`SELECT * FROM user_statuses`);
            const statusHierarchy = [
                "TOP_LEVEL_DEVELOPER",
                "TOP_LEVEL_ADMINISTRATOR",
                "DEVELOPER",
                "ADMINISTRATOR",
                "MODERATOR",
                "PARTNER",
                "USER",
                "USER_UNCONFIRMED",
                "DELETED_NO_RET",
                "BLOCKED",
                "BLOCKED_PER",
                "DELETED_RET",
                "DELETED_NO_RET"
            ];
            // const currentUserIndex = statusHierarchy.indexOf(currentUserStatus);
            let addonWhere = "";
            if (filter) {
                if (filter === "all") {
                    addonWhere = "";
                } else if (filter === "allAdm") {
                    addonWhere = "WHERE u.status IN (1,2,3)";
                } else {
                    // validateService._validateNumber(filter); // Раскомментировать при наличии validateService
                    addonWhere = "WHERE u.status = " + filter;
                }
            }
            // const UNBAN_LOGIN_ADMIN = await settingsService.selectSetting("main_admin");
            // const UNBAN_LOGIN_DEVELOPER = await settingsService.selectSetting("main_dev");
            const usersQuery = `
                SELECT
                    u.user_id,
                    u.login,
                    s.name AS status_text,
                    s.code_name AS status_code_name
                FROM users u
                JOIN user_statuses s ON u.status = s.status_id
                ${addonWhere}
                ORDER BY CASE ${statusHierarchy.map((code, idx) => `WHEN s.code_name='${code}' THEN ${idx}`).join(" ")} END, u.user_id
                LIMIT $1 OFFSET $2;
            `;
            const users = await client.query(usersQuery, [
                count,
                count * (page - 1)
            ]);
            await client.query('COMMIT');
            return (users.rows)
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    }

    async countAllUsers(client, filter, token) {
        try {
            await client.query('BEGIN');
            const decoded = tokenService.validateToken(token)
            // validateService._validateSearchStr(filter)
            let addon_str = ''
            if (filter) {
                if (filter == 'all') {
                    addon_str = ''
                } else if (filter == 'allAdm') {
                    addon_str = 'WHERE users.status > 0 AND users.status < 4 '
                } else {
                    // validateService._validateNumber(filter) // Раскомментировать при наличии validateService
                    addon_str = 'WHERE users.status = ' + filter
                }
            }
            const users = await client.query(`SELECT COUNT(user_id) AS count FROM users ${addon_str}`)
            await client.query('COMMIT');
            return users.rows[0]['count']
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async checkStatus(id, status) {
        // validateService.userValidation.validateId(id) // Раскомментировать при наличии
        // validateService.statusValidation.validateCodeName(status)
        const stat = await pgdb.query('SELECT statuses.code_name AS status FROM users LEFT JOIN statuses ON users.status = statuses.status_id WHERE user_id = $1', [id])
        if (stat.rowCount !== 0) {
            if (stat.rows[0]['status'] == status) {
                return [true, stat.rows[0]['status']]
            } else {
                return [false, stat.rows[0]['status']]
            }
        } else {
            return 'ERR'
        }
    }

    async getPasswordChangeInfo(client, userId, userStatus) {
        try {
            await client.query('BEGIN');
            const output = await staffSecurityService.getPasswordChangeInfo(client, userId, userStatus);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async changePassword(client, actorId, actorLogin, targetUserId, oldPassword, newPassword, autoGenerate, reason, userStatus) {
        try {
            await client.query('BEGIN');

            let output;
            // Если actorId === targetUserId — это смена самому себе
            if (actorId === targetUserId) {
                output = await staffSecurityService.changeSelfPassword(client, actorId, oldPassword, newPassword, autoGenerate);
            } else {
                // Админ меняет пароль другому пользователю
                const isPrivileged = ['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(userStatus);
                if (!isPrivileged) {
                    throw apiError.Forbidden('Недостаточно прав для смены пароля другому пользователю');
                }
                output = await staffSecurityService.changeUserPasswordByAdmin(client, actorId, actorLogin, targetUserId, newPassword, autoGenerate, reason);
            }
            await userRefreshTokenService.revokeAllUserRefreshTokens(client, targetUserId);

            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async regenerateSecondaryPassword(client, actorId, actorLogin, targetUserId) {
        try {
            await client.query('BEGIN');
            const output = await staffSecurityService.regenerateSecondaryPassword(client, actorId, actorLogin, targetUserId);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async verifySecondaryPassword(client, tempSessionToken, secondaryPassword, deviceInfo, userAgent, clientIp) {
        try {
            await client.query('BEGIN');
            const output = await userLoginService.verifySecondaryPassword(client, tempSessionToken, secondaryPassword, deviceInfo, userAgent, clientIp);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async cleanupOldPasswordHistory(client) {
        try {
            await client.query('BEGIN');
            const output = await staffSecurityService.cleanupOldPasswordHistory(client);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getPasswordHistory(client, targetUserId) {
        try {
            await client.query('BEGIN');
            const output = await userSecurityService.getPasswordHistory(client, targetUserId);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async deleteOldRevokedTokens(client) {
        try {
            await client.query('BEGIN');
            const output = await userRefreshTokenService.deleteOldRevokedTokens(client);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getActiveSessions(client, userId, token, userStatus, userAgent = '', clientIp = null) {
        try {
            await client.query('BEGIN');
            const output = await userSessionsService.getActiveSessions(client, userId, token, userStatus, userAgent, clientIp);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async logoutFromAllSessions(client, userId, token, user_id) {
        try {
            await client.query('BEGIN');
            const output = await userSessionsService.logoutFromAllSessions(client, userId, token, user_id);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async logoutFromSession(client, userId, sessionId, token) {
        try {
            await client.query('BEGIN');
            const output = await userSessionsService.logoutFromSession(client, userId, sessionId, token);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async logoutFromAllSessionsExceptCurrent(client, userId, currentSessionId, token, userAgent = '', clientIp = '') {
        try {
            await client.query('BEGIN');
            const output = await userSessionsService.logoutFromAllSessionsExceptCurrent(client, userId, currentSessionId, token, userAgent, clientIp);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async updateDeviceTrust(client, userId, deviceId, isTrusted, confirmPassword) {
        try {
            await client.query('BEGIN');
            const output = await userDevicesService.updateDeviceTrust(client, userId, deviceId, isTrusted, confirmPassword);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async updateDeviceName(client, userId, deviceId, customName, appendDeviceInfo) {
        try {
            await client.query('BEGIN');
            const output = await userDevicesService.updateDeviceName(client, userId, deviceId, customName, appendDeviceInfo);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async downgradeOldTrustedDevices(client) {
        try {
            await client.query('BEGIN');
            const output = await userDevicesService.downgradeOldTrustedDevices(client);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async loginSeed(client, seedPhrase, userAgent = '', ip = null, deviceInfo = null) {
        try {
            await client.query('BEGIN');
            const output = await userLoginService.loginSeed(client, seedPhrase, userAgent, ip, deviceInfo);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ==========================================
    // ДЕЛЕГИРОВАНИЕ В userSecurityService
    // ==========================================

    async generateSeedPhrase(client, userId, password) {
        try {
            await client.query('BEGIN');
            const output = await userSecurityService.generateSeedPhrase(client, userId, password);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async setupTOTP(client, userId, login) {
        try {
            await client.query('BEGIN');
            const output = await userSecurityService.setupTOTP(client, userId, login);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async verifyTOTP(client, userId, token, password) {
        try {
            await client.query('BEGIN');
            const output = await userSecurityService.verifyTOTP(client, userId, token, password);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async requestDeviceCode(client, login, deviceInfo, clientIp, userAgent) {
        try {
            await client.query('BEGIN');
            const output = await userSecurityService.requestDeviceCode(client, login, deviceInfo, clientIp, userAgent);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async verifyDeviceCode(client, login, code, deviceInfo, userAgent, clientIp) {
        try {
            await client.query('BEGIN');
            const output = await userSecurityService.verifyDeviceCode(client, login, code, deviceInfo, userAgent, clientIp);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getSecuritySettings(client, userId) {
        try {
            await client.query('BEGIN');
            const output = await userSecurityService.getSecuritySettings(client, userId);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Делегирование отключения сид-фразы
    async disableSeedPhrase(client, userId, password) {
        try {
            await client.query('BEGIN');
            const output = await userSecurityService.disableSeedPhrase(client, userId, password);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Делегирование отключения TOTP
    async disableTOTP(client, userId, password) {
        try {
            await client.query('BEGIN');
            const output = await userSecurityService.disableTOTP(client, userId, password);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async generateBackupCodes(client, userId, password) {
        try {
            await client.query('BEGIN');
            const output = await userSecurityService.generateBackupCodes(client, userId, password);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async verifyBackupCode(client, userId, code) {
        try {
            await client.query('BEGIN');
            const output = await userSecurityService.verifyBackupCode(client, userId, code);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async checkDeviceCodeStatus(client, login, code) {
        try {
            await client.query('BEGIN');
            const output = await userSecurityService.checkDeviceCodeStatus(client, login, code);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
module.exports = new userService();