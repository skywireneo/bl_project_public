const systemVersionService = require('../services/systemVersionService');
const tokenService = require('../services/systemServices/tokenService');
const apiError = require('../exceptions/apiError');
// Убедитесь, что pgdb импортирован корректно в вашем проекте
const pgdb = require('../pgdb')

class SystemVersionController {
    async getAll(req, res, next) {
        try {
            const filters = {
                is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : null,
                change_type: req.query.change_type || null,
                is_major: req.query.is_major !== undefined ? req.query.is_major === 'true' : null,
                limit: parseInt(req.query.limit) || 100,
                offset: parseInt(req.query.offset) || 0
            };
            const client = await pgdb.connect();
            try {
                const versions = await systemVersionService.getAllVersions(client, filters);
                res.json(versions);
            } finally {
                client.release();
            }
        } catch (error) {
            next(error);
        }
    }

    // Получить одну версию по ID
    async getById(req, res, next) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) throw apiError.ValidationError([{ field: 'id', message: 'ID должен быть числом' }], 'SVCC001');

            const token = req.headers.authorization?.split(' ')[1];
            let userRole = null;

            if (token) {
                try {
                    const decoded = tokenService.validateToken(token);
                    userRole = decoded.data?.status;
                } catch (e) {
                    // Игнорируем ошибку токена, вернем публичные данные
                }
            }

            const client = await pgdb.connect();
            try {
                const version = await systemVersionService.getVersionById(client, id, userRole);
                res.json(version);
            } finally {
                client.release();
            }
        } catch (error) {
            next(error);
        }
    }

    // Получить активные версии для пользователя
    async getActiveForUser(req, res, next) {
        try {
            const client = await pgdb.connect();
            try {
                const versions = await systemVersionService.getActiveVersionsForUser(client);
                res.json(versions);
            } finally {
                client.release();
            }
        } catch (error) {
            next(error);
        }
    }

    // Создать новую версию
    async create(req, res, next) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) throw apiError.UnauthorizedError('Токен отсутствует', 'SVCC002');

            const client = await pgdb.connect();
            try {
                const version = await systemVersionService.createVersion(client, req.body, token);
                res.status(201).json(version);
            } finally {
                client.release();
            }
        } catch (error) {
            next(error);
        }
    }

    // Обновить версию
    async update(req, res, next) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) throw apiError.ValidationError([{ field: 'id', message: 'ID должен быть числом' }], 'SVCC003');

            const token = req.headers.authorization?.split(' ')[1];
            if (!token) throw apiError.UnauthorizedError('Токен отсутствует', 'SVCC004');

            const client = await pgdb.connect();
            try {
                const version = await systemVersionService.updateVersion(client, id, req.body, token);
                res.json(version);
            } finally {
                client.release();
            }
        } catch (error) {
            next(error);
        }
    }

    // Удалить версию (мягкое удаление)
    async delete(req, res, next) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) throw apiError.ValidationError([{ field: 'id', message: 'ID должен быть числом' }], 'SVCC005');

            const token = req.headers.authorization?.split(' ')[1];
            if (!token) throw apiError.UnauthorizedError('Токен отсутствует', 'SVCC006');

            const client = await pgdb.connect();
            try {
                const result = await systemVersionService.deleteVersion(client, id, token);
                res.json(result);
            } finally {
                client.release();
            }
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SystemVersionController();