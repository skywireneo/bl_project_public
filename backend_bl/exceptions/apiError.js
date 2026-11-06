/**
 * Расширенный класс для работы с API ошибками
 *
 * Возможности:
 * - Детализированные ошибки валидации (массив ошибок полей)
 * - Локализация сообщений (ru/en)
 * - Цепочка ошибок (сохранение оригинальной ошибки)
 * - Rate limiting информация
 * - Контекстная информация (requestId, userAgent, ip)
 * - Error templates (шаблоны для частых ошибок)
 * - Service code (FQ001, FQ003 и т.п.)
 *
 * @example
 * // Простое использование
 * throw apiError.BadRequest(ERROR_CODES.VALIDATION_ERROR, 'Поле обязательно', 'FQ001');
 *
 * @example
 * // Детализированная валидация
 * throw apiError.ValidationError([
 *   { field: 'email', message: 'Некорректный email' },
 *   { field: 'password', message: 'Минимум 6 символов' }
 * ], 'FQ002');
 *
 * @example
 * // Rate Limiting
 * throw apiError.TooManyRequests(60, 'FQ005'); // retryAfter 60 секунд
 *
 * @example
 * // Использование шаблонов
 * throw apiError.Templates.notFound('FAQ', 'FQ010');
 */

const { getErrorMessage } = require('./errorMessages');

class apiError extends Error {
    /**
     * @param {number} status - HTTP статус код
     * @param {string} code - Уникальный код ошибки (например, 'VALIDATION_ERROR')
     * @param {string} message - Человекочитаемое сообщение об ошибке
     * @param {string} serviceCode - Код сервиса/метода (FQ001, FQ003 и т.п.)
     * @param {Array} errors - Дополнительные ошибки (для валидации)
     * @param {Object} additionalData - Дополнительные данные
     */
    constructor(status, code, message, serviceCode = 'none', errors = [], additionalData = {}) {
        super(message);

        this.status = status;                  // HTTP статус код
        this.code = code;                      // Код ошибки для фронтенда
        this.serviceCode = serviceCode;        // Код сервиса (FQ001, FQ003, и т.п.)
        this.message = message;                // Сообщение об ошибке
        this.errors = errors;                  // Массив детальных ошибок (для валидации)
        this.additionalData = additionalData;  // Дополнительные данные
        this.timestamp = new Date().toISOString(); // Время возникновения

        // Сохраняем оригинальную ошибку, если есть (для цепочки)
        if (additionalData.originalError) {
            this.originalError = additionalData.originalError;
        }

        // Сохраняем stack trace
        Error.captureStackTrace(this, this.constructor);
    }

    // ============================================
    // Статические методы для создания ошибок
    // ============================================

    /**
     * Создаёт ошибку Bad Request (400)
     * Используется для ошибок валидации и некорректных запросов
     *
     * @param {string|Object} codeOrErrorObj - Код ошибки или объект из ERROR_CODES
     * @param {string} message - Сообщение (опционально при использовании объекта)
     * @param {string} serviceCode - Код сервиса (FQ001 и т.п.), по умолчанию 'none'
     * @param {Array} errors - Массив дополнительных ошибок
     * @param {Object} additionalData - Дополнительные данные
     * @param {string} lang - Язык сообщения ('ru' или 'en')
     * @returns {apiError}
     *
     * @example
     * throw apiError.BadRequest('VALIDATION_ERROR', 'Неверные данные', 'FQ001');
     * throw apiError.BadRequest(ERROR_CODES.VALIDATION_ERROR, null, 'FQ002');
     */
    static BadRequest(codeOrErrorObj, message = '', serviceCode = 'none', errors = [], additionalData = {}, lang = 'ru') {
        let finalCode, finalMessage, finalStatus;

        if (typeof codeOrErrorObj === 'object' && codeOrErrorObj.code) {
            // Если передан объект из ERROR_CODES
            finalCode = codeOrErrorObj.code;
            finalStatus = codeOrErrorObj.httpStatus || 400;
            finalMessage = message || getErrorMessage(finalCode, lang, codeOrErrorObj.message);
        } else {
            // Если передана строка
            finalCode = codeOrErrorObj;
            finalStatus = 400;
            finalMessage = message || getErrorMessage(finalCode, lang);
        }

        return new apiError(finalStatus, finalCode, finalMessage, serviceCode, errors, additionalData);
    }

