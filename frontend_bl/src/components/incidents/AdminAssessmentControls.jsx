import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, Button, Textarea } from "../ui/UIComponents"; // Проверьте пути к вашим UI компонентам
import { addAdminAssessmentRecord } from "../../http/incidentsAPI"; // Импортируем новый метод

const RESULT_OPTIONS = [
    { value: 'approved', label: 'Одобрено', color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
    { value: 'needs_changes', label: 'Изменено', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
    { value: 'rejected', label: 'Не нравится', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' }
];

export default function AdminAssessmentControls({
    entityId,
    assessmentHistory = [],
    hasUserChecked,
    canUserCheck,
    currentUserId,
    onSuccess // Коллбэк для обновления данных в родительском компоненте после успеха
}) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [selectedResult, setSelectedResult] = useState('approved');
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // Отправляем только новые данные, бэкенд сам добавит их в историю
            const payload = {
                result: selectedResult,
                comment: comment.trim() || null
            };

            const response = await addAdminAssessmentRecord(entityId, payload);

            if (response.success) {
                // Уведомляем родительский компонент об успехе, чтобы он обновил стейт (перезагрузил инцидент)
                if (onSuccess) onSuccess(response.assessment);

                setIsFormOpen(false);
                setComment('');
                setSelectedResult('approved');
            }
        } catch (err) {
            console.error('Ошибка сохранения проверки:', err);
            alert(err.message || 'Не удалось сохранить проверку. Возможно, вы являетесь ответственным модератором.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Не указано';
        return new Date(dateStr).toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const getResultStyle = (val) => RESULT_OPTIONS.find(o => o.value === val) || RESULT_OPTIONS[0];

    return (
        <>
            <Card style={{ border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.03)' }}>
                <h4 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 16, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fa-solid fa-shield-halved" style={{ color: '#6366f1' }} /> Перекрёстная проверка
                </h4>

                {!canUserCheck ? (
                    <div style={{ padding: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 13, color: '#fca5a5', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <i className="fa-solid fa-circle-info" style={{ marginTop: 2 }} />
                        <span>Вы являетесь ответственным модератором этого обращения и не можете проводить перекрёстную проверку.</span>
                    </div>
                ) : null}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {canUserCheck ? (
                        <Button
                            variant={hasUserChecked ? "secondary" : "primary"}
                            icon={hasUserChecked ? "fa-solid fa-check" : "fa-solid fa-plus"}
                            onClick={() => setIsFormOpen(!isFormOpen)}
                            fullWidth
                            style={{ justifyContent: 'center' }}
                        >
                            {hasUserChecked ? 'Вы уже оставили проверку' : 'Оставить проверку'}
                        </Button>) : null}

                    <Button
                        variant="ghost"
                        icon="fa-solid fa-clock-rotate-left"
                        onClick={() => setIsHistoryOpen(true)}
                        fullWidth
                        style={{ justifyContent: 'center', color: '#94a3b8' }}
                    >
                        История проверок ({assessmentHistory.length})
                    </Button>
                    {canUserCheck ? (
                        <AnimatePresence>
                            {isFormOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Выберите результат:</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                                            {RESULT_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setSelectedResult(opt.value)}
                                                    style={{
                                                        padding: '10px 12px',
                                                        borderRadius: 8,
                                                        border: selectedResult === opt.value ? `1px solid ${opt.border}` : '1px solid rgba(255,255,255,0.05)',
                                                        background: selectedResult === opt.value ? opt.bg : 'rgba(0,0,0,0.2)',
                                                        color: selectedResult === opt.value ? opt.color : '#94a3b8',
                                                        fontSize: 13,
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color }} />
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Комментарий (необязательно):</div>
                                        <Textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder="Укажите детали проверки..."
                                            rows={3}
                                            style={{ marginBottom: 12, fontSize: 13 }}
                                        />

                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <Button variant="primary" onClick={handleSubmit} loading={isSubmitting} fullWidth>Сохранить</Button>
                                            <Button variant="secondary" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>Отмена</Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    ) : null}
                </div>
            </Card>

            {/* МОДАЛЬНОЕ ОКНО ИСТОРИИ */}
            <AnimatePresence>
                {isHistoryOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setIsHistoryOpen(false)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ background: '#1e293b', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 16, padding: 24, maxWidth: 500, width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <i className="fa-solid fa-clock-rotate-left" style={{ color: '#6366f1' }} /> История проверок
                                </h3>
                                <button onClick={() => setIsHistoryOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}>
                                    <i className="fa-solid fa-xmark" />
                                </button>
                            </div>

                            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 8 }}>
                                {assessmentHistory.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>Проверок пока не было</div>
                                ) : (
                                    [...assessmentHistory].reverse().map((record, idx) => {
                                        const style = getResultStyle(record.result);
                                        const isMe = String(record.user_id) === String(currentUserId);
                                        return (
                                            <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 14, border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: isMe ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', color: isMe ? '#a5b4fc' : '#94a3b8', fontWeight: 600 }}>
                                                            {isMe ? 'Вы' : (record.user_login || 'Модератор')}
                                                        </span>
                                                        <span style={{ fontSize: 11, color: '#64748b' }}>{formatDate(record.timestamp)}</span>
                                                    </div>
                                                    <span style={{ fontSize: 12, fontWeight: 700, color: style.color, background: style.bg, padding: '2px 8px', borderRadius: 6, border: `1px solid ${style.border}` }}>
                                                        {style.label}
                                                    </span>
                                                </div>
                                                {record.comment && (
                                                    <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 6, fontStyle: 'italic' }}>
                                                        "{record.comment}"
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}