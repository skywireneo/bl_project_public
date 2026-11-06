/**
 * Расширенный middleware для обработки ошибок
 * 
 * Возможности:
 * - Единообразный JSON-ответ
 * - Управление содержимым через флаги (errorConfig)
 * - Контекстная информация (requestId, userAgent, ip)
 * - Sanitization - очистка чувствительных данных из stack trace
 * - Поддержка serviceCode (FQ001, FQ003 и т.п.)
 * - Rate limiting информация (retryAfter)
 * - Цепочка ошибок (originalError)
 * 
 * Формат ответа:
 * {
 *   success: false,
 *   error: {
 *     code: 'ERROR_CODE',
 *     serviceCode: 'FQ001',      // Код сервиса/метода
 *     isMore: true               // Админ ли для модальных окон
 *     message: 'Описание ошибки',
 *     errors: [...],             // Детализированные ошибки (для валидации)
 *     timestamp: '2024-...',     // Если INCLUDE_TIMESTAMP = true
 *     path: '/api/...',          // Если INCLUDE_REQUEST_PATH = true
 *     method: 'POST',            // Если INCLUDE_REQUEST_PATH = true
 *     requestId: '...',          // Если INCLUDE_REQUEST_ID = true
 *     context: {...},            // Контекстная информация (userAgent, ip)
 *     stack: [...],              // Если INCLUDE_STACK_TRACE = true (очищенный)
 *     retryAfter: 60,            // Для rate limiting ошибок
 *     additionalData: {...}      // Дополнительные данные
 *   }
 * }
 */

const tokenService = require('../services/systemServices/tokenService');
const apiError = require('./apiError');
const errorConfig = require('./errorConfig');

/**
 * Список чувствительных паттернов для sanitization
 * Эти значения будут заменены на [FILTERED] в stack trace
 */
