const tokenService = require('../services/systemServices/tokenService');
const pgdb = require('../pgdb');
const dictionaryService = require('../services/dictionary/dictionaryService');

class dictionaryController {

    async createElement(req, res, next) {
        try {
            const { type, name, ball, addonData } = req.body;
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;
            const client = await pgdb.connect();
            const result = await dictionaryService.createElement(client, type, name, ball, addonData, current_user);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async updateElement(req, res, next) {
        try {
            const { element_id, type, name, ball, active, addonData } = req.body;
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;
            const client = await pgdb.connect();
            const result = await dictionaryService.updateElement(client, element_id, type, name, ball, active, addonData, current_user);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async deleteElement(req, res, next) {
        try {
            const { type, name } = req.body;
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;
            const client = await pgdb.connect();
            const result = await dictionaryService.deleteElement(client, type, name, current_user);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async getAdm(req, res, next) {
        try {
            const type = req.query.type;
            const token = req.headers.authorization.split(' ')[1];
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;
            const client = await pgdb.connect();
            const result = await dictionaryService.getAdm(client, type, current_user);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async getNonSecure(req, res, next) {
        try {
            const type = req.query.type;
            const client = await pgdb.connect();
            const result = await dictionaryService.getNonSecure(client, type);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }
}

module.exports = new dictionaryController();