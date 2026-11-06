const bcrypt = require('bcryptjs');
const tokenService = require('../../systemServices/tokenService');
const apiError = require('../../../exceptions/apiError');
const { hashData } = require('../../systemServices/cryptoService');
const userLoginTrackingService = require('../system/userLoginTrackingService');
const userRefreshTokenService = require('../system/userRefreshTokenService');
const ValidateService = require('../../systemServices/validate/validateService');
const userEnshureCheckService = require('../system/userEnshureCheckService');
const userSecurityService = require('./userSecurityService');

const validateService = new ValidateService();


class userRegisterService {
    async createUserAdm(client, login, pass, token) {

        const decoded = tokenService.validateToken(token)

        // Валидация
        validateService.userValidation.validateLogin(login)
        await userEnshureCheckService.checkNotExistLogin(client, login)
        validateService.userValidation.validatePassword(pass)
        const hashPass = await bcrypt.hash(pass, 5)
        const new_id = await client.query(`
                INSERT INTO users
                (
                login, pass, status, reg_date
                )
                values
                ($1, $2, $3, (NOW() AT TIME ZONE 'UTC'))
                RETURNING *`,
            [
                login, hashPass, 1
            ]
        )
        const userId = new_id.rows[0].user_id;

        // Инициализируем пустую запись в настройках безопасности
        // Это выполнится в той же транзакции, что и создание пользователя (BEGIN/COMMIT управляется в userService)
        await userSecurityService.initializeSecuritySettings(client, userId);

        return ["OK", userId];

    }
}
module.exports = new userRegisterService();