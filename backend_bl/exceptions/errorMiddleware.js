const tokenService = require('../services/systemServices/tokenService');
const apiError = require('./apiError');
const errorConfig = require('./errorConfig');

const SENSITIVE_PATTERNS = [
    /password[=:]\s*['"]?[\w\d]+['"]?/gi,
    /token[=:]\s*['"]?[\w\d\-_.]+['"]?/gi,
    /api[_-]?key[=:]\s*['"]?[\w\d\-_.]+['"]?/gi,
    /secret[=:]\s*['"]?[\w\d\-_.]+['"]?/gi,
    /authorization:\s*['"]?bearer\s+[\w\d\-_.]+['"]?/gi,
    /jwt[=:]\s*['"]?[\w\d\-_.]+['"]?/gi
];

function sanitizeText(text) {
    if (!text || typeof text !== 'string') return text;
    let sanitized = text;
    SENSITIVE_PATTERNS.forEach(pattern => {
        sanitized = sanitized.replace(pattern, (match) => {
            const key = match.split(/[=:]/)[0];
            return `${key}=[FILTERED]`;
        });
    });
    return sanitized;
}

function formatStackTrace(stack, shouldSanitize = true) {
    if (!stack) return [];
    return stack
        .split('\n')
        .slice(1)
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => shouldSanitize ? sanitizeText(line) : line);
}

function gatherContext(req) {
    const context = {};
    if (req.get('user-agent')) context.userAgent = req.get('user-agent');
    context.ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0]?.trim();
    if (req.id) context.requestId = req.id;
    if (req.get('referer')) context.referer = req.get('referer');
    if (req.get('accept-language')) context.acceptLanguage = req.get('accept-language');
    return context;
}

module.exports = function (err, req, res, next) {
    // Логируем в консоль для отладки с полным стеком (видно только на сервере)
    console.error('❌ Ошибка:', {
        code: err.code || 'UNKNOWN',
        serviceCode: err.serviceCode || 'none',
        message: err.message,
        path: req.path,
        method: req.method,
        stack: err.stack || 'Нет стека'
    });

    if (err.stack) {
        console.error('📚 Полный стек ошибки:\n', err.stack);
    }

    const response = {
        success: false,
        error: {}
    };

    //  ОПТИМИЗАЦИЯ: Берем пользователя из req.user (если authMiddleware уже отработал)
    // Или fallback на ручной парсинг токена, если middleware не сработал
    const userStatus = req.user?.status || (() => {
        const token = req?.headers?.authorization?.split(' ')[1];
        if (token) {
            const decoded = tokenService.validateToken(token);
            return decoded?.data?.status;
        }
        return null;
    })();

    const isAdmin = userStatus && ['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(userStatus);

    // ============================================
    // Обработка apiError
    // ============================================
    if (err instanceof apiError) {
        // 1. Базовые поля для ВСЕХ (включая retryAfter для фронтенда)
        response.error.code = err.code;
        response.error.serviceCode = err.serviceCode || 'none';
        response.error.isMore = isAdmin; // Флаг для модалки на фронте
        response.error.message = err.message;

        if (err.errors && err.errors.length > 0) {
            response.error.errors = err.errors;
        }

        //  КРИТИЧЕСКИ ВАЖНО: retryAfter отдаем ВСЕМ, чтобы фронтенд мог показать таймер
        if (err.additionalData?.retryAfter) {
            response.error.retryAfter = err.additionalData.retryAfter;
            res.set('Retry-After', err.additionalData.retryAfter);
        }

        // 2.  БЕЗОПАСНОСТЬ: Детальная информация ТОЛЬКО для админов
        if (isAdmin) {
            if (errorConfig.INCLUDE_TIMESTAMP) {
                response.error.timestamp = err.timestamp || new Date().toISOString();
            }
            if (errorConfig.INCLUDE_REQUEST_PATH) {
                response.error.path = req.originalUrl || req.path;
                response.error.method = req.method;
            }
            if (errorConfig.INCLUDE_REQUEST_ID && req.id) {
                response.error.requestId = req.id;
            }
            if (errorConfig.INCLUDE_CONTEXT) {
                response.error.context = gatherContext(req);
            }
            if (errorConfig.INCLUDE_STACK_TRACE && err.stack) {
                response.error.stack = formatStackTrace(err.stack, errorConfig.SANITIZE_STACK_TRACE);
            }

            if (errorConfig.INCLUDE_ORIGINAL_ERROR && err.originalError) {
                response.error.originalError = {
                    name: err.originalError.name,
                    message: err.originalError.message
                };
                if (errorConfig.INCLUDE_STACK_TRACE && err.originalError.stack) {
                    response.error.originalError.stack = formatStackTrace(
                        err.originalError.stack,
                        errorConfig.SANITIZE_STACK_TRACE
                    );
                }
            }
        }

        // Дополнительные данные (кроме retryAfter, который уже добавили)
        if (err.additionalData && Object.keys(err.additionalData).length > 0) {
            const { retryAfter, ...otherData } = err.additionalData;
            if (Object.keys(otherData).length > 0) {
                // Если это не админ, можно фильтровать sensitive данные из otherData, 
                // но обычно там безопасные метаданные.
                response.error.additionalData = otherData;
            }
        }

        return res.status(err.status).json(response);
    }

    // ============================================
    // Обработка обычных ошибок JavaScript (500)
    // ============================================
    response.error.code = 'UNKNOWN_ERROR';
    response.error.serviceCode = 'none';
    response.error.isMore = isAdmin;

    if (errorConfig.SHOW_INTERNAL_ERROR_DETAILS && isAdmin) {
        response.error.message = sanitizeText(err.message || 'Неизвестная ошибка');
        if (errorConfig.INCLUDE_STACK_TRACE && err.stack) {
            response.error.stack = formatStackTrace(err.stack, errorConfig.SANITIZE_STACK_TRACE);
        }
    } else {
        // Для обычных пользователей всегда показываем общее сообщение
        response.error.message = 'Внутренняя ошибка сервера';
    }

    // Детали для 500 ошибок тоже только админам
    if (isAdmin) {
        if (errorConfig.INCLUDE_TIMESTAMP) response.error.timestamp = new Date().toISOString();
        if (errorConfig.INCLUDE_REQUEST_PATH) {
            response.error.path = req.originalUrl || req.path;
            response.error.method = req.method;
        }
        if (errorConfig.INCLUDE_CONTEXT) response.error.context = gatherContext(req);
    }

    return res.status(500).json(response);
};