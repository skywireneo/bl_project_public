import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, Button } from '../../../ui/UIComponents';
import RoleHistoryList from './RoleHistoryList';
import PermissionHistoryList from './PermissionHistoryList';

const FilterPill = ({ active, onClick, children, color }) => (
    <button
        onClick={onClick}
        style={{
            padding: '8px 14px', borderRadius: 8, border: 'none',
            background: active ? `${color}20` : 'rgba(0,0,0,0.2)',
            color: active ? color : '#94a3b8',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.2s ease',
            border: active ? `1px solid ${color}40` : '1px solid transparent'
        }}
    >
        {children}
    </button>
);

export default function AccessAuditLog({ userId }) {
    const [activeFilter, setActiveFilter] = useState('roles_target');

    const filters = [
        { id: 'roles_target', label: 'История ролей пользователя', icon: 'fa-solid fa-user-pen', color: '#f59e0b' },
        { id: 'permissions', label: 'Изменения конкретных прав', icon: 'fa-solid fa-sliders', color: '#8b5cf6' },
        { id: 'roles_actor', label: 'Действия пользователя (кого менял)', icon: 'fa-solid fa-gavel', color: '#6366f1' },
    ];

    return (
        <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fa-solid fa-shield-halved" style={{ color: '#10b981' }} />
                    Журнал аудита доступов
                </h4>
            </div>

            {/* Фильтры журнала */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {filters.map(filter => (
                    <FilterPill
                        key={filter.id}
                        active={activeFilter === filter.id}
                        onClick={() => setActiveFilter(filter.id)}
                        color={filter.color}
                    >
                        <i className={filter.icon} style={{ fontSize: 11 }} />
                        {filter.label}
                    </FilterPill>
                ))}
            </div>

            {/* Условный рендеринг: загружается только активный список */}
            <motion.div
                key={activeFilter}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
            >
                {activeFilter === 'roles_target' && (
                    <RoleHistoryList
                        title="История изменений статуса"
                        icon="fa-solid fa-user-pen"
                        color="#f59e0b"
                        userId={userId}
                        queryType="target"
                    />
                )}

                {activeFilter === 'permissions' && (
                    <PermissionHistoryList targetUserId={userId} />
                )}

                {activeFilter === 'roles_actor' && (
                    <RoleHistoryList
                        title="Действия пользователя (аудит)"
                        icon="fa-solid fa-gavel"
                        color="#6366f1"
                        userId={userId}
                        queryType="actor"
                    />
                )}
            </motion.div>
        </Card>
    );
}