import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Badge, Alert } from '../../../ui/UIComponents'; // Проверь путь
import { getPermissionsDictionary, getUserOverrides, updateUserOverrides } from '../../../../http/userAPI'; // Проверь путь

// ============================================================================
// КОМПОНЕНТ: СТАТУСНЫЙ БЕЙДЖ ДЛЯ РЕЖИМА ПРОСМОТРА
// ============================================================================
const ViewStatusBadge = ({ perm, roleConfig, overrides }) => {
    const rolePerm = roleConfig.find(r => r.permission_code === perm.code);
    const inCeiling = !!rolePerm;
    const isDefault = rolePerm?.is_default || false;
    const override = overrides.find(o => o.permission_code === perm.code);

    let status = { label: 'Недоступно', color: '#64748b', icon: 'fa-lock', bg: 'rgba(100,116,139,0.1)' };

    if (inCeiling) {
        if (override) {
            status = override.is_granted
                ? { label: 'Разрешено вручную', color: '#22c55e', icon: 'fa-check', bg: 'rgba(34,197,94,0.1)' }
                : { label: 'Запрещено вручную', color: '#ef4444', icon: 'fa-xmark', bg: 'rgba(239,68,68,0.1)' };
        } else {
            status = isDefault
                ? { label: 'Выдано по умолчанию', color: '#3b82f6', icon: 'fa-circle-check', bg: 'rgba(59,130,246,0.1)' }
                : { label: 'Доступно, но не выдано', color: '#f59e0b', icon: 'fa-triangle-exclamation', bg: 'rgba(245,158,11,0.1)' };
        }
    }

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 6,
            background: status.bg, border: `1px solid ${status.color}30`
        }}>
            <i className={`fa-solid ${status.icon}`} style={{ color: status.color, fontSize: 10 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: status.color }}>{status.label}</span>
        </div>
    );
};

