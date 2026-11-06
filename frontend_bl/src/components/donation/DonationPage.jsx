import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, Badge, Button, Alert, EmptyState } from '../ui/UIComponents';
import DonationPackageCard from '../../components/donation/DonationPackageCard';
import DonationRedirectModal from '../../components/donation/DonationRedirectModal';
import { getDonationPackages, createDonationRequest } from '../../http/donationAPI';

export default function DonationPage() {
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState(null);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [creatingRequest, setCreatingRequest] = useState(false);
    const [showRedirect, setShowRedirect] = useState(false);

    useEffect(() => {
        document.title = 'Поддержать проект — BlacklistPVZ';
        loadPackages();
    }, []);

    const loadPackages = async () => {
        try {
            setLoading(true);
            const result = await getDonationPackages();
            setPackages(result.packages || []);
            setError(null);
        } catch (e) {
            setError('Не удалось загрузить пакеты. Попробуйте позже.');
        } finally {
            setLoading(false);
        }
    };

    const handlePackageSelect = async (pkg) => {
        if (!email || !email.includes('@')) {
            setEmailError('Сначала введите email ниже');
            document.getElementById('donation-email')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.getElementById('donation-email')?.focus();
            return;
        }

        setCreatingRequest(true);
        setEmailError(null);

        try {
            await createDonationRequest(email.trim().toLowerCase());
            setSelectedPackage(pkg);
            setShowRedirect(true);
        } catch (e) {
            setEmailError(e.response?.data?.message || 'Ошибка создания заявки');
        } finally {
            setCreatingRequest(false);
        }
    };

    return (
        <div style={{ padding: 'clamp(16px, 3vw, 32px)', maxWidth: 1200, margin: '0 auto' }}>
            {/* Приветственный баннер */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)',
                    borderRadius: 20,
                    border: '1px solid rgba(99,102,241,0.2)',
                    padding: 'clamp(24px, 4vw, 40px)',
                    marginBottom: 28,
                    position: 'relative',
                    overflow: 'hidden',
                    textAlign: 'center'
                }}
            >
                <div style={{
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: 200,
                    height: 200,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
                    pointerEvents: 'none'
                }} />

                <div style={{
                    width: 72,
                    height: 72,
                    borderRadius: 18,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 30,
                    margin: '0 auto 20px',
                    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)'
                }}>
                    <i className="fa-solid fa-heart" />
                </div>

                <h1 style={{
                    fontSize: 'clamp(24px, 4vw, 32px)',
                    fontWeight: 800,
                    marginBottom: 12,
                    color: '#f1f5f9'
                }}>
                    Поддержать проект
                </h1>
                <p style={{
                    fontSize: 15,
                    color: '#cbd5e1',
                    maxWidth: 640,
                    lineHeight: 1.7,
                    margin: '0 auto 20px'
                }}>
                    Ваши донаты помогают развивать систему учёта инцидентов
                    и поддерживают работу сервиса. В благодарность мы даём
                    доступ к <strong style={{ color: '#a5b4fc' }}>про-функциям</strong>.
                </p>

                <div style={{
                    display: 'flex',
                    gap: 12,
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    <Badge variant="info" icon="fa-magnifying-glass">Про-проверки</Badge>
                    <Badge variant="success" icon="fa-unlock">Без лимитов</Badge>
                    <Badge variant="warning" icon="fa-bolt">Приоритет</Badge>
                    <Badge variant="purple" icon="fa-clock-rotate-left">Расширенная история</Badge>
                </div>
            </motion.div>

            {/* Ввод email */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
            >
                <Card padding={24} style={{ marginBottom: 28 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginBottom: 16
                    }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: 'rgba(99, 102, 241, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <i className="fa-solid fa-envelope" style={{ color: '#818cf8', fontSize: 18 }} />
                        </div>
                        <div>
                            <h2 style={{
                                margin: 0,
                                fontSize: 17,
                                fontWeight: 700,
                                color: '#f1f5f9'
                            }}>
                                Шаг 1: Укажите ваш email
                            </h2>
                            <p style={{
                                margin: '2px 0 0 0',
                                fontSize: 12,
                                color: '#94a3b8'
                            }}>
                                На него придёт персональная ссылка для доступа к плюшкам
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 250 }}>
                            <input
                                id="donation-email"
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setEmailError(null);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: `1px solid ${emailError ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                                    borderRadius: 10,
                                    color: '#e2e8f0',
                                    fontSize: 14,
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                            {emailError && (
                                <div style={{
                                    fontSize: 12,
                                    color: '#f87171',
                                    marginTop: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}>
                                    <i className="fa-solid fa-circle-exclamation" />
                                    {emailError}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* Шаг 2: выбор пакета */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 20
                }}>
                    <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: 'rgba(16, 185, 129, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <i className="fa-solid fa-gift" style={{ color: '#34d399', fontSize: 18 }} />
                    </div>
                    <div>
                        <h2 style={{
                            margin: 0,
                            fontSize: 18,
                            fontWeight: 700,
                            color: '#f1f5f9'
                        }}>
                            Шаг 2: Выберите пакет
                        </h2>
                        <p style={{
                            margin: '2px 0 0 0',
                            fontSize: 13,
                            color: '#94a3b8'
                        }}>
                            Чем больше сумма — тем больше плюшек
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        color: '#94a3b8'
                    }}>
                        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 40, marginBottom: 16, color: '#6366f1' }} />
                        <div style={{ fontSize: 15 }}>Загрузка пакетов...</div>
                    </div>
                ) : error ? (
                    <Alert variant="error" icon="fa-circle-exclamation">
                        {error}
                        <Button variant="ghost" size="sm" onClick={loadPackages} style={{ marginLeft: 12 }}>
                            Повторить
                        </Button>
                    </Alert>
                ) : packages.length === 0 ? (
                    <EmptyState
                        icon="fa-inbox"
                        title="Пакеты недоступны"
                        description="В данный момент нет активных пакетов для доната"
                    />
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
                        gap: 20
                    }}>
                        {packages.map((pkg, idx) => (
                            <DonationPackageCard
                                key={pkg.package_id}
                                pkg={pkg}
                                onSelect={handlePackageSelect}
                                delay={idx * 0.08}
                                isPopular={pkg.code_name === 'pro'}
                            />
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Информация о процессе */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                style={{ marginTop: 40 }}
            >
                <Card padding={24}>
                    <h3 style={{
                        margin: '0 0 20px 0',
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                    }}>
                        <i className="fa-solid fa-circle-info" style={{ color: '#60a5fa' }} />
                        Как это работает
                    </h3>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))',
                        gap: 16
                    }}>
                        {[
                            { icon: 'fa-envelope', color: '#6366f1', title: '1. Укажите email', desc: 'Введите ваш email выше' },
                            { icon: 'fa-gift', color: '#10b981', title: '2. Выберите пакет', desc: 'Нажмите "Поддержать"' },
                            { icon: 'fa-credit-card', color: '#f59e0b', title: '3. Оплатите на платформе', desc: 'Тот же email обязателен' },
                            { icon: 'fa-key', color: '#ef4444', title: '4. Получите доступ', desc: 'Письмо со ссылкой и кодом' }
                        ].map((step, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                gap: 12,
                                padding: 12,
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: 10
                            }}>
                                <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 8,
                                    background: `${step.color}20`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: step.color,
                                    fontSize: 14,
                                    flexShrink: 0
                                }}>
                                    <i className={`fa-solid ${step.icon}`} />
                                </div>
                                <div>
                                    <div style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: '#f1f5f9',
                                        marginBottom: 2
                                    }}>
                                        {step.title}
                                    </div>
                                    <div style={{
                                        fontSize: 12,
                                        color: '#94a3b8'
                                    }}>
                                        {step.desc}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </motion.div>

            {/* FAQ */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                style={{ marginTop: 24 }}
            >
                <Card padding={24}>
                    <h3 style={{
                        margin: '0 0 20px 0',
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                    }}>
                        <i className="fa-solid fa-circle-question" style={{ color: '#fbbf24' }} />
                        Частые вопросы
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {[
                            {
                                q: 'Сколько действуют плюшки?',
                                a: 'Срок зависит от пакета (от 1 до 6 месяцев). После истечения проверки сгорают.'
                            },
                            {
                                q: 'Что если я задонатю повторно?',
                                a: 'Проверки складываются, а срок действия продлевается на срок нового пакета.'
                            },
                            {
                                q: 'Как быстро активируются плюшки?',
                                a: 'Обычно в течение 24 часов после оплаты. Вы получите письмо с доступом.'
                            },
                            {
                                q: 'Что если я потерял ссылку?',
                                a: 'Используйте кодовое слово из письма для входа, или обратитесь в поддержку.'
                            }
                        ].map((faq, idx) => (
                            <div key={idx} style={{
                                padding: '12px 16px',
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: 10,
                                borderLeft: '3px solid #6366f1'
                            }}>
                                <div style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: '#f1f5f9',
                                    marginBottom: 6
                                }}>
                                    {faq.q}
                                </div>
                                <div style={{
                                    fontSize: 13,
                                    color: '#94a3b8',
                                    lineHeight: 1.5
                                }}>
                                    {faq.a}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </motion.div>

            <DonationRedirectModal
                open={showRedirect}
                onClose={() => {
                    setShowRedirect(false);
                    setSelectedPackage(null);
                }}
                email={email}
                package={selectedPackage}
                platformUrl={process.env.REACT_APP_DONATION_PLATFORM_URL}
            />
        </div>
    );
}