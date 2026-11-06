import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Badge, Alert } from '../../ui/UIComponents'; // Проверь путь
import { getPermissionsDictionary, updateRolePermissions } from '../../../http/userAPI'; // Проверь путь
import { getAllStatuses } from '../../../http/userAPI'; // <-- Новый импорт

export default function RolePermissionsPage() {
    const [selectedRole, setSelectedRole] = useState('');
    const [statuses, setStatuses] = useState([]);
    const [dictionary, setDictionary] = useState([]);
    const [roleConfig, setRoleConfig] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // 1. Загружаем список статусов при старте
    useEffect(() => {
        const fetchStatuses = async () => {
            try {
                const data = await getAllStatuses();
                // Ожидаем массив объектов { code_name: 'MODERATOR', name: 'Модератор', ... }
                setStatuses(data || []);
                if (data && data.length > 0) {
                    setSelectedRole(data[0].code_name);
                }
            } catch (e) {
                console.error('Ошибка загрузки статусов:', e);
            }
        };
        fetchStatuses();
    }, []);

    // 2. Загружаем права при смене роли
    useEffect(() => {
        if (!selectedRole) return;
        const loadData = async () => {
            setLoading(true);
            try {
                const data = await getPermissionsDictionary(selectedRole);
                setDictionary(data.dictionary || []);
                setRoleConfig(data.roleConfig || []);
            } catch (e) {
                console.error('Ошибка загрузки прав:', e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [selectedRole]);

    // 3. Динамическое выделение категорий из справочника
    const categories = useMemo(() => {
        const grouped = {};
        dictionary.forEach(perm => {
            const cat = perm.category || 'other';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(perm);
        });

        // Преобразуем в массив для удобного маппинга и сортируем по имени категории
        return Object.entries(grouped)
            .map(([id, perms]) => ({
                id,
                label: id === 'incidents' ? 'Инциденты' :
                    id === 'users' ? 'Пользователи' :
                        id === 'system' ? 'Система' :
                            id.charAt(0).toUpperCase() + id.slice(1),
                perms
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [dictionary]);

    // 4. Логика переключения (исправленная, без багов)
    const handleToggleCeiling = (code) => {
        setRoleConfig(prev => {
            const exists = prev.find(p => p.permission_code === code);
            if (exists) {
                return prev.filter(p => p.permission_code !== code); // Удаляем из потолка
            } else {
                return [...prev, { permission_code: code, is_default: true }]; // Добавляем с is_default = true
            }
        });
    };

    const handleToggleDefault = (code) => {
        setRoleConfig(prev => {
            return prev.map(p => {
                if (p.permission_code === code) {
                    return { ...p, is_default: !p.is_default };
                }
                return p;
            });
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = roleConfig.map(c => ({ code: c.permission_code, is_default: c.is_default }));
            await updateRolePermissions(selectedRole, payload);
            alert(' Права роли успешно обновлены! Кеш пользователей сброшен.');
        } catch (e) {
            alert('❌ Ошибка сохранения: ' + (e.response?.data?.message || e.message));
        } finally {
            setSaving(false);
        }
    };

    const getConfig = (code) => roleConfig.find(c => c.permission_code === code);
    const currentRoleName = statuses.find(s => s.code_name === selectedRole)?.name || selectedRole;

    if (statuses.length === 0 && loading) {
        return (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 32, marginBottom: 16 }} />
                <div>Загрузка конфигурации...</div>
            </div>
        );
    }

    return (
        <div style={{ padding: 'clamp(16px, 3vw, 32px)', maxWidth: 1400, margin: '0 auto' }}>
            {/* Заголовок страницы */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fa-solid fa-shield-halved" style={{ color: '#fff', fontSize: 18 }} />
                            </div>
                            Управление правами ролей
                        </h1>
                        <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 8, margin: 0 }}>
                            Настройка базовых прав и прав "по умолчанию" для каждого статуса
                        </p>
                    </div>
                    <Button variant="success" onClick={handleSave} loading={saving} icon="fa-save" size="lg" disabled={loading}>
                        Сохранить изменения
                    </Button>
                </div>

                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* Левая колонка: Выбор роли (Компактная и стильная) */}
                    <Card padding={0} style={{ width: '100%', maxWidth: 260, flexShrink: 0, overflow: 'hidden' }}>
                        <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                            <h3 style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                                Выберите статус
                            </h3>
                        </div>
                        <div style={{ padding: 8 }}>
                            {statuses.map(s => {
                                const isSelected = selectedRole === s.code_name;
                                return (
                                    <button
                                        key={s.code_name}
                                        onClick={() => setSelectedRole(s.code_name)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            padding: '10px 14px',
                                            marginBottom: 4,
                                            borderRadius: 8,
                                            border: 'none',
                                            background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                            color: isSelected ? '#f1f5f9' : '#94a3b8',
                                            fontSize: 13,
                                            fontWeight: isSelected ? 600 : 500,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            textAlign: 'left',
                                            borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent'
                                        }}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600 }}>{s.name}</div>
                                            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{s.code_name}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Правая колонка: Права (Сетка категорий для компактности) */}
                    <Card padding={24} style={{ flex: 1, minWidth: 300 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                            <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, margin: 0 }}>
                                Права для статуса
                            </h2>
                            <Badge variant="info" style={{ fontSize: 13, padding: '4px 12px' }}>
                                {currentRoleName}
                            </Badge>
                        </div>

                        <Alert variant="info" style={{ marginBottom: 24, fontSize: 12, lineHeight: 1.5, padding: 12, border: '1px solid rgba(59, 130, 246, 0.2)', background: 'rgba(59, 130, 246, 0.05)' }}>
                            <i className="fa-solid fa-circle-info" style={{ marginRight: 8, color: '#60a5fa' }} />
                            <strong>Основной чекбокс</strong> добавляет право в "потолок" роли.
                            <strong style={{ display: 'block', marginTop: 4 }}>Чекбокс "По умолчанию"</strong> означает, что право выдается автоматически при смене статуса. Если он снят, право доступно в потолке, но выдается только вручную в профиле пользователя.
                        </Alert>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 32, marginBottom: 16, color: '#6366f1' }} />
                                <div style={{ fontSize: 14 }}>Загрузка конфигурации прав...</div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
                                {categories.map(cat => (
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
                                            <Badge variant="default" style={{ fontSize: 10, marginLeft: 'auto' }}>{cat.perms.length}</Badge>
                                        </div>

                                        {/* Список прав в категории */}
                                        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <AnimatePresence>
                                                {cat.perms.map(perm => {
                                                    const config = getConfig(perm.code);
                                                    const isInCeiling = !!config;
                                                    const isDefault = config?.is_default || false;

                                                    return (
                                                        <motion.div
                                                            key={perm.code}
                                                            initial={{ opacity: 0, y: 5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                padding: '10px 12px',
                                                                background: isInCeiling ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                                                                border: `1px solid ${isInCeiling ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)'}`,
                                                                borderRadius: 8,
                                                                transition: 'all 0.2s ease',
                                                                opacity: isInCeiling ? 1 : 0.6
                                                            }}
                                                        >
                                                            {/* Левая часть: Чекбокс потолка + Текст */}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isInCeiling}
                                                                    onChange={() => handleToggleCeiling(perm.code)}
                                                                    style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer', flexShrink: 0 }}
                                                                    title="Включить право для этой роли"
                                                                />
                                                                <div style={{ minWidth: 0 }}>
                                                                    <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                        {perm.code}
                                                                    </div>
                                                                    <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2, lineHeight: 1.3 }}>
                                                                        {perm.description}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Правая часть: Чекбокс "По умолчанию" (только если в потолке) */}
                                                            {isInCeiling && (
                                                                <motion.label
                                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 6,
                                                                        padding: '4px 10px',
                                                                        background: isDefault ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255,255,255,0.05)',
                                                                        border: `1px solid ${isDefault ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                                                                        borderRadius: 6,
                                                                        cursor: 'pointer',
                                                                        userSelect: 'none',
                                                                        flexShrink: 0
                                                                    }}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isDefault}
                                                                        onChange={(e) => {
                                                                            e.stopPropagation();
                                                                            handleToggleDefault(perm.code);
                                                                        }}
                                                                        style={{ width: 14, height: 14, accentColor: '#fbbf24', cursor: 'pointer' }}
                                                                    />
                                                                    <span style={{ color: isDefault ? '#fbbf24' : '#94a3b8', fontSize: 11, fontWeight: 600 }}>
                                                                        По умолчанию
                                                                    </span>
                                                                </motion.label>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </motion.div>
        </div>
    );
}