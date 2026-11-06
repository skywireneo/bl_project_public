import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

// Примечание: Если вы используете кастомный роутер из предоставленного файла, 
// замените useNavigate на: const { navigate } = useRouter();

function NotFound() {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f1117',
            padding: '24px'
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{
                    background: 'linear-gradient(135deg, #1e2030 0%, #1a1d2e 100%)',
                    borderRadius: 24,
                    padding: 'clamp(32px, 5vw, 64px)',
                    maxWidth: 560,
                    width: '100%',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    textAlign: 'center'
                }}
            >
                {/* Иконка */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    style={{
                        width: 96,
                        height: 96,
                        borderRadius: 24,
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 24px'
                    }}
                >
                    <i className="fa-solid fa-ghost" style={{ fontSize: 48, color: '#818cf8' }} />
                </motion.div>

                {/* Заголовок 404 */}
                <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    style={{
                        fontSize: 'clamp(48px, 8vw, 72px)',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        margin: 0,
                        lineHeight: 1
                    }}
                >
                    404
                </motion.h1>

                {/* Подзаголовок */}
                <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: '16px 0 8px' }}
                >
                    Страница не найдена
                </motion.h2>

                {/* Описание */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.6, marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}
                >
                    Запрашиваемая страница не существует, была удалена или перемещена. Проверьте корректность введенного адреса.
                </motion.p>

                {/* Кнопки действий (стили взяты из компонента Button вашего файла) */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
                >
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: '#fff',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: 10,
                            fontWeight: 600,
                            fontSize: 14,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            transition: 'filter 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                    >
                        <i className="fa-solid fa-house" />
                        На главную
                    </button>

                    <button
                        onClick={() => navigate('/incidents')}
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            color: '#e2e8f0',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '12px 24px',
                            borderRadius: 10,
                            fontWeight: 600,
                            fontSize: 14,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    >
                        <i className="fa-solid fa-list" />
                        К инцидентам
                    </button>
                </motion.div>

                {/* Футер компонента */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <div style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <i className="fa-solid fa-shield-halved" style={{ color: '#6366f1' }} />
                        <span>BlackList</span>
                        <span style={{ opacity: 0.5 }}>•</span>
                        <span>Система чёрных списков</span>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}

export default NotFound;