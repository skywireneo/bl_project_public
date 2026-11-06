import React, { useState } from 'react';
import { Modal, Button, Alert } from '../ui/UIComponents';

/**
 * Модалка с инструкцией для перехода на донатную платформу
 */
export default function DonationRedirectModal({ open, onClose, email, package: pkg, platformUrl }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const text = `Email: ${email}\nСумма: от ${pkg.min_amount}₽${pkg.max_amount ? ` до ${pkg.max_amount}₽` : ''}`;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Copy failed', e);
        }
    };

    const handleGoToPlatform = () => {
        window.open(platformUrl || 'https://donate.example.com', '_blank');
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Переход к оплате"
            size="md"
        >
            <div>
                <Alert variant="info" style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                        Для завершения доната вам нужно перейти на платёжную платформу
                        и указать там <strong>тот же email</strong>, что вы ввели у нас.
                    </div>
                </Alert>

                <div style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05))',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 20
                }}>
                    <div style={{
                        fontSize: 11,
                        color: '#a5b4fc',
                        marginBottom: 8,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: 600
                    }}>
                        📧 Ваш email
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: 8,
                        padding: '12px 16px'
                    }}>
                        <span style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: '#f1f5f9',
                            fontFamily: 'monospace'
                        }}>
                            {email}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopy}
                            icon={copied ? 'fa-check' : 'fa-copy'}
                            style={{ padding: '6px 10px', fontSize: 12 }}
                        >
                            {copied ? 'Скопировано' : 'Копировать'}
                        </Button>
                    </div>
                </div>

                {pkg && (
                    <div style={{
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 20
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                                    Выбранный пакет:
                                </div>
                                <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>
                                    {pkg.display_name}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                                    Сумма:
                                </div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: '#a5b4fc' }}>
                                    {pkg.max_amount
                                        ? `${pkg.min_amount}–${pkg.max_amount}₽`
                                        : `от ${pkg.min_amount}₽`}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <Alert variant="warning" style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                        <strong>Важно:</strong> После оплаты ваши плюшки будут активированы
                        в течение 24 часов. Вы получите письмо с персональной ссылкой и кодом доступа.
                    </div>
                </Alert>

                <div style={{
                    display: 'flex',
                    gap: 10,
                    justifyContent: 'flex-end'
                }}>
                    <Button variant="secondary" onClick={onClose}>
                        Отмена
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleGoToPlatform}
                        icon="fa-arrow-up-right-from-square"
                    >
                        Перейти к оплате
                    </Button>
                </div>
            </div>
        </Modal>
    );
}