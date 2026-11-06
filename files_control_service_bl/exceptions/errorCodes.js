/**
 * Централизованные коды ошибок
 * 
 * Этот файл содержит все возможные типы ошибок в системе.
 * Используйте эти константы вместо строковых литералов для единообразия.
 * 
 * Структура:
 * - code (string): уникальный идентификатор ошибки
 * - message (string): сообщение по умолчанию на русском
 * - httpStatus (number): HTTP статус код
 * 
 * Для расширения в других сервисах добавляйте новые коды в конец соответствующей категории
 */

const ERROR_CODES = {
    // === Ошибки валидации (400) ===
    VALIDATION_ERROR: {
        code: 'VALIDATION_ERROR',
        message: 'Ошибка валидации данных',
        httpStatus: 400
    },

    INVALID_INPUT: {
        code: 'INVALID_INPUT',
        message: 'Некорректные входные данные',
        httpStatus: 400
    },

    REQUIRED_FIELD_MISSING: {
        code: 'REQUIRED_FIELD_MISSING',
        message: 'Не указано обязательное поле',
        httpStatus: 400
    },

    NOT_A_NUMBER: {
        code: 'NOT_A_NUMBER',
        message: 'Значение должно быть числом',
        httpStatus: 400
    },

    INVALID_NUMBER: {
        code: 'INVALID_NUMBER',
        message: 'Некорректное числовое значение',
        httpStatus: 400
    },

    INVALID_EMAIL: {
        code: 'INVALID_EMAIL',
        message: 'Некорректный формат email',
        httpStatus: 400
    },

    PASSWORD_TOO_SHORT: {
        code: 'PASSWORD_TOO_SHORT',
        message: 'Пароль слишком короткий',
        httpStatus: 400
    },

    // === Ошибки существования ресурсов (400/404) ===
    RESOURCE_NOT_FOUND: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Ресурс не найден',
        httpStatus: 404
    },

    RESOURCE_ALREADY_EXISTS: {
        code: 'RESOURCE_ALREADY_EXISTS',
        message: 'Ресурс уже существует',
        httpStatus: 400
    },

    // === Ошибки доступа (403) ===
    FORBIDDEN: {
        code: 'FORBIDDEN',
        message: 'Доступ запрещён',
        httpStatus: 403
    },

    NO_ACCESS: {
        code: 'NO_ACCESS',
        message: 'Недостаточно прав для выполнения операции',
        httpStatus: 403
    },

    // === Ошибки авторизации (401) ===
    UNAUTHORIZED: {
        code: 'UNAUTHORIZED',
        message: 'Требуется авторизация',
        httpStatus: 401
    },

    INVALID_TOKEN: {
        code: 'INVALID_TOKEN',
        message: 'Недействительный токен',
        httpStatus: 401
    },

    TOKEN_EXPIRED: {
        code: 'TOKEN_EXPIRED',
        message: 'Токен истёк',
        httpStatus: 401
    },

    // === Rate Limiting (429) ===
    RATE_LIMIT_EXCEEDED: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Превышен лимит запросов',
        httpStatus: 429
    },

    TOO_MANY_REQUESTS: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Слишком много запросов',
        httpStatus: 429
    },

    // === Специфичные ошибки FAQ ===
    FAQ_TYPE_EXISTS: {
        code: 'FAQ_TYPE_EXISTS',
        message: 'Тип FAQ уже существует',
        httpStatus: 400
    },

    FAQ_TYPE_NOT_FOUND: {
        code: 'FAQ_TYPE_NOT_FOUND',
        message: 'Тип FAQ не найден',
        httpStatus: 404
    },

    FAQ_NOT_FOUND: {
        code: 'FAQ_NOT_FOUND',
        message: 'FAQ не найден',
        httpStatus: 404
    },

    FAQ_CANNOT_DELETE: {
        code: 'FAQ_CANNOT_DELETE',
        message: 'Невозможно удалить защищённый элемент',
        httpStatus: 400
    },

    FAQ_SEARCH_QUERY_TOO_LONG: {
        code: 'FAQ_SEARCH_QUERY_TOO_LONG',
        message: 'Поисковый запрос слишком длинный',
        httpStatus: 400
    },

    // === Серверные ошибки (500) ===
    INTERNAL_ERROR: {
        code: 'INTERNAL_ERROR',
        message: 'Внутренняя ошибка сервера',
        httpStatus: 500
    },

    DATABASE_ERROR: {
        code: 'DATABASE_ERROR',
        message: 'Ошибка базы данных',
        httpStatus: 500
    },

    EXTERNAL_SERVICE_ERROR: {
        code: 'EXTERNAL_SERVICE_ERROR',
        message: 'Ошибка внешнего сервиса',
        httpStatus: 500
    },

    SERVICE_UNAVAILABLE: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Сервис временно недоступен',
        httpStatus: 503
    },

    // === Неизвестные ошибки ===
    UNKNOWN_ERROR: {
        code: 'UNKNOWN_ERROR',
        message: 'Неизвестная ошибка',
        httpStatus: 500
    }
};

/**
 * Вспомогательная функция для добавления новых кодов ошибок
 * Используется в других сервисах для расширения системы
 * 
 * @param {string} code - Уникальный код ошибки
 * @param {string} message - Сообщение по умолчанию
 * @param {number} httpStatus - HTTP статус
 * 
 * @example
 * addErrorCode('USER_NOT_FOUND', 'Пользователь не найден', 404);
 */
function addErrorCode(code, message, httpStatus = 500) {
    if (!ERROR_CODES[code]) {
        ERROR_CODES[code] = { code, message, httpStatus };
    }
}

module.exports = ERROR_CODES;
module.exports.addErrorCode = addErrorCode;
