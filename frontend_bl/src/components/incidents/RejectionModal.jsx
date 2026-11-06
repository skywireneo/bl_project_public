import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/UIComponents"; // Проверь путь к UIComponents

const REJECTION_REASONS = [
    'Недостаточно доказательств',
    'Дубликат инцидента',
    'Нарушение правил сервиса',
    'Информация не подтвердилась',
    'Другое (указать вручную)'
];

export default function RejectionModal({ isOpen, onClose, onConfirm, isLoading = false }) {
    const [reason, setReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [error, setError] = useState('');

    // Сбрасываем состояние при закрытии/открытии
    React.useEffect(() => {
        if (!isOpen) {
            setReason('');
            setCustomReason('');
            setError('');
        }
    }, [isOpen]);

    const handleConfirmClick = () => {
        const finalReason = reason === 'Другое (указать вручную)' ? customReason : reason;

        if (!finalReason || !finalReason.trim()) {
            setError('Пожалуйста, укажите причину отклонения');
            return;
        }

        setError('');
        onConfirm(finalReason);
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
                zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
            }}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                    border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: 32,
                    maxWidth: 500, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
                    }}>
                        <i className="fa-solid fa-circle-xmark" style={{ color: '#ef4444', fontSize: 28 }} />
                    </div>
                    <h3 style={{ color: '#f1f5f9', margin: 0, fontSize: 20 }}>Отклонить инцидент</h3>
                    <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 8 }}>
                        Пожалуйста, укажите причину отклонения. Это действие нельзя отменить.
                    </p>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 8, display: 'block' }}>
                        Выберите причину:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                        {REJECTION_REASONS.map(item => (
                            <button
                                key={item}
                                onClick={() => setReason(item)}
                                style={{
                                    padding: '10px 14px',
                                    background: reason === item ? 'rgba(239,68,68,0.15)' : 'rgba(0,0,0,0.2)',
                                    border: reason === item ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: 10,
                                    color: reason === item ? '#fca5a5' : '#94a3b8',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    transition: 'all 0.2s'
                                }}
                            >
                                {item}
                            </button>
                        ))}
                    </div>

                    {reason === 'Другое (указать вручную)' && (
                        <textarea
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            placeholder="Введите причину вручную..."
                            rows={3}
                            style={{
                                width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 10, padding: 12, color: '#e2e8f0', fontSize: 14, resize: 'vertical', outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    )}

                    {error && (
                        <div style={{ color: '#f87171', fontSize: 12, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="fa-solid fa-circle-exclamation" /> {error}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <Button variant="secondary" onClick={onClose} fullWidth disabled={isLoading}>
                        Отмена
                    </Button>
                    <Button variant="danger" onClick={handleConfirmClick} fullWidth loading={isLoading}>
                        Отклонить
                    </Button>
                </div>
            </motion.div>
        </motion.div>
    );
}