import { io } from 'socket.io-client';
import storageHandler from './utils/storageHandler';

const BACKEND_URL = window.location.origin;

let socket = null;

export const initSocket = () => {
    if (socket) return socket;

    const token = storageHandler.get("tokenAccess", "cookies");
    const sessionId = storageHandler.get("sessionId");

    //  ПОДКЛЮЧАЕМСЯ ВСЕГДА. Если токена нет, передаем пустую строку.
    // Бэкенд сам определит, что это гость, и добавит его в комнату 'global_guests'.
    socket = io(BACKEND_URL, {
        path: '/socket.io/',
        auth: {
            token: token || '', // <-- Изменено: пустая строка вместо возврата null
            sessionId: sessionId || null
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        console.log('[Socket] Подключено. ID:', socket.id, token ? '(Auth)' : '(Guest)');
    });

    socket.on('connect_error', (err) => {
        console.error('[Socket] Ошибка подключения:', err.message);
    });

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const getSocket = () => socket;