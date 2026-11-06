const apiError = require("../../../exceptions/apiError");

class userEnshureCheckService {
    async checkNotExistLogin(client, login) {
        const candidate = await client.query('SELECT user_id FROM users WHERE login = $1', [login])
        if (candidate.rowCount > 0) {
            throw apiError.BadRequest('USER_EXIST', `Пользователь с логином "${login}" уже существует`)
        }
    }
}
module.exports = new userEnshureCheckService();