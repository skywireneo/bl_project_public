const { getIo } = require('../socketServer');

class SystemNotifier {
    notifyGlobalReload(reason, delay = 2000, jitter = 3000) {
        const io = getIo();
        if (!io) {
            console.error('[SystemNotifier] ❌ Socket.io не инициализирован!');
            return;
        }

        console.log(`[SystemNotifier] Отправка global_reload:`, { reason, delay, jitter });

        io.to('authorized_global').emit('system:global_reload', { reason, delay, jitter });
        io.to('global_guests').emit('system:global_reload', { reason, delay, jitter });

        console.log(`[SystemNotifier]  Global reload отправлен`);
    }

    broadcastAll(message) {
        const io = getIo();
        if (!io) return;
        console.log(`[SystemNotifier] Broadcast:`, { message });
        io.emit('system:broadcast', { message });
    }
}

module.exports = new SystemNotifier();