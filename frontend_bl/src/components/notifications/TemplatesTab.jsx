import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Alert, Badge } from '../ui/UIComponents';
import { getGroupTemplates, updateTemplate } from '../../http/notificationsAPI';
import CustomSelect from './CustomSelect';

// 🗺 Словарь переменных для разных групп
const VARIABLES_MAP = {
    'system_password_changed': ['{user_login}', '{ip}', '{date}'],
    'system_new_device_login': ['{device_info}', '{ip}', '{date}'],
    'system_session_revoked': ['{reason}', '{date}'],
    'system_role_changed': ['{old_role}', '{new_role}', '{date}'],
    'system_permissions_changed': ['{date}'],
    'incident_created': ['{incident_id}', '{incident_title}', '{user_login}', '{date}'],
    'incident_status_changed': ['{incident_id}', '{new_status}', '{date}'],
    'contestation_response': ['{incident_id}', '{response_text}', '{date}'],
    'staff_new_incident_assigned': ['{incident_id}', '{incident_title}', '{date}'],
    'staff_incident_escalated': ['{incident_id}', '{date}'],
    'staff_user_reported': ['{user_login}', '{date}'],
    'system_broadcast': ['{title}', '{body}', '{date}'],
    'security_backup_code_used': ['{remaining}', '{date}'],
    'security_totp_changed': ['{date}']
};

// 🎨 Иконки для каналов
const CHANNEL_ICONS = {
    'web': { icon: 'fa-globe', color: '#6366f1' },
    'email': { icon: 'fa-envelope', color: '#f59e0b' },
    'telegram': { icon: 'fa-brands fa-telegram', color: '#0ea5e9' },
    'push': { icon: 'fa-bell', color: '#10b981' }
};

