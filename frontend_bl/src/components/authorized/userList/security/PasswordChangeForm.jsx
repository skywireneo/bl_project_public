import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Modal } from '../../../ui/UIComponents';
import { changePassword, getPasswordHistory } from '../../../../http/userAPI';

export default function PasswordChangeForm({ targetUser, currentUserId, currentUserStatus }) {
    const [formData, setFormData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '', // Фича А: Подтверждение пароля
        autoGenerate: false,
        reason: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modal, setModal] = useState({ type: '', title: '', message: '', newPassword: null });
    const [lastChange, setLastChange] = useState(null);
    const [isCopied, setIsCopied] = useState(false);

    // Фича В: Состояние для показа/скрытия пароля
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const isSelf = targetUser?.user_id === currentUserId;
    const isAdmin = ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"].includes(currentUserStatus);

    useEffect(() => {
        if (!targetUser?.user_id) return;
        getPasswordHistory(targetUser.user_id)
            .then(data => {
                const arr = Array.isArray(data) ? data : [];
                if (arr.length > 0) setLastChange(arr[0].created_at);
            })
            .catch(() => { });
    }, [targetUser?.user_id]);

    if (!isSelf && !isAdmin) return null;

    // Фича Б: Проверка сложности пароля в реальном времени (соответствует бэкенду)
    const checkPasswordStrength = (pass) => {
        return {
            length: pass.length >= 5 && pass.length <= 20, // Исправлено под ваше требование "от 5"
            lower: /[a-z]/.test(pass),
            upper: /[A-Z]/.test(pass),
            number: /[0-9]/.test(pass),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)
        };
    };

    const strength = checkPasswordStrength(formData.newPassword);
    const isPasswordValid = Object.values(strength).every(Boolean);
    const isPasswordMatch = formData.newPassword === formData.confirmPassword && formData.newPassword !== '';

    // Кнопка активна только если пароль валиден, совпадает с подтверждением и (для админа) заполнена причина
    // Если включена автогенерация, проверка ручного ввода не требуется
    const isFormValid = formData.autoGenerate
        ? (!isSelf && formData.reason.trim().length > 0)
        : (isPasswordValid && isPasswordMatch && (!isSelf ? formData.reason.trim().length > 0 : true));

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Не удалось скопировать текст: ', err);
        }
    };

    const openFormModal = () => {
        setModal({ type: '', title: '', message: '', newPassword: null });
        setFormData({ oldPassword: '', newPassword: '', confirmPassword: '', autoGenerate: false, reason: '' });
        setShowPassword(false);
        setShowConfirmPassword(false);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setModal({ type: '', title: '', message: '', newPassword: null });
        setIsCopied(false);
    };

    // Фича В: При изменении основного пароля сбрасываем подтверждение, чтобы заставить ввести его заново
    const handlePasswordChange = (value) => {
        setFormData({ ...formData, newPassword: value, confirmPassword: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid) return;

        setIsLoading(true);
        try {
            const payload = {
                targetUserId: isSelf ? undefined : targetUser?.user_id,
                oldPassword: isSelf ? formData.oldPassword : undefined,
                newPassword: formData.autoGenerate ? undefined : formData.newPassword,
                autoGenerate: formData.autoGenerate,
                reason: !isSelf ? formData.reason : undefined
            };
            const result = await changePassword(payload);
            if (result.new_password) {
                setModal({ type: 'success', title: ' Пароль успешно изменен', message: 'Скопируйте новый пароль. Он больше не будет показан в системе.', newPassword: result.new_password });
            } else {
                setModal({ type: 'success', title: ' Пароль успешно изменен', message: 'Все остальные активные сессии пользователя были завершены в целях безопасности.', newPassword: null });
            }
        } catch (err) {
            setModal({ type: 'error', title: '❌ Ошибка', message: err?.response?.data?.message || 'Не удалось изменить пароль', newPassword: null });
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Неизвестно';
        return new Date(dateStr).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Вспомогательный компонент для строки чек-листа
    const ChecklistItem = ({ isValid, text }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: isValid ? '#10b981' : '#94a3b8', transition: 'color 0.2s' }}>
            <i className={`fa-solid ${isValid ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ fontSize: 14 }} />
            <span>{text}</span>
        </div>
    );

    return (
        <>
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-key" style={{ color: '#6366f1', fontSize: 16 }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
                                {isSelf ? 'Мой пароль' : `Пароль ${targetUser?.login || ''}`}
                            </div>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                                Последняя смена: {formatDate(lastChange)}
                            </div>
                        </div>
                    </div>
                    <Button variant="secondary" icon="fa-solid fa-arrows-rotate" onClick={openFormModal}>
                        Сменить
                    </Button>
                </div>
            </Card>

            <Modal
                open={modalOpen && !modal.type}
                onClose={closeModal}
                title={isSelf ? 'Смена моего пароля' : `Смена пароля ${targetUser?.login || ''}`}
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={closeModal}>Отмена</Button>
                        <Button
                            variant="primary"
                            icon="fa-solid fa-save"
                            onClick={handleSubmit}
                            loading={isLoading}
                            disabled={!isFormValid} // Фича В: Блокировка до выполнения условий
                        >
                            {isSelf ? 'Сменить пароль' : 'Сбросить пароль'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {!isSelf && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input type="checkbox" id="autoGen" checked={formData.autoGenerate}
                                onChange={(e) => setFormData({ ...formData, autoGenerate: e.target.checked, newPassword: '', confirmPassword: '' })}
                                style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }} />
                            <label htmlFor="autoGen" style={{ fontSize: 13, color: '#e2e8f0', cursor: 'pointer' }}>
                                Сгенерировать криптостойкий пароль автоматически
                            </label>
                        </div>
                    )}

                    {isSelf && (
                        <div style={{ position: 'relative' }}>
                            <Input type={showPassword ? "text" : "password"} label="Текущий пароль" value={formData.oldPassword}
                                onChange={(e) => setFormData({ ...formData, oldPassword: e.target.value })}
                                placeholder="Введите текущий пароль" required />
                            <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: 12, top: 38, color: '#94a3b8', cursor: 'pointer', fontSize: 14 }} />
                        </div>
                    )}

                    {!formData.autoGenerate && (
                        <>
                            <div style={{ position: 'relative' }}>
                                <Input type={showPassword ? "text" : "password"} label="Новый пароль" value={formData.newPassword}
                                    onChange={(e) => handlePasswordChange(e.target.value)}
                                    placeholder="Мин. 5 символов: A-Z, a-z, 0-9, спецсимволы"
                                    required style={{ borderColor: formData.newPassword && !isPasswordValid ? 'rgba(239,68,68,0.5)' : undefined }} />
                                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: 12, top: 38, color: '#94a3b8', cursor: 'pointer', fontSize: 14 }} />
                            </div>

                            {/* Фича Б: Красивый чек-лист сложности */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                                <ChecklistItem isValid={strength.length} text="От 5 до 20 символов" />
                                <ChecklistItem isValid={strength.lower} text="Строчная английская буква (a-z)" />
                                <ChecklistItem isValid={strength.upper} text="Заглавная английская буква (A-Z)" />
                                <ChecklistItem isValid={strength.number} text="Цифра (0-9)" />
                                <ChecklistItem isValid={strength.special} text="Спецсимвол (!@#$%^&*...)" />
                            </div>

                            <div style={{ position: 'relative' }}>
                                <Input type={showConfirmPassword ? "text" : "password"} label="Повторите новый пароль" value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    placeholder="Введите пароль ещё раз" required
                                    style={{ borderColor: formData.confirmPassword && !isPasswordMatch ? 'rgba(239,68,68,0.5)' : (isPasswordMatch ? 'rgba(16,185,129,0.5)' : undefined) }} />
                                <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={{ position: 'absolute', right: 12, top: 38, color: '#94a3b8', cursor: 'pointer', fontSize: 14 }} />

                                {/* Фича А: Статус совпадения паролей */}
                                {formData.confirmPassword && (
                                    <div style={{ fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, color: isPasswordMatch ? '#10b981' : '#ef4444' }}>
                                        <i className={`fa-solid ${isPasswordMatch ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
                                        {isPasswordMatch ? 'Пароли совпадают' : 'Пароли не совпадают'}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {!isSelf && (
                        <Input label="Причина смены пароля (обязательно) *" value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            placeholder="Например: Утеря доступа, компрометация" required
                            style={{ borderColor: 'rgba(245,158,11,0.3)' }} />
                    )}
                </form>
            </Modal>

            {/* Модалка результата */}
            {modalOpen && modal.type && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={closeModal}>
                    <div onClick={(e) => e.stopPropagation()} style={{ background: '#1a1d2e', borderRadius: 16, border: `1px solid ${modal.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)'}`, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden', animation: 'fadeInScale 0.2s ease-out' }}>
                        <div style={{ padding: 24, textAlign: 'center' }}>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px', background: modal.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className={`fa-solid ${modal.type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check'}`} style={{ fontSize: 28, color: modal.type === 'error' ? '#ef4444' : '#10b981' }} />
                            </div>
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>{modal.title}</h3>
                            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, marginBottom: modal.newPassword ? 16 : 0 }}>{modal.message}</p>
                            {modal.newPassword && (
                                <div style={{ marginTop: 16, padding: 16, background: 'rgba(0,0,0,0.3)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace', letterSpacing: '1.5px', wordBreak: 'break-all', marginBottom: 12 }}>
                                        {modal.newPassword}
                                    </div>
                                    <Button
                                        variant={isCopied ? "success" : "secondary"}
                                        size="sm"
                                        icon={isCopied ? "fa-solid fa-check" : "fa-regular fa-copy"}
                                        onClick={() => copyToClipboard(modal.newPassword)}
                                        fullWidth
                                        style={{ justifyContent: 'center', transition: 'all 0.2s ease-in-out' }}
                                    >
                                        {isCopied ? "Скопировано!" : "Скопировать пароль"}
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div style={{ padding: '0 24px 24px', display: 'flex', justifyContent: 'center' }}>
                            <Button variant="primary" onClick={closeModal} fullWidth style={{ justifyContent: 'center' }}>
                                Понятно
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`@keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
        </>
    );
}