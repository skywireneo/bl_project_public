import React, { useState, useEffect, useContext } from 'react';
import { Context } from '../..';
import { getMyNotificationSettings, updateMyNotificationSettings } from '../../http/notificationsAPI';
import { Card, Button, Badge, Toggle, Alert } from '../ui/UIComponents';

export default function NotificationSettingsPage() {
    const { notification } = useContext(Context);
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await getMyNotificationSettings();
                setSettings(res || []);
            } catch (e) {
                console.error(e);
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
                        if (ch.channel_id === channelId) {
                            return { ...ch, [field]: value };
                        }
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
            notification.handleSettingsChanged();
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24, marginBottom: 12 }} />
                <div>Загрузка настроек...</div>
            </div>
        );
    }

    const userGroups = settings.filter(g => g.type === 'user');
    const staffGroups = settings.filter(g => g.type === 'staff');

    const renderGroup = (group) => (
        <Card key={group.id} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${group.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className={`fa-solid ${group.icon || 'fa-bell'}`} style={{ color: group.color, fontSize: 18 }} />
                    </div>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {group.name}
                            {group.is_system && <Badge variant="danger" style={{ fontSize: 10 }}>Системное</Badge>}
                            {group.is_critical && <Badge variant="warning" style={{ fontSize: 10 }}>Критическое</Badge>}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{group.description}</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {group.channels.map(ch => {
                    const isLocked = !ch.can_toggle;
                    const isEnabled = ch.final_enabled;
                    const isSoundEnabled = ch.user_sound;

                    return (
                        <div key={ch.channel_id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8,
                            opacity: isLocked ? 0.6 : 1
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <i className={`fa-solid ${isLocked ? 'fa-lock' : (isEnabled ? 'fa-check-circle' : 'fa-circle')}`}
                                    style={{ color: isLocked ? '#64748b' : (isEnabled ? '#22c55e' : '#64748b'), fontSize: 14 }} />
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{ch.channel_name}</div>
                                    {isLocked && <div style={{ fontSize: 11, color: '#94a3b8' }}>Управляется администратором</div>}
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                {ch.channel_code === 'web' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <i className="fa-solid fa-volume-high" style={{ color: '#64748b', fontSize: 12 }} />
                                        <Toggle checked={isSoundEnabled} onChange={(val) => handleToggle(group.id, ch.channel_id, 'user_sound', val)} disabled={!isEnabled || isLocked} />
                                    </div>
                                )}
                                <Toggle checked={isEnabled} onChange={(val) => handleToggle(group.id, ch.channel_id, 'final_enabled', val)} disabled={isLocked} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            {success && (
                <Alert variant="success" icon="fa-check" style={{ marginBottom: 16 }}>
                    Настройки успешно сохранены
                </Alert>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                <Button variant="primary" icon="fa-save" onClick={handleSave} loading={saving}>
                    Сохранить изменения
                </Button>
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fa-solid fa-user" style={{ color: '#6366f1' }} /> Личные уведомления
            </h3>
            {userGroups.map(renderGroup)}

            {staffGroups.length > 0 && (
                <>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, marginTop: 32, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fa-solid fa-briefcase" style={{ color: '#f59e0b' }} /> Рабочие уведомления
                    </h3>
                    {staffGroups.map(renderGroup)}
                </>
            )}
        </div>
    );
}