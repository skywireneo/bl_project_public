import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Modal, Alert, Input, Toggle, Badge } from '../ui/UIComponents';
import { getNotificationGroups, updateNotificationGroup, updateGroupChannels } from '../../http/notificationsAPI';
import { getAllStatuses } from '../../http/userAPI';

import GroupsTab from './GroupsTab';
import TemplatesTab from './TemplatesTab';
import DefaultsTab from './DefaultsTab';
import BroadcastTab from './BroadcastTab';
import CustomSelect from './CustomSelect';
import AdminNotificationsHistoryTab from './AdminNotificationsHistoryTab';
import ChannelsTab from './ChannelsTab';

// 🎨 Иконки и цвета для каналов
const CHANNEL_ICONS = {
    'web': { icon: 'fa-globe', color: '#6366f1' },
    'email': { icon: 'fa-envelope', color: '#f59e0b' },
    'telegram': { icon: 'fa-brands fa-telegram', color: '#0ea5e9' },
    'push': { icon: 'fa-bell', color: '#10b981' }
};

export default function AdminNotificationsPage() {
    const [activeTab, setActiveTab] = useState('groups');
    const [groups, setGroups] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [successMsg, setSuccessMsg] = useState('');

    const [editingGroup, setEditingGroup] = useState(null);
    const [savingGroup, setSavingGroup] = useState(false);

    // 🔄 Единая функция обновления данных (используется и при старте, и после изменений)
    const refreshData = async () => {
        setLoading(true);
        try {
            const [groupsRes, statusesRes] = await Promise.all([
                getNotificationGroups(),
                getAllStatuses()
            ]);
            const groupsData = Array.isArray(groupsRes) ? groupsRes : (groupsRes?.data || []);
            const statusesData = Array.isArray(statusesRes) ? statusesRes : (statusesRes?.data || []);
            setGroups(groupsData);
            setStatuses(statusesData);
        } catch (e) {
            console.error('❌ Ошибка обновления данных:', e);
        } finally {
            setLoading(false);
        }
    };

    // Загружаем данные только один раз при монтировании компонента
    useEffect(() => {
        refreshData();
    }, []);

    const showSuccess = (msg) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    // Извлекаем все уникальные каналы (для возможного будущего использования)
    const allChannels = useMemo(() => {
        const channelsMap = new Map();
        groups.forEach(group => {
            group.channels?.forEach(ch => {
                if (!channelsMap.has(ch.channel_code)) {
                    channelsMap.set(ch.channel_code, {
                        id: ch.channel_id,
                        code: ch.channel_code,
                        name: ch.channel_name,
                        ...CHANNEL_ICONS[ch.channel_code]
                    });
                }
            });
        });
        return Array.from(channelsMap.values());
    }, [groups]);

    const handleSaveGroup = async () => {
        if (!editingGroup) return;
        setSavingGroup(true);
        try {
            await updateNotificationGroup(editingGroup.id, {
                name: editingGroup.name,
                description: editingGroup.description,
                priority: editingGroup.priority,
                is_critical: editingGroup.is_critical
            });

            // Сохраняем настройки каналов для этой группы
            const channelsPayload = editingGroup.channels.map(ch => ({
                channel_id: ch.channel_id,
                is_enabled: ch.is_enabled,
                is_locked_for_user: ch.is_locked_for_user
            }));
            await updateGroupChannels(editingGroup.id, channelsPayload);

            showSuccess('Группа успешно обновлена');
            setEditingGroup(null);
            refreshData(); // Обновляем список после сохранения
        } catch (e) {
            console.error(e);
            showSuccess('Ошибка при сохранении', 'error');
        } finally {
            setSavingGroup(false);
        }
    };

    // Обновление состояния канала внутри модалки до сохранения
    const updateChannelInEditing = (channelId, field, value) => {
        setEditingGroup(prev => ({
            ...prev,
            channels: prev.channels.map(ch =>
                ch.channel_id === channelId ? { ...ch, [field]: value } : ch
            )
        }));
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 32, marginBottom: 16 }} />
                <div style={{ fontSize: 14 }}>Загрузка настроек уведомлений...</div>
            </div>
        );
    }

    //  ИСПРАВЛЕНЫ ИКОНКИ ВКЛАДОК
    const tabs = [
        { id: 'groups', label: 'Группы', icon: 'fa-layer-group' },
        { id: 'channels', label: 'Каналы', icon: 'fa-route' }, // Было fa-layer-group
        { id: 'templates', label: 'Шаблоны', icon: 'fa-file-code' },
        { id: 'defaults', label: 'Дефолты ролей', icon: 'fa-user-gear' },
        { id: 'broadcast', label: 'Рассылка', icon: 'fa-paper-plane' },
        { id: 'history', label: 'История', icon: 'fa-clock-rotate-left' }, // Было fa-paper-plane
    ];

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
            {successMsg && (
                <Alert variant="success" icon="fa-check" style={{ marginBottom: 16 }}>
                    {successMsg}
                </Alert>
            )}

            {/* Навигация по вкладкам */}
            <div style={{
                display: 'flex', gap: 4, marginBottom: 24,
                background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 4,
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none',
                            background: activeTab === tab.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                            color: activeTab === tab.id ? '#e2e8f0' : '#94a3b8',
                            fontSize: 13, fontWeight: 600,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            transition: 'all 0.2s'
                        }}
                    >
                        <i className={`fa-solid ${tab.icon}`} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Контент вкладок */}
            <AnimatePresence mode="wait">
                {activeTab === 'groups' && <GroupsTab groups={groups} onEditGroup={setEditingGroup} />}

                {/* Передаём refreshData, чтобы после включения канала список групп обновился */}
                {activeTab === 'channels' && <ChannelsTab showSuccess={showSuccess} onDataUpdate={refreshData} />}

                {activeTab === 'templates' && <TemplatesTab groups={groups} showSuccess={showSuccess} />}
                {activeTab === 'defaults' && <DefaultsTab groups={groups} statuses={statuses} showSuccess={showSuccess} />}
                {activeTab === 'broadcast' && <BroadcastTab groups={groups} statuses={statuses} showSuccess={showSuccess} />}
                {activeTab === 'history' && <AdminNotificationsHistoryTab />}
            </AnimatePresence>

            {/* МОДАЛКА РЕДАКТИРОВАНИЯ ГРУППЫ */}
            <Modal
                open={!!editingGroup}
                onClose={() => setEditingGroup(null)}
                title={`Редактирование: ${editingGroup?.name}`}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setEditingGroup(null)} disabled={savingGroup}>
                            Отмена
                        </Button>
                        <Button variant="primary" onClick={handleSaveGroup} loading={savingGroup} icon="fa-save">
                            Сохранить
                        </Button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                        <label style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6, display: 'block' }}>Название</label>
                        <Input
                            value={editingGroup?.name || ''}
                            onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6, display: 'block' }}>Описание</label>
                        <Input
                            value={editingGroup?.description || ''}
                            onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6, display: 'block' }}>Приоритет</label>
                            <CustomSelect
                                value={editingGroup?.priority || 'normal'}
                                onChange={(val) => setEditingGroup({ ...editingGroup, priority: val })}
                                options={[
                                    { value: 'low', label: 'Низкий' },
                                    { value: 'normal', label: 'Обычный' },
                                    { value: 'high', label: 'Высокий' },
                                    { value: 'critical', label: 'Критический' }
                                ]}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6, display: 'block' }}>Тип</label>
                            <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: 10, color: '#e2e8f0', fontSize: 13, border: '1px solid rgba(255,255,255,0.05)' }}>
                                {editingGroup?.type === 'staff' ? '🛡️ Только сотрудники (Staff)' : '👤 Все пользователи (User)'}
                            </div>
                        </div>
                    </div>

                    {/* БЛОК КАНАЛОВ ДОСТАВКИ */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <i className="fa-solid fa-paper-plane" style={{ color: '#6366f1' }} />
                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Каналы доставки</h4>
                            <Badge variant="default" style={{ fontSize: 10, marginLeft: 'auto' }}>
                                {editingGroup?.channels?.filter(c => c.is_enabled).length} / {editingGroup?.channels?.length} активно
                            </Badge>
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
                            Настройте, через какие каналы будут приходить уведомления этой группы, и может ли пользователь отключить их.
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {/* 🛡️ КРИТИЧЕСКИ ВАЖНЫЙ ФИЛЬТР: показываем только те каналы, которые включены глобально */}
                            {editingGroup?.channels
                                ?.filter(ch => ch.channel_active !== false)
                                ?.map(ch => {
                                    const chIcon = CHANNEL_ICONS[ch.channel_code] || { icon: 'fa-bell', color: '#64748b' };
                                    return (
                                        <div key={ch.channel_id} style={{
                                            padding: 14, background: 'rgba(0,0,0,0.2)', borderRadius: 10,
                                            border: `1px solid ${ch.is_enabled ? `${chIcon.color}30` : 'rgba(255,255,255,0.05)'}`,
                                            opacity: ch.is_enabled ? 1 : 0.6,
                                            transition: 'all 0.2s'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                                <div style={{
                                                    width: 36, height: 36, borderRadius: 10,
                                                    background: `${chIcon.color}15`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <i className={chIcon.icon} style={{ color: chIcon.color, fontSize: 15 }} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{ch.channel_name}</div>
                                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                                        {ch.is_enabled ? 'Канал активен для этой группы' : 'Канал отключён'}
                                                    </div>
                                                </div>
                                                <Toggle
                                                    checked={ch.is_enabled}
                                                    onChange={(val) => updateChannelInEditing(ch.channel_id, 'is_enabled', val)}
                                                />
                                            </div>

                                            {ch.is_enabled && (
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8,
                                                    borderTop: '1px solid rgba(255,255,255,0.05)'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <i className={`fa-solid ${ch.is_locked_for_user ? 'fa-lock' : 'fa-lock-open'}`}
                                                            style={{ color: ch.is_locked_for_user ? '#f87171' : '#4ade80', fontSize: 12 }} />
                                                        <div>
                                                            <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>
                                                                Запретить пользователю отключать
                                                            </div>
                                                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                                                {ch.is_locked_for_user ? 'Пользователь не сможет изменить эту настройку' : 'Пользователь может отключить канал'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Toggle
                                                        checked={ch.is_locked_for_user}
                                                        onChange={(val) => updateChannelInEditing(ch.channel_id, 'is_locked_for_user', val)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}