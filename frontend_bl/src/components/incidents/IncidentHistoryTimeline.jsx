import React from "react";
import { motion } from "framer-motion";
import { EmptyState, Alert } from "../ui/UIComponents"; // 📌 Проверьте путь к вашим UI-компонентам

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (инкапсулированы внутри файла) ===
const formatRelativeDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'только что';
    if (diffMin < 60) return `${diffMin} мин. назад`;
    if (diffHour < 24) return `${diffHour} ч. назад`;
    if (diffDay < 7) return `${diffDay} дн. назад`;
    return '';
};

const getHistoryActionConfig = (action) => {
    if (!action) return { icon: 'fa-circle-dot', color: '#6366f1' };
    const a = action.toLowerCase();
    if (a.includes('созда') || a.includes('нов')) return { icon: 'fa-circle-plus', color: '#22c55e' };
    if (a.includes('обнов') || a.includes('измен') || a.includes('редакт')) return { icon: 'fa-pen', color: '#eab308' };
    if (a.includes('удал')) return { icon: 'fa-trash', color: '#ef4444' };
    if (a.includes('коммент') || a.includes('сообщ')) return { icon: 'fa-comment', color: '#3b82f6' };
    if (a.includes('статус') || a.includes('закры') || a.includes('переход')) return { icon: 'fa-flag', color: '#8b5cf6' };
    if (a.includes('оцен') || a.includes('интерес')) return { icon: 'fa-fire', color: '#f59e0b' };
    return { icon: 'fa-circle-dot', color: '#6366f1' };
};

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    if (typeof dateStr === 'string' && dateStr.includes('**')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
        return dateStr;
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString('ru-RU');
};

// === СКЕЛЕТОН ===
const HistorySkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1, 2, 3].map(i => (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, paddingTop: 4 }}>
                    <div className="skeleton-box skeleton-line skeleton-text-mid" />
                    <div className="skeleton-box" style={{ height: 12, width: '40%' }} />
                </div>
            </div>
        ))}
    </div>
);

// === ОСНОВНОЙ КОМПОНЕНТ ===
export default function IncidentHistoryTimeline({ history, isLoading, error, emptyMessage = "Пока нет записей об изменениях." }) {
    if (error) {
        return (
            <Alert variant="danger" icon="fa-solid fa-circle-exclamation" style={{ marginBottom: 16 }}>
                <strong>Ошибка загрузки истории</strong><br />
                {error}
            </Alert>
        );
    }

    if (isLoading) {
        return <HistorySkeleton />;
    }

    if (!history || history.length === 0) {
        return (
            <EmptyState
                icon="fa-solid fa-clock-rotate-left"
                title="История пуста"
                description={emptyMessage}
            />
        );
    }

    return (
        <div style={{ position: 'relative', paddingLeft: 32 }}>
            {/* Вертикальная timeline-линия */}
            <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                style={{
                    position: 'absolute',
                    left: 10,
                    top: 12,
                    bottom: 12,
                    width: 2,
                    background: 'linear-gradient(180deg, rgba(99,102,241,0.5) 0%, rgba(139,92,246,0.15) 100%)',
                    transformOrigin: 'top',
                    borderRadius: 2
                }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {history.map((record, idx) => {
                    const actionConfig = getHistoryActionConfig(record.action);
                    const relativeDate = formatRelativeDate(record.date_time);
                    return (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.08 + 0.2, duration: 0.3 }}
                            style={{ position: 'relative' }}
                        >
                            {/* Точка на линии */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: idx * 0.08 + 0.3, type: 'spring', stiffness: 300, damping: 18 }}
                                style={{
                                    position: 'absolute',
                                    left: -28,
                                    top: 16,
                                    width: 14,
                                    height: 14,
                                    borderRadius: '50%',
                                    background: actionConfig.color,
                                    border: '3px solid #0f172a',
                                    boxShadow: `0 0 0 2px ${actionConfig.color}40, 0 0 10px ${actionConfig.color}60`,
                                    zIndex: 1
                                }}
                            />
                            <div style={{
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: 10,
                                padding: '12px 16px',
                                border: '1px solid rgba(255,255,255,0.04)'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: 12,
                                    marginBottom: 6,
                                    flexWrap: 'wrap'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                                            {record.login || 'Неизвестный'}
                                        </span>
                                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#475569' }} />
                                        <span style={{
                                            fontSize: 12,
                                            padding: '2px 8px',
                                            background: `${actionConfig.color}20`,
                                            color: actionConfig.color,
                                            border: `1px solid ${actionConfig.color}40`,
                                            borderRadius: 6,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            fontWeight: 500
                                        }}>
                                            <i className={`fa-solid ${actionConfig.icon}`} style={{ fontSize: 10 }} />
                                            {record.action}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <i className="fa-regular fa-clock" style={{ fontSize: 11 }} />
                                        {formatDate(record.date_time)}
                                    </span>
                                    {relativeDate && (
                                        <span style={{ fontSize: 11, color: '#475569', fontStyle: 'italic' }}>
                                            ({relativeDate})
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}