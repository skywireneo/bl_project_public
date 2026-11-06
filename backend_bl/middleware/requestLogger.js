const pinoHttp = require('pino-http');
const { randomUUID } = require('crypto');
const logger = require('../services/utils/logger'); // Проверьте путь
const tokenService = require('../services/systemServices/tokenService'); // Проверьте путь
const appSettings = require('../services/utils/appSettings');

// 1. Базовая настройка pino-http
const pinoMiddleware = pinoHttp({
    logger,
    genReqId: (req) => req.headers['x-request-id'] || randomUUID(),
    customSuccessMessage: (req, res) => `${req.method} ${req.url} completed (${res.statusCode})`,
    customErrorMessage: (req, res, err) => `${req.method} ${req.url} failed (${res.statusCode}): ${err.message}`,

    //  ДИНАМИЧЕСКОЕ УПРАВЛЕНИЕ:
    // ignore возвращает true, если логирование нужно ПРОПУСТИТЬ.
    // Поэтому мы инвертируем наше значение isLoggingEnabled.
    autoLogging: {
        ignore: (req) => {
            // Дополнительно: можно всегда игнорировать healthcheck или favicon
            if (req.url === '/health' || req.url === '/favicon.ico') {
                return true;
            }
            return !appSettings.isLoggingEnabled;
        }
    }
});

// 2. Оборачиваем в Express middleware для внедрения контекста
const requestLogger = (req, res, next) => {
    // Если логирование глобально выключено, можно даже не инициализировать pino, 
    // но pinoHttp сам это сделает благодаря ignore выше. Мы просто добавляем контекст.

    pinoMiddleware(req, res, () => {
        const authHeader = req?.headers?.authorization;
        const token = authHeader ? authHeader.split(' ')[1] : null;
        const decoded = token ? tokenService.validateToken(token) : null;
        const current_user = decoded ? decoded?.data : null;

        const xff = req.headers['x-forwarded-for'] || '';
        let client_ip = xff ? xff.split(',')[0].trim() : (req.headers['x-real-ip'] || req.socket?.remoteAddress);

        req.log = req.log.child({
            user_id: current_user?.id || null,
            user_login: current_user?.login || current_user?.email || 'anonymous',
            user_status: current_user?.status || null,
            client_ip: client_ip || 'unknown',
            http_method: req.method,
            http_url: req.originalUrl || req.url,
        });

        next();
    });
};

module.exports = requestLogger;