const cacheService = require("../cacheService");

/**
 * Middleware для ограничения частоты событий от одного сокета
 * @param {string} eventName - имя события (например, 'chat:message')
 * @param {number} maxRequests - максимальное количество запросов
 * @param {number} windowSeconds - временное окно в секундах
 * @returns {Function} middleware для socket.io
 */
const createRateLimiter = (eventName, maxRequests = 20, windowSeconds = 60) => {
    return async (socket, next) => {
        const identifier = socket.isAuth
            ? `user_${socket.userId}`
            : `guest_${socket.guestId}`;

        const key = `rate_limit:socket:${eventName}:${identifier}`;

        try {
            const currentCount = await cacheService.rollingIncr(
                'socket_rate',
                key,
                windowSeconds
            );

            if (currentCount > maxRequests) {
                console.warn(`[RateLimiter]  Превышен лимит для ${identifier} на событие ${eventName}: ${currentCount}/${maxRequests}`);

                // Отправляем предупреждение клиенту
                socket.emit('system:rate_limit_exceeded', {
                    event: eventName,
                    retryAfter: windowSeconds
                });

                return next(new Error('Rate limit exceeded'));
            }

            next();
        } catch (error) {
            console.error('[RateLimiter] Ошибка проверки лимита:', error.message);
            // При ошибке Redis — пропускаем (не блокируем пользователя из-за падения кеша)
            next();
        }
    };
};

module.exports = { createRateLimiter };