    /**
     * Создаёт ошибку Unauthorized (401)
     * Используется когда требуется авторизация
     *
     * @param {string|Object} codeOrErrorObj - Код ошибки или объект из ERROR_CODES
     * @param {string} message - Сообщение
     * @param {string} serviceCode - Код сервиса
     * @param {Object} additionalData - Дополнительные данные
     * @param {string} lang - Язык сообщения
     * @returns {apiError}
     *
     * @example
     * throw apiError.Unauthorized('INVALID_TOKEN', 'Токен недействителен', 'FQ003');
     */
    static Unauthorized(codeOrErrorObj, message = '', serviceCode = 'none', additionalData = {}, lang = 'ru') {
        let finalCode, finalMessage, finalStatus;

        if (typeof codeOrErrorObj === 'object' && codeOrErrorObj.code) {
            finalCode = codeOrErrorObj.code;
            finalStatus = codeOrErrorObj.httpStatus || 401;
            finalMessage = message || getErrorMessage(finalCode, lang, codeOrErrorObj.message);
        } else {
            finalCode = codeOrErrorObj;
            finalStatus = 401;
            finalMessage = message || getErrorMessage(finalCode, lang);
        }

        return new apiError(finalStatus, finalCode, finalMessage, serviceCode, [], additionalData);
    }

    /**
     * Создаёт ошибку Forbidden (403)
     * Используется когда доступ запрещён
     *
     * @param {string|Object} codeOrErrorObj - Код ошибки или объект из ERROR_CODES
     * @param {string} message - Сообщение
     * @param {string} serviceCode - Код сервиса
     * @param {Object} additionalData - Дополнительные данные
     * @param {string} lang - Язык сообщения
     * @returns {apiError}
     *
     * @example
     * throw apiError.Forbidden('NO_ACCESS', 'Недостаточно прав', 'FQ004');
     */
    static Forbidden(codeOrErrorObj = 'FORBIDDEN', message = '', serviceCode = 'none', additionalData = {}, lang = 'ru') {
        let finalCode, finalMessage, finalStatus;

        if (typeof codeOrErrorObj === 'object' && codeOrErrorObj.code) {
            finalCode = codeOrErrorObj.code;
            finalStatus = codeOrErrorObj.httpStatus || 403;
            finalMessage = message || getErrorMessage(finalCode, lang, codeOrErrorObj.message);
        } else {
            finalCode = codeOrErrorObj;
            finalStatus = 403;
            finalMessage = message || getErrorMessage(finalCode, lang, 'Доступ запрещён');
        }

        return new apiError(finalStatus, finalCode, finalMessage, serviceCode, [], additionalData);
    }

    /**
     * Создаёт ошибку Not Found (404)
     * Используется когда ресурс не найден
     *
     * @param {string|Object} codeOrErrorObj - Код ошибки или объект из ERROR_CODES
     * @param {string} message - Сообщение
     * @param {string} serviceCode - Код сервиса
     * @param {Object} additionalData - Дополнительные данные
     * @param {string} lang - Язык сообщения
     * @returns {apiError}
     *
     * @example
     * throw apiError.NotFound('FAQ_NOT_FOUND', 'FAQ не найден', 'FQ005');
     */
    static NotFound(codeOrErrorObj, message = '', serviceCode = 'none', additionalData = {}, lang = 'ru') {
        let finalCode, finalMessage, finalStatus;

        if (typeof codeOrErrorObj === 'object' && codeOrErrorObj.code) {
            finalCode = codeOrErrorObj.code;
            finalStatus = codeOrErrorObj.httpStatus || 404;
            finalMessage = message || getErrorMessage(finalCode, lang, codeOrErrorObj.message);
        } else {
            finalCode = codeOrErrorObj;
            finalStatus = 404;
            finalMessage = message || getErrorMessage(finalCode, lang, 'Ресурс не найден');
        }

        return new apiError(finalStatus, finalCode, finalMessage, serviceCode, [], additionalData);
    }

