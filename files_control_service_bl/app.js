require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const grpcClient = require('./grpc/clients/grpcClient'); // Подключаем клиент для работы с gRPC

const db = require('./pgdb');
const redisClient = require('./redisClient');

const PORT = process.env.FILES_CONTROL_PORT;
const http = require('http').Server(app);

const router = require('./router/index');
const errorMiddleware = require('./exceptions/errorMiddleware');

const GrpcService = require('./grpc/services/grpcService');

app.use(express.json());
app.use(cors());
app.set('trust proxy', true);
// Увеличьте лимит для JSON и файлов (например, до 30MB)
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));

app.use('/filesAPI', router);

app.get('/test', async (req, res) => {
    const key = 'test_key';
    const value = await redisClient.get(key);
    if (value) {
        return res.send(`Значение из Redis: ${value}`);
    }
    await redisClient.set(key, 'Hello from Redis!');
    res.send('Значение добавлено в Redis');
});

app.use(errorMiddleware);

const start = async () => {
    try {
        // Запускаем gRPC сервер
        GrpcService.startGrpcServer();

        // Запускаем HTTP + Socket.IO
        http.listen(PORT || 3000, () => {
            console.log(`Сервер работает на порту ${PORT || 3000}`);
        });

    } catch (e) {
        console.error('Ошибка при старте сервера:', e);
        process.exit(1);
    }
};

// Запуск
start();