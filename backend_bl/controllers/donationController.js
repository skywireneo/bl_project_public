const apiError = require('../exceptions/apiError');
const donationService = require('../services/donation/donationService');
const tokenService = require('../services/systemServices/tokenService');
const pgdb = require('../pgdb');

class DonationController {
    async getPackages(req, res, next) {
        try {
            const client = await pgdb.connect();
            const result = await donationService.getPackages(client);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async createRequest(req, res, next) {
        try {
            const { email } = req.body;

            if (!email || typeof email !== 'string') {
                throw apiError.BadRequest('INVALID_EMAIL', 'Email обязателен');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw apiError.BadRequest('INVALID_EMAIL', 'Некорректный формат email');
            }

            const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
            const userAgent = req.headers['user-agent'];

            const client = await pgdb.connect();
            const result = await donationService.createRequest(
                client,
                email.trim().toLowerCase(),
                ipAddress,
                userAgent
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * Доступ к "Моим плюшкам" по токену
     * GET /donation/my?token=xxx
     */
    async getMyDonation(req, res, next) {
        try {
            const { token } = req.query;

            if (!token) {
                throw apiError.BadRequest('TOKEN_REQUIRED', 'Токен обязателен');
            }

            const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
            const userAgent = req.headers['user-agent'];

            const client = await pgdb.connect();
            const result = await donationService.getMyDonation(
                client,
                token,
                ipAddress,
                userAgent
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * Вход по email + кодовому слову
     * POST /donation/login
     * Body: { email, code }
     */
    async loginWithCode(req, res, next) {
        try {
            const { email, code } = req.body;

            if (!email || !code) {
                throw apiError.BadRequest('MISSING_CREDENTIALS', 'Email и код обязательны');
            }

            const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
            const userAgent = req.headers['user-agent'];

            const client = await pgdb.connect();
            const result = await donationService.loginWithCode(
                client,
                email.trim().toLowerCase(),
                code,
                ipAddress,
                userAgent
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    }
    /**
     * Список заявок
     * GET /donation/admin/requests?status=pending&limit=50
     */
    async getRequests(req, res, next) {
        try {
            const { status, limit = 50, offset = 0 } = req.query;
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;

            const client = await pgdb.connect();
            const result = await donationService.getRequests(
                client,
                { status, limit: parseInt(limit), offset: parseInt(offset) },
                current_user
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * Детали заявки
     * GET /donation/admin/request/:id
     */
    async getRequestDetail(req, res, next) {
        try {
            const { id } = req.params;
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;

            const client = await pgdb.connect();
            const result = await donationService.getRequestDetail(
                client,
                parseInt(id),
                current_user
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * Одобрить заявку
     * POST /donation/admin/approve
     * Body: { request_id, actual_amount, notes? }
     */
    async approveRequest(req, res, next) {
        try {
            const { request_id, actual_amount, notes } = req.body;

            if (!request_id || actual_amount === undefined) {
                throw apiError.BadRequest('MISSING_DATA', 'request_id и actual_amount обязательны');
            }

            if (typeof actual_amount !== 'number' || actual_amount <= 0) {
                throw apiError.BadRequest('INVALID_AMOUNT', 'Сумма должна быть положительным числом');
            }

            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;

            const client = await pgdb.connect();
            const result = await donationService.approveRequest(
                client,
                parseInt(request_id),
                actual_amount,
                notes,
                current_user
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * Отклонить заявку
     * POST /donation/admin/reject
     * Body: { request_id, rejection_reason }
     */
    async rejectRequest(req, res, next) {
        try {
            const { request_id, rejection_reason } = req.body;

            if (!request_id || !rejection_reason) {
                throw apiError.BadRequest('MISSING_DATA', 'request_id и rejection_reason обязательны');
            }

            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;

            const client = await pgdb.connect();
            const result = await donationService.rejectRequest(
                client,
                parseInt(request_id),
                rejection_reason,
                current_user
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * Отменить одобрение
     * POST /donation/admin/cancelApproval
     * Body: { request_id, reason }
     */
    async cancelApproval(req, res, next) {
        try {
            const { request_id, reason } = req.body;

            if (!request_id || !reason) {
                throw apiError.BadRequest('MISSING_DATA', 'request_id и reason обязательны');
            }

            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;

            const client = await pgdb.connect();
            const result = await donationService.cancelApproval(
                client,
                parseInt(request_id),
                reason,
                current_user
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * Отметить письмо как отправленное
     * POST /donation/admin/markEmailSent
     * Body: { request_id }
     */
    async markEmailSent(req, res, next) {
        try {
            const { request_id } = req.body;

            if (!request_id) {
                throw apiError.BadRequest('MISSING_DATA', 'request_id обязателен');
            }

            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;

            const client = await pgdb.connect();
            const result = await donationService.markEmailSent(
                client,
                parseInt(request_id),
                current_user
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * Предпросмотр письма для заявки
     * GET /donation/admin/emailPreview/:id
     */
    async getEmailPreview(req, res, next) {
        try {
            const { id } = req.params;
            const token = req.headers.authorization.split(' ');
            const decoded = tokenService.validateToken(token[1]);
            const current_user = decoded?.data;

            const client = await pgdb.connect();
            const result = await donationService.getEmailPreview(
                client,
                parseInt(id),
                current_user
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * История платежей
     * GET /donation/admin/payments?limit=50&offset=0
     */
    async getPayments(req, res, next) {
        try {
            const { limit = 50, offset = 0 } = req.query;
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;

            const client = await pgdb.connect();
            const result = await donationService.getPayments(
                client,
                { limit: parseInt(limit), offset: parseInt(offset) },
                current_user
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * Информация о пользователе по email_hesh
     * GET /donation/admin/user?email_hesh=xxx
     */
    async getUserInfo(req, res, next) {
        try {
            const { email_hesh } = req.query;

            if (!email_hesh) {
                throw apiError.BadRequest('MISSING_DATA', 'email_hesh обязателен');
            }

            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;

            const client = await pgdb.connect();
            const result = await donationService.getUserInfo(
                client,
                email_hesh,
                current_user
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * Перегенерировать токен/код доступа
     * POST /donation/admin/regenerateAccess
     * Body: { email_hesh, type: 'token' | 'code' | 'both' }
     */
    async regenerateAccess(req, res, next) {
        try {
            const { email_hesh, type = 'both' } = req.body;

            if (!email_hesh) {
                throw apiError.BadRequest('MISSING_DATA', 'email_hesh обязателен');
            }

            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;

            const client = await pgdb.connect();
            const result = await donationService.regenerateAccess(
                client,
                email_hesh,
                type,
                current_user
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * Отозвать доступ
     * POST /donation/admin/revokeAccess
     * Body: { email_hesh, reason }
     */
    async revokeAccess(req, res, next) {
        try {
            const { email_hesh, reason } = req.body;

            if (!email_hesh || !reason) {
                throw apiError.BadRequest('MISSING_DATA', 'email_hesh и reason обязательны');
            }

            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;

            const client = await pgdb.connect();
            const result = await donationService.revokeAccess(
                client,
                email_hesh,
                reason,
                current_user
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * Статистика
     * GET /donation/admin/stats?period=month
     */
    async getStats(req, res, next) {
        try {
            const { period = 'month' } = req.query;
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;

            const client = await pgdb.connect();
            const result = await donationService.getStats(client, period, current_user);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async getPackagesAdmin(req, res, next) {
        try {
            const client = await pgdb.connect();
            const result = await donationService.getPackagesAdmin(client);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async createPackage(req, res, next) {
        try {
            const packageData = req.body;
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;

            const client = await pgdb.connect();
            const result = await donationService.createPackage(client, packageData, current_user);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async updatePackage(req, res, next) {
        try {
            const { id } = req.params;
            const packageData = req.body;
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;

            const client = await pgdb.connect();
            const result = await donationService.updatePackage(client, parseInt(id), packageData, current_user);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async deletePackage(req, res, next) {
        try {
            const { id } = req.params;
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;

            const client = await pgdb.connect();
            const result = await donationService.deletePackage(client, parseInt(id), current_user);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async getPerksAdmin(req, res, next) {
        try {
            const client = await pgdb.connect();
            const result = await donationService.getPerksAdmin(client);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async createPerk(req, res, next) {
        try {
            const perkData = req.body;
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;

            const client = await pgdb.connect();
            const result = await donationService.createPerk(client, perkData, current_user);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async updatePerk(req, res, next) {
        try {
            const { id } = req.params;
            const perkData = req.body;
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;

            const client = await pgdb.connect();
            const result = await donationService.updatePerk(client, parseInt(id), perkData, current_user);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async deletePerk(req, res, next) {
        try {
            const { id } = req.params;
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;

            const client = await pgdb.connect();
            const result = await donationService.deletePerk(client, parseInt(id), current_user);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async getSettings(req, res, next) {
        try {
            const client = await pgdb.connect();
            const result = await donationService.getSettings(client);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async updateSettings(req, res, next) {
        try {
            const settings = req.body;
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;

            const client = await pgdb.connect();
            const result = await donationService.updateSettings(client, settings, current_user);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }
}

module.exports = new DonationController();