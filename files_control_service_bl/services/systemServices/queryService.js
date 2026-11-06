const pgdb = require('../../pgdb');
const apiError = require('../../exceptions/apiError');

class QueryService {
    /**
     * Выполняет SQL-запрос к базе данных.
     *
     * @param {string} sql - SQL-запрос, который нужно выполнить.
     * @param {Array<any>} params - Массив параметров для SQL-запроса.
     * @returns {Promise<any>} - Результат выполнения SQL-запроса.
     * @throws {Error} - Если возникает ошибка при выполнении запроса.
     */
    async query(sql, params) {
        try {
            const result = await pgdb.query(sql, params);
            return result;
        } catch (error) {
            console.error('[QUERY] Ошибка при выполнении SQL-запроса:', error.message);
            throw apiError.BadRequest('SQL_ERROR', `Ошибка SQL: ${error.message}`);
        }
    }
}

module.exports = new QueryService();