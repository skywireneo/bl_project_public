const incidentHistoryService = require("./history/incidentHistoryService");
const incidentConditionStatusesControl = require("./incidentConditionStatuses/incidentConditionStatusesControl");
const incidentCreateService = require("./incidentCreate/incidentCreateService");
const incidentDeleteService = require("./incidentDelete/incidentDeleteService");
const incidentGetService = require("./incidentGet/incidentGetService");
const incidentUpdateService = require("./incidentUpdate/incidentUpdateService");
const incidentWithdrawService = require("./incidentWithdrawService");

class IncidentService {

    //     // ================================================================
    //     //  Создание инцидентов  →  incidentCreateService
    //     // ================================================================

    async getCreateIncidentData(client) {
        try {
            await client.query('BEGIN');
            const output = await incidentCreateService.getCreateIncidentData(client)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getIncidents(client, incidentId, current_user, current_user_status, limit, offset, ownerToken) {
        try {
            await client.query('BEGIN');
            const output = await incidentGetService.getIncidents(client, incidentId, current_user, current_user_status, limit, offset, ownerToken)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getIncidentForExport(client, incidentId) {
        try {
            await client.query('BEGIN');
            const output = await incidentGetService.getIncidentForExport(client, incidentId)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getIncidentsCaban(client, type, column, limit, page, current_user, current_user_status) {
        try {
            await client.query('BEGIN');
            const output = await incidentGetService.getIncidentsCaban(client, type, column, limit, page, current_user, current_user_status)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getCollections(client, types, current_user, current_user_status) {
        try {
            await client.query('BEGIN');
            const output = await incidentGetService.getCollections(client, types, current_user, current_user_status)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getIncidentStatus(client, incidentId) {
        try {
            await client.query('BEGIN');
            const output = await incidentGetService.getIncidentStatus(client, incidentId)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getIncidentHistory(client, incidentId) {
        try {
            await client.query('BEGIN');
            const output = await incidentHistoryService.getRecords(client, incidentId)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async createIncident(client, data, id = null, importInc = false, options = {}) {
        try {
            await client.query('BEGIN');
            const output = await incidentCreateService.createIncident(client, data, null, false, options);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async updateIncident(client, data, current_user, current_user_status, ownerToken) {
        try {
            await client.query('BEGIN');
            const output = await incidentUpdateService.updateIncident(client, data, current_user, current_user_status, ownerToken)
            // console.log(1)
            await client.query('COMMIT');
            // console.log(2)
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async updateTgPost(client, incidentId) {
        try {
            await client.query('BEGIN');
            const output = await incidentUpdateService.updateTgPost(client, incidentId)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async updateInterestScorePlusOne(client, incidentId) {
        try {
            await client.query('BEGIN');
            const output = await incidentUpdateService.updateInterestScorePlusOne(client, incidentId)
            // console.log(1)
            await client.query('COMMIT');
            // console.log(2)
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async deleteIncident(client, id) {
        try {
            await client.query('BEGIN');
            const output = await incidentDeleteService.deleteIncident(client, id)
            // console.log(1)
            await client.query('COMMIT');
            // console.log(2)
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async softDeleteIncident(client, id, reason_code) {
        try {
            await client.query('BEGIN');
            const output = await incidentDeleteService.softDeleteIncident(client, id, reason_code)
            // console.log(1)
            await client.query('COMMIT');
            // console.log(2)
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async createIncidentExport(client, data, id) {
        try {
            await client.query('BEGIN');
            const output = await incidentCreateService.createIncident(client, data, id, true)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async transition(client, incidentId, targetStatusCode, userId, rejectionReason = null) {
        try {
            await client.query('BEGIN');
            const output = await incidentConditionStatusesControl.transition(client, incidentId, targetStatusCode, userId, rejectionReason)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async updateAdminAssessment(client, incidentId, assessment) {
        try {
            await client.query('BEGIN');
            const output = await incidentUpdateService.updateAdminAssessment(client, incidentId, assessment);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getTransitionInfo(client, incidentId) {
        try {
            await client.query('BEGIN');
            const output = await incidentConditionStatusesControl.getTransitionInfo(client, incidentId)
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async withdrawIncident(client, incidentId, current_user, current_user_status, identity, userIdForHistory) {
        try {
            await client.query('BEGIN');
            const output = await incidentWithdrawService.withdrawIncident(
                client, incidentId, current_user, current_user_status, identity, userIdForHistory
            );
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }


    async updateAiResponse(client, incidentId, aiResponse) {
        try {
            await client.query('BEGIN');
            const output = await incidentUpdateService.updateAiResponse(client, incidentId, aiResponse);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async updateShowAiResponse(client, incidentId, showAiResponse) {
        try {
            await client.query('BEGIN');
            const output = await incidentUpdateService.updateShowAiResponse(client, incidentId, showAiResponse);
            await client.query('COMMIT');
            return output;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async addAdminAssessmentRecord(client, incidentId, assessment, current_user) {
        try {
            await client.query('BEGIN');
            const output = await incidentUpdateService.addAdminAssessmentRecord(client, incidentId, assessment, current_user);
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

module.exports = new IncidentService();
