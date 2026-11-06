import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Alert } from '../ui/UIComponents'; // Проверь путь к UI
import { broadcastNotification } from '../../http/notificationsAPI';
import CustomSelect from './CustomSelect';

export default function BroadcastTab({ groups = [], statuses = [], showSuccess }) {
    const [targetType, setTargetType] = useState('all'); // 'all' | 'staff' | 'roles'
    const [targetRoles, setTargetRoles] = useState([]);
    const [selectedGroupCode, setSelectedGroupCode] = useState('');
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);

    const toggleRole = (codeName) => {
        setTargetRoles(prev =>
            prev.includes(codeName) ? prev.filter(c => c !== codeName) : [...prev, codeName]
        );
    };

    const handleBroadcast = async () => {
        if (!selectedGroupCode || !title.trim() || !body.trim()) return;
        if (targetType === 'roles' && targetRoles.length === 0) return;

        setSending(true);
        try {
            const payload = {
                group_code: selectedGroupCode,
                title: title.trim(),
                body: body.trim(),
                target_type: targetType,
                target_roles: targetType === 'roles' ? targetRoles : undefined
            };

            const res = await broadcastNotification(payload);
            showSuccess(`Рассылка успешно отправлена (${res.sent} уведомлений)`);

            // Сброс формы
            setSelectedGroupCode('');
            setTargetRoles([]);
            setTitle('');
            setBody('');
            setTargetType('all');
        } catch (e) {
            console.error('Ошибка рассылки:', e);
            showSuccess('Ошибка при отправке рассылки', 'error');
        } finally {
            setSending(false);
        }
    };

    const isFormValid =
        selectedGroupCode !== '' &&
        title.trim().length > 0 &&
        body.trim().length > 0 &&
        (targetType !== 'roles' || targetRoles.length > 0);

    return (
        <motion.div key="broadcast" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* === ВЕРХНИЙ РЯД: НАСТРОЙКИ (Аудитория + Категория) === */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>

                    {/* 1. Выбор аудитории */}
                    <Card padding={24}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="fa-solid fa-users" style={{ color: '#6366f1' }} />
                            Целевая аудитория
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                { value: 'all', label: 'Все пользователи', icon: 'fa-globe', desc: 'Каждому пользователю системы' },
                                { value: 'staff', label: 'Только сотрудники (Staff)', icon: 'fa-briefcase', desc: 'Статус is_staff = true' },
                                { value: 'roles', label: 'Конкретные роли', icon: 'fa-user-tag', desc: 'Выберите одну или несколько ролей' }
                            ].map(option => (
                                <div
                                    key={option.value}
                                    onClick={() => setTargetType(option.value)}
                                    style={{
                                        padding: 16,
                                        borderRadius: 12,
                                        border: `1px solid ${targetType === option.value ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                                        background: targetType === option.value ? 'rgba(99, 102, 241, 0.08)' : 'rgba(0,0,0,0.2)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 16
                                    }}
                                >
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                                        background: targetType === option.value ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: targetType === option.value ? '#818cf8' : '#64748b',
                                        transition: 'all 0.2s'
                                    }}>
                                        <i className={`fa-solid ${option.icon}`} style={{ fontSize: 18 }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: targetType === option.value ? '#f1f5f9' : '#94a3b8', transition: 'color 0.2s' }}>
                                            {option.label}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{option.desc}</div>
                                    </div>
                                    <div style={{
                                        width: 22, height: 22, borderRadius: '50%',
                                        border: `2px solid ${targetType === option.value ? '#6366f1' : '#475569'}`,
                                        background: targetType === option.value ? '#6366f1' : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.2s'
                                    }}>
                                        {targetType === option.value && <i className="fa-solid fa-check" style={{ color: 'white', fontSize: 11 }} />}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Выбор ролей (появляется при выборе "Конкретные роли") */}
                        {targetType === 'roles' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
                                style={{ paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <label style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>
                                        Выберите роли <span style={{ color: '#64748b', fontWeight: 400 }}>({targetRoles.length})</span>
                                    </label>
                                    {targetRoles.length > 0 && (
                                        <button
                                            onClick={() => setTargetRoles([])}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                        >
                                            <i className="fa-solid fa-xmark" /> Очистить
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                                    {statuses.map(status => {
                                        const isSelected = targetRoles.includes(status.code_name);
                                        return (
                                            <div
                                                key={status.code_name}
                                                onClick={() => toggleRole(status.code_name)}
                                                style={{
                                                    padding: '12px 14px',
                                                    borderRadius: 10,
                                                    border: `1px solid ${isSelected ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                                                    background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(0,0,0,0.2)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 10
                                                }}
                                            >
                                                <div style={{
                                                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                                                    background: isSelected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.05)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <i className={`fa-solid ${status.is_staff ? 'fa-briefcase' : 'fa-user'}`} style={{ color: isSelected ? '#818cf8' : '#64748b', fontSize: 12 }} />
                                                </div>
                                                <span style={{
                                                    fontSize: 12, fontWeight: 600,
                                                    color: isSelected ? '#f1f5f9' : '#94a3b8',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1
                                                }}>
                                                    {status.name}
                                                </span>
                                                {isSelected && (
                                                    <i className="fa-solid fa-circle-check" style={{ color: '#6366f1', fontSize: 16, flexShrink: 0 }} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </Card>

                    {/* 2. Выбор категории уведомления */}
                    <Card padding={24}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="fa-solid fa-layer-group" style={{ color: '#6366f1' }} />
                            Категория уведомления
                        </h4>

                        <CustomSelect
                            value={selectedGroupCode}
                            onChange={setSelectedGroupCode}
                            options={groups.map(g => ({ value: g.code, label: g.name }))}
                            placeholder="Выберите одну группу..."
                        />

                        {selectedGroupCode && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{ marginTop: 20, padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 14, alignItems: 'center' }}
                            >
                                {(() => {
                                    const g = groups.find(x => x.code === selectedGroupCode);
                                    return g ? (
                                        <>
                                            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${g.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <i className={`fa-solid ${g.icon || 'fa-bell'}`} style={{ color: g.color, fontSize: 20 }} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{g.name}</div>
                                                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>{g.description || 'Нет описания'}</div>
                                            </div>
                                        </>
                                    ) : null;
                                })()}
                            </motion.div>
                        )}
                    </Card>
                </div>

                {/* === СРЕДНИЙ РЯД: РЕДАКТОР СООБЩЕНИЯ === */}
                <Card padding={24}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fa-solid fa-pen-to-square" style={{ color: '#6366f1' }} />
                        Текст рассылки
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div>
                            <label style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 8, display: 'block', fontWeight: 500 }}>
                                Заголовок <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Например: Технические работы на сервере"
                                maxLength={100}
                                style={{
                                    width: '100%', padding: '14px 16px', fontSize: 15, fontWeight: 600,
                                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 10, color: '#f1f5f9', outline: 'none', boxSizing: 'border-box',
                                    transition: 'border-color 0.2s, box-shadow 0.2s'
                                }}
                                onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                            />
                            <div style={{ textAlign: 'right', fontSize: 12, color: title.length > 90 ? '#ef4444' : '#64748b', marginTop: 6 }}>
                                {title.length}/100
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 8, display: 'block', fontWeight: 500 }}>
                                Текст сообщения <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                rows={8}
                                maxLength={2000}
                                placeholder="Опишите суть объявления подробно. Поддерживается обычный текст."
                                style={{
                                    width: '100%', padding: '16px', fontSize: 14, lineHeight: 1.6,
                                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 10, color: '#e2e8f0', outline: 'none', boxSizing: 'border-box',
                                    fontFamily: 'inherit', resize: 'vertical', minHeight: '200px',
                                    transition: 'border-color 0.2s, box-shadow 0.2s'
                                }}
                                onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                            />
                            <div style={{ textAlign: 'right', fontSize: 12, color: body.length > 1900 ? '#ef4444' : '#64748b', marginTop: 6 }}>
                                {body.length}/2000
                            </div>
                        </div>
                    </div>
                </Card>

                {/* === НИЖНИЙ РЯД: ДЕЙСТВИЯ === */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, paddingTop: 8 }}>
                    {!isFormValid && (
                        <Alert variant="warning" icon="fa-info-circle" style={{ fontSize: 13, padding: '12px 16px', flex: 1, minWidth: 300 }}>
                            {targetType === 'roles' && targetRoles.length === 0
                                ? 'Необходимо выбрать хотя бы одну роль, группу, заголовок и текст.'
                                : 'Необходимо выбрать группу, заполнить заголовок и текст сообщения.'}
                        </Alert>
                    )}

                    <div style={{ marginLeft: 'auto' }}>
                        <Button
                            variant="primary"
                            icon="fa-paper-plane"
                            onClick={handleBroadcast}
                            loading={sending}
                            disabled={!isFormValid || sending}
                            style={{ minWidth: 220, height: 48, fontSize: 15, fontWeight: 700 }}
                        >
                            Отправить рассылку
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}