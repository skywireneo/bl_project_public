const apiError = require("../../../exceptions/apiError");
const { DeleteIncidentSend } = require("../../../grpc/handlers/filesHandler");
const dictionaryService = require("../../dictionary/dictionaryService");
const statisticService = require("../../stats/statisticService");
const userEncriptionService = require("../../systemServices/userEncriptionService");
const ValidateService = require("../../systemServices/validate/validateService");
const usersEmailService = require("../../users/usersEmailService");
const userTgService = require("../../users/userTgService");
const contestationService = require("../contestation/contestationService");
const incidentHistoryService = require("../history/incidentHistoryService");
const incidentCheckAndGeneratedDataService = require("../incidentCreate/incidentCheckAndGeneratedDataService");
const incidentGetService = require("../incidentGet/incidentGetService");
const personService = require("../persones/personService");
const pvzService = require("../pvz/pvzService");

const validateService = new ValidateService();

class incidentDeleteService {

    /**
     * Проверяет, к скольким инцидентам привязан email_id
     * @param {Object} client - клиент БД
     * @param {string} emailId - ID email
     * @returns {number} количество инцидентов
     */
    async getEmailUsageCount(client, emailId) {
        if (!emailId) return 0;

        const result = await client.query(
            `SELECT COUNT(*) as count 
             FROM incidents_main_info 
             WHERE user_add_email_id = $1`,
            [emailId]
        );

        return parseInt(result.rows[0].count);
    }

    /**
     * Проверяет, к скольким инцидентам привязан tg_id
     * @param {Object} client - клиент БД
     * @param {string} tgId - ID telegram
     * @returns {number} количество инцидентов
     */
    async getTgUsageCount(client, tgId) {
        if (!tgId) return 0;

        const result = await client.query(
            `SELECT COUNT(*) as count 
             FROM incidents_main_info 
             WHERE user_add_tg_id = $1`,
            [tgId]
        );

        return parseInt(result.rows[0].count);
    }

    /**
     * Безопасное удаление email - только если он не используется в других инцидентах
     * @param {Object} client - клиент БД
     * @param {string} emailId - ID email
     * @param {string} currentIncidentId - ID текущего инцидента
     */
    async safeDeleteEmail(client, emailId, currentIncidentId) {
        if (!emailId) return;

        const usageCount = await this.getEmailUsageCount(client, emailId);

        // Удаляем только если email используется только в текущем инциденте
        if (usageCount === 1) {
            await usersEmailService.deleteEmailById(client, emailId);
            // console.log(`[DELETE] Email ${emailId} удалён (использовался только в инциденте ${currentIncidentId})`);
        } else {
            // console.log(`[DELETE] Email ${emailId} НЕ удалён (используется в ${usageCount} инцидентах, включая ${currentIncidentId})`);
        }
    }

    /**
     * Безопасное удаление telegram - только если он не используется в других инцидентах
     * @param {Object} client - клиент БД
     * @param {string} tgId - ID telegram
     * @param {string} currentIncidentId - ID текущего инцидента
     */
    async safeDeleteTg(client, tgId, currentIncidentId) {
        if (!tgId) return;

        const usageCount = await this.getTgUsageCount(client, tgId);

        // Удаляем только если tg используется только в текущем инциденте
        if (usageCount === 1) {
            await userTgService.deleteTgById(client, tgId);
            // console.log(`[DELETE] TG ${tgId} удалён (использовался только в инциденте ${currentIncidentId})`);
        } else {
            // console.log(`[DELETE] TG ${tgId} НЕ удалён (используется в ${usageCount} инцидентах, включая ${currentIncidentId})`);
        }
    }

    async deleteIncident(client, id) {
        if (id) {
            validateService.incidentValidation.validateIncidentId(id);
        } else {
            throw apiError.BadRequest('NOT_EMAIL_ID', `Отсутствует ID инцидента для удаления`);
        }

        // Проверяем, что инцидент действительно существует
        await incidentCheckAndGeneratedDataService.checkIncidentNotExist(client, id);

        await contestationService.deleteContestationsByIncidentId(client, id);

        const incidentMainInfo = await incidentGetService.getIncidentMainInfoById(client, id);

        // Безопасное удаление email и tg (только если не используются в других инцидентах)
        await this.safeDeleteEmail(client, incidentMainInfo.user_add_email_id, id);
        await this.safeDeleteTg(client, incidentMainInfo.user_add_tg_id, id);

        await personService.deletePersonsByIncidentId(client, id);
        await pvzService.deletePVZByIncidentId(client, id);
        await incidentHistoryService.deleteRecords(client, id);
        await DeleteIncidentSend('incident_evidence', id)
        await statisticService.delete(client, 'incidents:view', id) // TODO

        // Удаление записи из таблицы incidents_main_info
        await client.query(
            `DELETE FROM incidents_main_info 
            WHERE incident_id = $1`,
            [id]
        );

        return true;
    }

    async softDeleteIncident(client, id, reason_code) {
        if (id) {
            validateService.incidentValidation.validateIncidentId(id);
        } else {
            throw apiError.BadRequest('NOT_EMAIL_ID', `Отсутствует ID инцидента для удаления`);
        }

        let reason_text = "";
        switch (reason_code) {
            case "legal":
                reason_text = "Удалено по юридическим причинам";
                break;
            default:
                reason_text = "Удалено по скрытым причинам";
        }

        // Проверяем, что инцидент действительно существует
        await incidentCheckAndGeneratedDataService.checkIncidentNotExist(client, id);

        await contestationService.deleteContestationsByIncidentId(client, id);

        const incidentMainInfo = await incidentGetService.getIncidentMainInfoById(client, id);

        // Безопасное удаление email и tg (только если не используются в других инцидентах)
        await this.safeDeleteEmail(client, incidentMainInfo.user_add_email_id, id);
        await this.safeDeleteTg(client, incidentMainInfo.user_add_tg_id, id);

        await personService.deletePersonsByIncidentId(client, id);
        await pvzService.deletePVZByIncidentId(client, id);
        await incidentHistoryService.deleteRecords(client, id);
        await DeleteIncidentSend('incident_evidence', id)
        await statisticService.delete(client, 'incidents:view', id)

        // Обновление записи в таблице incidents_main_info (soft delete)
        await client.query(
            `UPDATE incidents_main_info 
            SET user_add_email_id = null,
                user_add_tg_id = null,
                add_reason_id = 0,
                user_description = 'Удалено',
                deleted = true,
                deleted_reason = $2
            WHERE incident_id = $1`,
            [id, reason_text]
        );

        return true;
    }
}

module.exports = new incidentDeleteService();