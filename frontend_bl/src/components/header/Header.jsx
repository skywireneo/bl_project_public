import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function Header({ title, subtitle, actions, breadcrumb }) {
    const [showBetaModal, setShowBetaModal] = useState(false);

    // Если заголовок не передан, не рендерим компонент (например, для страницы 404)
    if (!title) return null;

    // Email для баг-репортов (можно вынести в .env)
    const BUG_REPORT_EMAIL = process.env.REACT_APP_BUG_REPORT_EMAIL || 'support@blpvz.ru';
    const TELEGRAM_SUPPORT = process.env.REACT_APP_TELEGRAM_SUPPORT || '@blpvz_support';

    return (
        <>
            {/* Полоса с плашкой тестовой версии */}
            <motion.div
                onClick={() => setShowBetaModal(true)}
                whileHover={{ backgroundColor: 'rgba(245,158,11,0.12)' }}
                style={{
                    padding: '8px clamp(16px, 3vw, 32px)',
                    background: 'linear-gradient(90deg, rgba(245,158,11,0.08), rgba(239,68,68,0.08))',
                    borderBottom: '1px solid rgba(245,158,11,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.2s ease'
                }}
            >
                <motion.span
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [1, 0.7, 1]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#f59e0b',
                        boxShadow: '0 0 12px rgba(245,158,11,0.6)'
                    }}
                />
                <span style={{
                    fontSize: 12,
                    color: '#fde68a',
                    fontWeight: 600,
                    letterSpacing: '0.3px'
                }}>
                    <strong>BETA ВЕРСИЯ</strong> — Возможны ошибки и нестабильная работа
                </span>
                <span style={{
                    fontSize: 11,
                    color: '#fbbf24',
                    padding: '2px 8px',
                    background: 'rgba(245,158,11,0.15)',
                    borderRadius: 10,
                    border: '1px solid rgba(245,158,11,0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                }}>
                    <i className="fa-solid fa-circle-info" style={{ fontSize: 10 }} />
                    Подробнее
                </span>
            </motion.div>

            {/* Основной хедер */}
            <div style={{
                padding: 'clamp(16px, 2.5vw, 24px) clamp(16px, 3vw, 32px)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
                background: 'rgba(15,17,23,0.8)',
                backdropFilter: 'blur(20px)',
                position: 'sticky',
                top: 0,
                zIndex: 50
            }}>
                <div style={{ minWidth: 0 }}>
                    {breadcrumb && (
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            {breadcrumb}
                        </div>
                    )}
                    <h1 style={{ fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700, color: '#f1f5f9' }}>
                        {title}
                    </h1>
                    {subtitle && <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{subtitle}</p>}
                </div>

                {actions && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {actions}
                    </div>
                )}
            </div>

            {/* Модалка с описанием тестовой версии */}
            <AnimatePresence>
                {showBetaModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowBetaModal(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(10px)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 20,
                            overflowY: 'auto'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                                borderRadius: 20,
                                maxWidth: 560,
                                width: '100%',
                                maxHeight: '90vh',
                                overflow: 'auto',
                                border: '1px solid rgba(245,158,11,0.2)',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                            }}
                        >
                            {/* Шапка модалки */}
                            <div style={{
                                padding: '24px 28px',
                                background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))',
                                borderBottom: '1px solid rgba(255,255,255,0.08)',
                                position: 'relative'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{
                                            width: 52,
                                            height: 52,
                                            borderRadius: 14,
                                            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 4px 14px rgba(245,158,11,0.4)',
                                            fontSize: 24
                                        }}>
                                            🧪
                                        </div>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: 20, color: '#f1f5f9' }}>
                                                BETA версия системы
                                            </h2>
                                            <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    background: 'rgba(245,158,11,0.2)',
                                                    border: '1px solid rgba(245,158,11,0.4)',
                                                    borderRadius: 6,
                                                    fontSize: 11,
                                                    color: '#fde68a',
                                                    fontWeight: 700
                                                }}>
                                                    BETA
                                                </span>
                                                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                                                    В процессе разработки
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowBetaModal(false)}
                                        style={{
                                            background: 'rgba(239,68,68,0.15)',
                                            border: 'none',
                                            color: '#f87171',
                                            borderRadius: 8,
                                            width: 36,
                                            height: 36,
                                            cursor: 'pointer',
                                            fontSize: 16,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}
                                    >
                                        <i className="fa-solid fa-xmark" />
                                    </button>
                                </div>
                            </div>

                            {/* Содержимое модалки */}
                            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {/* Описание */}
                                <div style={{
                                    padding: 16,
                                    background: 'rgba(99,102,241,0.06)',
                                    border: '1px solid rgba(99,102,241,0.2)',
                                    borderRadius: 12
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                        <i className="fa-solid fa-circle-info" style={{ color: '#818cf8', fontSize: 16, marginTop: 2, flexShrink: 0 }} />
                                        <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.7 }}>
                                            Вы используете <strong style={{ color: '#e2e8f0' }}>BETA версию</strong> системы.
                                            Это значит, что функционал активно развивается, и в работе могут возникать
                                            различные проблемы - от мелких неудобств до критических ошибок.
                                        </div>
                                    </div>
                                </div>

                                {/* Что может происходить */}
                                <div>
                                    <div style={{
                                        fontSize: 12,
                                        color: '#94a3b8',
                                        marginBottom: 10,
                                        textTransform: 'uppercase',
                                        fontWeight: 600
                                    }}>
                                        <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6, color: '#f59e0b' }} />
                                        Что может происходить
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {[
                                            { icon: 'fa-bug', color: '#ef4444', text: 'Встречаться ошибки и непредвиденное поведение' },
                                            { icon: 'fa-gauge', color: '#f59e0b', text: 'Страницы могут загружаться медленнее обычного' },
                                            { icon: 'fa-paintbrush', color: '#8b5cf6', text: 'Интерфейс может меняться и выглядеть по-разному' },
                                            { icon: 'fa-arrows-rotate', color: '#10b981', text: 'Возможны кратковременные простои при обновлениях' }
                                        ].map((item, i) => (
                                            <div key={i} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                padding: '8px 12px',
                                                background: 'rgba(0,0,0,0.2)',
                                                borderRadius: 8,
                                                fontSize: 13,
                                                color: '#e2e8f0'
                                            }}>
                                                <i className={`fa-solid ${item.icon}`} style={{ color: item.color, width: 16, textAlign: 'center' }} />
                                                {item.text}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Как помочь проекту */}
                                <div>
                                    <div style={{
                                        fontSize: 12,
                                        color: '#94a3b8',
                                        marginBottom: 10,
                                        textTransform: 'uppercase',
                                        fontWeight: 600
                                    }}>
                                        <i className="fa-solid fa-hands-helping" style={{ marginRight: 6, color: '#10b981' }} />
                                        Как вы можете помочь
                                    </div>
                                    <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.7 }}>
                                        Если вы столкнулись с ошибкой, нашли странное поведение или у вас есть идея
                                        по улучшению - пожалуйста, сообщите нам. Ваши отзывы помогают сделать систему лучше!
                                    </div>
                                </div>

                                {/* Контакты для баг-репортов */}
                                <div style={{
                                    padding: 16,
                                    background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.08))',
                                    border: '1px solid rgba(16,185,129,0.2)',
                                    borderRadius: 12
                                }}>
                                    <div style={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: '#e2e8f0',
                                        marginBottom: 12,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8
                                    }}>
                                        <i className="fa-solid fa-envelope-circle-check" style={{ color: '#10b981' }} />
                                        Сообщить о проблеме
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {/* Email */}
                                        <a
                                            href={`mailto:${BUG_REPORT_EMAIL}?subject=Баг-репорт (Beta)&body=Описание проблемы:%0D%0A%0D%0AШаги воспроизведения:%0D%0A%0D%0AОжидаемый результат:%0D%0A%0D%0AФактический результат:%0D%0A%0D%0AСкриншоты (если есть):`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                padding: 12,
                                                background: 'rgba(0,0,0,0.25)',
                                                borderRadius: 8,
                                                textDecoration: 'none',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = 'rgba(99,102,241,0.15)';
                                                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = 'rgba(0,0,0,0.25)';
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                                            }}
                                        >
                                            <div style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 10,
                                                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <i className="fa-solid fa-envelope" style={{ color: '#fff', fontSize: 16 }} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>
                                                    Email для баг-репортов
                                                </div>
                                                <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600, fontFamily: 'monospace' }}>
                                                    {BUG_REPORT_EMAIL}
                                                </div>
                                            </div>
                                            <i className="fa-solid fa-arrow-right" style={{ color: '#64748b', fontSize: 12 }} />
                                        </a>

                                        {/* Telegram */}
                                        <a
                                            href={`https://t.me/${TELEGRAM_SUPPORT.replace('@', '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                padding: 12,
                                                background: 'rgba(0,0,0,0.25)',
                                                borderRadius: 8,
                                                textDecoration: 'none',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = 'rgba(14,165,233,0.15)';
                                                e.currentTarget.style.borderColor = 'rgba(14,165,233,0.3)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = 'rgba(0,0,0,0.25)';
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                                            }}
                                        >
                                            <div style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 10,
                                                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <i className="fa-brands fa-telegram" style={{ color: '#fff', fontSize: 18 }} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>
                                                    Telegram для быстрой связи
                                                </div>
                                                <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600, fontFamily: 'monospace' }}>
                                                    {TELEGRAM_SUPPORT}
                                                </div>
                                            </div>
                                            <i className="fa-solid fa-arrow-up-right-from-square" style={{ color: '#64748b', fontSize: 12 }} />
                                        </a>
                                    </div>
                                </div>

                                {/* Что писать в баг-репорте */}
                                <div style={{
                                    padding: 14,
                                    background: 'rgba(250,204,21,0.06)',
                                    border: '1px solid rgba(250,204,21,0.2)',
                                    borderRadius: 10
                                }}>
                                    <div style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: '#fde68a',
                                        marginBottom: 8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6
                                    }}>
                                        <i className="fa-solid fa-list-check" />
                                        Что указать в сообщении
                                    </div>
                                    <ul style={{
                                        fontSize: 12,
                                        color: '#cbd5e1',
                                        lineHeight: 1.8,
                                        paddingLeft: 20,
                                        margin: 0
                                    }}>
                                        <li>Что вы делали (пошагово)</li>
                                        <li>Что ожидали увидеть</li>
                                        <li>Что произошло на самом деле</li>
                                        <li>Скриншоты или видео (по возможности)</li>
                                        <li>Браузер и устройство</li>
                                    </ul>
                                </div>

                                {/* Спасибо */}
                                <div style={{
                                    padding: 14,
                                    background: 'rgba(16,185,129,0.08)',
                                    border: '1px solid rgba(16,185,129,0.2)',
                                    borderRadius: 10,
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: 18, marginBottom: 6 }}>💚</div>
                                    <div style={{ fontSize: 13, color: '#6ee7b7', fontWeight: 600 }}>
                                        Спасибо, что помогаете сделать систему лучше!
                                    </div>
                                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                                        Каждый ваш отзыв — вклад в развитие проекта
                                    </div>
                                </div>

                                {/* Кнопка закрытия */}
                                <button
                                    onClick={() => setShowBetaModal(false)}
                                    style={{
                                        width: '100%',
                                        padding: 12,
                                        background: 'rgba(99,102,241,0.1)',
                                        border: '1px solid rgba(99,102,241,0.3)',
                                        borderRadius: 10,
                                        color: '#a5b4fc',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = 'rgba(99,102,241,0.2)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'rgba(99,102,241,0.1)';
                                    }}
                                >
                                    Понятно, продолжить работу
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default Header;