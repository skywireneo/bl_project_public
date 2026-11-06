import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Badge } from '../../../ui/UIComponents';
import UserPermissionsManager from './UserPermissionsManager';
import AccessAuditLog from './AccessAuditLog';

// === 🎨 КОМПОНЕНТ КРАСИВОГО СЕЛЕКТА СТАТУСОВ (перенесён сюда для автономности) ===
const StatusSelect = ({ value, onChange, allStatuses }) => {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <select
                value={value}
                onChange={onChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={{
                    width: '100%',
                    padding: '11px 40px 11px 14px',
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    background: 'rgba(15, 17, 23, 0.8)',
                    border: `1px solid ${isFocused ? 'rgba(245, 158, 11, 0.6)' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: 10,
                    color: '#e2e8f0',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isFocused ? '0 0 0 3px rgba(245, 158, 11, 0.15)' : 'none',
                }}
            >
                <optgroup label="👤 Пользователи (Non-Staff)" style={{ color: '#94a3b8', fontWeight: 600, background: '#0f1117' }}>
                    {allStatuses.filter(s => !s.is_staff).map(st => (
                        <option key={st.status_id} value={st.code_name} style={{ background: '#1a1d2e', color: '#e2e8f0', padding: '8px 12px' }}>
                            {st.name} ({st.code_name})
                        </option>
                    ))}
                </optgroup>
                <optgroup label="🛡️ Сотрудники (Staff)" style={{ color: '#fbbf24', fontWeight: 600, background: '#0f1117' }}>
                    {allStatuses.filter(s => s.is_staff).map(st => (
                        <option key={st.status_id} value={st.code_name} style={{ background: '#1a1d2e', color: '#e2e8f0', padding: '8px 12px' }}>
                            {st.name} ({st.code_name})
                        </option>
                    ))}
                </optgroup>
            </select>
            <div style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: `translateY(-50%) ${isFocused ? 'rotate(180deg)' : 'rotate(0deg)'}`,
                color: isFocused ? '#fbbf24' : '#64748b',
                fontSize: 11,
                pointerEvents: 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
                <i className="fa-solid fa-chevron-down" />
            </div>
        </div>
    );
};

export default function AccessDashboard({ displayUser, userData, currentUserStatus, onRequestRoleChange }) {
    const [activeSubTab, setActiveSubTab] = useState('role');

    // Локальное состояние для выбранной в селекте роли
    const [selectedStatusCode, setSelectedStatusCode] = useState(displayUser.role);

    // Синхронизируем состояние, если роль пользователя изменилась извне
    useEffect(() => {
        setSelectedStatusCode(displayUser.role);
    }, [displayUser.role]);

    const subTabs = [
        { key: 'role', label: 'Роль и Статус', icon: 'fa-solid fa-user-shield' },
        { key: 'permissions', label: 'Детальные права', icon: 'fa-solid fa-sliders' },
        { key: 'audit', label: 'Журнал аудита', icon: 'fa-solid fa-clock-rotate-left' },
    ];

    const customOverridesCount = displayUser.permissions ? displayUser.permissions.filter(p => p.granted).length : 0;

    return (
        <div>
            {/* Суб-табы */}
            <div style={{
                display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto',
                paddingBottom: 4, background: 'rgba(0,0,0,0.2)', borderRadius: 12,
                padding: 6, border: '1px solid rgba(255,255,255,0.05)'
            }}>
                {subTabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveSubTab(tab.key)}
                        style={{
                            padding: '10px 14px', borderRadius: 8, border: 'none',
                            background: activeSubTab === tab.key ? 'rgba(245,158,11,0.15)' : 'transparent',
                            color: activeSubTab === tab.key ? '#fbbf24' : '#94a3b8',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6,
                            transition: 'all 0.2s', whiteSpace: 'nowrap'
                        }}
                    >
                        <i className={tab.icon} style={{ fontSize: 12 }} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Контент выбранной суб-вкладки */}
            <motion.div
                key={activeSubTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
            >
                {activeSubTab === 'role' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Карточка Текущей Роли */}
                        <Card style={{ border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <div style={{
                                        width: 56, height: 56, borderRadius: 14,
                                        background: 'rgba(245,158,11,0.15)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                    }}>
                                        <i className="fa-solid fa-user-shield" style={{ color: '#f59e0b', fontSize: 24 }} />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fbbf24', margin: 0 }}>
                                                {displayUser.roleName}
                                            </h3>
                                            {displayUser.isStaff && (
                                                <Badge variant="danger" icon="fa-solid fa-briefcase" style={{ fontSize: 10 }}>Сотрудник</Badge>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>
                                            Кодовое имя: <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{displayUser.role}</span>
                                        </div>
                                        <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, margin: 0, maxWidth: 600 }}>
                                            {displayUser.descr || 'Описание роли отсутствует.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Блок управления ролью с рабочим селектором */}
                                {displayUser.canEditStatus && displayUser.allStatuses.length > 0 && (
                                    <div style={{
                                        minWidth: 260, padding: 16, background: 'rgba(0,0,0,0.2)',
                                        borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Управление доступом
                                        </div>

                                        {/* Селектор выбора новой роли */}
                                        <div style={{ marginBottom: 12 }}>
                                            <StatusSelect
                                                value={selectedStatusCode}
                                                onChange={(e) => setSelectedStatusCode(e.target.value)}
                                                allStatuses={displayUser.allStatuses}
                                            />
                                        </div>

                                        <Button
                                            variant="warning"
                                            icon="fa-solid fa-pen-to-square"
                                            onClick={() => onRequestRoleChange(selectedStatusCode)} // Теперь передаём ВЫБРАННУЮ роль!
                                            disabled={selectedStatusCode === displayUser.role} // Блокируем, если роль не меняли
                                            fullWidth
                                            style={{ justifyContent: 'center', opacity: selectedStatusCode === displayUser.role ? 0.6 : 1 }}
                                        >
                                            Изменить роль
                                        </Button>

                                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 8, textAlign: 'center', lineHeight: 1.4 }}>
                                            {selectedStatusCode === displayUser.role
                                                ? 'Выберите новую роль из списка выше'
                                                : 'Требует подтверждения и может повлечь изменение прав'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Краткая сводка */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                            <Card padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="fa-solid fa-fingerprint" style={{ color: '#6366f1', fontSize: 16 }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>ИНДИВИДУАЛЬНЫЕ ПРАВА</div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
                                        {customOverridesCount} <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>изменено</span>
                                    </div>
                                </div>
                            </Card>

                            <Card padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'background 0.2s' }}
                                onClick={() => setActiveSubTab('audit')}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.3)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="fa-solid fa-clock-rotate-left" style={{ color: '#8b5cf6', fontSize: 16 }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>ПОСЛЕДНЯЯ АКТИВНОСТЬ</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        Перейти в журнал
                                        <i className="fa-solid fa-arrow-right" style={{ fontSize: 10, color: '#8b5cf6' }} />
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {activeSubTab === 'permissions' && (
                    <UserPermissionsManager
                        targetUser={userData}
                        currentUserStatus={currentUserStatus}
                    />
                )}

                {activeSubTab === 'audit' && (
                    <AccessAuditLog userId={userData?.user_id} />
                )}
            </motion.div>
        </div>
    );
}