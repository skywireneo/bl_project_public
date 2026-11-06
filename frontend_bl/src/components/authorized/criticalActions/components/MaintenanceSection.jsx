import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Input, Alert, EmptyState, Badge } from '../../../ui/UIComponents';
import Pagination from '../../../ui/Pagination';
import { getMaintenanceStatus, scheduleMaintenance, cancelMaintenance, getMaintenanceHistory } from '../../../../http/criticalActionsAPI';

const MaintenanceSection = ({ onShowNotification }) => {
    const isMountedRef = useRef(true);
    const [maintenanceTask, setMaintenanceTask] = useState(null);
    const [maintLoading, setMaintLoading] = useState(false);
    const [maintForm, setMaintForm] = useState({ scheduledAt: '', expectedOpenAt: '', message: '' });

    const [maintenanceHistory, setMaintenanceHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [cancelConfirmModalOpen, setCancelConfirmModalOpen] = useState(false);

    const loadMaintenanceHistory = useCallback(async (page = 1, limit = 20) => {
        try {
            setHistoryLoading(true);
            const response = await getMaintenanceHistory(page, limit);
            if (!isMountedRef.current) return;
            const meta = response.meta || {};
            setMaintenanceHistory(response.data || []);
            setHistoryPagination({ page: meta.page || page, limit: meta.limit || limit, total: meta.total || 0, totalPages: meta.totalPages || Math.ceil((meta.total || 0) / (meta.limit || limit)) });
        } catch (err) { console.error(err); } finally { if (isMountedRef.current) setHistoryLoading(false); }
    }, []);

    useEffect(() => {
        const loadStatus = async () => {
            try {
                const res = await getMaintenanceStatus();
                if (res.success && res.data) {
                    setMaintenanceTask(res.data);
                    const toLocalInput = (dateStr) => { if (!dateStr) return ''; const d = new Date(dateStr); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
                    setMaintForm({ scheduledAt: toLocalInput(res.data.scheduled_at), expectedOpenAt: toLocalInput(res.data.expected_open_at), message: res.data.message || '' });
                }
            } catch (e) { console.error(e); }
        };
        loadStatus();
        loadMaintenanceHistory(1, 20);
        return () => { isMountedRef.current = false; };
    }, [loadMaintenanceHistory]);

    const handleScheduleMaint = async () => {
        if (!maintForm.scheduledAt || !maintForm.message) { onShowNotification('error', 'Заполните время и сообщение'); return; }
        setMaintLoading(true);
        try {
            const res = await scheduleMaintenance(new Date(maintForm.scheduledAt).toISOString(), maintForm.expectedOpenAt ? new Date(maintForm.expectedOpenAt).toISOString() : null, maintForm.message);
            if (res.success) { setMaintenanceTask(res.data); onShowNotification('success', 'Техработы успешно запланированы'); }
        } catch (e) { onShowNotification('error', 'Ошибка: ' + (e.response?.data?.message || e.message)); } finally { setMaintLoading(false); }
    };

    const confirmCancelMaint = async () => {
        setCancelConfirmModalOpen(false);
        try {
            const res = await cancelMaintenance();
            if (res.success) { setMaintenanceTask(null); setMaintForm({ scheduledAt: '', expectedOpenAt: '', message: '' }); onShowNotification('success', 'Техработы отменены'); }
        } catch (e) { onShowNotification('error', 'Ошибка: ' + (e.response?.data?.message || e.message)); }
    };

    const statusConfig = { scheduled: { variant: 'info', label: 'Запланировано', icon: 'fa-clock', color: '#60a5fa' }, active: { variant: 'warning', label: 'Выполняется', icon: 'fa-spinner fa-spin', color: '#fbbf24' }, completed: { variant: 'success', label: 'Завершено', icon: 'fa-check', color: '#34d399' }, cancelled: { variant: 'danger', label: 'Отменено', icon: 'fa-ban', color: '#f87171' } };

    return (
        <>
            {/* Планировщик */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.4 }}>
                <Card padding={24} style={{ marginBottom: 24, borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}><i className="fa-solid fa-clock" /></div>
                        <div><h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Планирование технических работ</h3><p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#94a3b8' }}>Мягкое закрытие сайта с предупреждением пользователей</p></div>
                    </div>
                    {maintenanceTask ? (
                        <Alert variant="warning" style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 13, lineHeight: 1.6 }}><strong> Техработы запланированы.</strong><br />Начало: {new Date(maintenanceTask.scheduled_at).toLocaleString('ru-RU')}<br />{maintenanceTask.expected_open_at && <>Ожидаемое открытие: {new Date(maintenanceTask.expected_open_at).toLocaleString('ru-RU')}<br /></>}Сообщение: "{maintenanceTask.message}"</div>
                            <Button variant="danger" size="sm" onClick={() => setCancelConfirmModalOpen(true)} icon="fa-ban" style={{ marginTop: 12 }}>Отменить техработы</Button>
                        </Alert>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                            <div><label style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4, display: 'block' }}>Время закрытия (МСК)</label><Input type="datetime-local" value={maintForm.scheduledAt} onChange={(e) => setMaintForm({ ...maintForm, scheduledAt: e.target.value })} /></div>
                            <div><label style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4, display: 'block' }}>Ожидаемое открытие (МСК, необязательно)</label><Input type="datetime-local" value={maintForm.expectedOpenAt} onChange={(e) => setMaintForm({ ...maintForm, expectedOpenAt: e.target.value })} /></div>
                            <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4, display: 'block' }}>Сообщение для пользователей</label><Input placeholder="Например: Плановое обновление базы данных" value={maintForm.message} onChange={(e) => setMaintForm({ ...maintForm, message: e.target.value })} /></div>
                            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}><Button variant="warning" onClick={handleScheduleMaint} loading={maintLoading} icon="fa-calendar-check" disabled={!maintForm.scheduledAt || !maintForm.message}>Запланировать закрытие</Button></div>
                        </div>
                    )}
                </Card>
            </motion.div>

            {/* История */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.4 }}>
                <Card padding={24} style={{ marginBottom: 24, borderLeft: '4px solid #6366f1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}><i className="fa-solid fa-clock-rotate-left" /></div>
                            <div><h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>История технических работ</h3><p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#94a3b8' }}>Все запланированные, выполненные и отменённые техработы</p></div>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => loadMaintenanceHistory(historyPagination.page, historyPagination.limit)} icon="fa-rotate" loading={historyLoading}>Обновить</Button>
                    </div>
                    {historyLoading && maintenanceHistory.length === 0 ? (<div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, marginBottom: 12 }} /><div style={{ fontSize: 14 }}>Загрузка истории...</div></div>) : maintenanceHistory.length === 0 ? (<EmptyState icon="fa-inbox" title="История пуста" description="Запланированные и выполненные техработы будут отображаться здесь" />) : (
                        <>
                            <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' }}><tr>{['Сообщение', 'Запланировано', 'Ожидаемое открытие', 'Статус', 'Создано'].map((h, i) => (<th key={i} style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>))}</tr></thead>
                                    <tbody>
                                        {maintenanceHistory.map((task, idx) => {
                                            const config = statusConfig[task.status] || statusConfig.completed;
                                            return (
                                                <tr key={task.id || idx} style={{ borderBottom: idx < maintenanceHistory.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                                    <td style={{ padding: '14px 16px', color: '#e2e8f0', fontWeight: 500, maxWidth: 300 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.message || '—'}</div></td>
                                                    <td style={{ padding: '14px 16px', fontSize: 12, color: '#94a3b8' }}>{task.scheduled_at ? new Date(task.scheduled_at).toLocaleString('ru-RU') : '—'}</td>
                                                    <td style={{ padding: '14px 16px', fontSize: 12, color: '#94a3b8' }}>{task.expected_open_at ? new Date(task.expected_open_at).toLocaleString('ru-RU') : '—'}</td>
                                                    <td style={{ padding: '14px 16px' }}><Badge variant={config.variant} icon={config.icon}>{config.label}</Badge></td>
                                                    <td style={{ padding: '14px 16px', fontSize: 12, color: '#94a3b8' }}><div>{task.created_at ? new Date(task.created_at).toLocaleString('ru-RU') : '—'}</div>{task.created_by_login && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}><i className="fa-solid fa-user" style={{ marginRight: 4 }} />{task.created_by_login}</div>}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {historyPagination.totalPages > 1 && <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}><Pagination currentPage={historyPagination.page} totalPages={historyPagination.totalPages} totalItems={historyPagination.total} onPageChange={(newPage) => loadMaintenanceHistory(newPage, historyPagination.limit)} variant="compact" size="sm" /></div>}
                        </>
                    )}
                </Card>
            </motion.div>

            {/* Модалка подтверждения отмены */}
            {cancelConfirmModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setCancelConfirmModalOpen(false)}>
                    <div style={{ background: '#1e293b', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#f1f5f9' }}>Подтверждение отмены</h3>
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f59e0b', fontSize: 24 }} />
                            <div><div style={{ color: '#fbbf24', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Вы уверены?</div><div style={{ color: '#cbd5e1', fontSize: 13 }}>Запланированные технические работы будут отменены.</div></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <Button variant="secondary" onClick={() => setCancelConfirmModalOpen(false)}>Нет, оставить</Button>
                            <Button variant="danger" onClick={confirmCancelMaint} icon="fa-ban">Да, отменить</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
export default MaintenanceSection;