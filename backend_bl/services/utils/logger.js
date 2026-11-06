const pino = require('pino');

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    //  Обязательно: превращаем числовой уровень (30) в строку ("info") для Grafana
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;