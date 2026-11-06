/**
 * Словарь локализованных сообщений об ошибках
 *
 * Поддерживаемые языки: ru (русский), en (английский)
 *
 * Использование:
 * const msg = getErrorMessage('VALIDATION_ERROR', 'en');
 */

const ERROR_MESSAGES = {
    // === Валидация ===
    VALIDATION_ERROR: {
        ru: 'Ошибка валидации данных',
        en: 'Validation error'
    },
    INVALID_INPUT: {
        ru: 'Некорректные входные данные',
        en: 'Invalid input'
    },
    REQUIRED_FIELD_MISSING: {
        ru: 'Не указано обязательное поле',
        en: 'Required field missing'
    },
    NOT_A_NUMBER: {
        ru: 'Значение должно быть числом',
        en: 'Value must be a number'
    },
    INVALID_NUMBER: {
        ru: 'Некорректное числовое значение',
        en: 'Invalid numeric value'
    },
    INVALID_EMAIL: {
        ru: 'Некорректный формат email',
        en: 'Invalid email format'
    },
    PASSWORD_TOO_SHORT: {
        ru: 'Пароль слишком короткий',
        en: 'Password is too short'
    },

    // === Ресурсы ===
    RESOURCE_NOT_FOUND: {
        ru: 'Ресурс не найден',
        en: 'Resource not found'
    },
    RESOURCE_ALREADY_EXISTS: {
        ru: 'Ресурс уже существует',
        en: 'Resource already exists'
    },

    // === Доступ ===
    FORBIDDEN: {
        ru: 'Доступ запрещён',
        en: 'Access forbidden'
    },
    NO_ACCESS: {
        ru: 'Недостаточно прав для выполнения операции',
        en: 'Insufficient permissions'
    },

    // === Авторизация ===
    UNAUTHORIZED: {
        ru: 'Требуется авторизация',
        en: 'Authorization required'
    },
    INVALID_TOKEN: {
        ru: 'Недействительный токен',
        en: 'Invalid token'
    },
    TOKEN_EXPIRED: {
        ru: 'Токен истёк',
        en: 'Token expired'
    },

    // === Rate Limiting ===
    RATE_LIMIT_EXCEEDED: {
        ru: 'Превышен лимит запросов',
        en: 'Rate limit exceeded'
    },
    TOO_MANY_REQUESTS: {
        ru: 'Слишком много запросов',
        en: 'Too many requests'
    },

    // === FAQ специфичные ===
    FAQ_TYPE_EXISTS: {
        ru: 'Тип FAQ уже существует',
        en: 'FAQ type already exists'
    },
    FAQ_TYPE_NOT_FOUND: {
        ru: 'Тип FAQ не найден',
        en: 'FAQ type not found'
    },
    FAQ_NOT_FOUND: {
        ru: 'FAQ не найден',
        en: 'FAQ not found'
    },
    FAQ_CANNOT_DELETE: {
        ru: 'Невозможно удалить защищённый элемент',
        en: 'Cannot delete protected item'
    },
    FAQ_SEARCH_QUERY_TOO_LONG: {
        ru: 'Поисковый запрос слишком длинный',
        en: 'Search query is too long'
    },

    // === Серверные ===
    INTERNAL_ERROR: {
        ru: 'Внутренняя ошибка сервера',
        en: 'Internal server error'
    },
    DATABASE_ERROR: {
        ru: 'Ошибка базы данных',
        en: 'Database error'
    },
    SERVICE_UNAVAILABLE: {
        ru: 'Сервис временно недоступен',
        en: 'Service temporarily unavailable'
    },
    EXTERNAL_SERVICE_ERROR: {
        ru: 'Ошибка внешнего сервиса',
        en: 'External service error'
    },

    // === Общие ===
    UNKNOWN_ERROR: {
        ru: 'Неизвестная ошибка',
        en: 'Unknown error'
    }
};

/**
 * Получить локализованное сообщение об ошибке
 *
 * @param {string} code - Код ошибки
 * @param {string} lang - Язык (ru/en)
 * @param {string} fallback - Сообщение по умолчанию
 * @returns {string} Локализованное сообщение
 */
function getErrorMessage(code, lang = 'ru', fallback = null) {
    const messages = ERROR_MESSAGES[code];

    if (!messages) {
        return fallback || ERROR_MESSAGES.UNKNOWN_ERROR[lang] || 'Unknown error';
    }

    return messages[lang] || messages.ru || fallback || 'Error';
}

/**
 * Добавить новое сообщение в словарь (для расширения в других сервисах)
 *
 * @param {string} code - Код ошибки
 * @param {Object} messages - Объект с переводами {ru: '...', en: '...'}
 */
function addErrorMessage(code, messages) {
    if (!ERROR_MESSAGES[code]) {
        ERROR_MESSAGES[code] = messages;
    }
}

module.exports = {
    ERROR_MESSAGES,
    getErrorMessage,
    addErrorMessage
};
