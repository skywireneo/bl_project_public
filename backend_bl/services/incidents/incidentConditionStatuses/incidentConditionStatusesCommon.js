const apiError = require("../../../exceptions/apiError");

class incidentConditionStatusesCommon {
    /**
     * Получить все состояния из справочника
     * @param {Object} client - клиент БД
     * @returns {Array} массив всех состояний
     */
    async getAllStatuses(client) {
        const query = `
            SELECT status_id, status_code_name, status_name, button_text, descr, button_color, need_alert
            FROM incident_conditions_statuses
            ORDER BY status_id
        `;
        const result = await client.query(query);
        return result.rows;
    }

    /**
     * Получить полное состояние по ID
     * @param {Object} client - клиент БД
     * @param {number} statusId - ID состояния
     * @returns {Object} объект состояния
     */
    async getStatusById(client, statusId) {
        if (!statusId || typeof statusId !== 'number') {
            throw apiError.BadRequest('INVALID_STATUS_ID', 'ID состояния должен быть числом');
        }

        const query = `
            SELECT status_id, status_code_name, status_name, button_text, descr, button_color, need_alert
            FROM incident_conditions_statuses
            WHERE status_id = $1
        `;
        const result = await client.query(query, [statusId]);

        if (result.rowCount === 0) {
            throw apiError.BadRequest('STATUS_NOT_FOUND', `Состояние с ID ${statusId} не найдено`);
        }

        return result.rows[0];
    }

    /**
     * Получить полное состояние по кодовому имени
     * @param {Object} client - клиент БД
     * @param {string} statusCode - кодовое имя состояния
     * @returns {Object} объект состояния
     */
    async getStatusByCode(client, statusCode) {
        if (!statusCode || typeof statusCode !== 'string') {
            throw apiError.BadRequest('INVALID_STATUS_CODE', 'Код состояния должен быть строкой');
        }

        const query = `
            SELECT status_id, status_code_name, status_name, button_text, descr, button_color, need_alert
            FROM incident_conditions_statuses
            WHERE status_code_name = $1
        `;
        const result = await client.query(query, [statusCode.trim()]);

        if (result.rowCount === 0) {
            throw apiError.BadRequest('STATUS_NOT_FOUND', `Состояние с кодом "${statusCode}" не найдено`);
        }

        return result.rows[0];
    }

    /**
     * Получить только кодовое имя по ID
     * @param {Object} client - клиент БД
     * @param {number} statusId - ID состояния
     * @returns {string} кодовое имя
     */
    async getStatusCodeById(client, statusId) {
        const status = await this.getStatusById(client, statusId);
        return status.status_code_name;
    }

    /**
     * Получить только название по ID
     * @param {Object} client - клиент БД
     * @param {number} statusId - ID состояния
     * @returns {string} название состояния
     */
    async getStatusNameById(client, statusId) {
        const status = await this.getStatusById(client, statusId);
        return status.status_name;
    }

    /**
     * Получить текст кнопки по ID состояния
     * @param {Object} client - клиент БД
     * @param {number} statusId - ID состояния
     * @returns {string} текст кнопки
     */
    async getStatusButtonTextById(client, statusId) {
        const status = await this.getStatusById(client, statusId);
        return status.button_text;
    }

    /**
     * Получить ID состояния по кодовому имени
     * @param {Object} client - клиент БД
     * @param {string} statusCode - кодовое имя состояния
     * @returns {number} ID состояния
     */
    async getIdByCode(client, statusCode) {
        const status = await this.getStatusByCode(client, statusCode);
        return status.status_id;
    }
}

module.exports = new incidentConditionStatusesCommon();