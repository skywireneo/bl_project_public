const apiError = require("../../exceptions/apiError");
const incidentConditionStatusesControl = require("./incidentConditionStatuses/incidentConditionStatusesControl");
const incidentConditionStatusesCommon = require("./incidentConditionStatuses/incidentConditionStatusesCommon");
const incidentUpdateService = require("./incidentUpdate/incidentUpdateService");
const usersEmailService = require("../users/usersEmailService");
const userTgService = require("../users/userTgService");
const validateService = require("../systemServices/validate/validateService").instance || new (require("../systemServices/validate/validateService"))();

const ALLOWED_STATUSES_FOR_WITHDRAW = ['new', 'in_progress', 'resolved'];

class incidentWithdrawService {
    /**
     * Отозвать инцидент.
     * 
     * Логика прав:
     * - Админ (DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR): может отозвать из new / in_progress / resolved в любой момент
     * - Обычный юзер: может отозвать ТОЛЬКО если может редактировать (статус = new И прошло ≤ 15 минут)
     *   Авторство проверяется по email или tg
     * 
     * @param {Object} client 
     * @param {string} incidentId 
     * @param {Object} current_user - из токена (может быть null)
     * @param {string} current_user_status - статус из токена
     * @param {Object} identity - { email?, tg? } для проверки авторства неавторизованным юзером
     * @param {number|null} userIdForHistory - ID пользователя для записи в историю
     */
    async withdrawIncident(client, incidentId, current_user, current_user_status, identity = {}, userIdForHistory = null) {
        if (!incidentId) {
            throw apiError.BadRequest('MISSING_INCIDENT_ID', 'Отсутствует ID инцидента');
        }

        // 1. Получаем текущий статус
        const currentStatus = await incidentConditionStatusesControl.getCurrentStatus(client, incidentId);

        // 2. Проверяем, что статус позволяет отзыв
        if (!ALLOWED_STATUSES_FOR_WITHDRAW.includes(currentStatus.code)) {
            throw apiError.BadRequest(
                'WITHDRAW_NOT_ALLOWED',
                `Инцидент в статусе "${currentStatus.name}" не может быть отозван. ` +
                `Отзыв возможен только из статусов: Новый, В работе, Завершён.`
            );
        }

        // 3. Проверка прав
        const isAdmin = ['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(current_user_status);

        if (!isAdmin) {
            // Обычный юзер: проверяем авторство + окно 15 минут + статус new
            await this._verifyOwnershipAndTimeWindow(client, incidentId, identity);
        }

        // 4. Выполняем переход через стандартный механизм
        const targetStatusCode = 'withdrawn';
        const historyUserId = userIdForHistory || current_user?.id || -1;

        const result = await incidentConditionStatusesControl.transition(
            client,
            incidentId,
            targetStatusCode,
            historyUserId,
            isAdmin ? `Инцидент отозван администратором (${current_user_status})` : 'Инцидент отозван заявителем'
        );

        return result;
    }

    /**
     * Проверка авторства и временного окна для обычного юзера
     */
    async _verifyOwnershipAndTimeWindow(client, incidentId, identity) {
        if (!identity || (!identity.email && !identity.tg)) {
            throw apiError.Forbidden('Необходимо указать email или telegram для подтверждения авторства');
        }

        // Получаем данные инцидента
        const incidentResult = await client.query(
            `SELECT 
                imf.user_add_email_id,
                imf.user_add_tg_id,
                imf.date_add,
                imf.condition_id,
                imf.deleted
            FROM incidents_main_info imf
            WHERE imf.incident_id = $1`,
            [incidentId]
        );

        if (incidentResult.rowCount === 0) {
            throw apiError.BadRequest('INCIDENT_NOT_FOUND', 'Инцидент не найден');
        }

        const incident = incidentResult.rows[0];

        if (incident.deleted) {
            throw apiError.Forbidden('Инцидент удалён');
        }

        // Проверяем статус: для обычного юзера — только new
        const allStatuses = await incidentConditionStatusesCommon.getAllStatuses(client);
        const newStatus = allStatuses.find(s => s.status_code_name === 'new');
        if (!newStatus || String(incident.condition_id) !== String(newStatus.status_id)) {
            throw apiError.Forbidden(
                'Инцидент можно отозвать только в течение 15 минут после создания (пока он в статусе "Новый")'
            );
        }

        // Проверяем временное окно (15 минут)
        const dateAdd = new Date(incident.date_add);
        const now = new Date();
        const diffMinutes = (now - dateAdd) / (1000 * 60);
        if (diffMinutes > 15) {
            throw apiError.Forbidden(
                'Время для отзыва инцидента истекло (доступно только в течение 15 минут после создания)'
            );
        }

        // Проверяем авторство по email или tg
        let isOwner = false;

        if (identity.email && incident.user_add_email_id) {
            try {
                const emailHash = await usersEmailService.getEmailHash(client, identity.email);
                console.log(identity.email)
                console.log(emailHash, incident.user_add_email_id)
                if (emailHash && String(emailHash) === String(incident.user_add_email_id)) {
                    isOwner = true;
                }
            } catch (e) {
                console.warn('[withdraw] Ошибка проверки email:', e.message);
            }
        }

        if (!isOwner && identity.tg && incident.user_add_tg_id) {
            try {
                const tgHash = await userTgService.getTgHash(identity.tg);
                if (tgHash && String(tgHash) === String(incident.user_add_tg_id)) {
                    isOwner = true;
                }
            } catch (e) {
                console.warn('[withdraw] Ошибка проверки tg:', e.message);
            }
        }

        if (!isOwner) {
            throw apiError.Forbidden('Вы не являетесь автором этого инцидента');
        }
    }
}

module.exports = new incidentWithdrawService();