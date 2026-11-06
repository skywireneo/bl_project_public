import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Card, Divider } from "../ui/UIComponents"; // Убрали Alert из импорта

function SupportModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(12px)',
                    zIndex: 3000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: 'linear-gradient(135deg, #1e2030 0%, #1a1d2e 100%)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '16px',
                        maxWidth: '600px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    {/* ШАПКА МОДАЛКИ */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '24px 24px 0',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: '12px',
                                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 8px 16px rgba(236, 72, 153, 0.3)'
                            }}>
                                <i className="fa-solid fa-heart" style={{ color: '#fff', fontSize: 20 }} />
                            </div>
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Поддержать проект</div>
                                <div style={{ fontSize: 13, color: '#94a3b8' }}>Сделайте сервис лучше вместе с нами</div>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" icon="fa-solid fa-xmark" onClick={onClose} />
                    </div>

                    {/* ОСНОВНОЙ КОНТЕНТ */}
                    <div style={{ padding: '24px' }}>

                        {/* КРАСИВЫЙ ТЕКСТОВЫЙ БЛОК (вместо Alert) */}
                        <div style={{ marginBottom: 24, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                                background: 'rgba(236, 72, 153, 0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <i className="fa-solid fa-heart" style={{ color: '#ec4899', fontSize: 16 }} />
                            </div>
                            <p style={{ fontSize: 15, lineHeight: 1.6, color: '#cbd5e1', margin: 0, marginTop: 6 }}>
                                Мы создаем этот проект с любовью и заботой о безопасности сообщества.
                                Чтобы сервис оставался <strong style={{ color: '#f1f5f9', fontWeight: 600 }}>бесплатным, независимым и без навязчивой рекламы</strong>,
                                мы существуем исключительно на добровольные пожертвования пользователей.
                            </p>
                        </div>

                        {/* ПРЕИМУЩЕСТВА с использованием hoverable Card */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                            {[
                                { icon: 'fa-server', color: '#6366f1', title: 'Оплата серверов', desc: 'Ваши средства напрямую идут на обеспечение стабильной и быстрой работы сервиса 24/7.' },
                                { icon: 'fa-code', color: '#10b981', title: 'Развитие функций', desc: 'Поддержка позволяет нам уделять время разработке новых полезных инструментов, а не поиску спонсоров.' },
                                { icon: 'fa-shield-halved', color: '#f59e0b', title: 'Независимость и приватность', desc: 'Мы не продаем ваши данные и не встраиваем скрытую рекламу. Мы работаем только на вас.' }
                            ].map((item, idx) => (
                                <Card key={idx} hoverable={true} padding={16}>
                                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                                            background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <i className={`fa-solid ${item.icon}`} style={{ color: item.color, fontSize: 18 }} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>{item.title}</div>
                                            <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{item.desc}</div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        <Divider />

                        {/* CTA КНОПКА через ваш компонент Button */}
                        <a
                            href="https://boosty.to/***" // ЗАМЕНИТЕ НА ВАШУ РЕАЛЬНУЮ ССЫЛКУ
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none', display: 'block' }}
                        >
                            <Button
                                variant="primary"
                                size="lg"
                                fullWidth
                                icon="fa-solid fa-mug-hot"
                                style={{
                                    // Переопределяем градиент primary на розово-фиолетовый для акцента
                                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                                    border: 'none',
                                    boxShadow: '0 10px 25px rgba(236, 72, 153, 0.3)',
                                    marginTop: 8
                                }}
                            >
                                Перейти на страницу поддержки
                            </Button>
                        </a>

                        <p style={{ textAlign: 'center', fontSize: 12, color: '#64748b', marginTop: 16 }}>
                            Даже небольшая сумма имеет огромное значение для нас. Спасибо за вашу веру в проект! ❤️
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export default SupportModal;