    /**
     * Создаёт ошибку Internal Server Error (500)
     * Используется для внутренних ошибок сервера
     *
     * @param {string} message - Сообщение
     * @param {string} serviceCode - Код сервиса
     * @param {Object} additionalData - Дополнительные данные
     * @param {string} lang - Язык сообщения
     * @returns {apiError}
     *
     * @example
     * throw apiError.Internal('Ошибка подключения к БД', 'FQ006');
     */
    static Internal(message = '', serviceCode = 'none', additionalData = {}, lang = 'ru') {
        const finalMessage = message || getErrorMessage('INTERNAL_ERROR', lang);
        return new apiError(500, 'INTERNAL_ERROR', finalMessage, serviceCode, [], additionalData);
    }

    /**
     * Создаёт ошибку Too Many Requests (429) с информацией о retry
     * Используется для Rate Limiting
     *
     * @param {number} retryAfter - Через сколько секунд можно повторить запрос
     * @param {string} serviceCode - Код сервиса
     * @param {string} message - Кастомное сообщение
     * @param {string} lang - Язык сообщения
     * @returns {apiError}
     *
     * @example
     * throw apiError.TooManyRequests(60, 'FQ007'); // Повторите через 60 секунд
     */
    static TooManyRequests(retryAfter = 60, serviceCode = 'none', message = '', lang = 'ru') {
        const finalMessage = message || getErrorMessage('RATE_LIMIT_EXCEEDED', lang);

        return new apiError(
            429,
            'RATE_LIMIT_EXCEEDED',
            finalMessage,
            serviceCode,
            [],
            { retryAfter }
        );
    }

    /**
     * Создаёт детализированную ошибку валидации с массивом ошибок полей
     *
     * @param {Array} validationErrors - Массив ошибок: [{field, message, value?}, ...]
     * @param {string} serviceCode - Код сервиса
     * @param {string} message - Общее сообщение
     * @param {string} lang - Язык сообщения
     * @returns {apiError}
     *
     * @example
     * throw apiError.ValidationError([
     *   { field: 'email', message: 'Некорректный email' },
     *   { field: 'password', message: 'Минимум 6 символов', value: '123' }
     * ], 'FQ008');
     */
    static ValidationError(validationErrors = [], serviceCode = 'none', message = '', lang = 'ru') {
        const finalMessage = message || getErrorMessage('VALIDATION_ERROR', lang);

        return new apiError(
            400,
            'VALIDATION_ERROR',
            finalMessage,
            serviceCode,
            validationErrors,
            { validationErrorsCount: validationErrors.length }
        );
    }

    /**
     * Создаёт кастомную ошибку с произвольным статусом
     *
     * @param {number} status - HTTP статус
     * @param {string} code - Код ошибки
     * @param {string} message - Сообщение
     * @param {string} serviceCode - Код сервиса
     * @param {Array} errors - Массив ошибок
     * @param {Object} additionalData - Дополнительные данные
     * @returns {apiError}
     *
     * @example
     * throw apiError.Custom(503, 'SERVICE_UNAVAILABLE', 'Сервис недоступен', 'FQ009');
     */
    static Custom(status, code, message, serviceCode = 'none', errors = [], additionalData = {}) {
        return new apiError(status, code, message, serviceCode, errors, additionalData);
    }

