import React, { useState } from 'react';
import { Card, Button } from '../../../ui/UIComponents';
import { regenerateSecondaryPassword } from '../../../../http/userAPI';

export default function SecondaryPasswordManager({ targetUser, currentUserId, currentUserStatus }) {
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [modalState, setModalState] = useState(null);
    const [modalData, setModalData] = useState({ newPassword: '', message: '' });

    // Стейт для анимации успешного копирования
    const [isCopied, setIsCopied] = useState(false);

    const isSelf = targetUser?.user_id === currentUserId;
    const isAdmin = ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"].includes(currentUserStatus);
    if (!isSelf && !isAdmin) return null;

    // Асинхронная функция копирования с визуальным фидбеком
    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setIsCopied(true);

            // Возвращаем кнопку в исходное состояние через 2 секунды
            setTimeout(() => {
                setIsCopied(false);
            }, 2000);
        } catch (err) {
            console.error('Не удалось скопировать текст: ', err);
        }
    };

    const handleRegenerateClick = () => {
        setModalState('confirm');
    };

    const confirmRegenerate = async () => {
        setModalState('loading');
        setIsRegenerating(true);
        setIsCopied(false); // Сбрасываем состояние копирования при новой генерации

        try {
            const result = await regenerateSecondaryPassword(targetUser.user_id);
            setModalData({ newPassword: result.secondary_password, message: '' });
            setModalState('success');
        } catch (err) {
            setModalData({ newPassword: '', message: err?.response?.data?.message || 'Не удалось сгенерировать дополнительный пароль' });
            setModalState('error');
        } finally {
            setIsRegenerating(false);
        }
    };

    const closeModal = () => {
        setModalState(null);
        setModalData({ newPassword: '', message: '' });
        setIsCopied(false); // Сбрасываем состояние при закрытии модалки
    };

    return (
        <>
            {/* Виджет-карточка */}
            <Card style={{ border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: 'rgba(245,158,11,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <i className="fa-solid fa-shield-halved" style={{ color: '#f59e0b', fontSize: 16 }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#fbbf24' }}>Дополнительный пароль (2FA)</div>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                                Требуется при входе с нового устройства
                            </div>
                        </div>
                    </div>
                    <Button variant="warning" icon="fa-solid fa-rotate" onClick={handleRegenerateClick} loading={isRegenerating}>
                        Обновить
                    </Button>
                </div>
            </Card>

            {/* Модалки */}
            {modalState && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={closeModal}>
                    <div onClick={(e) => e.stopPropagation()} style={{ background: '#1a1d2e', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden', animation: 'fadeInScale 0.2s ease-out' }}>
                        {modalState === 'confirm' && (
                            <div style={{ padding: 24, textAlign: 'center' }}>
                                <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 28, color: '#f59e0b' }} />
                                </div>
                                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>Подтвердите действие</h3>
                                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                                    Старый дополнительный пароль для <strong style={{ color: '#e2e8f0' }}>{targetUser.login}</strong> будет немедленно аннулирован.
                                </p>
                                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                                    <Button variant="secondary" onClick={closeModal} fullWidth style={{ justifyContent: 'center' }}>Отмена</Button>
                                    <Button variant="warning" onClick={confirmRegenerate} fullWidth style={{ justifyContent: 'center' }}>Продолжить</Button>
                                </div>
                            </div>
                        )}
                        {modalState === 'loading' && (
                            <div style={{ padding: 40, textAlign: 'center' }}>
                                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 32, color: '#f59e0b', marginBottom: 16 }} />
                                <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600 }}>Генерация безопасного пароля...</div>
                            </div>
                        )}
                        {modalState === 'success' && (
                            <div style={{ padding: 24, textAlign: 'center' }}>
                                <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="fa-solid fa-circle-check" style={{ fontSize: 28, color: '#10b981' }} />
                                </div>
                                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>Пароль сгенерирован</h3>
                                <p style={{ fontSize: 12, color: '#fbbf24', marginBottom: 16, fontStyle: 'italic' }}> Покажите этот пароль пользователю прямо сейчас.</p>
                                <div style={{ padding: 16, background: 'rgba(0,0,0,0.3)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.3)', marginBottom: 16 }}>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace', letterSpacing: '1.5px', wordBreak: 'break-all', marginBottom: 12 }}>
                                        {modalData.newPassword}
                                    </div>

                                    {/* ОБНОВЛЕННАЯ КНОПКА КОПИРОВАНИЯ С АНИМАЦИЕЙ */}
                                    <Button
                                        variant={isCopied ? "success" : "secondary"}
                                        size="sm"
                                        icon={isCopied ? "fa-solid fa-check" : "fa-regular fa-copy"}
                                        onClick={() => copyToClipboard(modalData.newPassword)}
                                        fullWidth
                                        style={{
                                            justifyContent: 'center',
                                            transition: 'all 0.2s ease-in-out' // Плавный переход цветов
                                        }}
                                    >
                                        {isCopied ? "Скопировано!" : "Скопировать пароль"}
                                    </Button>
                                </div>
                                <Button variant="primary" onClick={closeModal} fullWidth style={{ justifyContent: 'center' }}>Закрыть</Button>
                            </div>
                        )}
                        {modalState === 'error' && (
                            <div style={{ padding: 24, textAlign: 'center' }}>
                                <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="fa-solid fa-circle-xmark" style={{ fontSize: 28, color: '#ef4444' }} />
                                </div>
                                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>Ошибка</h3>
                                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, marginBottom: 24 }}>{modalData.message}</p>
                                <Button variant="primary" onClick={closeModal} fullWidth style={{ justifyContent: 'center' }}>Понятно</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <style>{`@keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
        </>
    );
}