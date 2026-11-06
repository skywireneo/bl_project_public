import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, Input, Button, Alert, FormField } from '../ui/UIComponents';
import { loginWithDonationCode } from '../../http/donationAPI';

export default function DonationLoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !email.includes('@')) {
            setError('Введите корректный email');
            return;
        }
        if (!code || code.replace(/-/g, '').length !== 9) {
            setError('Код должен быть в формате XXX-XXX-XXX');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await loginWithDonationCode(email.trim().toLowerCase(), code);
            localStorage.setItem('donation_token', result.access.token);
            navigate(`/donation/my?token=${result.access.token}`);
        } catch (e) {
            setError(e.response?.data?.message || 'Неверные данные для входа');
        } finally {
            setLoading(false);
        }
    };

    const formatCode = (value) => {
        const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const parts = [cleaned.slice(0, 3), cleaned.slice(3, 6), cleaned.slice(6, 9)];
        return parts.filter(p => p).join('-');
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ width: '100%', maxWidth: 450 }}
            >
                <Card padding={32}>
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <div style={{
                            width: 64,
                            height: 64,
                            borderRadius: 16,
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 28,
                            margin: '0 auto 16px',
                            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)'
                        }}>
                            <i className="fa-solid fa-key" />
                        </div>
                        <h1 style={{
                            fontSize: 22,
                            fontWeight: 800,
                            marginBottom: 8,
                            color: '#f1f5f9'
                        }}>
                            Доступ к плюшкам
                        </h1>
                        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
                            Введите email и кодовое слово из письма
                        </p>
                    </div>

                    {error && (
                        <Alert
                            variant="error"
                            icon="fa-circle-exclamation"
                            style={{ marginBottom: 20 }}
                            onClose={() => setError(null)}
                        >
                            {error}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit}>
                        <FormField label="Email" required>
                            <Input
                                icon="fa-envelope"
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </FormField>

                        <FormField
                            label="Кодовое слово"
                            required
                            hint="Формат: XXX-XXX-XXX (из письма)"
                            style={{ marginTop: 16 }}
                        >
                            <Input
                                icon="fa-key"
                                placeholder="ABC-DEF-123"
                                value={code}
                                onChange={(e) => setCode(formatCode(e.target.value))}
                                maxLength={11}
                                style={{ fontFamily: 'monospace', letterSpacing: '2px', textTransform: 'uppercase' }}
                            />
                        </FormField>

                        <Button
                            variant="primary"
                            fullWidth
                            type="submit"
                            loading={loading}
                            icon="fa-right-to-bracket"
                            style={{ marginTop: 24 }}
                        >
                            Войти
                        </Button>
                    </form>

                    <div style={{
                        marginTop: 24,
                        paddingTop: 20,
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        textAlign: 'center',
                        fontSize: 13,
                        color: '#94a3b8'
                    }}>
                        Нет кода?{' '}
                        <Link to="/donate" style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 600 }}>
                            Поддержите проект
                        </Link>
                        {' '}и получите доступ
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}