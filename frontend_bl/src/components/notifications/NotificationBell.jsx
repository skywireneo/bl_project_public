import React, { useState, useContext, useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { Context } from "../..";
import { motion, AnimatePresence } from "framer-motion";
import NotificationItem from "./NotificationItem";

const NotificationBell = observer(({ type }) => {
    const { notification } = useContext(Context);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const count = type === 'staff' ? notification.unreadCounts.staff : notification.unreadCounts.user;
    const icon = type === 'staff' ? 'fa-briefcase' : 'fa-bell';
    const color = type === 'staff' ? '#f59e0b' : '#6366f1';

    // Закрытие при клике вне компонента
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    // Автопрочтение при открытии
    useEffect(() => {
        if (isOpen && count > 0) {
            notification.markAllAsRead(type);
        }
    }, [isOpen, count, type]);

    const recentNotifications = notification.recentNotifications.filter(n => n.type === type);

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            {/* Кнопка колокольчика */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: isOpen ? `${color}15` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isOpen ? `${color}40` : 'rgba(255,255,255,0.08)'}`,
                    color: isOpen ? color : '#94a3b8',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 17, position: 'relative', transition: 'all 0.2s ease'
                }}
            >
                <i className={`fa-solid ${icon}`} />
                <AnimatePresence>
                    {count > 0 && (
                        <motion.span
                            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            style={{
                                position: 'absolute', top: -5, right: -5,
                                minWidth: 20, height: 20, borderRadius: 10,
                                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                color: 'white', fontSize: 11, fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2.5px solid #0f1117', padding: '0 5px',
                                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                            }}
                        >
                            {count > 99 ? '99+' : count}
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Выпадающий список */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                            position: 'absolute', top: 56, right: 0, width: 380,
                            background: 'rgba(30, 32, 48, 0.95)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 16,
                            boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
                            zIndex: 1000, overflow: 'hidden', display: 'flex', flexDirection: 'column'
                        }}
                    >
                        {/* Шапка */}
                        <div style={{
                            padding: '16px 18px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'rgba(0,0,0,0.2)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>
                                    {type === 'staff' ? 'Рабочие уведомления' : 'Уведомления'}
                                </span>
                                {count > 0 && (
                                    <span style={{
                                        fontSize: 11, fontWeight: 700, color: color,
                                        background: `${color}15`, padding: '2px 8px', borderRadius: 6
                                    }}>
                                        {count} новых
                                    </span>
                                )}
                            </div>

                            {count > 0 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); notification.markAllAsRead(type); }}
                                    style={{
                                        background: 'transparent', border: 'none', color: '#818cf8',
                                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                        padding: '6px 10px', borderRadius: 8,
                                        transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(129, 140, 248, 0.1)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <i className="fa-solid fa-check-double" style={{ fontSize: 11 }} />
                                    Прочитать все
                                </button>
                            )}
                        </div>

                        {/* Список уведомлений */}
                        <div style={{ maxHeight: 420, overflowY: 'auto', padding: 12 }}>
                            {/* Кастомный скроллбар для списка */}
                            <style>{`
                                .notif-scroll::-webkit-scrollbar { width: 4px; }
                                .notif-scroll::-webkit-scrollbar-track { background: transparent; }
                                .notif-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
                                .notif-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                            `}</style>

                            <div className="notif-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {recentNotifications.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: '40px 20px' }}>
                                        <div style={{
                                            width: 48, height: 48, borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.03)', margin: '0 auto 12px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <i className="fa-regular fa-bell-slash" style={{ fontSize: 20, opacity: 0.5 }} />
                                        </div>
                                        Нет новых уведомлений
                                    </div>
                                ) : (
                                    recentNotifications.slice(0, 8).map(n => (
                                        <NotificationItem
                                            key={n.id}
                                            notification={n}
                                            isDropdown={true}
                                            onClick={() => {
                                                notification.markAsRead(n.id);
                                                // Дропдаун НЕ закрывается, чтобы можно было прочитать текст
                                            }}
                                        />
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Подвал */}
                        <div style={{
                            padding: 14, borderTop: '1px solid rgba(255,255,255,0.06)',
                            textAlign: 'center', background: 'rgba(0,0,0,0.2)'
                        }}>
                            <a href="/notifications" onClick={() => setIsOpen(false)} style={{
                                color: '#818cf8', fontSize: 12.5, fontWeight: 600, textDecoration: 'none',
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                transition: 'color 0.2s'
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#a5b4fc'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#818cf8'}
                            >
                                Показать все уведомления
                                <i className="fa-solid fa-arrow-right" style={{ fontSize: 10, transition: 'transform 0.2s' }} />
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

export default NotificationBell;