require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const http = require('http').Server(app);

const router = require('./router/index');
const errorMiddleware = require('./exceptions/errorMiddleware');
const GrpcService = require('./grpc/services/grpcService');
const httpLogger = require('./middleware/requestLogger');

const appSettings = require('./services/utils/appSettings');
const mainSettindsService = require('./services/systemSettings/mainSettindsService');
const pool = require('./pgdb');
const { initSocketServer } = require('./services/systemServices/socket/socketServer');

const PORT = process.env.BACKEND_PORT || 3000;

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));
app.use(cors());
app.set('trust proxy', true);

app.use(httpLogger);

initSocketServer(http);

const maintenanceService = require('./services/systemServices/maintenanceService');

app.use('/sys', router);

app.get('/test', async (req, res) => {
    req.log.info('Тестовый запрос выполнен успешно');
    res.send('Тест бека');
});

app.use(errorMiddleware);

const start = async () => {
    try {
        let client;
        try {
            client = await pool.connect();
            const loggingValue = await mainSettindsService.selectSetting(client, 'logging');

            const isEnabled = loggingValue === 'true' || loggingValue === true;
            appSettings.setLoggingEnabled(isEnabled);

            console.log(`[SERVER INIT]  Настройка логирования загружена: ${isEnabled ? 'ВКЛ' : 'ВЫКЛ'}`);
        } catch (err) {
            console.error('[SERVER INIT]  Ошибка чтения настройки logging при старте. Используем значение по умолчанию (ВКЛ). Детали:', err.message);
        } finally {
            if (client) {
                client.release();
            }
        }

        GrpcService.startGrpcServer();
        http.listen(PORT, () => {
            console.log(`🚀 Сервер работает на порту ${PORT}`);
        });
    } catch (e) {
        console.error('❌ Критическая ошибка при старте сервера:', e);
        process.exit(1);
    }
};

start();