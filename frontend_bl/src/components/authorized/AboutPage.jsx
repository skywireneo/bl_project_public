import React from 'react';
import { motion } from 'framer-motion';

// Предполагается, что эти компоненты импортируются из вашей UI-библиотеки
import { Card, Button, Badge, StatCard, Alert, Divider } from '../ui/UIComponents';
import SingleFileViewer from './unifiedFiles/singleFiles/SingleFileViewer';

// Вспомогательный компонент для информационных блоков
function InfoBlock({ icon, label, value, color = '#6366f1' }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 12,
                padding: 16,
                border: '1px solid rgba(255,255,255,0.06)',
                transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.3)';
                e.currentTarget.style.borderColor = `${color}40`;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
            }}
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11,
                color: '#64748b',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
            }}>
                <i className={`fa-solid ${icon}`} style={{ color, fontSize: 14 }} />
                {label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{value}</div>
        </motion.div>
    );
}

// Компонент для блока с фичей
function FeatureCard({ icon, title, description, delay = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            style={{
                background: 'linear-gradient(135deg,#1e2030 0%,#1a1d2e 100%)',
                borderRadius: 16,
                padding: 20,
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
            }}
        >
            <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'rgba(99,102,241,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <i className={`fa-solid ${icon}`} style={{ fontSize: 20, color: '#818cf8' }} />
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{title}</h4>
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{description}</p>
        </motion.div>
    );
}

