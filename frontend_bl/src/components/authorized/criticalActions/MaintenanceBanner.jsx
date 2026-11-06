import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMaintenanceStatus } from '../../../http/criticalActionsAPI';
import { getSocket, initSocket } from '../../../http/socket';

const MaintenanceBanner = () => {
    const [task, setTask] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');
    const [cancelMessage, setCancelMessage] = useState(null);

    const formatToMSK = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return 'некорректная дата';

        return d.toLocaleString('ru-RU', {
            timeZone: 'Europe/Moscow',
            day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
        });
    };

    useEffect(() => {
        if (!task || !task.scheduled_at) return;

        const timer = setInterval(() => {
            const now = new Date().getTime();
            const target = new Date(task.scheduled_at).getTime();

            if (isNaN(target)) {
                setTimeLeft('Ошибка даты');
                return;
            }

            const diff = target - now;

            if (diff <= 0) {
                setTimeLeft('00:00:00');
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                const h = String(hours).padStart(2, '0');
                const m = String(minutes).padStart(2, '0');
                const s = String(seconds).padStart(2, '0');
                setTimeLeft(`${h}:${m}:${s}`);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [task]);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await getMaintenanceStatus();
                if (res.success && res.data) {
                    setTask(res.data);
                }
            } catch (e) {
                console.error('Failed to fetch maintenance status', e);
            }
        };

        fetchStatus();

        let socket = getSocket();
        if (!socket) {
            socket = initSocket();
        }

        if (socket) {
            socket.on('system:maintenance_scheduled', (data) => {
                setTask({
                    scheduled_at: data.scheduledAtUTC || data.scheduled_at,
                    expected_open_at: data.expectedOpenAtUTC || data.expected_open_at,
                    message: data.message
                });
            });

            socket.on('system:maintenance_cancelled', () => {
                setTask(null);
                setCancelMessage('Запланированные технические работы отменены');
                setTimeout(() => {
                    setCancelMessage(null);
                }, 5000);
            });
        }

        return () => {
            if (socket) {
                socket.off('system:maintenance_scheduled');
                socket.off('system:maintenance_cancelled');
            }
        };
    }, []);

    if (cancelMessage) {
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    style={{
                        position: 'sticky', top: 0, zIndex: 50,
                        background: '#1e2030',
                        borderTop: '3px solid #10b981',
                        padding: '8px 20px',
                        textAlign: 'center'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <i className="fa-solid fa-circle-check" style={{ color: '#10b981', fontSize: 14 }} />
                        <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>
                            {cancelMessage}
                        </span>
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    }

    if (!task) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{
                    position: 'sticky', top: 0, zIndex: 50,
                    background: '#1e2030',
                    borderTop: '3px solid #f59e0b',
                    padding: '10px 20px',
                    textAlign: 'center'
                }}
            >
                <div style={{ maxWidth: 800, margin: '0 auto' }}>

                    {/* Заголовок и основная информация в одной строке */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
                        <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f59e0b', fontSize: 14 }} />
                        <span style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600 }}>
                            Технические работы:
                        </span>
                        <span style={{ color: '#cbd5e1', fontSize: 13 }}>
                            закрытие сайта будет {formatToMSK(task.scheduled_at)} МСК
                        </span>

                        {/* Таймер */}
                        <span style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: 12,
                            fontWeight: 600,
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            display: 'inline-flex', alignItems: 'center', gap: 4
                        }}>
                            <i className="fa-regular fa-clock" style={{ fontSize: 10 }} />
                            {timeLeft}
                        </span>
                    </div>

                    {/* Сообщение в одну строку */}
                    <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                        Причина:<span>{task.message}</span>
                        {task.expected_open_at && (
                            <>
                                <span style={{ color: '#475569' }}>•</span>
                                <span>открытие: {formatToMSK(task.expected_open_at)} МСК</span>
                            </>
                        )}
                        <span style={{ color: '#475569' }}>•</span>
                        <span style={{ color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <i className="fa-solid fa-floppy-disk" style={{ fontSize: 10 }} />
                            Сохраните данные
                        </span>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default MaintenanceBanner;