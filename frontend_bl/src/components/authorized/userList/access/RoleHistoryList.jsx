// components/authorized/userList/RoleHistoryList.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Badge, EmptyState, Alert } from '../../../ui/UIComponents'; // Добавлен Alert
import { getRoleHistory } from '../../../../http/userAPI';

const RoleHistoryList = ({ title, icon, color, userId, queryType }) => {
    const [records, setRecords] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const limit = 10;

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const tId = queryType === 'target' ? userId : null;
            const aId = queryType === 'actor' ? userId : null;

            const res = await getRoleHistory(tId, aId, page, limit);
            setRecords(res.records || []);
            setTotal(res.total || 0);
        } catch (err) {
            console.error(`Ошибка загрузки истории (${queryType}):`, err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, queryType, page, refreshKey]);

    const totalPages = Math.ceil(total / limit);

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Проверяем, было ли последнее изменение менее 20 дней назад
    const isRecentChange = useMemo(() => {
        if (!records || records.length === 0) return false;
        const lastChange = records[0];
        if (!lastChange.created_at) return false;
        const diffDays = (new Date() - new Date(lastChange.created_at)) / (1000 * 60 * 60 * 24);
        return diffDays <= 20;
    }, [records]);

    const lastChange = records && records.length > 0 ? records[0] : null;

    return (
        <Card style={{ marginBottom: 16 }}>
            {/* ПЛАШКА: ПОСЛЕДНЕЕ ИЗМЕНЕНИЕ СТАТУСА (МЕНЕЕ 20 ДНЕЙ) */}
            {isRecentChange && lastChange && queryType === 'target' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 16 }}>
                    <Alert variant="warning" icon="fa-solid fa-clock-rotate-left" style={{ fontSize: 12, padding: '10px 14px' }}>
                        <strong>Недавнее изменение статуса:</strong>{' '}
                        {new Date(lastChange.created_at).toLocaleDateString('ru-RU')}
                        {lastChange.actor_login && (
                            <> пользователем <strong style={{ color: '#fbbf24' }}>{lastChange.actor_login}</strong></>
                        )}
                        {lastChange.action_status === 'failed' && (
                            <span style={{ color: '#fca5a5' }}> (Попытка: {lastChange.fail_reason})</span>
                        )}
                    </Alert>
                </motion.div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className={icon} style={{ color }} /> {title}
                    <Badge variant="neutral" style={{ fontSize: 10, padding: '2px 6px' }}>{total}</Badge>
                </h4>
                <Button
                    variant="secondary"
                    size="sm"
                    icon="fa-solid fa-rotate"
                    onClick={() => setRefreshKey(k => k + 1)}
                    loading={isLoading}
                >
                    Обновить
                </Button>
            </div>

            {isLoading && records.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>
                    <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 20, marginBottom: 8 }} />
                    <div style={{ fontSize: 13 }}>Загрузка истории...</div>
                </div>
            ) : records.length === 0 ? (
                <EmptyState icon="fa-solid fa-clock-rotate-left" title="История пуста" description="Записей пока нет" />
            ) : (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {records.map((rec) => (
                            <motion.div
                                key={rec.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 10,
                                    border: `1px solid ${rec.action_status === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Badge variant={rec.action_status === 'success' ? 'success' : 'danger'} style={{ fontSize: 10, padding: '2px 8px' }}>
                                            {rec.action_status === 'success' ? 'Успешно' : 'Ошибка'}
                                        </Badge>
                                        <span style={{ fontSize: 12, color: '#e2e8f0' }}>
                                            {rec.old_status_code || 'Нет'}
                                            <i className="fa-solid fa-arrow-right" style={{ margin: '0 6px', fontSize: 10, color: '#64748b' }} />
                                            {rec.new_status_code || 'Не задан'}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>
                                        <i className="fa-solid fa-clock" style={{ marginRight: 4 }} />
                                        {formatDate(rec.created_at)}
                                    </span>
                                </div>

                                {rec.action_status === 'failed' && rec.fail_reason && (
                                    <div style={{ fontSize: 11, color: '#fca5a5', marginTop: 4, fontStyle: 'italic' }}>
                                        <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 4 }} />
                                        Причина: {rec.fail_reason}
                                    </div>
                                )}

                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                                    {queryType === 'target' ? (
                                        <>Инициатор: <strong style={{ color: '#e2e8f0' }}>{rec.actor_login || 'Система'}</strong></>
                                    ) : (
                                        <>Цель: <strong style={{ color: '#e2e8f0' }}>{rec.target_login}</strong></>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                            <Button size="sm" variant="secondary" icon="fa-solid fa-chevron-left" disabled={page === 1} onClick={() => setPage(p => p - 1)} />
                            <span style={{ fontSize: 12, color: '#94a3b8' }}>Стр. {page} из {totalPages}</span>
                            <Button size="sm" variant="secondary" icon="fa-solid fa-chevron-right" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} />
                        </div>
                    )}
                </>
            )}
        </Card>
    );
};

export default RoleHistoryList;