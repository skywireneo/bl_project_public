// const apiError = require('../exceptions/apiError')
// const criticalActionsService = require('../services/criticalActionsService')
const settingsService = require('../services/systemSettings/settingsService')
const pgdb = require('../pgdb');
const tokenService = require('../services/systemServices/tokenService');
const rateLimitService = require('../services/systemServices/rateLimitService');

class systemController {

    async updateValue(req, res, next) {
        try {
            const { name, value } = req.body
            const token = req.headers.authorization.split(' ')[1]
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;
            const client = await pgdb.connect();
            const createStatus = await settingsService.updateValue(client, name, value, current_user)
            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }

    async selectSettings(req, res, next) {
        try {
            // const {name, value, descr} = req.body
            const token = req.headers.authorization.split(' ')[1]
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;
            const client = await pgdb.connect();
            const createStatus = await settingsService.selectSettings(client, current_user)
            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }

    async selectSetting(req, res, next) {
        try {
            // const {name, value, descr} = req.body
            const token = req.headers.authorization.split(' ')[1]
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;
            const client = await pgdb.connect();
            const createStatus = await settingsService.selectSetting(client, req.query.name, current_user)
            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }

    async getSettingHistory(req, res, next) {
        try {
            const client = await pgdb.connect();
            const createStatus = await settingsService.getSettingHistory(client, req.query.settingName)
            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }

    async cleanOldHistory(req, res, next) {
        try {
            const client = await pgdb.connect();
            const createStatus = await settingsService.cleanOldHistory(client)
            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }

    async cleanupExpiredLimits(req, res, next) {
        try {
            const client = await pgdb.connect();
            const createStatus = await rateLimitService.cleanupExpiredLimits(client)
            res.json(createStatus)
        } catch (e) {
            next(e);
        }
    }


}

module.exports = new systemController()
