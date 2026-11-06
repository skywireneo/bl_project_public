import React from 'react';
import { motion } from 'framer-motion';
import { Card, Button, EmptyState, Badge, Select } from '../../../ui/UIComponents';
import Pagination from '../../../ui/Pagination';

const ActionHistory = ({ logs, logsLoading, logsPagination, onLoadLogs, onPageChange }) => {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
            <Card padding={24} style={{ marginTop: 32, marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-clock-rotate-left" style={{ color: '#6366f1', fontSize: 18 }} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>История действий</h3>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => onLoadLogs(logsPagination.page, logsPagination.limit)} icon="fa-rotate" loading={logsLoading}>Обновить</Button>
                </div>
                {logsLoading && logs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, marginBottom: 12 }} /><div style={{ fontSize: 14 }}>Загрузка истории...</div></div>
                ) : logs.length === 0 ? (
                    <EmptyState icon="fa-inbox" title="История действий пуста" description="Выполненные действия будут отображаться здесь" />
                ) : (
                    <>
                        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' }}>
                                    <tr>
                                        {['Действие', 'Пользователь', 'Время', 'Статус'].map((h, i) => (<th key={i} style={{ padding: '14px 16px', textAlign: i === 3 ? 'center' : 'left', fontWeight: 700, color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log, idx) => (
                                        <tr key={log.uuid || idx} style={{ borderBottom: idx < logs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '14px 16px', color: '#e2e8f0', fontWeight: 500 }}>{log.action_text}</td>
                                            <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>{log.user_login ? <Badge variant="info" icon="fa-user">{log.user_login}</Badge> : <span style={{ color: '#64748b', fontStyle: 'italic', fontSize: 12 }}><i className="fa-solid fa-gear" style={{ marginRight: 4 }} />Система</span>}</td>
                                            <td style={{ padding: '14px 16px', fontSize: 12, color: '#94a3b8' }}>{log.datetime ? new Date(log.datetime).toLocaleString('ru-RU') : '-'}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}><Badge variant={log.status === 1 ? 'success' : 'danger'} icon={log.status === 1 ? 'fa-check' : 'fa-times'}>{log.status === 1 ? 'Выполнено' : 'Провалено'}</Badge></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: 13, color: '#94a3b8' }}>Показывать по:</span>
                                <Select value={logsPagination.limit} onChange={(e) => onLoadLogs(1, parseInt(e.target.value))} style={{ width: 'auto', padding: '8px 32px 8px 12px', fontSize: 13 }}>
                                    <option value={5}>5</option><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
                                </Select>
                                <span style={{ fontSize: 13, color: '#94a3b8' }}>Всего: <strong style={{ color: '#e2e8f0' }}>{logsPagination.total}</strong></span>
                            </div>
                            {logsPagination.totalPages > 1 && <Pagination currentPage={logsPagination.page} totalPages={logsPagination.totalPages} totalItems={logsPagination.total} onPageChange={onPageChange} variant="compact" size="sm" showFirstLast={true} showPrevNext={true} showPageNumbers={true} showTotalItems={false} />}
                        </div>
                    </>
                )}
            </Card>
        </motion.div>
    );
};
export default ActionHistory;