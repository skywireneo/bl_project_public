import React from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Badge } from '../ui/UIComponents';

export default function GroupsTab({ groups, onEditGroup }) {
    return (
        <motion.div key="groups" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: 16 }}>
                {groups.map(group => {
                    // Фильтруем только те каналы, которые включены для группы И глобально активны
                    const activeEnabledChannels = group.channels?.filter(c => c.is_enabled && c.channel_active !== false) || [];
                    const webChannel = group.channels?.find(c => c.channel_code === 'web');
                    const isLocked = webChannel?.is_locked_for_user || false;

                    return (
                        <motion.div key={group.id} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                            <Card style={{
                                padding: 20, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16,
                                border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(30, 32, 48, 0.6)',
                                transition: 'border-color 0.2s, box-shadow 0.2s'
                            }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <div style={{ width: 48, height: 48, borderRadius: 12, background: `${group.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <i className={`fa-solid ${group.icon || 'fa-bell'}`} style={{ color: group.color, fontSize: 20 }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{group.name}</span>
                                            {group.is_system && <Badge variant="danger" style={{ fontSize: 10, fontWeight: 700 }}>SYSTEM</Badge>}
                                            {group.is_critical && <Badge variant="warning" style={{ fontSize: 10, fontWeight: 700 }}>CRITICAL</Badge>}
                                            <Badge variant="default" style={{
                                                fontSize: 10,
                                                background: group.type === 'staff' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                                                color: group.type === 'staff' ? '#fbbf24' : '#60a5fa',
                                                border: `1px solid ${group.type === 'staff' ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'}`
                                            }}>
                                                {group.type === 'staff' ? 'Staff' : 'User'}
                                            </Badge>
                                        </div>
                                        <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4 }}>{group.description || 'Нет описания'}</div>

                                        {/* Индикатор активных каналов (ТОЛЬКО включенные И глобально активные) */}
                                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                                            {activeEnabledChannels.length > 0 ? (
                                                activeEnabledChannels.map(ch => (
                                                    <span key={ch.channel_id} style={{
                                                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                                                        background: 'rgba(34,197,94,0.1)', color: '#4ade80',
                                                        border: '1px solid rgba(34,197,94,0.2)',
                                                        display: 'inline-flex', alignItems: 'center', gap: 4
                                                    }}>
                                                        <i className="fa-solid fa-check" style={{ fontSize: 8 }} />
                                                        {ch.channel_name}
                                                    </span>
                                                ))
                                            ) : (
                                                <span style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>
                                                    Нет активных каналов
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: 8,
                                            background: isLocked ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <i className={`fa-solid ${isLocked ? 'fa-lock' : 'fa-lock-open'}`} style={{ color: isLocked ? '#f87171' : '#4ade80', fontSize: 12 }} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: isLocked ? '#f87171' : '#4ade80' }}>
                                                {isLocked ? 'Заблокировано' : 'Доступно'}
                                            </span>
                                            <span style={{ fontSize: 11, color: '#64748b' }}>
                                                {isLocked ? 'Пользователь не может изменить' : 'Пользователь может изменить'}
                                            </span>
                                        </div>
                                    </div>
                                    <Button variant={group.is_system ? "secondary" : "primary"} size="sm" icon="fa-pen"
                                        onClick={() => onEditGroup(group)} disabled={group.is_system}
                                        style={{ opacity: group.is_system ? 0.5 : 1, cursor: group.is_system ? 'not-allowed' : 'pointer', minWidth: 130, justifyContent: 'center' }}
                                        title={group.is_system ? 'Системные группы нельзя редактировать' : 'Настроить группу'}
                                    >
                                        Настроить
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
}