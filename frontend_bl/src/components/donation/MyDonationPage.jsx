import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, Badge, Button, Alert, EmptyState } from '../ui/UIComponents';
import { getMyDonation } from '../../http/donationAPI';

export default function MyDonationPage() {
    const [searchParams] = useSearchParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        document.title = 'Мои плюшки — BlacklistPVZ';
        const token = searchParams.get('token') || localStorage.getItem('donation_token');
        if (token) {
            loadData(token);
            localStorage.setItem('donation_token', token);
        } else {
            setLoading(false);
            setError('NO_TOKEN');
        }
    }, [searchParams]);

    const loadData = async (token) => {
        try {
            setLoading(true);
            const result = await getMyDonation(token);
            setData(result);
            setError(null);
        } catch (e) {
            setError(e.response?.data?.message || e.message || 'Не удалось загрузить данные');
            localStorage.removeItem('donation_token');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 40, marginBottom: 16, color: '#6366f1' }} />
                <div>Загрузка данных...</div>
            </div>
        );
    }

    if (error === 'NO_TOKEN') {
        return (
            <div style={{ padding: 40 }}>
                <Card padding={40}>
                    <EmptyState
                        icon="fa-key"
                        title="Доступ не найден"
                        description="Перейдите по персональной ссылке из письма или войдите с помощью кодового слова."
                        action={
                            <Link to="/donation/login" style={{ textDecoration: 'none' }}>
                                <Button variant="primary" icon="fa-right-to-bracket">
                                    Войти по кодовому слову
                                </Button>
                            </Link>
                        }
                    />
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: 40 }}>
                <Card padding={40}>
                    <EmptyState
                        icon="fa-circle-exclamation"
                        title="Ошибка доступа"
                        description={error}
                        action={
                            <Link to="/donation/login" style={{ textDecoration: 'none' }}>
                                <Button variant="primary" icon="fa-right-to-bracket">
                                    Войти по кодовому слову
                                </Button>
                            </Link>
                        }
                    />
                </Card>
            </div>
        );
    }

    const { activation, perks, stats, email } = data;
    const activePerks = perks.filter(p => p.is_active);
    const inactivePerks = perks.filter(p => !p.is_active);

    return (
        <div style={{ padding: 'clamp(16px, 3vw, 32px)', maxWidth: 1000, margin: '0 auto' }}>
            {/* Приветствие */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.1) 100%)',
                    borderRadius: 20,
                    border: '1px solid rgba(16,185,129,0.2)',
                    padding: 'clamp(24px, 4vw, 36px)',
                    marginBottom: 28,
                    textAlign: 'center'
                }}
            >
                <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 28,
                    margin: '0 auto 16px',
                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)'
                }}>
                    <i className="fa-solid fa-heart" />
                </div>
                <h1 style={{
                    fontSize: 'clamp(22px, 3vw, 28px)',
                    fontWeight: 800,
                    marginBottom: 8,
                    color: '#f1f5f9'
                }}>
                    Спасибо за поддержку!
                </h1>
                <p style={{ fontSize: 14, color: '#cbd5e1', margin: 0 }}>
                    {email}
                </p>
            </motion.div>

            {/* Активная подписка или пусто */}
            {!activation ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Card padding={32}>
                        <EmptyState
                            icon="fa-inbox"
                            title="Активных подписок нет"
                            description="Поддержите проект, чтобы получить доступ к про-функциям"
                            action={
                                <Link to="/donate" style={{ textDecoration: 'none' }}>
                                    <Button variant="primary" icon="fa-heart">
                                        Поддержать проект
                                    </Button>
                                </Link>
                            }
                        />
                    </Card>
                </motion.div>
            ) : (
                <>
                    {/* Статы */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
                        gap: 16,
                        marginBottom: 24
                    }}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <Card padding={20}>
                                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <i className="fa-solid fa-magnifying-glass" style={{ color: '#6366f1' }} />
                                    Проверок осталось
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9' }}>
                                    {activation.checks_remaining}
                                    <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500, marginLeft: 4 }}>
                                        / {activation.checks_granted}
                                    </span>
                                </div>
                                <div style={{
                                    marginTop: 8,
                                    height: 6,
                                    background: 'rgba(0,0,0,0.3)',
                                    borderRadius: 3,
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${(activation.checks_remaining / activation.checks_granted) * 100}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                        transition: 'width 0.3s'
                                    }} />
                                </div>
                            </Card>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                            <Card padding={20}>
                                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <i className="fa-solid fa-calendar" style={{ color: '#f59e0b' }} />
                                    Дней осталось
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9' }}>
                                    {activation.days_remaining}
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                                    до {new Date(activation.expires_at).toLocaleDateString('ru-RU')}
                                </div>
                            </Card>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <Card padding={20}>
                                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <i className="fa-solid fa-coins" style={{ color: '#fbbf24' }} />
                                    Всего задонатили
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9' }}>
                                    {stats.total_donated.toLocaleString('ru-RU')}₽
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                                    Спасибо за поддержку!
                                </div>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Пакет */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                    >
                        <Card padding={24} style={{ marginBottom: 24 }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 16,
                                flexWrap: 'wrap',
                                gap: 12
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontSize: 18
                                    }}>
                                        <i className="fa-solid fa-crown" />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>
                                            Текущий пакет: {activation.package.name}
                                        </h3>
                                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                                            Активен до {new Date(activation.expires_at).toLocaleDateString('ru-RU')} включительно
                                        </div>
                                    </div>
                                </div>
                                <Badge variant="success" icon="fa-circle-check">Активен</Badge>
                            </div>

                            <Alert variant="warning" icon="fa-triangle-exclamation">
                                <div style={{ fontSize: 13 }}>
                                    Неиспользованные проверки и плюшки <strong>сгорят</strong> после{' '}
                                    {new Date(activation.expires_at).toLocaleDateString('ru-RU')}.
                                    Поддержите проект снова, чтобы продлить действие.
                                </div>
                            </Alert>
                        </Card>
                    </motion.div>

                    {/* Активные плюшки */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h3 style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: '#f1f5f9',
                            marginBottom: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10
                        }}>
                            <i className="fa-solid fa-bolt" style={{ color: '#f59e0b' }} />
                            Ваши плюшки
                        </h3>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
                            gap: 12,
                            marginBottom: 24
                        }}>
                            {activePerks.map((perk, idx) => (
                                <motion.div
                                    key={perk.perk_id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + idx * 0.05 }}
                                >
                                    <Card padding={16} style={{
                                        border: `1px solid ${perk.color || '#10b981'}40`,
                                        borderLeft: `4px solid ${perk.color || '#10b981'}`
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                            <div style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 8,
                                                background: `${perk.color || '#10b981'}20`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: perk.color || '#10b981',
                                                fontSize: 16,
                                                flexShrink: 0
                                            }}>
                                                <i className={`fa-solid ${perk.icon || 'fa-check'}`} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: 4
                                                }}>
                                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>
                                                        {perk.display_name}
                                                    </div>
                                                    <Badge variant="success" icon="fa-check">✓</Badge>
                                                </div>
                                                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>
                                                    {perk.description}
                                                </div>
                                                {perk.active_data && (
                                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                                                        до {new Date(perk.active_data.expires_at).toLocaleDateString('ru-RU')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Недоступные плюшки */}
                    {inactivePerks.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <h3 style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: '#94a3b8',
                                marginBottom: 12,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}>
                                <i className="fa-solid fa-lock" />
                                Доступно в более дорогих пакетах
                            </h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
                                gap: 12,
                                marginBottom: 24,
                                opacity: 0.6
                            }}>
                                {inactivePerks.map(perk => (
                                    <Card key={perk.perk_id} padding={14} style={{
                                        background: 'rgba(15,17,23,0.5)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: 8,
                                                background: 'rgba(100,116,139,0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#64748b',
                                                fontSize: 14
                                            }}>
                                                <i className={`fa-solid ${perk.icon || 'fa-lock'}`} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>
                                                    {perk.display_name}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#64748b' }}>
                                                    {perk.description}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Статистика */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                    >
                        <Card padding={24}>
                            <h3 style={{
                                margin: '0 0 16px 0',
                                fontSize: 16,
                                fontWeight: 700,
                                color: '#f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10
                            }}>
                                <i className="fa-solid fa-chart-line" style={{ color: '#6366f1' }} />
                                Ваша статистика
                            </h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: 16
                            }}>
                                <div>
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Всего получено</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>
                                        {stats.total_granted}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Использовано</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>
                                        {stats.total_spent}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Всего донатов</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: '#a5b4fc' }}>
                                        {stats.total_donated.toLocaleString('ru-RU')}₽
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </>
            )}

            {/* Подвал */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{
                    textAlign: 'center',
                    marginTop: 40,
                    padding: 20,
                    color: '#64748b',
                    fontSize: 12
                }}
            >
                <p>
                    Есть вопросы? Напишите нам на{' '}
                    <a href={`mailto:${process.env.REACT_APP_SUPPORT_EMAIL || '***'}`}
                        style={{ color: '#a5b4fc', textDecoration: 'none' }}>
                        {process.env.REACT_APP_SUPPORT_EMAIL || '***'}
                    </a>
                </p>
                <Link to="/donate" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 12 }}>
                    ← Вернуться на страницу доната
                </Link>
            </motion.div>
        </div>
    );
}