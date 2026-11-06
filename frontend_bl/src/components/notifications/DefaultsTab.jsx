import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Toggle, Alert, Badge } from '../ui/UIComponents';
import { getRoleDefaults, updateRoleDefaults } from '../../http/notificationsAPI';
import CustomSelect from './CustomSelect';

// 🎨 Иконки для каналов
const CHANNEL_ICONS = {
    'web': { icon: 'fa-globe', color: '#6366f1' },
    'email': { icon: 'fa-envelope', color: '#f59e0b' },
    'telegram': { icon: 'fa-brands fa-telegram', color: '#0ea5e9' },
    'push': { icon: 'fa-bell', color: '#10b981' }
};

export default function DefaultsTab({ groups, statuses, showSuccess }) {
    const [selectedRole, setSelectedRole] = useState('');
    const [defaults, setDefaults] = useState([]);
    const [saving, setSaving] = useState(false);
    const [isStaffRole, setIsStaffRole] = useState(false);

    useEffect(() => {
        if (selectedRole) {
            const statusObj = statuses.find(s => s.code_name === selectedRole);
            const isStaff = statusObj?.is_staff || false;
            setIsStaffRole(isStaff);

            getRoleDefaults(selectedRole).then(res => {
                const backendDefaults = Array.isArray(res) ? res : (res?.data || []);

                // Формируем полный список настроек: для каждой группы и каждого канала
                const applicableGroups = groups.filter(g => g.type === 'user' || (isStaff && g.type === 'staff'));

                const mergedDefaults = [];
                applicableGroups.forEach(group => {
                    group.channels.forEach(channel => {
                        if (!channel.is_enabled) return;
                        // Проверяем активность канала
                        if (channel.channel_active === false) return;

                        const existing = backendDefaults.find(
                            d => d.group_id === group.id && d.channel_id === channel.channel_id
                        );

                        mergedDefaults.push(existing ? { ...existing } : {
                            group_id: group.id,
                            channel_id: channel.channel_id,
                            channel_code: channel.channel_code,
                            channel_name: channel.channel_name,
                            group_name: group.name,
                            group_icon: group.icon,
                            group_color: group.color,
                            group_type: group.type,
                            is_enabled: true,
                            sound_enabled: true
                        });
                    });
                });

                setDefaults(mergedDefaults);
            }).catch(console.error);
        } else {
            setDefaults([]);
            setIsStaffRole(false);
        }
    }, [selectedRole, groups, statuses]);

    const toggleDefault = (groupId, channelId) => {
        setDefaults(prev => prev.map(item => {
            if (item.group_id === groupId && item.channel_id === channelId) {
                return { ...item, is_enabled: !item.is_enabled };
            }
            return item;
        }));
    };

    const handleSave = async () => {
        if (!selectedRole) return;
        setSaving(true);
        try {
            const payload = defaults.map(d => ({
                group_id: d.group_id,
                channel_id: d.channel_id,
                is_enabled: d.is_enabled,
                sound_enabled: d.sound_enabled !== undefined ? d.sound_enabled : true
            }));
            await updateRoleDefaults(selectedRole, payload);
            showSuccess('Настройки роли успешно обновлены');
        } catch (e) {
            console.error('Ошибка сохранения дефолтов:', e);
            showSuccess('Ошибка при сохранении', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Группируем настройки по группам уведомлений
    const groupedByGroup = defaults.reduce((acc, item) => {
        if (!acc[item.group_id]) {
            acc[item.group_id] = {
                id: item.group_id,
                name: item.group_name,
                icon: item.group_icon,
                color: item.group_color,
                type: item.group_type,
                channels: []
            };
        }
        acc[item.group_id].channels.push(item);
        return acc;
    }, {});

    const userGroups = Object.values(groupedByGroup).filter(g => g.type === 'user');
    const staffGroups = Object.values(groupedByGroup).filter(g => g.type === 'staff');

    const renderGroupBlock = (group) => (
        <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                background: 'rgba(30, 32, 48, 0.6)', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden'
            }}
        >
            {/* Заголовок группы */}
            <div style={{
                padding: '14px 18px', background: 'rgba(0,0,0,0.2)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: 12
            }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${group.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <i className={`fa-solid ${group.icon || 'fa-bell'}`} style={{ color: group.color, fontSize: 15 }} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{group.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {group.channels.length} {group.channels.length === 1 ? 'канал' : 'каналов'} настроено
                    </div>
                </div>
                <Badge variant="default" style={{ fontSize: 10 }}>
                    {group.channels.filter(c => c.is_enabled).length} / {group.channels.length} вкл.
                </Badge>
            </div>

            {/* Список каналов */}
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {group.channels.map(channel => {
                    const chIcon = CHANNEL_ICONS[channel.channel_code] || { icon: 'fa-bell', color: '#64748b' };
                    return (
                        <div
                            key={channel.channel_id}
                            style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '12px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 10,
                                border: '1px solid rgba(255,255,255,0.05)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = `${chIcon.color}40`}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: 8,
                                    background: `${chIcon.color}15`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <i className={chIcon.icon} style={{ color: chIcon.color, fontSize: 13 }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                                        {channel.channel_name}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                        {channel.is_enabled ? 'Включено по умолчанию' : 'Отключено по умолчанию'}
                                    </div>
                                </div>
                            </div>
                            <Toggle
                                checked={channel.is_enabled}
                                onChange={() => toggleDefault(channel.group_id, channel.channel_id)}
                            />
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );

    return (
        <motion.div key="defaults" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card padding={24}>
                <div style={{ marginBottom: 24 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8, display: 'block' }}>
                        <i className="fa-solid fa-user-gear" style={{ marginRight: 6, color: '#6366f1' }} />
                        Выберите роль для настройки дефолтных уведомлений
                    </label>
                    <CustomSelect
                        value={selectedRole}
                        onChange={setSelectedRole}
                        options={statuses.map(s => ({ value: s.code_name, label: `${s.name} (${s.code_name})` }))}
                        placeholder="Например: MODERATOR или USER"
                    />
                </div>

                {selectedRole && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                        <Alert variant="info" icon="fa-info-circle" style={{ marginBottom: 24, fontSize: 13 }}>
                            Эти настройки будут <strong>автоматически применены</strong> ко всем пользователям с ролью
                            <strong> {statuses.find(s => s.code_name === selectedRole)?.name}</strong> при их регистрации или смене статуса.
                        </Alert>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                            {/* Личные уведомления */}
                            {userGroups.length > 0 && (
                                <div>
                                    <h4 style={{
                                        fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 16,
                                        textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 8
                                    }}>
                                        <i className="fa-solid fa-user" style={{ color: '#6366f1' }} />
                                        Личные уведомления
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 16 }}>
                                        {userGroups.map(renderGroupBlock)}
                                    </div>
                                </div>
                            )}

                            {/* Рабочие уведомления */}
                            {isStaffRole && staffGroups.length > 0 && (
                                <div>
                                    <h4 style={{
                                        fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 16,
                                        textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 8
                                    }}>
                                        <i className="fa-solid fa-briefcase" style={{ color: '#f59e0b' }} />
                                        Рабочие уведомления (Staff)
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 16 }}>
                                        {staffGroups.map(renderGroupBlock)}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{
                            display: 'flex', justifyContent: 'flex-end', marginTop: 32,
                            paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)'
                        }}>
                            <Button variant="primary" icon="fa-save" onClick={handleSave} loading={saving}
                                style={{ minWidth: 200, height: 44, fontSize: 14, fontWeight: 600 }}>
                                Сохранить настройки роли
                            </Button>
                        </div>
                    </motion.div>
                )}
            </Card>
        </motion.div>
    );
}