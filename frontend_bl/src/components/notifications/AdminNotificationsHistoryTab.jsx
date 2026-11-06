import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Badge, EmptyState } from '../ui/UIComponents';
import { getAdminHistory } from '../../http/notificationsAPI';

const ACTION_CONFIG = {
    'GROUP_CREATED': { color: '#22c55e', icon: 'fa-plus', label: 'Создание группы', bg: 'rgba(34,197,94,0.1)' },
    'GROUP_UPDATED': { color: '#3b82f6', icon: 'fa-pen', label: 'Изменение группы', bg: 'rgba(59,130,246,0.1)' },
    'GROUP_DELETED': { color: '#ef4444', icon: 'fa-trash', label: 'Удаление группы', bg: 'rgba(239,68,68,0.1)' },
    'CHANNEL_TOGGLED': { color: '#f59e0b', icon: 'fa-toggle-on', label: 'Канал вкл/выкл', bg: 'rgba(245,158,11,0.1)' },
    'GROUP_CHANNEL_ADDED': { color: '#8b5cf6', icon: 'fa-link', label: 'Канал для группы', bg: 'rgba(139,92,246,0.1)' },
    'GROUP_CHANNEL_REMOVED': { color: '#ec4899', icon: 'fa-unlink', label: 'Удаление канала группы', bg: 'rgba(236,72,153,0.1)' },
    'TEMPLATE_UPDATED': { color: '#0ea5e9', icon: 'fa-file-code', label: 'Шаблон изменён', bg: 'rgba(14,165,233,0.1)' },
    'DEFAULTS_UPDATED': { color: '#10b981', icon: 'fa-user-gear', label: 'Дефолты роли', bg: 'rgba(16,185,129,0.1)' },
    'BROADCAST_SENT': { color: '#f97316', icon: 'fa-paper-plane', label: 'Рассылка', bg: 'rgba(249,115,22,0.1)' }
};