// ============================================================================
// КОМПОНЕНТ: 3-СОСТОЯНИЙНЫЙ ПЕРЕКЛЮЧАТЕЛЬ (Для режима редактирования)
// ============================================================================
const PermissionToggle = ({ state, onChange, disabled, isDefault }) => {
    const options = [
        { value: 'inherit', label: 'Наследуется', icon: 'fa-rotate', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' },
        { value: 'allow', label: 'Разрешить', icon: 'fa-check', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
        { value: 'deny', label: 'Запретить', icon: 'fa-xmark', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' }
    ];

    const getInheritHint = () => {
        if (disabled) return { text: 'Недоступно для этой роли', color: '#64748b', icon: 'fa-lock' };
        if (isDefault) return { text: 'Выдано по наследованию', color: '#22c55e', icon: 'fa-circle-check' };
        return { text: 'Доступно, но не выдано', color: '#fbbf24', icon: 'fa-triangle-exclamation' };
    };

    const inheritHint = getInheritHint();

    return (
        <div>
            <div style={{
                display: 'flex', gap: 3, background: 'rgba(0,0,0,0.3)', padding: 3, borderRadius: 8,
                opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? 'none' : 'auto',
                border: disabled ? '1px dashed rgba(100,116,139,0.3)' : '1px solid rgba(255,255,255,0.05)'
            }}>
                {options.map(opt => {
                    const isActive = state === opt.value;
                    return (
                        <button
                            key={opt.value}
                            onClick={() => onChange(opt.value)}
                            style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                padding: '6px 4px', borderRadius: 6, border: 'none',
                                background: isActive ? opt.bg : 'transparent',
                                color: isActive ? opt.color : '#64748b',
                                fontSize: 11, fontWeight: isActive ? 700 : 500,
                                cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap'
                            }}
                            title={disabled ? 'Недоступно для этого статуса' : `Выбрать: ${opt.label}`}
                        >
                            <i className={`fa-solid ${opt.icon}`} style={{ fontSize: 10 }} />
                            {opt.label}
                        </button>
                    );
                })}
            </div>
            {state === 'inherit' && (
                <div style={{
                    textAlign: 'center', fontSize: 10, color: inheritHint.color, marginTop: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontWeight: 500
                }}>
                    <i className={`fa-solid ${inheritHint.icon}`} style={{ fontSize: 9 }} />
                    {inheritHint.text}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// ОСНОВНОЙ КОМПОНЕНТ
// ============================================================================
export default function UserPermissionsManager({
    targetUser,
    currentUserStatus,
    initialMode = 'view' // 'view' (просмотр) или 'edit' (редактирование)
}) {
    const [dictionary, setDictionary] = useState([]);
    const [roleConfig, setRoleConfig] = useState([]);
    const [overrides, setOverrides] = useState([]);
    const [originalOverrides, setOriginalOverrides] = useState([]); // Для отмены изменений

    const [mode, setMode] = useState(initialMode);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // Состояние для фильтров
    const [activeFilter, setActiveFilter] = useState('available'); // 'all' | 'available' | 'unavailable' | 'customized'

    const loadData = async () => {
        if (!targetUser?.user_id || !targetUser?.status?.code_name) return;
        setLoading(true);
        try {
            const [dictData, overridesData] = await Promise.all([
                getPermissionsDictionary(targetUser.status.code_name),
                getUserOverrides(targetUser.user_id)
            ]);
            setDictionary(dictData.dictionary || []);
            setRoleConfig(dictData.roleConfig || []);
            setOverrides(overridesData || []);
        } catch (e) {
            console.error('Ошибка загрузки прав пользователя:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [targetUser?.user_id, targetUser?.status?.code_name]);

    // Группировка прав по категориям
    const categorizedPermissions = useMemo(() => {
        const grouped = {};
        dictionary.forEach(perm => {
            const cat = perm.category || 'other';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(perm);
        });

        return Object.entries(grouped).map(([id, perms]) => ({
            id,
            label: id === 'incidents' ? 'Инциденты' :
                id === 'users' ? 'Пользователи' :
                    id === 'system' ? 'Система' :
                        id.charAt(0).toUpperCase() + id.slice(1),
            perms
        })).sort((a, b) => a.label.localeCompare(b.label));
    }, [dictionary]);

    // Логика изменения права (только в режиме редактирования)
    const handlePermissionChange = (code, newValue) => {
        setOverrides(prev => {
            if (newValue === 'inherit') {
                return prev.filter(o => o.permission_code !== code);
            } else {
                const exists = prev.find(o => o.permission_code === code);
                if (exists) {
                    return prev.map(o => o.permission_code === code ? { ...o, is_granted: newValue === 'allow' } : o);
                } else {
                    return [...prev, { permission_code: code, is_granted: newValue === 'allow' }];
                }
            }
        });
    };

    // === УПРАВЛЕНИЕ РЕЖИМАМИ ===
    const handleEdit = () => {
        setOriginalOverrides(JSON.parse(JSON.stringify(overrides)));
        setMode('edit');
        setSuccessMsg('');
    };

    const handleCancel = () => {
        setOverrides(originalOverrides);
        setMode('view');
        setSuccessMsg('');
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = overrides.map(o => ({ code: o.permission_code, is_granted: o.is_granted }));
            await updateUserOverrides(targetUser.user_id, payload);

            setOriginalOverrides(JSON.parse(JSON.stringify(overrides)));
            setMode('view');
            setSuccessMsg('Права успешно обновлены!');

            // Убираем сообщение об успехе через 3 секунды
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (e) {
            console.error('Ошибка сохранения прав:', e);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Card padding={40} style={{ textAlign: 'center', color: '#94a3b8', marginTop: 16 }}>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24, marginBottom: 12, color: '#6366f1' }} />
                <div style={{ fontSize: 14 }}>Загрузка прав доступа...</div>
            </Card>
        );
    }

    const filterOptions = [
        { id: 'available', label: 'Доступные', icon: 'fa-check-circle', color: '#22c55e' },
        { id: 'unavailable', label: 'Недоступные', icon: 'fa-ban', color: '#ef4444' },
        { id: 'customized', label: 'Изменённые', icon: 'fa-pen', color: '#f59e0b' },
        { id: 'all', label: 'Все права', icon: 'fa-list', color: '#94a3b8' }
    ];

    return (
        <Card padding={24} style={{ marginTop: 16 }}>
            {/* Заголовок и Кнопки действий */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h3 style={{ color: '#f1f5f9', margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <i className="fa-solid fa-user-gear" style={{ color: mode === 'edit' ? '#f59e0b' : '#6366f1' }} />
                        Индивидуальные права доступа
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0 0' }}>
                        Пользователь: <strong style={{ color: '#e2e8f0' }}>{targetUser.login}</strong> (Статус: {targetUser.status?.name || targetUser.status?.code_name})
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {successMsg && (
                        <Badge variant="success" icon="fa-check" style={{ animation: 'pulse 0.5s ease-in-out' }}>
                            {successMsg}
                        </Badge>
                    )}
                    {mode === 'view' ? (
                        <Button variant="primary" size="sm" onClick={handleEdit} icon="fa-pen">
                            Редактировать права
                        </Button>
                    ) : (
                        <>
                            <Button variant="secondary" size="sm" onClick={handleCancel} icon="fa-xmark" disabled={saving}>
                                Отмена
                            </Button>
                            <Button variant="success" size="sm" onClick={handleSave} loading={saving} icon="fa-save">
                                Сохранить
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Инструкция (показывается только в режиме редактирования) */}
            {mode === 'edit' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <Alert variant="info" style={{ marginBottom: 24, fontSize: 12, lineHeight: 1.6, border: '1px solid rgba(59, 130, 246, 0.2)', background: 'rgba(59, 130, 246, 0.05)' }}>
                        <i className="fa-solid fa-circle-info" style={{ marginRight: 8, color: '#60a5fa' }} />
                        <strong>Как это работает:</strong><br />
                        🔄 <strong>Наследуется:</strong> Право берётся из настроек роли.<br />
                        <strong>Разрешить:</strong> Выдаёт право лично этому пользователю (даже если у роли его нет).<br />
                        ❌ <strong>Запретить:</strong> Отбирает право лично у этого пользователя (даже если у роли оно есть).
                    </Alert>
                </motion.div>
            )}

            {/* Панель фильтров */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {filterOptions.map(filter => (
                    <button
                        key={filter.id}
                        onClick={() => setActiveFilter(filter.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 14px', borderRadius: 8, border: 'none',
                            background: activeFilter === filter.id ? `${filter.color}20` : 'rgba(0,0,0,0.2)',
                            color: activeFilter === filter.id ? filter.color : '#94a3b8',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: activeFilter === filter.id ? `1px solid ${filter.color}40` : '1px solid transparent'
                        }}
                    >
                        <i className={`fa-solid ${filter.icon}`} style={{ fontSize: 11 }} />
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Сетка категорий */}
            <div style={{ display: 'grid', gridTemplateColumns: mode === 'view' ? 'repeat(auto-fill, minmax(350px, 1fr))' : 'repeat(auto-fill, minmax(400px, 1fr))', gap: 16 }}>
                {categorizedPermissions.map(cat => {
                    // Фильтрация прав внутри категории
                    const filteredPerms = cat.perms.filter(perm => {
                        const rolePerm = roleConfig.find(r => r.permission_code === perm.code);
                        const inCeiling = !!rolePerm;
                        const hasOverride = !!overrides.find(o => o.permission_code === perm.code);

                        if (activeFilter === 'available') return inCeiling;
                        if (activeFilter === 'unavailable') return !inCeiling;
                        if (activeFilter === 'customized') return hasOverride;
                        return true; // 'all'
                    });

                    // Если после фильтрации в категории ничего нет, не рендерим её
                    if (filteredPerms.length === 0) return null;

                    return (
                        <div key={cat.id} style={{
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: 12,
                            border: '1px solid rgba(255,255,255,0.05)',
                            overflow: 'hidden'
                        }}>
                            {/* Заголовок категории */}
                            <div style={{
                                padding: '12px 16px',
                                background: 'rgba(255,255,255,0.03)',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex', alignItems: 'center', gap: 8
                            }}>
                                <i className="fa-solid fa-folder" style={{ color: '#8b5cf6', fontSize: 14 }} />
                                <h4 style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {cat.label}
                                </h4>
                                <Badge variant="default" style={{ fontSize: 10, marginLeft: 'auto' }}>{filteredPerms.length}</Badge>
                            </div>

                            {/* Список прав */}
                            <div style={{ padding: mode === 'view' ? 8 : 12, display: 'flex', flexDirection: 'column', gap: mode === 'view' ? 4 : 8 }}>
                                <AnimatePresence>
                                    {filteredPerms.map(perm => {
                                        const rolePerm = roleConfig.find(r => r.permission_code === perm.code);
                                        const inCeiling = !!rolePerm;
                                        const isDefault = rolePerm?.is_default || false;

                                        const override = overrides.find(o => o.permission_code === perm.code);
                                        const hasOverride = !!override;

                                        let currentState = 'inherit';
                                        if (hasOverride) {
                                            currentState = override.is_granted ? 'allow' : 'deny';
                                        }

                                        return (
                                            <motion.div
                                                key={perm.code}
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -5 }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: mode === 'view' ? 'center' : 'flex-start',
                                                    justifyContent: 'space-between',
                                                    padding: mode === 'view' ? '8px 12px' : '12px 14px',
                                                    background: mode === 'view' ? 'transparent' : (!inCeiling ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.02)'),
                                                    border: mode === 'view' ? 'none' : `1px solid ${!inCeiling ? 'rgba(100,116,139,0.15)' : 'rgba(255,255,255,0.05)'}`,
                                                    borderRadius: mode === 'view' ? 6 : 10,
                                                    transition: 'all 0.2s ease',
                                                    opacity: inCeiling ? 1 : 0.6,
                                                    borderBottom: mode === 'view' ? '1px solid rgba(255,255,255,0.03)' : 'none'
                                                }}
                                            >
                                                {/* Левая часть: Текст */}
                                                <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                                                    <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {perm.code}
                                                    </div>
                                                    {mode === 'edit' && (
                                                        <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 3, lineHeight: 1.3 }}>
                                                            {perm.description}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Правая часть: Переключатель или Бейдж статуса */}
                                                <div style={{ flexShrink: 0, width: mode === 'view' ? 'auto' : 210 }}>
                                                    {mode === 'view' ? (
                                                        <ViewStatusBadge perm={perm} roleConfig={roleConfig} overrides={overrides} />
                                                    ) : (
                                                        <PermissionToggle
                                                            state={currentState}
                                                            onChange={(newValue) => handlePermissionChange(perm.code, newValue)}
                                                            disabled={!inCeiling}
                                                            isDefault={isDefault}
                                                        />
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}