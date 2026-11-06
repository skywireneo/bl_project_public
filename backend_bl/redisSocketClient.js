require('dotenv').config();
const { createClient } = require('redis');

const createRedisClient = () => {
    return createClient({
        url: process.env.BACKEND_REDIS_URL,
        socket: {
            reconnectStrategy: (retries) => Math.min(retries * 50, 2000)
        }
    });
};

const socketPubClient = createRedisClient();
const socketSubClient = createRedisClient();

socketPubClient.on('error', (err) => console.error('[Socket Redis] Pub Error:', err));
socketSubClient.on('error', (err) => console.error('[Socket Redis] Sub Error:', err));

const connectSocketRedis = async () => {
    try {
        await Promise.all([socketPubClient.connect(), socketSubClient.connect()]);
        console.log(' Подключено к выделенному Redis для Socket.io (Pub & Sub)');
    } catch (err) {
        console.error('❌ Ошибка при подключении Socket Redis:', err);
    }
};

connectSocketRedis();

module.exports = { socketPubClient, socketSubClient };