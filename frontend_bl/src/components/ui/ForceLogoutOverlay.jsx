import React, { useState, useEffect } from 'react';

const ForceLogoutOverlay = ({ reason, delay = 5000, onConfirm }) => {
    // Вычисляем секунды из переданного delay (например, 6432 мс -> 7 сек)
    const initialSeconds = Math.ceil(delay / 1000);
    const [countdown, setCountdown] = useState(initialSeconds);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onConfirm(); // Время вышло -> редирект
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onConfirm, delay]); // Зависимость от delay гарантирует корректный сброс таймера

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 17, 23, 0.95)',
            backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: '#e2e8f0', textAlign: 'center', padding: 20
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #1e2030 0%, #1a1d2e 100%)',
                border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 16,
                padding: 32, maxWidth: 450, width: '100%',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}>
                <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px'
                }}>
                    <i className="fa-solid fa-shield-halved" style={{ fontSize: 28, color: '#f87171' }} />
                </div>

                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#f1f5f9' }}>
                    Сессия завершена
                </h2>

                <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24, lineHeight: 1.5 }}>
                    {reason || 'Ваша сессия была принудительно завершена.'}
                </p>

                <div style={{
                    fontSize: 13, color: '#64748b', marginBottom: 20,
                    background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: 8
                }}>
                    Автоматическое перенаправление через <strong style={{ color: '#f87171' }}>{countdown}</strong> сек.
                </div>

                <button
                    onClick={onConfirm}
                    style={{
                        width: '100%', padding: '12px 24px',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: '#fff', border: 'none', borderRadius: 10,
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        transition: 'filter 0.2s', fontFamily: 'inherit'
                    }}
                    onMouseOver={(e) => e.target.style.filter = 'brightness(1.1)'}
                    onMouseOut={(e) => e.target.style.filter = 'brightness(1)'}
                >
                    Перейти к авторизации сейчас
                </button>
            </div>
        </div>
    );
};

export default ForceLogoutOverlay;