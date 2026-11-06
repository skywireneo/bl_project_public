const apiError = require('../../../exceptions/apiError');

class incidentHistoryService {
    /**
     * Создает новую запись в истории изменений инцидента
     * @param {Object} client - клиент базы данных
     * @param {string} incident_id - ID инцидента
     * @param {number} user_id - ID пользователя (больше 0, или -1 для Заявителя, или -2 для Анонима)
     * @param {string} action - описание действия
     * @returns {string} record_id - ID созданной записи
     */
    async createRecord(client, incident_id, user_id, action) {
        if (!incident_id || user_id === undefined || user_id === null || !action) {
            throw apiError.BadRequest('MISSING_PARAMS', 'Отсутствуют обязательные параметры: incident_id, user_id, action');
        }

        user_id = Number(user_id)

        if (typeof user_id !== 'number' || (user_id <= 0 && user_id !== -1 && user_id !== -2)) {
            throw apiError.BadRequest('INVALID_USER_ID', 'user_id должен быть больше 0, равен -1 или -2');
        }

        if (typeof action !== 'string' || action.trim().length === 0) {
            throw apiError.BadRequest('INVALID_ACTION', 'Action должен быть непустой строкой');
        }

        if (action.length > 100) {
            throw apiError.BadRequest('ACTION_TOO_LONG', 'Action не должен превышать 100 символов');
        }

        const query = `
            INSERT INTO incident_change_history (user_id, action, date_time, incident_id)
            VALUES ($1, $2, (NOW() AT TIME ZONE 'UTC'), $3)
            RETURNING record_id
        `;

        const result = await client.query(query, [user_id, action.trim(), incident_id]);

        if (result.rowCount === 0) {
            throw apiError.BadRequest('CREATE_FAILED', 'Не удалось создать запись истории');
        }

        return result.rows[0].record_id;
    }

    /**
     * Получает все записи истории для указанного инцидента
     * @param {Object} client - клиент базы данных
     * @param {string} incident_id - ID инцидента
     * @returns {Array} массив записей истории (action, date_time, login), отсортированных по дате (новые сверху)
     */
    async getRecords(client, incident_id) {
        if (!incident_id) {
            throw apiError.BadRequest('MISSING_INCIDENT_ID', 'Отсутствует incident_id');
        }

        const query = `
            SELECT 
                ich.action,
                ich.date_time,
                CASE 
                    WHEN ich.user_id = -1 THEN 'Заявитель'
                    WHEN ich.user_id = -2 THEN 'Аноним'
                    ELSE u.login
                END as login
            FROM incident_change_history ich
            LEFT JOIN users u ON u.user_id = ich.user_id
            WHERE ich.incident_id = $1
            ORDER BY ich.date_time DESC
        `;

        const result = await client.query(query, [incident_id]);

        return result.rows;
    }

    /**
     * Удаляет все записи истории для указанного инцидента
     * @param {Object} client - клиент базы данных
     * @param {string} incident_id - ID инцидента
     * @returns {number} количество удаленных записей
     */
    async deleteRecords(client, incident_id) {
        if (!incident_id) {
            throw apiError.BadRequest('MISSING_INCIDENT_ID', 'Отсутствует incident_id');
        }

        const query = `
            DELETE FROM incident_change_history
            WHERE incident_id = $1
            RETURNING record_id
        `;

        const result = await client.query(query, [incident_id]);

        return result.rowCount;
    }
}

module.exports = new incidentHistoryService();