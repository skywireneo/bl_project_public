import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, Badge, Button, EmptyState } from '../../../ui/UIComponents'; // Проверь путь
import Pagination from '../../../ui/Pagination'; // Проверь путь
import { getPermissionHistory } from '../../../../http/userAPI'; // Проверь путь

const ACTION_STYLES = {
    ROLE_CHANGED: { color: '#3b82f6', icon: 'fa-rotate', bg: 'rgba(59,130,246,0.08)', label: 'Смена роли' },
    PERMISSION_TOGGLED: { color: '#f59e0b', icon: 'fa-pen', bg: 'rgba(245,158,11,0.08)', label: 'Ручное изменение' }
};

const STATE_STYLES = {
    GRANTED: { color: '#22c55e', icon: 'fa-check', label: 'Выдано' },
    DENIED: { color: '#ef4444', icon: 'fa-xmark', label: 'Запрещено' },
    INHERITED: { color: '#94a3b8', icon: 'fa-rotate', label: 'Наследуется' }
};

export default function PermissionHistoryList({ targetUserId }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

    const loadData = useCallback(async (page = 1, limit = 10) => {
        if (!targetUserId) return;
        setLoading(true);
        try {
            const res = await getPermissionHistory(targetUserId, page, limit);
            setHistory(res.data || []);
            setPagination(res.meta || { page, limit, total: 0, totalPages: 0 });
        } catch (e) {
            console.error('Ошибка загрузки истории прав:', e);
        } finally {
            setLoading(false);
        }
    }, [targetUserId]);

    useEffect(() => { loadData(1, 10); }, [loadData]);

    if (!targetUserId) return null;

    return (
        <Card padding={24} style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fa-solid fa-clock-rotate-left" style={{ color: '#8b5cf6' }} />
                    История изменений прав
                </h4>
                <Button variant="secondary" size="sm" onClick={() => loadData(pagination.page, pagination.limit)} icon="fa-rotate" loading={loading}>
                    Обновить
                </Button>
            </div>

            {loading && history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 20, marginBottom: 8 }} />
                    <div style={{ fontSize: 13 }}>Загрузка...</div>
                </div>
            ) : history.length === 0 ? (
                <EmptyState icon="fa-inbox" title="История пуста" description="Изменения прав будут отображаться здесь" />
            ) : (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', paddingLeft: 20 }}>
                        {/* Вертикальная линия таймлайна */}
                        <div style={{ position: 'absolute', left: 7, top: 10, bottom: 10, width: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }} />

                        {history.map((item, idx) => {
                            const actionStyle = ACTION_STYLES[item.action_type] || ACTION_STYLES.PERMISSION_TOGGLED;
                            const oldStateStyle = STATE_STYLES[item.old_state] || STATE_STYLES.INHERITED;
                            const newStateStyle = STATE_STYLES[item.new_state] || STATE_STYLES.GRANTED;

                            return (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '10px 0', position: 'relative' }}
                                >
                                    {/* Точка таймлайна */}
                                    <div style={{
                                        width: 16, height: 16, borderRadius: '50%',
                                        background: '#0f1117', border: `2px solid ${actionStyle.color}`,
                                        flexShrink: 0, zIndex: 1, marginTop: 3,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <i className={`fa-solid ${actionStyle.icon}`} style={{ color: actionStyle.color, fontSize: 6 }} />
                                    </div>

                                    {/* Контент */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                            <Badge variant="default" style={{ fontSize: 10, background: actionStyle.bg, color: actionStyle.color, border: `1px solid ${actionStyle.color}30` }}>
                                                {actionStyle.label}
                                            </Badge>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', fontFamily: 'monospace' }}>
                                                {item.permission_code}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 4 }}>
                                            <span style={{ color: oldStateStyle.color, display: 'flex', alignItems: 'center', gap: 3 }}>
                                                <i className={`fa-solid ${oldStateStyle.icon}`} style={{ fontSize: 9 }} />
                                                {oldStateStyle.label}
                                            </span>
                                            <i className="fa-solid fa-arrow-right" style={{ color: '#64748b', fontSize: 9 }} />
                                            <span style={{ color: newStateStyle.color, display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
                                                <i className={`fa-solid ${newStateStyle.icon}`} style={{ fontSize: 9 }} />
                                                {newStateStyle.label}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#64748b' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <i className="fa-solid fa-clock" style={{ fontSize: 9 }} />
                                                {new Date(item.created_at).toLocaleString('ru-RU')}
                                            </span>
                                            {item.actor_login ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <i className="fa-solid fa-user" style={{ fontSize: 9 }} />
                                                    {item.actor_login}
                                                </span>
                                            ) : (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontStyle: 'italic' }}>
                                                    <i className="fa-solid fa-gear" style={{ fontSize: 9 }} />
                                                    Система
                                                </span>
                                            )}
                                            {item.reason && (
                                                <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                                                    — {item.reason}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {pagination.totalPages > 1 && (
                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                            <Pagination
                                currentPage={pagination.page}
                                totalPages={pagination.totalPages}
                                totalItems={pagination.total}
                                onPageChange={(newPage) => loadData(newPage, pagination.limit)}
                                variant="compact"
                                size="sm"
                            />
                        </div>
                    )}
                </>
            )}
        </Card>
    );
}