function AboutPage() {
    const features = [
        {
            icon: 'fa-solid fa-shield-halved',
            title: 'Управление чёрными списками',
            description: 'Централизованное хранение и управление информацией о нарушителях с возможностью быстрого поиска и фильтрации.',
            delay: 0.1
        },
        {
            icon: 'fa-solid fa-triangle-exclamation',
            title: 'Учёт инцидентов',
            description: 'Детальное документирование всех инцидентов с привязкой к персонам, ПВЗ и указанием серьёзности.',
            delay: 0.2
        },
        {
            icon: 'fa-solid fa-user',
            title: 'Поиск людей',
            description: 'Поиск людей в чёрном списке.',
            delay: 0.3
        },
        {
            icon: 'fa-solid fa-building-flag',
            title: 'Поиск ПВЗ',
            description: 'Поиск ПВЗ в чёрном списке.',
            delay: 0.4
        },
        // {
        //     icon: 'fa-solid fa-chart-line',
        //     title: 'Аналитика и статистика',
        //     description: 'Наглядные графики и отчёты для анализа тенденций, серьёзности нарушений и эффективности работы.',
        //     delay: 0.3
        // },
        // {
        //     icon: 'fa-solid fa-users',
        //     title: 'Ролевая модель доступа',
        //     description: 'Гибкая система прав доступа для администраторов, модераторов и обычных пользователей.',
        //     delay: 0.4
        // },
        // {
        //     icon: 'fa-solid fa-comments',
        //     title: 'Комментарии и история',
        //     description: 'Возможность оставлять комментарии к инцидентам и отслеживать полную историю изменений.',
        //     delay: 0.5
        // },
        // {
        //     icon: 'fa-solid fa-bell',
        //     title: 'Уведомления',
        //     description: 'Система уведомлений о новых инцидентах, изменениях статусов и важных событиях.',
        //     delay: 0.6
        // }
    ];

    return (
        <div>
            <div style={{ padding: 'clamp(16px,3vw,32px)' }}>
                <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* Главный блок с информацией о системе */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card padding="clamp(24px,4vw,40px)">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                                <div style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: 16,
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(99,102,241,0.1)',
                                    boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
                                    flexShrink: 0
                                }}>
                                    <SingleFileViewer
                                        codeName="logo"
                                        mediaType="image"
                                        showTitle={false}
                                        showDownload={false}
                                        maxHeight="64px"
                                        maxWidth="64px"
                                    />
                                </div>
                                <div>
                                    <h2 style={{
                                        fontSize: 'clamp(20px,3vw,26px)',
                                        fontWeight: 800,
                                        margin: 0,
                                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent'
                                    }}>
                                        BlackList
                                    </h2>
                                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                                        Версия 1.0.0 • Система управления чёрными списками
                                    </div>
                                </div>
                            </div>

                            <Alert variant="info" icon="fa-solid fa-circle-info">
                                Система для централизованного управления чёрными списками, учёта инцидентов и анализа нарушений.
                            </Alert>

                            <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.8, marginTop: 16, marginBottom: 0 }}>
                                BlackList предоставляет полный набор инструментов для работы с информацией о нарушителях:
                                от создания и редактирования записей до сложной аналитики и формирования отчётов.
                            </p>
                        </Card>
                    </motion.div>

                    {/* Блок с ключевыми возможностями */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>
                            <i className="fa-solid fa-star" style={{ color: '#f59e0b', marginRight: 8 }} />
                            Ключевые возможности
                        </h3>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit,minmax(min(280px,100%),1fr))',
                            gap: 16
                        }}>
                            {features.map((feature, idx) => (
                                <FeatureCard key={idx} {...feature} />
                            ))}
                        </div>
                    </motion.div>

                    {/* Блок со статистикой системы */}
                    {/* <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>
                            <i className="fa-solid fa-chart-simple" style={{ color: '#10b981', marginRight: 8 }} />
                            Статистика системы
                        </h3>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit,minmax(min(180px,100%),1fr))',
                            gap: 16
                        }}>
                            <StatCard
                                icon="fa-triangle-exclamation"
                                number="150+"
                                label="Инцидентов обработано"
                                color="#6366f1"
                                delay={0.4}
                            />
                            <StatCard
                                icon="fa-users"
                                number="50+"
                                label="Активных пользователей"
                                color="#10b981"
                                delay={0.5}
                            />
                            <StatCard
                                icon="fa-building"
                                number="30+"
                                label="ПВЗ в системе"
                                color="#f59e0b"
                                delay={0.6}
                            />
                            <StatCard
                                icon="fa-shield"
                                number="99.9%"
                                label="Время доступности"
                                color="#3b82f6"
                                delay={0.7}
                            />
                        </div>
                    </motion.div> */}

                    {/* Блок с контактной информацией */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card>
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#f1f5f9' }}>
                                <i className="fa-solid fa-address-book" style={{ color: '#6366f1', marginRight: 8 }} />
                                Контакты
                            </h3>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit,minmax(min(240px,100%),1fr))',
                                gap: 14
                            }}>
                                <InfoBlock
                                    icon="fa-brands fa-telegram"
                                    label="Telegram"
                                    value="@123"
                                    color="#3b82f6"
                                />
                                <InfoBlock
                                    icon="fa-envelope"
                                    label="Email"
                                    value="***"
                                    color="#3b82f6"
                                />
                                {/* <InfoBlock
                                    icon="fa-phone"
                                    label="Телефон"
                                    value="+7 (800) 555-35-35"
                                    color="#10b981"
                                /> */}
                                <InfoBlock
                                    icon="fa-clock"
                                    label="Время работы"
                                    value="Пн-Пт, 10:00 - 18:00"
                                    color="#f59e0b"
                                />
                                {/* <InfoBlock
                                    icon="fa-location-dot"
                                    label="Офис"
                                    value="г. Москва"
                                    color="#ef4444"
                                /> */}
                            </div>

                            <Divider style={{ margin: '20px 0' }} />

                            <div style={{
                                display: 'flex',
                                gap: 12,
                                flexWrap: 'wrap',
                                justifyContent: 'center'
                            }}>
                                <Button
                                    variant="secondary"
                                    icon="fa-solid fa-envelope"
                                    onClick={() => window.location.href = 'mailto:***'}
                                >
                                    Написать на почту
                                </Button>
                                {/* <Button
                                    variant="secondary"
                                    icon="fa-phone"
                                    onClick={() => window.location.href = 'tel:+78005553535'}
                                >
                                    Позвонить
                                </Button> */}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Блок с технической информацией */}
                    {/* <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <Card>
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#f1f5f9' }}>
                                <i className="fa-solid fa-code" style={{ color: '#8b5cf6', marginRight: 8 }} />
                                Техническая информация
                            </h3>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit,minmax(min(200px,100%),1fr))',
                                gap: 16
                            }}>
                                <div>
                                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>
                                        Версия
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
                                        1.0.0
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>
                                        Дата релиза
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
                                        2024-01-15
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>
                                        Фреймворк
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
                                        React 18
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>
                                        Лицензия
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
                                        Proprietary
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div> */}

                    {/* Футер с копирайтом */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        style={{
                            textAlign: 'center',
                            padding: '20px 0',
                            fontSize: 13,
                            color: '#64748b'
                        }}
                    >
                        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <div style={{
                                width: 20,
                                height: 20,
                                borderRadius: 4,
                                overflow: 'hidden',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <SingleFileViewer
                                    codeName="logo"
                                    mediaType="image"
                                    showTitle={false}
                                    showDownload={false}
                                    maxHeight="20px"
                                    maxWidth="20px"
                                />
                            </div>
                            BlackList — Система управления чёрными списками
                        </div>
                        <div>
                            © {new Date().getFullYear()} Все права защищены
                        </div>
                    </motion.div>

                </div>
            </div>
        </div>
    );
}

export default AboutPage;