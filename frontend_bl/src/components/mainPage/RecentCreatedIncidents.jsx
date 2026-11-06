import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import storageHandler from "../../http/utils/storageHandler";

const COOKIE_KEY = 'recent_created_items';

// Форматирование оставшегося времени в MM:SS
function formatRemaining(ms) {
    if (ms <= 0) return '00:00';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Чтение и очистка живых записей из cookies
function readAliveItems() {
    try {
        const all = storageHandler.get(COOKIE_KEY, 'cookies') || [];
        if (!Array.isArray(all)) return [];
        const now = Date.now();
        return all
            .filter(item => item?.id && item?.expiresAt && item.expiresAt > now)
            // Сортируем по времени создания (новые сверху)
            .sort((a, b) => b.createdAt - a.createdAt);
    } catch {
        return [];
    }
}

// Перезапись cookies с актуальным списком
function writeItems(list) {
    try {
        const now = Date.now();
        if (list.length === 0) {
            storageHandler.remove(COOKIE_KEY, { method: 'cookies', path: '/' });
            return;
        }
        const maxExpiresAt = Math.max(...list.map(i => i.expiresAt));
        const ttlSeconds = Math.max(1, Math.ceil((maxExpiresAt - now) / 1000));
        storageHandler.add(COOKIE_KEY, list, {
            method: 'cookies',
            expireTime: ttlSeconds,
            path: '/',
            sameSite: 'Lax'
        });
    } catch (e) {
        console.warn('Ошибка записи куки:', e);
    }
}

export default function RecentCreatedIncidents() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [now, setNow] = useState(Date.now());

    // Инициализация при монтировании
    useEffect(() => {
        setItems(readAliveItems()); // ИЗМЕНЕНО
    }, []);

    // Тик каждую секунду
    useEffect(() => {
        const interval = setInterval(() => {
            const currentNow = Date.now();
            setNow(currentNow);

            setItems(prev => {
                const alive = prev.filter(item => item.expiresAt > currentNow);
                if (alive.length !== prev.length) {
                    writeItems(alive); // ИЗМЕНЕНО
                }
                return alive;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Синхронизация с cookies на случай, если в другой вкладке создали инцидент
    useEffect(() => {
        const handler = () => {
            setItems(readAliveItems()); // ИЗМЕНЕНО
        };
        window.addEventListener('focus', handler);
        return () => window.removeEventListener('focus', handler);
    }, []);

    const removeItem = useCallback((id) => {
        setItems(prev => {
            const next = prev.filter(item => item.id !== id);
            writeItems(next); // ИЗМЕНЕНО
            return next;
        });
    }, []);

    // Если список пуст — ничего не рендерим
    if (items.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            style={{
                background: "linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(59,130,246,0.06) 100%)",
                borderRadius: 16,
                border: "1px solid rgba(34,197,94,0.18)",
                padding: 20,
                marginBottom: 28,
            }}
        >
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
                color: "#f1f5f9"
            }}>
                <div style={{
                    width: 32, height: 32,
                    borderRadius: 8,
                    background: "rgba(34,197,94,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                    <i className="fa-solid fa-clock" style={{ color: "#34d399", fontSize: 14 }} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>
                        Недавно созданные записи
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                        Можете быстро перейти к редактированию. Ссылки исчезнут через 15 минут после создания.
                    </div>
                </div>
                <span style={{
                    background: "rgba(34,197,94,0.15)",
                    color: "#34d399",
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700
                }}>
                    {items.length}
                </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <AnimatePresence>
                    {items.map(item => {
                        // ОПРЕДЕЛЯЕМ ТИП ЗАПИСИ (если type нет, считаем что это инцидент для обратной совместимости)
                        const isContestation = item.type === 'contestation';
                        const remaining = item.expiresAt - now;
                        const isUrgent = remaining < 60 * 1000;
                        const pct = Math.max(0, Math.min(100, (remaining / (15 * 60 * 1000)) * 100));

                        // МАРШРУТ И ТЕКСТ В ЗАВИСИМОСТИ ОТ ТИПА
                        const targetPath = isContestation ? `/contestation/${item.id}` : `/incidents/${item.id}/edit`;
                        const label = isContestation ? `Оспаривание #${item.id}` : `Инцидент #${item.id}`;
                        const iconClass = isContestation ? 'fa-solid fa-scale-balanced' : 'fa-solid fa-pen-to-square';
                        const iconColor = isContestation ? '#a78bfa' : '#818cf8';
                        const bgIcon = isContestation ? "rgba(139,92,246,0.15)" : "rgba(99,102,241,0.15)";

                        return (
                            <motion.div
                                key={`${item.type || 'incident'}-${item.id}`} // Уникальный ключ
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0, padding: 0 }}
                                transition={{ duration: 0.25 }}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: "10px 14px",
                                    background: "rgba(0,0,0,0.25)",
                                    border: "1px solid rgba(255,255,255,0.06)",
                                    borderRadius: 10,
                                    cursor: "pointer",
                                    transition: "border-color 0.2s"
                                }}
                                onClick={() => navigate(targetPath)} // Динамический путь
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                            >
                                <div style={{
                                    width: 36, height: 36,
                                    borderRadius: 8,
                                    background: bgIcon, // Динамический цвет
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0
                                }}>
                                    <i className={iconClass} style={{ color: iconColor, fontSize: 14 }} /> {/* Динамическая иконка */}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: "#e2e8f0",
                                        fontFamily: "monospace",
                                        letterSpacing: 0.5,
                                        marginBottom: 4
                                    }}>
                                        {label} {/* Динамическая надпись */}
                                    </div>
                                    <div style={{
                                        height: 3,
                                        background: "rgba(255,255,255,0.05)",
                                        borderRadius: 2,
                                        overflow: "hidden"
                                    }}>
                                        <div style={{
                                            height: "100%",
                                            width: `${pct}%`,
                                            background: isUrgent
                                                ? "linear-gradient(90deg,#ef4444,#f87171)"
                                                : "linear-gradient(90deg,#22c55e,#34d399)",
                                            transition: "width 1s linear"
                                        }} />
                                    </div>
                                </div>

                                <div style={{
                                    fontFamily: "monospace",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: isUrgent ? "#f87171" : "#34d399",
                                    padding: "4px 10px",
                                    background: isUrgent ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.1)",
                                    borderRadius: 6,
                                    minWidth: 64,
                                    textAlign: "center",
                                    flexShrink: 0
                                }}>
                                    <i className="fa-regular fa-clock" style={{ marginRight: 6, fontSize: 11 }} />
                                    {formatRemaining(remaining)}
                                </div>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeItem(item.id);
                                    }}
                                    title="Убрать из списка"
                                    style={{
                                        background: "rgba(239,68,68,0.1)",
                                        border: "none",
                                        color: "#f87171",
                                        borderRadius: 6,
                                        width: 28, height: 28,
                                        cursor: "pointer",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        flexShrink: 0,
                                        opacity: 0.7,
                                        transition: "opacity 0.2s"
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                                >
                                    <i className="fa-solid fa-xmark" style={{ fontSize: 12 }} />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}