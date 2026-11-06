const pgdb = require('../pgdb');
const permissionService = require('../services/systemServices/permissionService');
const tokenService = require('../services/systemServices/tokenService');

class PermissionController {
    async getDictionary(req, res, next) {
        const client = await pgdb.connect();
        try {
            const { statusCode } = req.query;
            const data = await permissionService.getPermissionsDictionary(client, statusCode);
            res.json(data);
        } catch (e) { next(e); } finally { client.release(); }
    }

    async updateRole(req, res, next) {
        const client = await pgdb.connect();
        try {
            const { statusCode } = req.params;
            const { permissions } = req.body; // [{code, is_default}]
            await permissionService.updateRolePermissions(client, statusCode, permissions);
            res.json({ success: true, message: 'Права роли обновлены' });
        } catch (e) { next(e); } finally { client.release(); }
    }

    async getUserOverrides(req, res, next) {
        const client = await pgdb.connect();
        try {
            const { userId } = req.params;
            const data = await permissionService.getUserOverrides(client, userId);
            res.json(data);
        } catch (e) { next(e); } finally { client.release(); }
    }

    async updateUserOverrides(req, res, next) {
        const client = await pgdb.connect();
        try {
            const { userId } = req.params;
            const { overrides } = req.body; // [{code, is_granted}]
            const token = req.headers.authorization.split(' ')[1];
            const actorId = tokenService.validateToken(token).data.id;

            await permissionService.updateUserOverrides(client, userId, overrides, actorId);
            res.json({ success: true, message: 'Индивидуальные права обновлены' });
        } catch (e) { next(e); } finally { client.release(); }
    }
}
module.exports = new PermissionController();