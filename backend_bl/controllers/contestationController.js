const pgdb = require('../pgdb');
const contestationService = require('../services/incidents/contestation/contestationService');
const apiError = require('../exceptions/apiError');
const tokenService = require('../services/systemServices/tokenService');

class ContestationController {
    async createContestation(req, res, next) {
        const client = await pgdb.connect();
        try {
            await client.query('BEGIN');
            const { parentIncidentId, description, creatorPersonId, publishOnSuccess, email } = req.body;
            const userId = req.user?.id || null;
            const userEmail = req.user?.email || email;
            const ownerToken = req.headers['x-owner-token'] || null;

            if (!parentIncidentId || !description || !email) {
                throw apiError.BadRequest('Необходимо указать parentIncidentId, description и email');
            }

            const result = await contestationService.createContestation(
                client, { parentIncidentId, description, creatorPersonId, publishOnSuccess: publishOnSuccess || false, email },
                userId, userEmail, ownerToken
            );

            await client.query('COMMIT');
            return res.json({ success: true, contestationId: result.contestationId, ownerToken: result.ownerToken, message: 'Оспаривание создано.' });
        } catch (error) {
            await client.query('ROLLBACK');
            next(error);
        } finally {
            client.release();
        }
    }

    async getContestation(req, res, next) {
        const client = await pgdb.connect();
        try {
            const { id } = req.params;
            const token = req?.headers?.authorization?.split(' ')[1];
            const decoded = token ? tokenService.validateToken(token) : null;
            const current_user_status = decoded?.data?.status || null;
            const ownerToken = req.headers['x-owner-token'] || null;

            const contestation = await contestationService.getContestationById(client, id, decoded?.data || null, current_user_status, ownerToken);
            return res.json({ success: true, data: contestation });
        } catch (error) {
            next(error);
        } finally {
            client.release();
        }
    }

    async getContestationsForIncident(req, res, next) {
        const client = await pgdb.connect();
        try {
            const { incidentId } = req.params;
            const token = req?.headers?.authorization?.split(' ')[1];
            const decoded = token ? tokenService.validateToken(token) : null;
            const current_user_status = decoded?.data?.status || null;

            const contestations = await contestationService.getContestationsForIncident(client, incidentId, decoded?.data || null, current_user_status);
            return res.json({ success: true, data: contestations });
        } catch (error) {
            next(error);
        } finally {
            client.release();
        }
    }

    async getTransitionInfo(req, res, next) {
        const client = await pgdb.connect();
        try {
            const { id } = req.params;
            const contestationInfo = await contestationService.getTransitionInfo(client, id);
            return res.json({ success: true, data: contestationInfo });
        } catch (error) {
            next(error);
        } finally {
            client.release();
        }
    }

    async transition(req, res, next) {
        const client = await pgdb.connect();
        try {
            await client.query('BEGIN');
            const { id } = req.params;
            const { targetStatusCode } = req.body;
            const token = req?.headers?.authorization?.split(' ')[1];
            const decoded = token ? tokenService.validateToken(token) : null;
            const userId = decoded?.data?.id || null;
            const userStatus = decoded?.data?.status || null;

            if (!targetStatusCode) throw apiError.BadRequest('Необходимо указать targetStatusCode');

            const result = await contestationService.transition(client, id, targetStatusCode, userId, userStatus);
            await client.query('COMMIT');
            return res.json({ success: true, data: result, message: 'Статус оспаривания обновлен' });
        } catch (error) {
            await client.query('ROLLBACK');
            next(error);
        } finally {
            client.release();
        }
    }

    async updateDescription(req, res, next) {
        const client = await pgdb.connect();
        try {
            await client.query('BEGIN');
            const { id } = req.params;
            const { description, ownerToken } = req.body;
            const token = req?.headers?.authorization?.split(' ')[1];
            const decoded = token ? tokenService.validateToken(token) : null;
            const userId = decoded?.data?.id || null;
            const userStatus = decoded?.data?.status || null;

            if (!description) throw apiError.BadRequest('Необходимо указать description');

            await contestationService.updateDescription(client, id, description, userId, userStatus, ownerToken);
            await client.query('COMMIT');
            return res.json({ success: true, message: 'Описание обновлено' });
        } catch (error) {
            await client.query('ROLLBACK');
            next(error);
        } finally {
            client.release();
        }
    }
}

module.exports = new ContestationController();