export default function AdminNotificationsHistoryTab() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [filterAction, setFilterAction] = useState('');
    const [expandedId, setExpandedId] = useState(null);

    const loadData = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await getAdminHistory({
                page,
                limit: pagination.limit,
                actionType: filterAction || undefined
            });
            setHistory(res.data || []);
            setPagination(res.meta || { page, limit: 20, total: 0, totalPages: 0 });
        } catch (e) {
            console.error('Ошибка загрузки истории:', e);
        } finally {
            setLoading(false);
        }
    }, [filterAction, pagination.limit]);

    useEffect(() => { loadData(1); }, [filterAction]);

    const formatJson = (obj) => {
        if (!obj || Object.keys(obj).length === 0) return '—';
        return JSON.stringify(obj, null, 2);
    };

    return (
        <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {/* Фильтры */}
            <Card padding={16} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                        <i className="fa-solid fa-filter" style={{ marginRight: 6 }} />
                        Фильтр по действию:
                    </span>
                    <button
                        onClick={() => setFilterAction('')}
                        style={{
                            padding: '6px 12px', borderRadius: 6, border: 'none',
                            background: !filterAction ? 'rgba(99,102,241,0.2)' : 'rgba(0,0,0,0.2)',
                            color: !filterAction ? '#a5b4fc' : '#94a3b8',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer'
                        }}
                    >
                        Все
                    </button>
                    {Object.entries(ACTION_CONFIG).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => setFilterAction(key)}
                            style={{
                                padding: '6px 12px', borderRadius: 6, border: 'none',
                                background: filterAction === key ? `${config.color}20` : 'rgba(0,0,0,0.2)',
                                color: filterAction === key ? config.color : '#94a3b8',
                                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 6,
                                border: filterAction === key ? `1px solid ${config.color}40` : '1px solid transparent'
                            }}
                        >
                            <i className={`fa-solid ${config.icon}`} style={{ fontSize: 10 }} />
                            {config.label}
                        </button>
                    ))}
                </div>
            </Card>

            {/* Список истории */}
            <Card padding={24}>
                {loading && history.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                        <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24 }} />
                    </div>
                ) : history.length === 0 ? (
                    <EmptyState icon="fa-inbox" title="История пуста" description="Действия администраторов будут отображаться здесь" />
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', paddingLeft: 24 }}>
                            <div style={{ position: 'absolute', left: 9, top: 10, bottom: 10, width: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }} />

                            {history.map((item, idx) => {
                                const config = ACTION_CONFIG[item.action_type] || { color: '#64748b', icon: 'fa-circle', label: item.action_type, bg: 'rgba(100,116,139,0.1)' };
                                const isExpanded = expandedId === item.id;

                                return (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.02 }}
                                        style={{
                                            padding: '12px 0', position: 'relative',
                                            borderBottom: idx < history.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none'
                                        }}
                                    >
                                        {/* Точка таймлайна */}
                                        <div style={{
                                            position: 'absolute', left: -18, top: 16,
                                            width: 20, height: 20, borderRadius: '50%',
                                            background: '#0f1117', border: `2px solid ${config.color}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            zIndex: 1
                                        }}>
                                            <i className={`fa-solid ${config.icon}`} style={{ color: config.color, fontSize: 8 }} />
                                        </div>

                                        {/* Контент */}
                                        <div style={{ paddingLeft: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                                                <Badge variant="default" style={{
                                                    fontSize: 10, background: config.bg, color: config.color,
                                                    border: `1px solid ${config.color}30`, fontWeight: 700
                                                }}>
                                                    {config.label}
                                                </Badge>
                                                {item.target_name && (
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
                                                        {item.target_name}
                                                    </span>
                                                )}
                                                <span style={{
                                                    marginLeft: 'auto', fontSize: 11, color: '#64748b',
                                                    display: 'flex', alignItems: 'center', gap: 4
                                                }}>
                                                    <i className="fa-solid fa-clock" style={{ fontSize: 9 }} />
                                                    {new Date(item.created_at).toLocaleString('ru-RU')}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <i className="fa-solid fa-user" style={{ fontSize: 10 }} />
                                                    {item.actor_login || <span style={{ fontStyle: 'italic' }}>Система</span>}
                                                </span>
                                                {item.actor_status && (
                                                    <Badge variant="default" style={{ fontSize: 9, padding: '1px 6px' }}>
                                                        {item.actor_status}
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Кнопка раскрытия JSON */}
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                                style={{
                                                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                                                    color: '#a5b4fc', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                                    padding: '4px 10px', borderRadius: 6,
                                                    display: 'flex', alignItems: 'center', gap: 6
                                                }}
                                            >
                                                <i className={`fa-solid fa-${isExpanded ? 'eye-slash' : 'eye'}`} style={{ fontSize: 10 }} />
                                                {isExpanded ? 'Скрыть детали' : 'Показать детали'}
                                            </button>

                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
                                                >
                                                    <div>
                                                        <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <i className="fa-solid fa-arrow-left" style={{ fontSize: 9 }} />
                                                            Старое значение
                                                        </div>
                                                        <pre style={{
                                                            background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8,
                                                            fontSize: 11, color: '#cbd5e1', fontFamily: 'monospace',
                                                            overflow: 'auto', maxHeight: 200, margin: 0,
                                                            border: '1px solid rgba(239,68,68,0.2)'
                                                        }}>
                                                            {formatJson(item.old_value)}
                                                        </pre>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <i className="fa-solid fa-arrow-right" style={{ fontSize: 9 }} />
                                                            Новое значение
                                                        </div>
                                                        <pre style={{
                                                            background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8,
                                                            fontSize: 11, color: '#cbd5e1', fontFamily: 'monospace',
                                                            overflow: 'auto', maxHeight: 200, margin: 0,
                                                            border: '1px solid rgba(34,197,94,0.2)'
                                                        }}>
                                                            {formatJson(item.new_value)}
                                                        </pre>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Пагинация */}
                        {pagination.totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                                <Button
                                    variant="secondary" size="sm"
                                    disabled={pagination.page === 1}
                                    onClick={() => loadData(pagination.page - 1)}
                                >
                                    <i className="fa-solid fa-chevron-left" />
                                </Button>
                                <span style={{ display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: 13, padding: '0 12px' }}>
                                    Страница {pagination.page} из {pagination.totalPages}
                                </span>
                                <Button
                                    variant="secondary" size="sm"
                                    disabled={pagination.page === pagination.totalPages}
                                    onClick={() => loadData(pagination.page + 1)}
                                >
                                    <i className="fa-solid fa-chevron-right" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </Card>
        </motion.div>
    );
}