import React from "react";
import { motion } from "framer-motion";

export default function NotificationItem({ notification, onClick, isDropdown = false }) {
    const { title, body, priority, icon, color, is_read } = notification;

    // Безопасный парсинг даты
    const dateStr = notification.created_at || notification.createdAt;
    const dateObj = dateStr ? new Date(dateStr) : new Date();
    const isValidDate = !isNaN(dateObj.getTime());
    const timeStr = isValidDate
        ? dateObj.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        : 'Только что';

    const priorityColors = {
        low: '#64748b',
        normal: '#6366f1',
        high: '#f59e0b',
        critical: '#ef4444'
    };
    const pColor = priorityColors[priority] || priorityColors.normal;

    // 🎨 Умные стили в зависимости от статуса прочтения
    const isUnread = !is_read;
    const bgColor = isUnread ? (isDropdown ? 'rgba(99, 102, 241, 0.06)' : 'rgba(99, 102, 241, 0.04)') : 'transparent';
    const borderColor = isUnread ? `${pColor}40` : 'rgba(255,255,255,0.05)';
    const borderLeftColor = isUnread ? pColor : 'transparent';
    const titleColor = isUnread ? '#f1f5f9' : '#94a3b8';
    const bodyColor = isUnread ? '#cbd5e1' : '#64748b';
    const opacity = isUnread ? 1 : 0.65;

    // Плавная функция перехода для всех изменяемых свойств
    const smoothTransition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';

    return (
        <motion.div
            initial={isDropdown ? { opacity: 0, y: -8 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{
                scale: 1.01,
                backgroundColor: isUnread ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.03)'
            }}
            onClick={onClick}
            style={{
                display: 'flex',
                gap: 14,
                padding: isDropdown ? '14px 16px' : '16px 18px',
                background: bgColor,
                border: `1px solid ${borderColor}`,
                borderLeft: `3px solid ${borderLeftColor}`,
                borderRadius: 12,
                cursor: 'pointer',
                opacity: opacity,
                transition: smoothTransition // Плавное изменение фона, границ и прозрачности
            }}
        >
            {/* Иконка с мягким свечением */}
            <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: `${pColor}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isUnread ? `0 0 12px ${pColor}20` : 'none',
                transition: smoothTransition // Плавное исчезновение свечения
            }}>
                <i className={`fa-solid ${icon || 'fa-bell'}`} style={{ color: pColor, fontSize: 16 }} />
            </div>

            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <span style={{
                        fontSize: 13.5,
                        fontWeight: isUnread ? 700 : 600,
                        color: titleColor,
                        lineHeight: 1.4,
                        transition: smoothTransition // Плавное изменение цвета и жирности текста
                    }}>
                        {title}
                    </span>
                    {isUnread && (
                        <motion.span
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            style={{
                                width: 8, height: 8, borderRadius: '50%', background: pColor, flexShrink: 0, marginTop: 6,
                                boxShadow: `0 0 8px ${pColor}`
                            }}
                        />
                    )}
                </div>

                {body && (
                    <p style={{
                        fontSize: 12.5,
                        color: bodyColor,
                        margin: 0,
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        transition: smoothTransition // Плавное изменение цвета описания
                    }}>
                        {body}
                    </p>
                )}

                <div style={{ fontSize: 11, color: '#64748b', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className="fa-regular fa-clock" style={{ fontSize: 10 }} />
                    {timeStr}
                </div>
            </div>
        </motion.div>
    );
}