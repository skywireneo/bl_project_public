import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Badge, EmptyState } from '../../ui/UIComponents';
import { getUserSettingsHistory } from '../../../http/notificationsAPI';

const CHANNEL_ICONS = {
    'web': { icon: 'fa-globe', color: '#6366f1' },
    'email': { icon: 'fa-envelope', color: '#f59e0b' },
    'telegram': { icon: 'fa-brands fa-telegram', color: '#0ea5e9' },
    'push': { icon: 'fa-bell', color: '#10b981' }
};

export default function UserNotificationSettingsHistory({ userId }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

    const loadData = useCallback(async (page = 1) => {
        if (!userId) return;
        setLoading(true);
        try {
            const res = await getUserSettingsHistory(userId, { page, limit: pagination.limit });
            setHistory(res.data || []);
            setPagination(res.meta || { page, limit: 10, total: 0, totalPages: 0 });
        } catch (e) {
            console.error('Ошибка загрузки истории настроек:', e);
        } finally {
            setLoading(false);
        }
    }, [userId, pagination.limit]);

    useEffect(() => { loadData(1); }, [loadData]);

    if (!userId) return null;

    return (
        <Card padding={24}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <i className="fa-solid fa-clock-rotate-left" style={{ color: '#8b5cf6' }} />
                    История изменений настроек
                </h4>
                <Button variant="secondary" size="sm" onClick={() => loadData(pagination.page)} icon="fa-rotate" loading={loading}>
                    Обновить
                </Button>
            </div>

            {loading && history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                    <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 20 }} />
                </div>
            ) : history.length === 0 ? (
                <EmptyState icon="fa-inbox" title="История пуста" description="Здесь будут отображаться изменения ваших настроек уведомлений" />
            ) : (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', paddingLeft: 24 }}>
                        <div style={{ position: 'absolute', left: 9, top: 10, bottom: 10, width: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }} />

                        {history.map((item, idx) => {
                            const chConfig = CHANNEL_ICONS[item.channel_code] || { icon: 'fa-bell', color: '#64748b' };

                            return (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    style={{
                                        padding: '14px 0', position: 'relative',
                                        borderBottom: idx < history.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none'
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute', left: -18, top: 18,
                                        width: 20, height: 20, borderRadius: '50%',
                                        background: '#0f1117', border: `2px solid ${chConfig.color}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        zIndex: 1
                                    }}>
                                        <i className={chConfig.icon} style={{ color: chConfig.color, fontSize: 8 }} />
                                    </div>

                                    <div style={{ paddingLeft: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                                            {item.group_icon && (
                                                <div style={{
                                                    width: 28, height: 28, borderRadius: 8,
                                                    background: `${item.group_color}15`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <i className={`fa-solid ${item.group_icon}`} style={{ color: item.group_color, fontSize: 12 }} />
                                                </div>
                                            )}
                                            <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>
                                                {item.group_name || item.group_code || 'Группа'}
                                            </span>
                                            <span style={{ fontSize: 12, color: '#64748b' }}>→</span>
                                            <Badge variant="default" style={{
                                                fontSize: 11,
                                                background: `${chConfig.color}15`,
                                                color: chConfig.color,
                                                border: `1px solid ${chConfig.color}30`,
                                                padding: '4px 8px'
                                            }}>
                                                <i className={chConfig.icon} style={{ fontSize: 10, marginRight: 4 }} />
                                                {item.channel_name || item.channel_code}
                                            </Badge>
                                            <span style={{
                                                marginLeft: 'auto', fontSize: 12, color: '#64748b',
                                                display: 'flex', alignItems: 'center', gap: 4
                                            }}>
                                                <i className="fa-solid fa-clock" style={{ fontSize: 10 }} />
                                                {new Date(item.changed_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', gap: 20, fontSize: 13, flexWrap: 'wrap' }}>
                                            {item.old_is_enabled !== item.new_is_enabled && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ color: '#94a3b8' }}>Уведомления:</span>
                                                    <span style={{ color: item.old_is_enabled ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <i className={`fa-solid ${item.old_is_enabled ? 'fa-check' : 'fa-xmark'}`} style={{ fontSize: 10 }} />
                                                        {item.old_is_enabled ? 'Вкл' : 'Выкл'}
                                                    </span>
                                                    <i className="fa-solid fa-arrow-right" style={{ color: '#64748b', fontSize: 10 }} />
                                                    <span style={{ color: item.new_is_enabled ? '#22c55e' : '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <i className={`fa-solid ${item.new_is_enabled ? 'fa-check' : 'fa-xmark'}`} style={{ fontSize: 10 }} />
                                                        {item.new_is_enabled ? 'Вкл' : 'Выкл'}
                                                    </span>
                                                </div>
                                            )}
                                            {item.old_sound_enabled !== item.new_sound_enabled && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ color: '#94a3b8' }}>Звук:</span>
                                                    <span style={{ color: item.old_sound_enabled ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <i className={`fa-solid ${item.old_sound_enabled ? 'fa-volume-high' : 'fa-volume-xmark'}`} style={{ fontSize: 10 }} />
                                                        {item.old_sound_enabled ? 'Вкл' : 'Выкл'}
                                                    </span>
                                                    <i className="fa-solid fa-arrow-right" style={{ color: '#64748b', fontSize: 10 }} />
                                                    <span style={{ color: item.new_sound_enabled ? '#22c55e' : '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <i className={`fa-solid ${item.new_sound_enabled ? 'fa-volume-high' : 'fa-volume-xmark'}`} style={{ fontSize: 10 }} />
                                                        {item.new_sound_enabled ? 'Вкл' : 'Выкл'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {pagination.totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                            <Button variant="secondary" size="sm" disabled={pagination.page === 1} onClick={() => loadData(pagination.page - 1)}>
                                <i className="fa-solid fa-chevron-left" />
                            </Button>
                            <span style={{ display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: 13, padding: '0 12px' }}>
                                Страница {pagination.page} из {pagination.totalPages}
                            </span>
                            <Button variant="secondary" size="sm" disabled={pagination.page === pagination.totalPages} onClick={() => loadData(pagination.page + 1)}>
                                <i className="fa-solid fa-chevron-right" />
                            </Button>
                        </div>
                    )}
                </>
            )}
        </Card>
    );
}