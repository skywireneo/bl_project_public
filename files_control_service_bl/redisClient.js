require('dotenv').config();
const { createClient } = require('redis');

// Создаем клиент Redis с автопереподключением
const redisClient = createClient({
    url: process.env.FILES_CONTROL_REDIS_URL,
    socket: {
        // Функция переподключения
        reconnectStrategy: (retries) => {
            console.log(`Попытка переподключения к Redis #${retries}`);
            // Ждем до 2 секунд между попытками
            return Math.min(retries * 50, 2000);
        }
    }
});

// Обработка событий Redis
redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('end', () => console.log('Соединение Redis закрыто'));
redisClient.on('reconnecting', () => console.log('Переподключение к Redis'));

// Функция подключения
(async () => {
    try {
        await redisClient.connect();
        console.log('Подключено к Redis');

        // Периодический PING каждые 60 секунд, чтобы держать соединение живым
        const pingInterval = setInterval(async () => {
            try {
                if (redisClient.isOpen) {
                    const res = await redisClient.ping();
                    // console.log('Redis PING OK:', res); // обычно "PONG"
                }
            } catch (err) {
                console.error('Redis ping failed:', err);
            }
        }, 60_000);


    } catch (err) {
        console.error('Ошибка при подключении к Redis:', err);
    }
})();

module.exports = redisClient;
