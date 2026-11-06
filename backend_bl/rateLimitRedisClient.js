require('dotenv').config();
const Redis = require('ioredis');

const rateLimitRedisClient = new Redis(process.env.BACKEND_REDIS_URL, {
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3
});

rateLimitRedisClient.on('connect', () => console.log(' Rate-Limit Redis (ioredis) подключен'));
rateLimitRedisClient.on('error', (err) => console.error('❌ Rate-Limit Redis Error:', err));

module.exports = rateLimitRedisClient;