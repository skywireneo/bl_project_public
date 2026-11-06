import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Badge, Toggle, Alert } from '../../ui/UIComponents';
import { getMyNotificationSettings, updateMyNotificationSettings } from '../../../http/notificationsAPI';

const CHANNEL_ICONS = {
    'web': { icon: 'fa-globe', color: '#6366f1' },
    'email': { icon: 'fa-envelope', color: '#f59e0b' },
    'telegram': { icon: 'fa-brands fa-telegram', color: '#0ea5e9' },
    'push': { icon: 'fa-bell', color: '#10b981' }
};

export default function UserNotificationSettings() {
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                console.log('🔄 Запрос настроек уведомлений на бэк...');
                const res = await getMyNotificationSettings();
                console.log(' Настройки получены:', res);
                setSettings(res || []);
            } catch (e) {
                console.error('❌ Ошибка загрузки настроек уведомлений:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleToggle = (groupId, channelId, field, value) => {
        setSettings(prev => prev.map(g => {
            if (g.id === groupId) {
                return {
                    ...g,
                    channels: g.channels.map(ch => {
                        if (ch.channel_id === channelId) return { ...ch, [field]: value };
                        return ch;
                    })
                };
            }
            return g;
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = settings.flatMap(g =>
                g.channels.map(ch => ({
                    group_id: g.id,
                    channel_id: ch.channel_id,
                    is_enabled: ch.final_enabled,
                    sound_enabled: ch.user_sound
                }))
            );
            await updateMyNotificationSettings(payload);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (e) {
            console.error('❌ Ошибка сохранения настроек:', e);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Card style={{ textAlign: 'center', padding: 40 }}>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24, color: '#6366f1', marginBottom: 12 }} />
                <div style={{ color: '#94a3b8' }}>Загрузка настроек...</div>
            </Card>
        );
    }

    const renderGroup = (group) => (
        <Card key={group.id} style={{ marginBottom: 16, overflow: 'hidden' }}>
            <div style={{
                padding: '16px 20px',
                background: 'rgba(0,0,0,0.2)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: 14
            }}>
                <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: `${group.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <i className={`fa-solid ${group.icon || 'fa-bell'}`} style={{ color: group.color, fontSize: 18 }} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {group.name}
                        {group.is_system && <Badge variant="danger" style={{ fontSize: 9 }}>Системное</Badge>}
                        {group.is_critical && <Badge variant="warning" style={{ fontSize: 9 }}>Критическое</Badge>}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{group.description || 'Стандартные уведомления'}</div>
                </div>
            </div>

            <div style={{ padding: 8 }}>
                {group.channels.map(ch => {
                    const chIcon = CHANNEL_ICONS[ch.channel_code] || { icon: 'fa-bell', color: '#64748b' };
                    const isLocked = !ch.can_toggle;
                    const isEnabled = ch.final_enabled;
                    const isSoundEnabled = ch.user_sound;

                    return (
                        <div key={ch.channel_id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '14px 16px',
                            margin: '4px 8px',
                            background: isLocked ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.02)',
                            borderRadius: 10,
                            border: `1px solid ${isLocked ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)'}`,
                            opacity: isLocked ? 0.6 : 1,
                            transition: 'all 0.2s'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 8,
                                    background: `${chIcon.color}15`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <i className={`fa-solid ${isLocked ? 'fa-lock' : chIcon.icon}`}
                                        style={{ color: isLocked ? '#64748b' : chIcon.color, fontSize: 14 }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
                                        {ch.channel_name}
                                    </div>
                                    {isLocked && (
                                        <div style={{ fontSize: 11, color: '#f87171', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <i className="fa-solid fa-shield-halved" style={{ fontSize: 10 }} />
                                            Управляется администратором
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: 12, color: isEnabled ? '#4ade80' : '#64748b', fontWeight: 600 }}>
                                        {isEnabled ? 'Вкл' : 'Выкл'}
                                    </span>
                                    <Toggle
                                        checked={isEnabled}
                                        onChange={(val) => handleToggle(group.id, ch.channel_id, 'final_enabled', val)}
                                        disabled={isLocked}
                                    />
                                </div>

                                {ch.channel_code === 'web' && isEnabled && !isLocked && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', width: '100%', justifyContent: 'flex-end'
                                    }}>
                                        <span style={{ fontSize: 11, color: '#94a3b8' }}>Звук</span>
                                        <Toggle
                                            size="sm"
                                            checked={isSoundEnabled}
                                            onChange={(val) => handleToggle(group.id, ch.channel_id, 'user_sound', val)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );

    const userGroups = settings.filter(g => g.type === 'user');
    const staffGroups = settings.filter(g => g.type === 'staff');

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 24, flexWrap: 'wrap', gap: 16
            }}>
                <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <i className="fa-solid fa-sliders" style={{ color: '#6366f1' }} />
                        Настройки уведомлений
                    </h3>
                    <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                        Управляйте способами получения уведомлений. Настройки, заблокированные администратором, изменить нельзя.
                    </p>
                </div>
                <Button variant="primary" icon="fa-save" onClick={handleSave} loading={saving} style={{ minWidth: 180 }}>
                    Сохранить изменения
                </Button>
            </div>

            {success && (
                <Alert variant="success" icon="fa-check" style={{ marginBottom: 20 }}>
                    Настройки успешно сохранены и применены
                </Alert>
            )}

            {userGroups.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fa-solid fa-user" style={{ color: '#6366f1' }} />
                        Личные уведомления
                    </h4>
                    {userGroups.map(renderGroup)}
                </div>
            )}

            {staffGroups.length > 0 && (
                <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fa-solid fa-briefcase" style={{ color: '#f59e0b' }} />
                        Рабочие уведомления
                    </h4>
                    {staffGroups.map(renderGroup)}
                </div>
            )}
        </motion.div>
    );
}