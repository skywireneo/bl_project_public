const apiError = require("../../../exceptions/apiError");
const incidentHistoryService = require("../history/incidentHistoryService");
const incidentUpdateService = require("../incidentUpdate/incidentUpdateService");
const incidentConditionStatusesCommon = require("./incidentConditionStatusesCommon");

// Правила переходов между состояниями
const TRANSITION_RULES = {
    'new': ['in_progress', 'rejected', 'withdrawn'],
    'in_progress': ['resolved', 'rejected', 'withdrawn'],
    'resolved': ['closed', 'in_progress', 'withdrawn'],
    'closed': [],
    'rejected': [],
    'withdrawn': []
};

// Ограничения для каждого состояния
const STATUS_RESTRICTIONS = {
    'new': {
        can_edit: true,
        can_delete: true,
        is_final: false
    },
    'in_progress': {
        can_edit: true,
        can_delete: false,
        is_final: false
    },
    'resolved': {
        can_edit: false,
        can_delete: false,
        is_final: false
    },
    'closed': {
        can_edit: false,
        can_delete: false,
        is_final: true
    },
    'rejected': {
        can_edit: false,
        can_delete: false,
        is_final: true
    },
    'withdrawn': {
        can_edit: false,
        can_delete: false,
        is_final: true
    }
};

class incidentConditionStatusesControl {
    async getCurrentStatus(client, incidentId) {
        if (!incidentId) {
            throw apiError.BadRequest('MISSING_INCIDENT_ID', 'Отсутствует ID инцидента');
        }

        const query = `
            SELECT condition_id
            FROM incidents_main_info
            WHERE incident_id = $1
        `;
        const result = await client.query(query, [incidentId]);

        if (result.rowCount === 0) {
            throw apiError.BadRequest('INCIDENT_NOT_FOUND', `Инцидент с ID ${incidentId} не найден`);
        }

        const conditionId = result.rows[0].condition_id;
        const status = await incidentConditionStatusesCommon.getStatusById(client, conditionId);

        return {
            id: status.status_id,
            code: status.status_code_name,
            name: status.status_name,
            button_text: status.button_text,
            descr: status.descr,
            button_color: status.button_color,
            need_alert: status.need_alert
        };
    }

    async canTransition(client, incidentId, targetStatusCode) {
        try {
            const currentStatus = await this.getCurrentStatus(client, incidentId);
            const allowedTransitions = TRANSITION_RULES[currentStatus.code] || [];

            return allowedTransitions.includes(targetStatusCode);
        } catch (err) {
            return false;
        }
    }

    async getAvailableTransitions(client, incidentId) {
        const currentStatus = await this.getCurrentStatus(client, incidentId);
        const allowedCodes = TRANSITION_RULES[currentStatus.code] || [];

        if (allowedCodes.length === 0) {
            return [];
        }

        const allStatuses = await incidentConditionStatusesCommon.getAllStatuses(client);

        return allStatuses
            .filter(status => allowedCodes.includes(status.status_code_name))
            .map(status => ({
                id: status.status_id,
                code: status.status_code_name,
                name: status.status_name,
                button_text: status.button_text,
                descr: status.descr,
                button_color: status.button_color,
                need_alert: status.need_alert
            }));
    }

    async getStatusRestrictions(client, incidentId) {
        const currentStatus = await this.getCurrentStatus(client, incidentId);
        const restrictions = STATUS_RESTRICTIONS[currentStatus.code];

        if (!restrictions) {
            return {
                can_edit: false,
                can_delete: false,
                is_final: true
            };
        }

        return restrictions;
    }

    async onTransitionAction(client, incidentId, oldStatusCode, newStatusCode, moderatorId = null) {

        if (newStatusCode === 'in_progress') {
            await incidentUpdateService.updateActive(client, incidentId, false)
            await incidentUpdateService.updateResponsible(client, incidentId, moderatorId)
        }

        if (newStatusCode === 'closed') {
            await incidentUpdateService.updateActive(client, incidentId, false)
        }

        if (newStatusCode === 'resolved') {
            await incidentUpdateService.updateActive(client, incidentId, true)
        }

        if (newStatusCode === 'rejected') {
            await incidentUpdateService.updateActive(client, incidentId, false)
        }

        if (newStatusCode === 'withdrawn') {
            await incidentUpdateService.updateActive(client, incidentId, false)
        }
    }

    async transition(client, incidentId, targetStatusCode, userId, comment = null) {
        if (!incidentId) {
            throw apiError.BadRequest('MISSING_INCIDENT_ID', 'Отсутствует ID инцидента');
        }

        if (!targetStatusCode || typeof targetStatusCode !== 'string') {
            throw apiError.BadRequest('INVALID_TARGET_STATUS', 'Код целевого состояния должен быть строкой');
        }

        if (userId === undefined || userId === null || typeof userId !== 'number') {
            throw apiError.BadRequest('INVALID_USER_ID', 'ID пользователя должен быть числом');
        }

        const currentStatus = await this.getCurrentStatus(client, incidentId);
        const targetStatus = await incidentConditionStatusesCommon.getStatusByCode(client, targetStatusCode.trim());

        const allowedTransitions = TRANSITION_RULES[currentStatus.code] || [];

        if (!allowedTransitions.includes(targetStatus.status_code_name)) {
            throw apiError.BadRequest(
                'TRANSITION_NOT_ALLOWED',
                `Переход из состояния "${currentStatus.name}" в "${targetStatus.status_name}" невозможен`
            );
        }

        const updateQuery = `
        UPDATE incidents_main_info
        SET condition_id = $1
        WHERE incident_id = $2
        RETURNING incident_id
    `;
        const updateResult = await client.query(updateQuery, [targetStatus.status_id, incidentId]);

        if (updateResult.rowCount === 0) {
            throw apiError.BadRequest('UPDATE_FAILED', 'Не удалось обновить состояние инцидента');
        }

        if (targetStatusCode === 'rejected' && comment) {
            await client.query(
                `UPDATE incidents_main_info SET rejection_reason = $1 WHERE incident_id = $2`,
                [comment, incidentId]
            );
        }

        const actionText = comment && targetStatusCode === 'rejected'
            ? `Изменил состояние на "${targetStatus.status_name}". Причина: ${comment}`
            : `Изменил состояние с "${currentStatus.name}" на "${targetStatus.status_name}"`;

        await incidentHistoryService.createRecord(client, incidentId, userId, actionText);
        await this.onTransitionAction(client, incidentId, currentStatus.code, targetStatus.status_code_name, userId);

        return {
            id: targetStatus.status_id,
            code: targetStatus.status_code_name,
            name: targetStatus.status_name,
            button_text: targetStatus.button_text,
            descr: targetStatus.descr,
            button_color: targetStatus.button_color,
            need_alert: targetStatus.need_alert
        };
    }

    async getTransitionInfo(client, incidentId) {
        const [currentStatus, availableTransitions, restrictions] = await Promise.all([
            this.getCurrentStatus(client, incidentId),
            this.getAvailableTransitions(client, incidentId),
            this.getStatusRestrictions(client, incidentId)
        ]);

        return {
            current_status: currentStatus,
            available_transitions: availableTransitions,
            restrictions: restrictions
        };
    }
}

const instance = new incidentConditionStatusesControl();
instance.TRANSITION_RULES = TRANSITION_RULES;
module.exports = instance;