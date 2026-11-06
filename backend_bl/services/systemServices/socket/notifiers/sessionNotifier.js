const { getIo } = require('../socketServer');

class SessionNotifier {
    notifyLogout(userId, targetType, targetSessionId = null, reason = '') {
        const io = getIo();
        if (!io) {
            console.error('[SessionNotifier] ❌ Socket.io не инициализирован!');
            return;
        }

        console.log(`[SessionNotifier] Отправка события logout:`, {
            userId,
            targetType,
            targetSessionId,
            reason,
            room: `user_${userId}`
        });

        // Проверяем, есть ли вообще сокеты в этой комнате
        const socketsInRoom = io.sockets.adapter.rooms.get(`user_${userId}`);
        console.log(`[SessionNotifier] Сокетов в комнате user_${userId}:`, socketsInRoom ? socketsInRoom.size : 0);

        io.to(`user_${userId}`).emit('session:force_logout', {
            targetType,
            targetSessionId,
            reason
        });

        console.log(`[SessionNotifier]  Событие отправлено в комнату user_${userId}`);
    }

    notifyRefreshList(userId, excludeSessionId) {
        const io = getIo();
        if (!io) return;

        console.log(`[SessionNotifier] Отправка refresh_list для user ${userId}`);

        io.to(`user_${userId}`).emit('session:refresh_list', {
            excludeSessionId
        });
    }

    /**
 * Уведомление конкретного пользователя о необходимости обновить свои данные
 * (например, при смене статуса или роли)
 */
    notifyUserDataRefresh(userId, reason = 'Ваши права доступа были изменены') {
        const io = getIo();
        if (!io) return;

        console.log(`[SessionNotifier] Отправка refresh_user_data для user ${userId}`);
        io.to(`user_${userId}`).emit('system:refresh_user_data', {
            reason,
            timestamp: Date.now()
        });
    }
}

module.exports = new SessionNotifier();