const SENSITIVE_PATTERNS = [
    /password[=:]\s*['"]?[\w\d]+['"]?/gi,
    /token[=:]\s*['"]?[\w\d\-_.]+['"]?/gi,
    /api[_-]?key[=:]\s*['"]?[\w\d\-_.]+['"]?/gi,
    /secret[=:]\s*['"]?[\w\d\-_.]+['"]?/gi,
    /authorization:\s*['"]?bearer\s+[\w\d\-_.]+['"]?/gi,
    /jwt[=:]\s*['"]?[\w\d\-_.]+['"]?/gi
];

/**
 * Очищает строку от чувствительных данных (пароли, токены, ключи)
 * 
 * @param {string} text - Текст для очистки
 * @returns {string} Очищенный текст
 */
function sanitizeText(text) {
    if (!text || typeof text !== 'string') return text;

    let sanitized = text;

    // Применяем все паттерны
    SENSITIVE_PATTERNS.forEach(pattern => {
        sanitized = sanitized.replace(pattern, (match) => {
            const key = match.split(/[=:]/)[0];
            return `${key}=[FILTERED]`;
        });
    });

    return sanitized;
}

/**
 * Форматирует и очищает stack trace
 * 
 * @param {string} stack - Stack trace
 * @param {boolean} shouldSanitize - Применять ли sanitization
 * @returns {Array<string>} Массив строк стека (очищенных)
 */
function formatStackTrace(stack, shouldSanitize = true) {
    if (!stack) return [];

    return stack
        .split('\n')
        .slice(1) // Убираем первую строку (сообщение об ошибке)
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => shouldSanitize ? sanitizeText(line) : line);
}

/**
 * Собирает контекстную информацию из запроса
 * 
 * @param {Object} req - Express request
 * @returns {Object} Контекстная информация
 */
function gatherContext(req) {
    const context = {};

    // User Agent
    if (req.get('user-agent')) {
        context.userAgent = req.get('user-agent');
    }

    // IP адрес (с учётом proxy)
    context.ip = req.ip ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.headers['x-forwarded-for']?.split(',')[0]?.trim();

    // Request ID (если используется middleware для генерации ID)
    if (req.id) {
        context.requestId = req.id;
    }

    // Referer
    if (req.get('referer')) {
        context.referer = req.get('referer');
    }

    // Accept-Language для определения предпочитаемого языка
    if (req.get('accept-language')) {
        context.acceptLanguage = req.get('accept-language');
    }

    return context;
}

/**
 * Основной обработчик ошибок
 * 
 * @param {Error} err - Объект ошибки
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next функция
 */
module.exports = function (err, req, res, next) {
    // Логируем в консоль для отладки
    console.error('❌ Ошибка:', {
        code: err.code || 'UNKNOWN',
        serviceCode: err.serviceCode || 'none',
        message: err.message,
        path: req.path,
        method: req.method
    });

    // Базовая структура ответа
    const response = {
        success: false,
        error: {}
    };

    const token = req?.headers?.authorization?.split(' ')[1]
    let decoded = null
    if (token)
        decoded = tokenService.validateToken(token)

    // Обработка apiError
    if (err instanceof apiError) {
        // Основные поля
        response.error.code = err.code;
        response.error.serviceCode = err.serviceCode || 'none';
        // console.log(decoded?.data?.status && ['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(decoded?.data?.status))
        response.error.isMore = decoded?.data?.status && ['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(decoded?.data?.status) || false;
        response.error.message = err.message;

        // Массив детализированных ошибок (для валидации)
        if (err.errors && err.errors.length > 0) {
            response.error.errors = err.errors;
        }

        // Добавляем timestamp, если включён флаг
        if (errorConfig.INCLUDE_TIMESTAMP) {
            response.error.timestamp = err.timestamp || new Date().toISOString();
        }

        // Добавляем путь и метод запроса, если включён флаг
        if (errorConfig.INCLUDE_REQUEST_PATH) {
            response.error.path = req.originalUrl || req.path;
            response.error.method = req.method;
        }

        // Добавляем request ID (из контекста), если включён флаг
        if (errorConfig.INCLUDE_REQUEST_ID && req.id) {
            response.error.requestId = req.id;
        }

        // Добавляем контекстную информацию (userAgent, ip и т.п.)
        if (errorConfig.INCLUDE_CONTEXT) {
            response.error.context = gatherContext(req);
        }

        // Добавляем stack trace с sanitization, если включён флаг
        if (errorConfig.INCLUDE_STACK_TRACE && err.stack) {
            response.error.stack = formatStackTrace(
                err.stack,
                errorConfig.SANITIZE_STACK_TRACE
            );
        }

        // Добавляем информацию о Rate Limiting (retryAfter)
        if (err.additionalData?.retryAfter) {
            response.error.retryAfter = err.additionalData.retryAfter;

            // Также устанавливаем заголовок Retry-After
            res.set('Retry-After', err.additionalData.retryAfter);
        }

        // Добавляем дополнительные данные (если есть)
        if (err.additionalData && Object.keys(err.additionalData).length > 0) {
            // Исключаем retryAfter, так как уже добавили выше
            const { retryAfter, ...otherData } = err.additionalData;

            if (Object.keys(otherData).length > 0) {
                response.error.additionalData = otherData;
            }
        }

        // Добавляем оригинальную ошибку (error chaining), если включён флаг
        if (errorConfig.INCLUDE_ORIGINAL_ERROR && err.originalError) {
            response.error.originalError = {
                name: err.originalError.name,
                message: err.originalError.message
            };

            // Добавляем stack оригинальной ошибки, если включён флаг
            if (errorConfig.INCLUDE_STACK_TRACE && err.originalError.stack) {
                response.error.originalError.stack = formatStackTrace(
                    err.originalError.stack,
                    errorConfig.SANITIZE_STACK_TRACE
                );
            }
        }

        return res.status(err.status).json(response);
    }

    // ============================================
    // Обработка обычных ошибок JavaScript
    // ============================================

    response.error.code = 'UNKNOWN_ERROR';
    response.error.serviceCode = 'none';

    // Показываем детали в зависимости от флага
    if (errorConfig.SHOW_INTERNAL_ERROR_DETAILS) {
        response.error.message = sanitizeText(err.message || 'Неизвестная ошибка');

        if (errorConfig.INCLUDE_STACK_TRACE && err.stack) {
            response.error.stack = formatStackTrace(
                err.stack,
                errorConfig.SANITIZE_STACK_TRACE
            );
        }
    } else {
        response.error.message = 'Внутренняя ошибка сервера';
    }

    // Добавляем timestamp
    if (errorConfig.INCLUDE_TIMESTAMP) {
        response.error.timestamp = new Date().toISOString();
    }

    // Добавляем путь запроса
    if (errorConfig.INCLUDE_REQUEST_PATH) {
        response.error.path = req.originalUrl || req.path;
        response.error.method = req.method;
    }

    // Добавляем request ID
    if (errorConfig.INCLUDE_REQUEST_ID && req.id) {
        response.error.requestId = req.id;
    }

    // Добавляем контекстную информацию
    if (errorConfig.INCLUDE_CONTEXT) {
        response.error.context = gatherContext(req);
    }

    return res.status(500).json(response);
};
