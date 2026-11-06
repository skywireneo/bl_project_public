const tokenService = require('../services/systemServices/tokenService');
const pgdb = require('../pgdb');
const statisticService = require('../services/stats/statisticService');
const actionStatsService = require('../services/stats/actionStatsService');

class statsController {

    async aggregateFromRedis(req, res, next) {
        try {
            const client = await pgdb.connect();
            try {
                await client.query('BEGIN');
                const result = await statisticService.aggregateFromRedis(client)
                await client.query('COMMIT');
                res.json(result)
            } catch (error) {
                await client.query('ROLLBACK');
                next(e)
            } finally {
                client.release();
            }
        } catch (e) {
            next(e)
        }
    }

    async aggregateToHigherGranularity(req, res, next) {
        try {
            const client = await pgdb.connect();
            try {
                await client.query('BEGIN');
                const result = await statisticService.aggregateToHigherGranularity(client)
                await client.query('COMMIT');
                res.json(result)
            } catch (error) {
                await client.query('ROLLBACK');
                next(e)
            } finally {
                client.release();
            }
        } catch (e) {
            next(e)
        }
    }

    async cleanup(req, res, next) {
        try {
            const client = await pgdb.connect();
            try {
                await client.query('BEGIN');
                const result = await statisticService.cleanup(client)
                await client.query('COMMIT');
                res.json(result)
            } catch (error) {
                await client.query('ROLLBACK');
                next(e)
            } finally {
                client.release();
            }
        } catch (e) {
            next(e)
        }
    }

    async delete(req, res, next) {
        const client = await pgdb.connect();
        try {
            const { metric_name, entity_id } = req.body;
            const result = await statisticService.delete(client, metric_name, entity_id)
            res.json(result)
        } catch (e) {
            next(e)
        } finally {
            client.release();
        }
    }

    async get(req, res, next) {
        const client = await pgdb.connect();
        try {
            const metric_name = req.query.metric_name
            const entity_id = req.query.entity_id

            const from = req.query.from
            const to = req.query.to
            const granularity = req.query.granularity
            const format = req.query.format
            const force_refresh = req.query.force_refresh
            const result = await statisticService.get(client, metric_name, entity_id, {
                from: from,
                to: to,
                granularity: granularity,
                format: format,
                force_refresh: force_refresh
            })
            res.json(result)
        } catch (e) {
            next(e)
        } finally {
            client.release();
        }

    }

    async overview(req, res, next) {
        const client = await pgdb.connect();
        try {
            const stats = await statisticService.getOverviewStats(client);
            res.json(stats)
        } catch (e) {
            next(e)
        } finally {
            client.release();
        }
    }

    async getModuleStats(req, res, next) {
        try {
            const { module } = req.query;
            if (!module) {
                return res.status(400).json({ message: 'Параметр module обязателен' });
            }

            const client = await pgdb.connect();
            try {
                const stats = await actionStatsService.getModuleStats(client, module);
                res.json(stats);
            } finally {
                client.release();
            }
        } catch (e) {
            next(e);
        }
    }

    async cleanupOldStats(req, res, next) {
        const client = await pgdb.connect();
        try {
            const stats = await actionStatsService.cleanupOldStats(client);
            res.json(stats)
        } catch (e) {
            next(e)
        } finally {
            client.release();
        }
    }
}

module.exports = new statsController()
