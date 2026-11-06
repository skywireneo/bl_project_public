import React from 'react';
import { Modal, Button, Input } from '../../../ui/UIComponents';

const ConfirmActionModal = ({ isOpen, action, countdown, canConfirm, confirmInput, onClose, onConfirm, onInputChange }) => {
    if (!action) return null;
    return (
        <Modal open={isOpen} onClose={onClose} title={action.title || 'Подтверждение действия'} size="md">
            <div>
                {countdown > 0 && (<div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center', color: '#fbbf24', fontWeight: 700, fontSize: 14, animation: 'pulse 1s ease-in-out infinite' }}><i className="fa-solid fa-clock" style={{ marginRight: 10 }} />Подтвердите действие через {countdown} сек.</div>)}
                <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: 18, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: '#fca5a5', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Описание</div>
                    <p style={{ margin: 0, color: '#f1f5f9', fontSize: 14, lineHeight: 1.6 }}>{action.description}</p>
                </div>
                {action.consequences && action.consequences.length > 0 && (<div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: 18, marginBottom: 16, borderLeft: '3px solid #ef4444' }}><p style={{ margin: '0 0 10px 0', fontSize: 12, fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}><i className="fa-solid fa-triangle-exclamation" />Возможные последствия:</p><ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#cbd5e1', lineHeight: 1.7 }}>{action.consequences.map((c, idx) => (<li key={idx} style={{ marginBottom: 4 }}>{c}</li>))}</ul></div>)}
                {action.need_extra_confirmation && action.pendingValue !== 'false' && (
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>Для подтверждения введите: <code style={{ background: 'rgba(0,0,0,0.4)', padding: '3px 10px', borderRadius: 6, color: '#ef4444', fontFamily: 'monospace', fontSize: 13, border: '1px solid rgba(239, 68, 68, 0.3)' }}>{action.confirmText}</code></label>
                        <Input placeholder={`Введите "${action.confirmText}"`} value={confirmInput} onChange={(e) => onInputChange(e.target.value)} error={confirmInput && !canConfirm ? 'Текст не совпадает' : null} />
                        {canConfirm && <p style={{ margin: '10px 0 0 0', color: '#34d399', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}><i className="fa-solid fa-check-circle" />Текст подтверждён</p>}
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <Button variant="secondary" onClick={onClose}>Отмена</Button>
                    <Button variant="danger" onClick={onConfirm} icon={countdown > 0 ? 'fa-clock' : 'fa-check'} disabled={!canConfirm && (action.pendingValue !== 'false' && action.need_extra_confirmation || countdown > 0)}>{countdown > 0 ? `Подтвердить (${countdown})` : 'Подтвердить'}</Button>
                </div>
            </div>
        </Modal>
    );
};
export default ConfirmActionModal;