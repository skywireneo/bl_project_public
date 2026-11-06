import React, { useState } from 'react';
import { Modal, Input, Button, Alert, FormField } from '../ui/UIComponents';
import { createDonationRequest } from '../../http/donationAPI';
import DonationRedirectModal from './DonationRedirectModal';

/**
 * Быстрая модалка доната из меню (один шаг — только email)
 */
export default function DonationModal({ open, onClose }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showRedirect, setShowRedirect] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState(null);

    const handleSubmit = async () => {
        if (!email || !email.includes('@')) {
            setError('Введите корректный email');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await createDonationRequest(email.trim().toLowerCase());
            // Показываем модалку перехода (выбираем базовый пакет)
            setSelectedPackage({
                display_name: 'Поддержка проекта',
                min_amount: 300,
                max_amount: null
            });
            setShowRedirect(true);
        } catch (e) {
            setError(e.response?.data?.message || e.message || 'Ошибка создания заявки');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setError(null);
        setShowRedirect(false);
        setSelectedPackage(null);
        onClose();
    };

    return (
        <>
            <Modal
                open={open && !showRedirect}
                onClose={handleClose}
                title="Поддержать проект"
                size="sm"
            >
                <div>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: 12,
                        padding: 18,
                        marginBottom: 20,
                        textAlign: 'center'
                    }}>
                        <i className="fa-solid fa-heart" style={{
                            fontSize: 36,
                            color: '#a5b4fc',
                            marginBottom: 12,
                            display: 'block'
                        }} />
                        <h3 style={{
                            margin: '0 0 8px 0',
                            fontSize: 17,
                            fontWeight: 700,
                            color: '#f1f5f9'
                        }}>
                            Спасибо за поддержку!
                        </h3>
                        <p style={{
                            margin: 0,
                            fontSize: 13,
                            color: '#94a3b8',
                            lineHeight: 1.5
                        }}>
                            Ваш донат поможет развитию проекта и даст вам доступ к про-функциям.
                        </p>
                    </div>

                    {error && (
                        <Alert variant="error" style={{ marginBottom: 16 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    <FormField
                        label="Ваш email"
                        required
                    >
                        <Input
                            icon="fa-envelope"
                            type="email"
                            placeholder="***"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            error={error}
                        />
                    </FormField>

                    <p style={{
                        fontSize: 12,
                        color: '#64748b',
                        marginTop: 8,
                        marginBottom: 20,
                        lineHeight: 1.5
                    }}>
                        На этот email придёт персональная ссылка для доступа к плюшкам
                        после подтверждения платежа.
                    </p>

                    <div style={{
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 20,
                        fontSize: 12,
                        color: '#fbbf24',
                        lineHeight: 1.5
                    }}>
                        💡 <strong>Минимальная сумма доната: 300₽</strong>.
                        Для просмотра всех пакетов{' '}
                        <a href="/donate" onClick={(e) => { e.preventDefault(); handleClose(); window.location.href = '/donate'; }}
                            style={{ color: '#fbbf24', textDecoration: 'underline' }}>
                            перейдите на страницу
                        </a>.
                    </div>

                    <div style={{
                        display: 'flex',
                        gap: 10,
                        justifyContent: 'flex-end'
                    }}>
                        <Button variant="secondary" onClick={handleClose}>
                            Отмена
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSubmit}
                            loading={loading}
                            icon="fa-heart"
                        >
                            Продолжить
                        </Button>
                    </div>
                </div>
            </Modal>

            <DonationRedirectModal
                open={showRedirect}
                onClose={handleClose}
                email={email}
                package={selectedPackage}
                platformUrl={process.env.REACT_APP_DONATION_PLATFORM_URL}
            />
        </>
    );
}