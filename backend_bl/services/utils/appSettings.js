// src/services/utils/appSettings.js

// Значение по умолчанию (безопасный режим: лучше залогировать, чем потерять лог)
let isLoggingEnabled = true;

module.exports = {
    get isLoggingEnabled() {
        return isLoggingEnabled;
    },
    setLoggingEnabled(value) {
        isLoggingEnabled = Boolean(value);
        console.log(`[AppSettings] Логирование HTTP-запросов изменено на: ${isLoggingEnabled}`);
    }
};