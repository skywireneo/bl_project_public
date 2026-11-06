import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input, Card, Badge } from '../../../ui/UIComponents'; // Путь адаптируйте под свой
import { SEVERITY_STYLES, CATEGORIES } from '../constants';

const CriticalActionCard = ({ action, onExecute, isLocked, onToggleLock, executionState, hasValue, delay = 0 }) => {
    const severityStyle = SEVERITY_STYLES[action.severity] || SEVERITY_STYLES[2];
    const categoryStyle = CATEGORIES[action.category] || CATEGORIES.system;
    const [isHovered, setIsHovered] = useState(false);
    const currentValue = action.value === 'true' || action.value === true;
    const toggleValue = currentValue ? 'false' : 'true';
    const [customValue, setCustomValue] = useState(action.value || '');

    const isInputAction = ['setGeoMode', 'setTimeWindow', 'setRateLimitGuest', 'setRateLimitUser', 'setBlockedCountries'].includes(action.id_name);

    const getPlaceholder = () => {
        if (action.id_name === 'setGeoMode') return 'rf_only, block_list или disabled';
        if (action.id_name === 'setTimeWindow') return '09:00-21:00 (или false для выкл)';
        if (action.id_name === 'setRateLimitGuest') return 'Например: 30';
        if (action.id_name === 'setBlockedCountries') return 'Например: US, CN, DE';
        return 'Введите значение...';
    };

    const getInfoText = () => {
        if (action.id_name === 'setGeoMode') return (<div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, lineHeight: 1.5, background: 'rgba(59, 130, 246, 0.08)', padding: 12, borderRadius: 8, borderLeft: '3px solid #3b82f6' }}><strong style={{ color: '#93c5fd' }}>Как заполнять:</strong><br />• <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: 4 }}>rf_only</code> — блокировать всё, кроме России.<br />• <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: 4 }}>block_list</code> — блокировать только страны из списка.<br />• <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: 4 }}>disabled</code> — отключить гео-блокировку.</div>);
        if (action.id_name === 'setTimeWindow') return (<div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, lineHeight: 1.5, background: 'rgba(245, 158, 11, 0.08)', padding: 12, borderRadius: 8, borderLeft: '3px solid #f59e0b' }}><strong style={{ color: '#fbbf24' }}>Как заполнять:</strong><br />• Формат: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: 4 }}>ЧЧ:ММ-ЧЧ:ММ</code>.<br />• Введите <code>false</code> или <code>off</code> для отключения.</div>);
        if (action.id_name === 'setRateLimitGuest' || action.id_name === 'setRateLimitUser') return (<div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, lineHeight: 1.5, background: 'rgba(16, 185, 129, 0.08)', padding: 12, borderRadius: 8, borderLeft: '3px solid #10b981' }}><strong style={{ color: '#34d399' }}>Как заполнять:</strong><br />• Целое число запросов в секунду (например, <code>30</code>).</div>);
        if (action.id_name === 'setBlockedCountries') return (<div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, lineHeight: 1.5, background: 'rgba(239, 68, 68, 0.08)', padding: 12, borderRadius: 8, borderLeft: '3px solid #ef4444' }}><strong style={{ color: '#f87171' }}>Как заполнять:</strong><br />• Двухбуквенные коды стран через запятую (например, <code>US, CN, DE</code>).</div>);
        return null;
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: executionState === 'loading' ? 0.7 : 1, y: 0, scale: executionState === 'loading' ? 0.98 : 1 }} transition={{ delay, duration: 0.4 }} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} style={{ height: '100%' }}>
            <Card hoverable padding={0} style={{ height: '100%', border: isLocked ? '1px dashed rgba(148,163,184,0.3)' : `1px solid ${severityStyle.color}40`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: 4, background: isLocked ? 'rgba(148,163,184,0.2)' : `linear-gradient(90deg, ${severityStyle.color}, ${categoryStyle.color})`, transition: 'all 0.3s' }} />
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${severityStyle.color}, ${severityStyle.color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, flexShrink: 0, boxShadow: `0 4px 16px ${severityStyle.color}40` }}>
                            {executionState === 'loading' ? <i className="fa-solid fa-spinner fa-spin" /> : executionState === 'success' ? <i className="fa-solid fa-check" /> : <i className={action.icon} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#f1f5f9', fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{action.title}</h4>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                <Badge variant={severityStyle.variant} icon={severityStyle.icon}>{severityStyle.label}</Badge>
                                <Badge variant={isLocked ? 'warning' : 'success'} icon={isLocked ? 'fa-lock' : 'fa-unlock'}>{isLocked ? 'Заблокировано' : 'Активно'}</Badge>
                                {hasValue && !isInputAction && (<Badge variant={currentValue ? 'danger' : 'success'} icon={currentValue ? 'fa-power-off' : 'fa-play'}>{currentValue ? 'Включено' : 'Выключено'}</Badge>)}
                                {isInputAction && (<span style={{ fontSize: 12, color: action.value ? '#a5b4fc' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.25)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}><i className="fa-solid fa-tag" style={{ fontSize: 10, color: '#6366f1' }} /><strong style={{ fontWeight: 600 }}>{action.value || 'Не задано'}</strong></span>)}
                            </div>
                        </div>
                    </div>
                    <p style={{ color: '#cbd5e1', marginBottom: 14, fontSize: 13, lineHeight: 1.6, flex: 1 }}>{action.description}</p>
                    {isInputAction && getInfoText()}
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 14, display: 'flex', gap: 12, flexWrap: 'wrap', padding: '10px 12px', background: 'rgba(0,0,0,0.25)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                        {action.executedByUser && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><i className="fa-solid fa-user" style={{ color: '#6366f1' }} />{action.executedByUser}</span>}
                        {action.lastExecuted && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><i className="fa-solid fa-clock" style={{ color: '#f59e0b' }} />{new Date(action.lastExecuted).toLocaleString('ru-RU')}</span>}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><i className="fa-solid fa-list-ol" style={{ color: '#10b981' }} /><strong style={{ color: '#e2e8f0' }}>{action.executionCount || 0}</strong><span>раз</span></span>
                    </div>
                    <AnimatePresence>
                        {isHovered && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}><div style={{ background: `linear-gradient(135deg, ${categoryStyle.bgColor}, transparent)`, border: `1px solid ${categoryStyle.color}40`, borderRadius: 10, padding: 12, marginBottom: 14 }}><div style={{ fontSize: 11, fontWeight: 700, color: categoryStyle.color, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}><i className="fa-solid fa-circle-info" />Внимание</div><p style={{ margin: 0, fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>{action.severity === 2 ? ' Требует особой осторожности. Очень критическая операция!' : action.severity === 1 ? '⚡ Стандартная операция, но имеет последствия. Выполнять обдуманно!' : ' Безопасная операция. Минимальные или отсутствующие последствия.'}</p></div></motion.div>)}
                    </AnimatePresence>
                    {action.consequences && action.consequences.length > 0 && (<div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 14, marginBottom: 16, borderLeft: `3px solid ${severityStyle.color}` }}><p style={{ margin: '0 0 10px 0', fontSize: 11, fontWeight: 700, color: severityStyle.color, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}><i className="fa-solid fa-triangle-exclamation" />Возможные последствия:</p><ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#cbd5e1', lineHeight: 1.7 }}>{action.consequences.map((c, idx) => (<li key={idx} style={{ marginBottom: 3 }}>{c}</li>))}</ul></div>)}
                    <div style={{ marginTop: 'auto' }}>
                        {isLocked ? (<Button variant="warning" onClick={onToggleLock} fullWidth icon="fa-solid fa-lock-open" disabled={executionState === 'loading'}>Разблокировать</Button>) : (
                            <div style={{ display: 'flex', gap: 8 }}>
                                {hasValue ? (isInputAction ? (<div style={{ display: 'flex', gap: 8, width: '100%' }}><Input value={customValue} onChange={(e) => setCustomValue(e.target.value)} placeholder={getPlaceholder()} style={{ fontSize: 13, flex: 1 }} /><Button variant="success" onClick={() => onExecute(customValue)} icon={executionState === 'loading' ? 'fa-solid fa-spinner fa-spin' : 'fa-check'} disabled={executionState === 'loading' || !customValue.trim()} loading={executionState === 'loading'} style={{ padding: '10px 16px', flexShrink: 0 }} /></div>) : (<Button variant={currentValue ? 'danger' : 'success'} onClick={() => onExecute(toggleValue)} fullWidth icon={executionState === 'loading' ? 'fa-solid fa-spinner fa-spin' : (currentValue ? 'fa-solid fa-ban' : 'fa-solid fa-play')} disabled={executionState === 'loading'} loading={executionState === 'loading'}>{executionState === 'loading' ? 'Выполняется...' : (currentValue ? 'Выключить' : 'Включить')}</Button>)) : (<Button variant="danger" onClick={() => onExecute(null)} fullWidth icon={executionState === 'loading' ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-play'} disabled={executionState === 'loading'} loading={executionState === 'loading'}>{executionState === 'loading' ? 'Выполняется...' : 'Выполнить'}</Button>)}
                                <Button variant="secondary" onClick={onToggleLock} icon="fa-solid fa-lock" disabled={executionState === 'loading'} style={{ padding: '10px 14px', flexShrink: 0 }} title="Заблокировать" />
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </motion.div>
    );
};
export default CriticalActionCard;