    /**
     * Преобразует обычную ошибку в apiError (с цепочкой ошибок)
     * Сохраняет оригинальную ошибку для трассировки
     *
     * @param {Error} error - Обычная ошибка JavaScript
     * @param {string} code - Код ошибки
     * @param {string} serviceCode - Код сервиса
     * @param {number} status - HTTP статус (по умолчанию 500)
     * @param {string} message - Кастомное сообщение (если не указано, берётся из error)
     * @returns {apiError}
     *
     * @example
     * try {
     *   await externalAPI.call();
     * } catch (error) {
     *   throw apiError.FromError(error, 'EXTERNAL_SERVICE_ERROR', 'FQ010');
     * }
     */
    static FromError(error, code = 'INTERNAL_ERROR', serviceCode = 'none', status = 500, message = '') {
        const finalMessage = message || error.message || getErrorMessage(code, 'ru');

        const apiError = new apiError(
            status,
            code,
            finalMessage,
            serviceCode,
            [],
            {
                originalError: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                }
            }
        );

        // Сохраняем оригинальный stack trace
        if (error.stack) {
            apiError.originalStack = error.stack;
        }

        return apiError;
    }

    // ============================================
    // Error Templates - Шаблоны для частых ошибок
    // ============================================

    /**
     * Коллекция готовых шаблонов для частых ошибок
     */
    static Templates = {
        /**
         * Шаблон "Ресурс не найден"
         * @param {string} resourceName - Название ресурса (FAQ, Пользователь и т.п.)
         * @param {string} serviceCode - Код сервиса
         * @param {string} lang - Язык
         */
        notFound: (resourceName, serviceCode = 'none', lang = 'ru') => {
            const messages = {
                ru: `${resourceName} не найден`,
                en: `${resourceName} not found`
            };
            return apiError.NotFound('RESOURCE_NOT_FOUND', messages[lang], serviceCode);
        },

        /**
         * Шаблон "Ресурс уже существует"
         * @param {string} resourceName - Название ресурса
         * @param {string} serviceCode - Код сервиса
         * @param {string} lang - Язык
         */
        alreadyExists: (resourceName, serviceCode = 'none', lang = 'ru') => {
            const messages = {
                ru: `${resourceName} уже существует`,
                en: `${resourceName} already exists`
            };
            return apiError.BadRequest('RESOURCE_ALREADY_EXISTS', messages[lang], serviceCode);
        },

        /**
         * Шаблон "Обязательное поле не заполнено"
         * @param {string} fieldName - Название поля
         * @param {string} serviceCode - Код сервиса
         * @param {string} lang - Язык
         */
        requiredField: (fieldName, serviceCode = 'none', lang = 'ru') => {
            const messages = {
                ru: `Не указано обязательное поле: ${fieldName}`,
                en: `Required field missing: ${fieldName}`
            };
            return apiError.BadRequest('REQUIRED_FIELD_MISSING', messages[lang], serviceCode);
        },

        /**
         * Шаблон "Недостаточно прав"
         * @param {string} action - Действие, которое нельзя выполнить
         * @param {string} serviceCode - Код сервиса
         * @param {string} lang - Язык
         */
        noPermission: (action, serviceCode = 'none', lang = 'ru') => {
            const messages = {
                ru: `Недостаточно прав для: ${action}`,
                en: `Insufficient permissions for: ${action}`
            };
            return apiError.Forbidden('NO_ACCESS', messages[lang], serviceCode);
        },

        /**
         * Шаблон "Некорректное значение"
         * @param {string} fieldName - Название поля
         * @param {string} expectedType - Ожидаемый тип (число, строка и т.п.)
         * @param {string} serviceCode - Код сервиса
         * @param {string} lang - Язык
         */
        invalidValue: (fieldName, expectedType, serviceCode = 'none', lang = 'ru') => {
            const messages = {
                ru: `Некорректное значение поля ${fieldName}. Ожидается: ${expectedType}`,
                en: `Invalid value for field ${fieldName}. Expected: ${expectedType}`
            };
            return apiError.BadRequest('INVALID_INPUT', messages[lang], serviceCode);
        }
    };
}

module.exports = apiError;
