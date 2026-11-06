// services/notifications/notificationNotifier.js
const { getIo } = require('../systemServices/socket/socketServer');

class NotificationNotifier {
    /**
     * Отправка нового уведомления конкретному пользователю
     */
    notifyNew(userId, notification) {
        const io = getIo();
        if (!io) {
            console.error('[NotificationNotifier] ❌ Socket.io не инициализирован!');
            return;
        }

        const room = `user_${userId}`;
        const socketsInRoom = io.sockets.adapter.rooms.get(room);
        console.log(`[NotificationNotifier] Новое уведомление для user ${userId} (type: ${notification.type}, priority: ${notification.priority})`);

        io.to(room).emit('notification:new', {
            id: notification.id,
            groupId: notification.group_id,
            groupCode: notification.group_code,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            payload: notification.payload || {},
            priority: notification.priority,
            icon: notification.icon,
            color: notification.color,
            createdAt: notification.created_at
        });
    }

    /**
     * Уведомление о прочтении (синхронизация между вкладками)
     */
    notifyRead(userId, notificationId, readAt) {
        const io = getIo();
        if (!io) return;

        io.to(`user_${userId}`).emit('notification:read', {
            id: notificationId,
            readAt
        });
    }

    /**
     * Уведомление о прочтении всех (для конкретного типа)
     */
    notifyReadAll(userId, type, readAt) {
        const io = getIo();
        if (!io) return;

        io.to(`user_${userId}`).emit('notification:read_all', {
            type,
            readAt
        });
    }

    /**
     * Уведомление об изменении настроек (админом)
     */
    notifySettingsChanged(userId, reason = 'Настройки уведомлений были изменены') {
        const io = getIo();
        if (!io) return;

        io.to(`user_${userId}`).emit('notification:settings_changed', {
            reason,
            timestamp: Date.now()
        });
    }

    /**
     * Массовое уведомление (broadcast)
     */
    notifyBroadcast(type, notification, userIds) {
        const io = getIo();
        if (!io) return;

        const payload = {
            id: notification.id,
            groupId: notification.group_id,
            groupCode: notification.group_code,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            payload: notification.payload || {},
            priority: notification.priority,
            icon: notification.icon,
            color: notification.color,
            createdAt: notification.created_at
        };

        // Отправляем каждому пользователю в его комнату
        for (const userId of userIds) {
            io.to(`user_${userId}`).emit('notification:new', payload);
        }
    }
}

module.exports = new NotificationNotifier();