// middleware/trustMiddleware.js
const crypto = require('crypto');
const apiError = require('../exceptions/apiError');

const MAX_TIME_DIFF_SECONDS = 30;

const SYSTEM_TRUST_TOKENS = process.env.SYSTEM_TRUST_TOKENS
    ? new Set(process.env.SYSTEM_TRUST_TOKENS.split(',').map(t => t.trim()))
    : new Set();

if (SYSTEM_TRUST_TOKENS.size === 0) {
    console.warn('[trustMiddleware] ВНИМАНИЕ: SYSTEM_TRUST_TOKENS не установлен или пуст в .env');
}

const FRONTEND_SECRET_KEY = process.env.REACT_APP_BACKEND_SECRET_KEY;

if (!FRONTEND_SECRET_KEY) {
    console.error('[trustMiddleware] КРИТИЧЕСКАЯ ОШИБКА: REACT_APP_BACKEND_SECRET_KEY не установлен в .env');
    process.exit(1);
}

const SECRET_KEY_BUFFER = Buffer.from(FRONTEND_SECRET_KEY, 'base64');

const trustMiddleware = (req, res, next) => {
    // === СЦЕНАРИЙ А: Системный обход ===
    const systemTrustToken = req.headers['x-system-trust'];

    if (systemTrustToken) {
        if (SYSTEM_TRUST_TOKENS.has(systemTrustToken)) {
            req.isSystemTrusted = true;
            req.trustSource = 'system';
            return next();
        } else {
            return next(apiError.Forbidden('INVALID_SYSTEM_TOKEN', 'Неверный системный токен'));
        }
    }

    // === СЦЕНАРИЙ Б: Проверка фронтенда ===
    const timestamp = req.headers['x-trust-timestamp'];
    const signature = req.headers['x-trust-signature'];

    if (!timestamp || !signature) {
        return next(apiError.BadRequest('TRUST_HEADERS_MISSING', 'Отсутствуют заголовки доверия'));
    }

    const timestampNum = parseInt(timestamp, 10);
    if (isNaN(timestampNum)) {
        return next(apiError.BadRequest('INVALID_TIMESTAMP', 'Неверный формат timestamp'));
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(currentTime - timestampNum);

    if (timeDiff > MAX_TIME_DIFF_SECONDS) {
        return next(apiError.Forbidden('REQUEST_EXPIRED', `Запрос устарел. Разница: ${timeDiff} сек`));
    }

    // ИСПРАВЛЕНИЕ: Берем полный оригинальный URL и отрезаем query-параметры (?)
    // Например: /sys/incident/getContestationsForIncident/14012026-JDIDM?foo=bar -> /sys/incident/getContestationsForIncident/14012026-JDIDM
    const cleanPath = req.originalUrl.split('?')[0];

    const stringToSign = `${timestamp}|${req.method}|${cleanPath}`;

    // Вычисляем ожидаемую подпись
    const expectedSignature = crypto
        .createHmac('sha256', SECRET_KEY_BUFFER)
        .update(stringToSign)
        .digest('hex');

    // Безопасное сравнение
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
        return next(apiError.Forbidden('INVALID_SIGNATURE', 'Неверная подпись запроса'));
    }

    req.isFrontendTrusted = true;
    req.trustSource = 'frontend';
    next();
};

module.exports = trustMiddleware;