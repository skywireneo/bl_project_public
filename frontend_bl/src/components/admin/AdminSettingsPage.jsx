import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PageHeader, Card, Button, Input, Textarea, Toggle, Badge, EmptyState } from '../ui/UIComponents';
import { getAdm, createElement, updateElement, deleteElement, DICTIONARY_TYPES } from '../../http/dictionaryAPI';

const TABS = [
    { key: 'positions', label: 'Должности', icon: 'fa-briefcase' },
    { key: 'reasons', label: 'Причины', icon: 'fa-tag' },
    { key: 'pvzTypes', label: 'Типы ПВЗ', icon: 'fa-building' },
];

const TYPES_WITH_ONPVZ = [DICTIONARY_TYPES.positions, DICTIONARY_TYPES.reasons];
const TYPES_WITH_DESCRIPTION = [DICTIONARY_TYPES.reasons];

export default function AdminSettingsPage() {
    const [activeTab, setActiveTab] = useState('positions');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Состояние для добавления нового элемента
    const [newName, setNewName] = useState('');
    const [newBall, setNewBall] = useState(0);
    const [newOnPvz, setNewOnPvz] = useState(false);
    const [newDescription, setNewDescription] = useState('');

    // Состояние для редактирования
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editBall, setEditBall] = useState(0);
    const [editOnPvz, setEditOnPvz] = useState(false);
    const [editDescription, setEditDescription] = useState('');

    const currentTab = TABS.find(t => t.key === activeTab);
    const apiType = DICTIONARY_TYPES[activeTab];

    const requiresOnPvz = TYPES_WITH_ONPVZ.includes(apiType);
    const requiresDescription = TYPES_WITH_DESCRIPTION.includes(apiType);

    useEffect(() => {
        loadItems();
        setNewName('');
        setNewBall(0);
        setNewOnPvz(false);
        setNewDescription('');
        cancelEdit();
    }, [activeTab]);

    const loadItems = async () => {
        setLoading(true);
        try {
            const data = await getAdm(apiType);
            setItems(data || []);
        } catch (error) {
            console.error('Ошибка загрузки справочника:', error);
            alert(error.response?.data?.message || 'Не удалось загрузить данные');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newName.trim()) return;
        // Валидация описания на фронте
        if (requiresDescription && !newDescription.trim()) {
            alert('Укажите описание причины');
            return;
        }
        setSaving(true);
        try {
            const addonData = {};
            if (requiresOnPvz) addonData.onPvz = newOnPvz;
            if (requiresDescription) addonData.description = newDescription.trim();

            await createElement(apiType, newName, newBall, Object.keys(addonData).length > 0 ? addonData : undefined);
            setNewName('');
            setNewBall(0);
            setNewOnPvz(false);
            setNewDescription('');
            await loadItems();
        } catch (error) {
            alert(error.response?.data?.message || error.message || 'Ошибка при создании элемента');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`Вы уверены, что хотите удалить "${item.name}"?`)) return;
        setSaving(true);
        try {
            await deleteElement(item.type, item.name);
            await loadItems();
        } catch (error) {
            alert(error.response?.data?.message || 'Ошибка при удалении');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (item) => {
        setSaving(true);
        try {
            await updateElement(item.element_id, item.type, item.name, item.ball, !item.active, item.addonData);
            await loadItems();
        } catch (error) {
            alert('Ошибка при обновлении статуса');
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (item) => {
        setEditingId(item.element_id);
        setEditName(item.name);
        setEditBall(item.ball);
        setEditOnPvz(!!item.addonData?.onPvz);
        setEditDescription(item.addonData?.description || '');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditBall(0);
        setEditOnPvz(false);
        setEditDescription('');
    };

    const handleSaveEdit = async (item) => {
        if (!editName.trim()) return;
        // Валидация описания
        if (requiresDescription && !editDescription.trim()) {
            alert('Описание причины не может быть пустым');
            return;
        }
        setSaving(true);
        try {
            let addonData = { ...(item.addonData || {}) };
            if (requiresOnPvz) addonData.onPvz = editOnPvz;
            if (requiresDescription) addonData.description = editDescription.trim();

            await updateElement(item.element_id, item.type, editName, editBall, item.active, addonData);
            setEditingId(null);
            await loadItems();
        } catch (error) {
            alert(error.response?.data?.message || 'Ошибка при сохранении изменений');
        } finally {
            setSaving(false);
        }
    };

    const activeCount = items.filter(i => i.active).length;

    const getNoun = () => {
        if (currentTab.label === 'Должности') return 'должность';
        if (currentTab.label === 'Причины') return 'причину';
        return 'тип';
    };

    // Общий стиль для блока addonData-полей
    const addonFieldWrapperStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: 'rgba(99, 102, 241, 0.08)',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        borderRadius: 8
    };

    const addonLabelStyle = {
        fontSize: 13,
        color: '#cbd5e1',
        display: 'flex',
        alignItems: 'center',
        gap: 6
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: 'clamp(16px, 3vw, 32px)', flex: 1, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900, margin: '0 auto', width: '100%' }}>

                <Card padding={16}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {TABS.map(tab => (
                            <Button
                                key={tab.key}
                                size="sm"
                                variant={activeTab === tab.key ? 'primary' : 'secondary'}
                                icon={tab.icon}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </div>
                </Card>

                <Card>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <i className={`fa-solid ${currentTab.icon}`} style={{ color: '#6366f1' }} /> {currentTab.label}
                            <Badge variant="info">{items.length}</Badge>
                            <Badge variant="success" style={{ fontSize: 12 }}>Активных: {activeCount}</Badge>
                        </h3>
                    </div>

                    {/* === БЛОК СОЗДАНИЯ === */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                        {/* Строка 1: Название + Балл + onPvz + кнопка */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Input
                                placeholder={`Новая ${getNoun()}...`}
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                                style={{ flex: 1, minWidth: 200 }}
                            />
                            <Input
                                type="number"
                                placeholder="Балл"
                                value={newBall}
                                onChange={e => setNewBall(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                                style={{ width: 100 }}
                            />

                            {requiresOnPvz && (
                                <div style={addonFieldWrapperStyle}>
                                    <Toggle
                                        checked={newOnPvz}
                                        onChange={() => setNewOnPvz(!newOnPvz)}
                                        label=""
                                        size="sm"
                                    />
                                    <span style={addonLabelStyle}>
                                        <i className="fa-solid fa-location-dot" style={{ color: '#6366f1' }} />
                                        На администрацию ПВЗ
                                    </span>
                                </div>
                            )}

                            <Button icon="fa-solid fa-plus" onClick={handleAdd} loading={saving}>Добавить</Button>
                        </div>

                        {/* Строка 2: Описание (только для reasons) */}
                        {requiresDescription && (
                            <div style={{
                                padding: '10px 14px',
                                background: 'rgba(139, 92, 246, 0.06)',
                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                borderRadius: 10
                            }}>
                                <div style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#a78bfa',
                                    marginBottom: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}>
                                    <i className="fa-solid fa-align-left" />
                                    Описание причины <span style={{ color: '#ef4444' }}>*</span>
                                </div>
                                <Textarea
                                    placeholder="Кратко опишите, что относится к этой причине инцидента..."
                                    value={newDescription}
                                    onChange={e => setNewDescription(e.target.value)}
                                    style={{ minHeight: 70, resize: 'vertical' }}
                                    maxLength={1000}
                                />
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    fontSize: 11,
                                    color: '#64748b',
                                    marginTop: 4
                                }}>
                                    {newDescription.length} / 1000
                                </div>
                            </div>
                        )}
                    </div>

                    {/* === СПИСОК ЭЛЕМЕНТОВ === */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Загрузка...</div>
                        ) : items.length === 0 ? (
                            <EmptyState icon="fa-solid fa-inbox" title="Список пуст" />
                        ) : (
                            items.map((item, i) => {
                                const isEditing = editingId === item.element_id;
                                const isOnPvz = !!item.addonData?.onPvz;
                                const description = item.addonData?.description || '';

                                return (
                                    <motion.div
                                        key={item.element_id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.02 }}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 8,
                                            background: isEditing ? 'rgba(99, 102, 241, 0.1)' : 'rgba(0,0,0,0.2)',
                                            borderRadius: 10,
                                            padding: '12px 16px',
                                            border: '1px solid rgba(255,255,255,0.04)'
                                        }}
                                    >
                                        {isEditing ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                                                <div style={{ display: 'flex', gap: 8, flex: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <Input
                                                        value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        style={{ flex: 1, minWidth: 150 }}
                                                        autoFocus
                                                    />
                                                    <Input
                                                        type="number"
                                                        value={editBall}
                                                        onChange={e => setEditBall(e.target.value)}
                                                        style={{ width: 80 }}
                                                    />

                                                    {requiresOnPvz && (
                                                        <div style={addonFieldWrapperStyle}>
                                                            <Toggle
                                                                checked={editOnPvz}
                                                                onChange={() => setEditOnPvz(!editOnPvz)}
                                                                label=""
                                                                size="sm"
                                                            />
                                                            <span style={addonLabelStyle}>
                                                                <i className="fa-solid fa-location-dot" style={{ color: '#6366f1' }} />
                                                                На администрацию ПВЗ
                                                            </span>
                                                        </div>
                                                    )}

                                                    <Button size="sm" variant="success" icon="fa-solid fa-check" onClick={() => handleSaveEdit(item)} loading={saving}>Сохранить</Button>
                                                    <Button size="sm" variant="secondary" icon="fa-solid fa-xmark" onClick={cancelEdit} />
                                                </div>

                                                {requiresDescription && (
                                                    <div style={{
                                                        padding: '8px 12px',
                                                        background: 'rgba(139, 92, 246, 0.06)',
                                                        border: '1px solid rgba(139, 92, 246, 0.2)',
                                                        borderRadius: 8
                                                    }}>
                                                        <div style={{
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            color: '#a78bfa',
                                                            marginBottom: 4,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 5
                                                        }}>
                                                            <i className="fa-solid fa-align-left" style={{ fontSize: 10 }} />
                                                            Описание причины <span style={{ color: '#ef4444' }}>*</span>
                                                        </div>
                                                        <Textarea
                                                            value={editDescription}
                                                            onChange={e => setEditDescription(e.target.value)}
                                                            style={{ minHeight: 60, resize: 'vertical', fontSize: 13 }}
                                                            maxLength={1000}
                                                        />
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'flex-end',
                                                            fontSize: 10,
                                                            color: '#64748b',
                                                            marginTop: 2
                                                        }}>
                                                            {editDescription.length} / 1000
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: 14, color: item.active ? '#e2e8f0' : '#64748b', textDecoration: item.active ? 'none' : 'line-through' }}>
                                                        {item.name}
                                                    </span>
                                                    <Badge variant="secondary" style={{ fontSize: 11 }}>Балл: {item.ball}</Badge>

                                                    {requiresOnPvz ? isOnPvz ? (
                                                        <Badge
                                                            variant="success"
                                                            style={{
                                                                fontSize: 11,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 4
                                                            }}
                                                        >
                                                            <i className="fa-solid fa-location-dot" />
                                                            На администрацию ПВЗ
                                                        </Badge>
                                                    ) : <Badge
                                                        variant="success"
                                                        style={{
                                                            fontSize: 11,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 4
                                                        }}
                                                    >
                                                        <i className="fa-solid fa-location-dot" />
                                                        На наёмного работника ПВЗ
                                                    </Badge> : null}

                                                    {!item.active && <Badge variant="danger" style={{ fontSize: 11 }}>Неактивен</Badge>}
                                                </div>

                                                {/* Описание причины в списке */}
                                                {requiresDescription && description && (
                                                    <div
                                                        title={description}
                                                        style={{
                                                            fontSize: 12,
                                                            color: '#94a3b8',
                                                            lineHeight: 1.5,
                                                            padding: '6px 10px',
                                                            background: 'rgba(139, 92, 246, 0.05)',
                                                            borderLeft: '2px solid rgba(139, 92, 246, 0.4)',
                                                            borderRadius: '0 6px 6px 0',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                            wordBreak: 'break-word'
                                                        }}
                                                    >
                                                        <i className="fa-solid fa-quote-left" style={{ color: '#6d28d9', marginRight: 6, fontSize: 10, opacity: 0.6 }} />
                                                        {description}
                                                    </div>
                                                )}

                                                {requiresDescription && !description && (
                                                    <div style={{
                                                        fontSize: 11,
                                                        color: '#f59e0b',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 5,
                                                        fontStyle: 'italic'
                                                    }}>
                                                        <i className="fa-solid fa-triangle-exclamation" />
                                                        Описание отсутствует (старая запись)
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                                    <Toggle
                                                        checked={item.active}
                                                        onChange={() => handleToggleActive(item)}
                                                        label=""
                                                        size="sm"
                                                    />
                                                    <Button size="sm" variant="secondary" icon="fa-solid fa-pen" onClick={() => startEdit(item)} title="Редактировать" />
                                                    <Button
                                                        size="sm"
                                                        variant="danger"
                                                        icon="fa-solid fa-trash"
                                                        onClick={() => handleDelete(item)}
                                                        loading={saving}
                                                        title="Удалить"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}