export default function TemplatesTab({ groups, showSuccess }) {
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [selectedChannelCode, setSelectedChannelCode] = useState('web');
    const [templates, setTemplates] = useState([]); // Все шаблоны для выбранной группы
    const [currentTemplate, setCurrentTemplate] = useState({ title_template: '', body_template: '' });
    const [originalVariables, setOriginalVariables] = useState([]);
    const [saving, setSaving] = useState(false);
    const [validationError, setValidationError] = useState('');

    const titleRef = useRef(null);
    const bodyRef = useRef(null);

    // Извлечение переменных из текста
    const extractVariables = (text) => {
        if (!text) return [];
        const matches = text.match(/\{(\w+)\}/g);
        return matches ? [...new Set(matches)] : [];
    };

    // Загрузка всех шаблонов для выбранной группы
    useEffect(() => {
        if (selectedGroupId) {
            setValidationError('');
            getGroupTemplates(selectedGroupId).then(res => {
                const data = Array.isArray(res) ? res : (res?.data || []);
                // Фильтруем только активные каналы
                const activeTemplates = data.filter(t => t.channel_active !== false);
                setTemplates(activeTemplates);

                const availableChannels = activeTemplates.map(t => t.channel_code);
                if (!availableChannels.includes(selectedChannelCode) && availableChannels.length > 0) {
                    setSelectedChannelCode(availableChannels[0]);
                }
            }).catch(console.error);
        } else {
            setTemplates([]);
        }
    }, [selectedGroupId]);

    // Обновление текущего шаблона при смене канала
    useEffect(() => {
        const tpl = templates.find(t => t.channel_code === selectedChannelCode);
        if (tpl) {
            const newTemplate = {
                title_template: tpl.title_template || '',
                body_template: tpl.body_template || ''
            };
            setCurrentTemplate(newTemplate);
            const vars = [...extractVariables(newTemplate.title_template), ...extractVariables(newTemplate.body_template)];
            setOriginalVariables([...new Set(vars)]);
        } else {
            setCurrentTemplate({ title_template: '', body_template: '' });
            setOriginalVariables([]);
        }
    }, [selectedChannelCode, templates]);

    // Вставка переменной в позицию курсора
    const insertVariable = (variable, target) => {
        const ref = target === 'title' ? titleRef : bodyRef;
        const textarea = ref.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = target === 'title' ? currentTemplate.title_template : currentTemplate.body_template;
        const newText = text.substring(0, start) + variable + text.substring(end);

        if (target === 'title') {
            setCurrentTemplate({ ...currentTemplate, title_template: newText });
        } else {
            setCurrentTemplate({ ...currentTemplate, body_template: newText });
        }

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
    };

    const handleSave = async () => {
        if (!selectedGroupId || !selectedChannelCode) return;

        // Проверка: не удалил ли админ исходные переменные
        const currentVars = [...extractVariables(currentTemplate.title_template), ...extractVariables(currentTemplate.body_template)];
        const missingVars = originalVariables.filter(v => !currentVars.includes(v));
        if (missingVars.length > 0) {
            setValidationError(`Вы удалили обязательные переменные: ${missingVars.join(', ')}. Верните их в текст.`);
            return;
        }

        setSaving(true);
        setValidationError('');
        try {
            await updateTemplate(selectedGroupId, selectedChannelCode, currentTemplate);
            showSuccess(`Шаблон для канала "${selectedChannelCode}" успешно сохранён`);
            // Перезагружаем шаблоны
            const res = await getGroupTemplates(selectedGroupId);
            const data = Array.isArray(res) ? res : (res?.data || []);
            setTemplates(data);
        } catch (e) {
            console.error(e);
            showSuccess('Ошибка при сохранении шаблона', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Доступные каналы для выбранной группы
    const availableChannels = templates.map(t => ({
        code: t.channel_code,
        name: t.channel_name,
        ...CHANNEL_ICONS[t.channel_code]
    }));

    const selectedGroup = groups.find(g => g.id.toString() === selectedGroupId);
    const defaultVars = selectedGroup ? (VARIABLES_MAP[selectedGroup.code] || ['{user_login}', '{date}']) : [];

    return (
        <motion.div key="templates" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Селекторы группы и канала */}
                <Card padding={24}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8, display: 'block' }}>
                                <i className="fa-solid fa-layer-group" style={{ marginRight: 6, color: '#6366f1' }} />
                                Группа уведомлений
                            </label>
                            <CustomSelect
                                value={selectedGroupId}
                                onChange={(val) => { setSelectedGroupId(val); setSelectedChannelCode('web'); }}
                                options={groups.map(g => ({ value: g.id.toString(), label: g.name }))}
                                placeholder="Выберите группу..."
                            />
                        </div>

                        {selectedGroupId && availableChannels.length > 0 && (
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8, display: 'block' }}>
                                    <i className="fa-solid fa-paper-plane" style={{ marginRight: 6, color: '#6366f1' }} />
                                    Канал доставки
                                </label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {availableChannels.map(ch => {
                                        const isSelected = ch.code === selectedChannelCode;
                                        return (
                                            <button
                                                key={ch.code}
                                                onClick={() => setSelectedChannelCode(ch.code)}
                                                style={{
                                                    padding: '10px 16px', borderRadius: 10, border: 'none',
                                                    background: isSelected ? `${ch.color}20` : 'rgba(0,0,0,0.2)',
                                                    color: isSelected ? ch.color : '#94a3b8',
                                                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: 8,
                                                    transition: 'all 0.2s',
                                                    boxShadow: isSelected ? `0 0 0 2px ${ch.color}40` : 'none'
                                                }}
                                            >
                                                <i className={ch.icon} style={{ fontSize: 14 }} />
                                                {ch.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Редактор шаблона */}
                {selectedGroupId && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {/* Панель переменных */}
                        <Card padding={20} style={{ marginBottom: 20, background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#818cf8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <i className="fa-solid fa-code" /> Доступные переменные (кликните, чтобы вставить):
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {defaultVars.map(v => (
                                    <button key={v} onClick={() => insertVariable(v, 'body')}
                                        style={{
                                            padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)',
                                            background: 'rgba(99,102,241,0.1)', color: '#a5b4fc',
                                            fontSize: 12, fontWeight: 600, fontFamily: 'monospace',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                            display: 'flex', alignItems: 'center', gap: 6
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                    >
                                        <i className="fa-solid fa-plus" style={{ fontSize: 9 }} /> {v}
                                    </button>
                                ))}
                            </div>
                        </Card>

                        {validationError && (
                            <Alert variant="warning" icon="fa-triangle-exclamation" style={{ marginBottom: 20, fontSize: 13 }}>
                                {validationError}
                            </Alert>
                        )}

                        <Card padding={24}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 8, display: 'block' }}>
                                        Заголовок <span style={{ color: '#ef4444' }}>*</span>
                                        <Badge variant="default" style={{ marginLeft: 8, fontSize: 10 }}>
                                            Канал: {selectedChannelCode}
                                        </Badge>
                                    </label>
                                    <input
                                        ref={titleRef}
                                        type="text"
                                        value={currentTemplate.title_template}
                                        onChange={(e) => setCurrentTemplate({ ...currentTemplate, title_template: e.target.value })}
                                        placeholder="Например: Новый инцидент #{incident_id}"
                                        style={{
                                            width: '100%', padding: '12px 16px', fontSize: 14, fontWeight: 600,
                                            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 10, color: '#f1f5f9', outline: 'none', boxSizing: 'border-box',
                                            transition: 'border-color 0.2s, box-shadow 0.2s'
                                        }}
                                        onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 8, display: 'block' }}>
                                        Текст сообщения <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <textarea
                                        ref={bodyRef}
                                        value={currentTemplate.body_template}
                                        onChange={(e) => setCurrentTemplate({ ...currentTemplate, body_template: e.target.value })}
                                        rows={6}
                                        style={{
                                            width: '100%', padding: '14px 16px', fontSize: 13, lineHeight: 1.6,
                                            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 10, color: '#e2e8f0', outline: 'none', boxSizing: 'border-box',
                                            fontFamily: 'inherit', resize: 'vertical', minHeight: '150px',
                                            transition: 'border-color 0.2s, box-shadow 0.2s'
                                        }}
                                        placeholder="Например: Пользователь {user_login} создал новый инцидент."
                                        onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <Button variant="primary" icon="fa-save" onClick={handleSave} loading={saving}
                                        style={{ minWidth: 200, height: 44, fontSize: 14, fontWeight: 600 }}>
                                        Сохранить шаблон ({selectedChannelCode})
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}