import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Badge, Toggle, Alert } from '../ui/UIComponents';
import { getChannels, updateChannel } from '../../http/notificationsAPI';

const CHANNEL_ICONS = {
    'web': { icon: 'fa-globe', color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
    'email': { icon: 'fa-envelope', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
    'telegram': { icon: 'fa-brands fa-telegram', color: '#0ea5e9', gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)' },
    'push': { icon: 'fa-bell', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' }
};

export default function ChannelsTab({ showSuccess, onDataUpdate }) {
    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await getChannels();
            const data = Array.isArray(res) ? res : (res?.data || []);
            setChannels(data);
        } catch (e) {
            console.error('Ошибка загрузки каналов:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleToggle = async (channelId, newActive) => {
        setUpdating(channelId);
        try {
            await updateChannel(channelId, newActive);
            setChannels(prev => prev.map(ch =>
                ch.id === channelId ? { ...ch, is_active: newActive } : ch
            ));
            showSuccess(`Канал ${newActive ? 'активирован' : 'деактивирован'}`);

            // Сообщаем родителю, что нужно обновить данные (группы, дефолты и т.д.)
            if (onDataUpdate) {
                await onDataUpdate();
            }
        } catch (e) {
            console.error(e);
            showSuccess('Ошибка обновления канала', 'error');
        } finally {
            setUpdating(null);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24 }} />
            </div>
        );
    }

    return (
        <motion.div key="channels" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Alert variant="info" icon="fa-info-circle" style={{ marginBottom: 20, fontSize: 13 }}>
                <strong>Управление каналами доставки.</strong> Отключённые каналы не используются нигде в системе,
                но их данные (шаблоны, настройки) сохраняются для возможного восстановления.
            </Alert>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
                {channels.map(channel => {
                    const chConfig = CHANNEL_ICONS[channel.code] || { icon: 'fa-bell', color: '#64748b', gradient: 'linear-gradient(135deg, #64748b, #475569)' };
                    const isActive = channel.is_active;

                    return (
                        <motion.div
                            key={channel.id}
                            whileHover={{ y: -2 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        >
                            <Card style={{
                                padding: 20, height: '100%',
                                display: 'flex', flexDirection: 'column',
                                border: `1px solid ${isActive ? `${chConfig.color}30` : 'rgba(255,255,255,0.06)'}`,
                                background: isActive ? 'rgba(30, 32, 48, 0.6)' : 'rgba(30, 32, 48, 0.3)',
                                opacity: isActive ? 1 : 0.7,
                                transition: 'all 0.2s'
                            }}>
                                {/* Шапка */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                                    <div style={{
                                        width: 52, height: 52, borderRadius: 14,
                                        background: isActive ? chConfig.gradient : 'rgba(100,116,139,0.2)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: isActive ? `0 4px 14px ${chConfig.color}40` : 'none',
                                        transition: 'all 0.2s'
                                    }}>
                                        <i className={chConfig.icon} style={{ color: isActive ? '#fff' : '#64748b', fontSize: 22 }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
                                                {channel.name}
                                            </span>
                                            <Badge
                                                variant={isActive ? 'success' : 'danger'}
                                                style={{ fontSize: 10, fontWeight: 700 }}
                                            >
                                                {isActive ? 'АКТИВЕН' : 'ОТКЛЮЧЁН'}
                                            </Badge>
                                        </div>
                                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                            {channel.description || `Канал доставки: ${channel.code}`}
                                        </div>
                                    </div>
                                </div>

                                {/* Статистика */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
                                    padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 10, marginBottom: 16
                                }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: chConfig.color }}>
                                            {parseInt(channel.total_sent || 0).toLocaleString('ru-RU')}
                                        </div>
                                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Отправлено</div>
                                    </div>
                                    <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>
                                            {channel.groups_using || 0}
                                        </div>
                                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Групп</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>
                                            {channel.last_sent_at
                                                ? new Date(channel.last_sent_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                                                : '—'}
                                        </div>
                                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Последний раз</div>
                                    </div>
                                </div>

                                {/* Toggle активности */}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 10,
                                    marginTop: 'auto'
                                }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                                            {isActive ? 'Канал активен' : 'Канал отключён'}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                            {isActive ? 'Используется в системе' : 'Не используется нигде'}
                                        </div>
                                    </div>
                                    <Toggle
                                        checked={isActive}
                                        onChange={(val) => handleToggle(channel.id, val)}
                                        disabled={updating === channel.id}
                                    />
                                </div>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
}