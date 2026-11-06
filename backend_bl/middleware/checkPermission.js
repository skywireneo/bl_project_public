const permissionService = require('../services/systemServices/permissionService');
const apiError = require('../exceptions/apiError');
const pgdb = require('../pgdb');

/**
 * Middleware для проверки наличия конкретного права
 * Использование: router.post('/delete', authMiddleware, checkPermission('incident:delete'), controller.delete)
 */
const checkPermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.data || !req.user.data.id) {
                return next(apiError.Unauthorized('AUTH_REQUIRED', 'Требуется авторизация'));
            }

            const userId = req.user.data.id;
            const client = await pgdb.connect();

            try {
                const permissions = await permissionService.getEffectivePermissions(client, userId);

                if (!permissions.includes(requiredPermission)) {
                    throw apiError.Forbidden('PERMISSION_DENIED', `У вас нет права "${requiredPermission}" для выполнения этого действия`);
                }

                next();
            } finally {
                client.release();
            }
        } catch (error) {
            next(error);
        }
    };
};

module.exports = checkPermission;