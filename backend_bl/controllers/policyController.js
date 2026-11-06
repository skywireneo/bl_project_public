const policyService = require('../services/policy/policyService');
const tokenService = require('../services/systemServices/tokenService');
const pgdb = require('../pgdb')

class policyController {

    async getPolicy(req, res, next) {
        try {
            const policyType = req.query.policyType
            const token = req.headers.authorization.split(' ')[1]
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;
            const client = await pgdb.connect();
            const result = await policyService.getPolicy(client, policyType, current_user, req.log)
            res.json(result)
        } catch (e) {
            next(e)
        }
    }

    async updatePolicy(req, res, next) {
        try {
            const { updateType, policyType, text, changeComment } = req.body
            const token = req.headers.authorization.split(' ')[1]
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;
            const client = await pgdb.connect();
            const result = await policyService.updatePolicy(client, updateType, policyType, text, changeComment, current_user, req.log)
            res.json(result)
        } catch (e) {
            next(e)
        }
    }

    async getPolicyVersions(req, res, next) {
        try {
            const policyType = req.query.policyType
            const client = await pgdb.connect();
            const result = await policyService.getPolicyVersions(client, policyType, req.log)
            res.json(result)
        } catch (e) {
            next(e)
        }
    }

    async getPolicyVersionDetail(req, res, next) {
        try {
            const policyType = req.query.policyType
            const version = req.query.version
            const client = await pgdb.connect();
            const result = await policyService.getPolicyVersionDetail(client, policyType, version, req.log)
            res.json(result)
        } catch (e) {
            next(e)
        }
    }

    async getPDFPolicy(req, res, next) {
        try {
            const policyType = req.query.policyType;
            // const token = req.headers.authorization.split(' ')[1]
            //const decoded = tokenService.validateToken(token);
            const current_user = null//decoded?.data;
            const client = await pgdb.connect();
            const pdfBuffer = await policyService.getPDFPolicy(client, policyType, current_user, req.log);

            if (pdfBuffer === 'err') {
                return res.status(404).send({ error: 'Политика не найдена' });
            }

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="policy_${policyType}.pdf"`);
            res.send(pdfBuffer);
        } catch (e) {
            next(e)
        }
    }


}

module.exports = new policyController()
