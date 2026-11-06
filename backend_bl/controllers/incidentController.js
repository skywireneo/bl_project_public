const apiError = require('../exceptions/apiError');
const pgdb = require('../pgdb');
const incidentService = require('../services/incidents/incidentService');
const updatePvzService = require('../services/incidents/pvz/updatePvzService');
const actionStatsService = require('../services/stats/actionStatsService');
const ownerTokenService = require('../services/systemServices/ownerTokenService');
const tokenService = require('../services/systemServices/tokenService');
const usersEmailService = require('../services/users/usersEmailService');

class incidentController {


    async getCreateIncidentData(req, res, next) {
        try {
            // const token = req.headers.authorization.split(' ')[1]
            // const decoded = tokenService.validateToken(token)
            const client = await pgdb.connect();
            const createStatus = await incidentService.getCreateIncidentData(client)
            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }

    async getIncidents(req, res, next) {
        try {
            const { incidentId, limit, offset } = req.query;
            const ownerToken = req.headers['x-owner-token'] || req.query.ownerToken;
            const token = req?.headers?.authorization?.split(' ')[1]
            const decoded = token ? tokenService.validateToken(token) : null
            const current_user = decoded ? decoded?.data : null;
            const current_user_status = decoded ? current_user?.status : null;
            const client = await pgdb.connect();
            const createStatus = await incidentService.getIncidents(client, incidentId, current_user, current_user_status, limit, offset, ownerToken)

            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }

    async getIncidentForExport(req, res, next) {
        try {
            const { incidentId } = req.query;
            const client = await pgdb.connect();
            const createStatus = await incidentService.getIncidentForExport(client, incidentId)
            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }

    async getIncidentStatus(req, res, next) {
        try {
            const { incidentId } = req.query;
            const client = await pgdb.connect();
            const createStatus = await incidentService.getIncidentStatus(client, incidentId)
            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }

    async getIncidentsCaban(req, res, next) {
        try {
            const { type, column, limit, page } = req.query;
            const token = req?.headers?.authorization?.split(' ')[1]
            const decoded = token ? tokenService.validateToken(token) : null
            const current_user = decoded ? decoded?.data : null;
            const current_user_status = decoded ? current_user?.status : null;
            const client = await pgdb.connect();
            const createStatus = await incidentService.getIncidentsCaban(client, type, column, limit, page, current_user, current_user_status)
            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }

    async getCollections(req, res, next) {
        try {
            const { types } = req.query;
            const token = req?.headers?.authorization?.split(' ')[1]
            const decoded = token ? tokenService.validateToken(token) : null
            const current_user = decoded ? decoded?.data : null;
            const current_user_status = decoded ? current_user?.status : null;
            const client = await pgdb.connect();
            const createStatus = await incidentService.getCollections(client, types, current_user, current_user_status)
            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }

    async getIncidentHistory(req, res, next) {
        try {
            const { incidentId } = req.query;
            // const token = req?.headers?.authorization?.split(' ')[1]
            // const decoded = token ? tokenService.validateToken(token) : null
            // const current_user = decoded ? decoded?.data : null;
            // const current_user_status = decoded ? current_user?.status : null;
            const client = await pgdb.connect();
            const createStatus = await incidentService.getIncidentHistory(client, incidentId)
            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }

    async createIncident(req, res, next) {
        try {
            const { data, stats_info } = req.body;

            const requestIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                || req.ip
                || req.socket?.remoteAddress;
            const deviceId = req.headers['x-device-id'] || null;

            const token = req?.headers?.authorization?.split(' ')[1];
            const decoded = token ? tokenService.validateToken(token) : null;
            const current_user = decoded?.data || null;
            const skipRateLimit = ['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(current_user?.status);

            const client = await pgdb.connect();
            const createStatus = await incidentService.createIncident(client, data, null, false, {
                request_ip: requestIp,
                device_id: deviceId,
                skip_rate_limit: skipRateLimit
            });
            await actionStatsService.logAction(client, stats_info, requestIp);
            res.json(createStatus);
        } catch (e) {
            next(e);
        }
    }

    async updateIncident(req, res, next) {
        try {
            const { data, ownerToken } = req.body;
            // const token = req.headers.authorization.split(' ')[1]
            // const decoded = tokenService.validateToken(token)
            const token = req?.headers?.authorization?.split(' ')[1]
            const decoded = token ? tokenService.validateToken(token) : null
            const current_user = decoded ? decoded?.data : null;
            const current_user_status = decoded ? current_user?.status : null;
            const client = await pgdb.connect();
            const createStatus = await incidentService.updateIncident(client, data, current_user, current_user_status, ownerToken)
            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }

    async updateTgPost(req, res, next) {
        try {
            const { incidentId } = req.body
            // const token = req.headers.authorization.split(' ')[1]
            // const decoded = tokenService.validateToken(token)
            const client = await pgdb.connect();
            const createStatus = await incidentService.updateTgPost(client, incidentId)
            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }

    async updateInterestScorePlusOne(req, res, next) {
        try {
            const { incidentId } = req.body
            const client = await pgdb.connect();
            const createStatus = await incidentService.updateInterestScorePlusOne(client, incidentId)
            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }

    async deleteIncident(req, res, next) {
        try {
            const { id } = req.body
            // const token = req.headers.authorization.split(' ')[1]
            // const decoded = tokenService.validateToken(token)
            const client = await pgdb.connect();
            const createStatus = await incidentService.deleteIncident(client, id)
            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }

    async softDeleteIncident(req, res, next) {
        try {
            const { id, reason_code } = req.body
            // const token = req.headers.authorization.split(' ')[1]
            // const decoded = tokenService.validateToken(token)
            const client = await pgdb.connect();
            const createStatus = await incidentService.softDeleteIncident(client, id, reason_code)
            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }

    async createIncidentExport(req, res, next) {
        try {
            const { data, id } = req.body
            const token = req.headers.authorization.split(' ')[1]
            const decoded = tokenService.validateToken(token)
            if (decoded == null) {
                return false
            }
            const client = await pgdb.connect();
            const createStatus = await incidentService.createIncidentExport(client, data, id)
            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }

    async getTransitionInfo(req, res, next) {
        try {
            const { incidentId } = req.query;
            // const token = req?.headers?.authorization?.split(' ')[1]
            // const decoded = token ? tokenService.validateToken(token) : null
            // const current_user = decoded ? decoded?.data : null;
            // const current_user_status = decoded ? current_user?.status : null;
            const client = await pgdb.connect();
            const createStatus = await incidentService.getTransitionInfo(client, incidentId)
            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }

    async transition(req, res, next) {
        try {
            const { incidentId, targetStatusCode, rejectionReason } = req.body;
            const token = req?.headers?.authorization?.split(' ')[1]
            const decoded = token ? tokenService.validateToken(token) : null
            const current_user = decoded ? decoded?.data : null;
            const current_user_id = decoded ? Number(current_user?.id) : null;

            const client = await pgdb.connect();
            const createStatus = await incidentService.transition(client, incidentId, targetStatusCode, current_user_id, rejectionReason)
            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }
    async updateAdminAssessment(req, res, next) {
        try {
            const { incidentId, assessment } = req.body;
            const client = await pgdb.connect();
            const result = await incidentService.updateAdminAssessment(client, incidentId, assessment);
            res.json({ success: true, assessment: result });
        } catch (e) {
            next(e);
        }
    }

    async verifyPvz(req, res, next) {
        try {
            const { pvzId, isVerified } = req.body;
            const client = await pgdb.connect();
            const result = await updatePvzService.verifyPvz(client, pvzId, !!isVerified);
            res.json({
                success: true,
                pvzId: result.pvz_id,
                is_verified: result.is_verified
            });
        } catch (e) {
            next(e);
        }
    }

    async withdrawIncident(req, res, next) {
        try {
            const { incidentId, email, tg } = req.body;

            const token = req?.headers?.authorization?.split(' ')[1];
            const decoded = token ? tokenService.validateToken(token) : null;
            const current_user = decoded?.data || null;
            const current_user_status = current_user?.status || null;
            const userIdForHistory = current_user?.id || null;

            const client = await pgdb.connect();
            const result = await incidentService.withdrawIncident(
                client,
                incidentId,
                current_user,
                current_user_status,
                { email, tg },
                userIdForHistory
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async verifyCreatorEmail(req, res, next) {
        try {
            const { incidentId, email } = req.body;
            const client = await pgdb.connect();

            const incRes = await client.query('SELECT user_add_email_id FROM incidents_main_info WHERE incident_id = $1', [incidentId]);
            if (incRes.rowCount === 0) throw apiError.BadRequest('Инцидент не найден');

            const dbEmail = await usersEmailService.getDecryptedEmailById(client, incRes.rows[0].user_add_email_id);

            if (!dbEmail || dbEmail.toLowerCase().trim() !== email.toLowerCase().trim()) {
                throw apiError.BadRequest('Неверный email создателя инцидента');
            }

            const token = ownerTokenService.generateOwnerToken(incidentId, dbEmail);
            res.json({ success: true, token });
        } catch (e) { next(e); }
    }

    async updateAiResponse(req, res, next) {
        try {
            const { incidentId, aiResponse } = req.body;

            if (!incidentId || !aiResponse) {
                return next(apiError.BadRequest('Не указан incidentId или aiResponse'));
            }

            const client = await pgdb.connect();
            const result = await incidentService.updateAiResponse(client, incidentId, aiResponse);

            res.json({
                success: true,
                message: 'Отчёт ИИ успешно сохранён',
                data: result
            });
        } catch (e) {
            next(e);
        }
    }

    async updateShowAiResponse(req, res, next) {
        try {
            const { incidentId, showAiResponse } = req.body;

            if (incidentId === undefined || showAiResponse === undefined) {
                return next(apiError.BadRequest('Не указан incidentId или showAiResponse'));
            }

            const client = await pgdb.connect();
            const result = await incidentService.updateShowAiResponse(client, incidentId, Boolean(showAiResponse));

            res.json({
                success: true,
                message: 'Статус отображения ИИ-отчёта обновлён',
                data: result
            });
        } catch (e) {
            next(e);
        }
    }

    async addAdminAssessmentRecord(req, res, next) {
        try {
            const { incidentId, assessment } = req.body;

            const token = req?.headers?.authorization?.split(' ')[1];
            const decoded = token ? tokenService.validateToken(token) : null;
            const current_user = decoded ? decoded?.data : null;
            if (!current_user) return next(apiError.Forbidden('Требуется авторизация'));

            const client = await pgdb.connect();
            const result = await incidentService.addAdminAssessmentRecord(client, incidentId, assessment, current_user);
            res.json({ success: true, assessment: result });
        } catch (e) {
            next(e);
        }
    }
}

module.exports = new incidentController()