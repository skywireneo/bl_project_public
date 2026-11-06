const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { socketPubClient, socketSubClient } = require('../../../redisSocketClient');
const tokenService = require('../tokenService');
const { createRateLimiter } = require('./socketRateLimiter');

let io;

const initSocketServer = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost',
            methods: ['GET', 'POST'],
            credentials: true
        },
        adapter: createAdapter(socketPubClient, socketSubClient),

        //  НАСТРОЙКИ HEARTBEAT
        pingTimeout: 60000,    // Если клиент не ответил на ping за 60с — разрываем
        pingInterval: 25000,   // Пингуем каждые 25с
        connectTimeout: 10000, // Таймаут на установление соединения
        maxHttpBufferSize: 1e6, // Максимальный размер сообщения (1 MB)
        transports: ['websocket', 'polling']
    });

    // Middleware аутентификации
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        const sessionId = socket.handshake.auth.sessionId;

        if (!token || token === '') {
            // Гость
            socket.isAuth = false;
            socket.guestId = socket.handshake.auth.guestId || require('crypto').randomUUID();
            return next();
        }

        try {
            const decoded = tokenService.validateToken(token);
            socket.isAuth = true;
            socket.userId = decoded.data.id;
            socket.userStatus = decoded.data.status;
            socket.sessionId = sessionId;

            //  СОХРАНЯЕМ ВРЕМЯ ПОДКЛЮЧЕНИЯ ДЛЯ ПОСЛЕДУЮЩИХ ПРОВЕРОК
            socket.connectedAt = Date.now();

            next();
        } catch (err) {
            console.error('[Socket] Auth error:', err.message);
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        if (socket.isAuth) {
            socket.join(`user_${socket.userId}`);
            socket.join('authorized_global');
            if (socket.sessionId) {
                socket.join(`session_${socket.sessionId}`);
            }
            console.log(`[Socket]  Auth connected: User ${socket.userId}, Session ${socket.sessionId}`);
        } else {
            socket.join(`guest_${socket.guestId}`);
            socket.join('global_guests');
            console.log(`[Socket]  Guest connected: ${socket.guestId}`);
        }

        socket.on('admin:critical_action', createRateLimiter('admin:critical_action', 5, 60), async (data) => {
            console.log(`[Socket] Critical action from ${socket.userId}:`, data);
            // Здесь будет логика выполнения критического действия
        });

        socket.on('disconnect', (reason) => {
            console.log(`[Socket] ❌ Disconnected: ${socket.id}, reason: ${reason}`);
        });

        //  ОБРАБОТКА ОШИБОК СОКЕТА
        socket.on('error', (err) => {
            console.error(`[Socket] Error on socket ${socket.id}:`, err.message);
        });
    });

    return io;
};

const getIo = () => {
    if (!io) throw new Error('Socket.io не инициализирован.');
    return io;
};

module.exports = { initSocketServer, getIo };