import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';

/**
 * Карточка реферальной ссылки
 */
const ReferralLinkCard = ({ url, totalReferrals }) => {
    const [copied, setCopied] = useState(false);
    const { showToast } = useToast();
    
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            showToast?.('Ссылка скопирована в буфер обмена', 'success');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            showToast?.('Не удалось скопировать ссылку', 'error');
        }
    };
    
    const handleShare = (platform) => {
        const text = `Присоединяйся ко мне на BlacklistPVZ! Регистрация по моей ссылке:`;
        let shareUrl = '';
        
        switch (platform) {
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
                break;
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
                break;
            case 'vk':
                shareUrl = `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
                break;
            default:
                return;
        }
        
        window.open(shareUrl, '_blank', 'width=600,height=400');
    };
    
    return (
        <div
            style={{
                padding: '20px',
                background: 'rgba(30, 30, 47, 0.88)',
                backdropFilter: 'blur(14px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
        >
            <h3 style={{
                fontSize: '1.1rem',
                fontWeight: 600,
                marginBottom: '12px',
                color: '#a0f0ff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <i className="fa-solid fa-users-rays"></i>
                Реферальная ссылка
            </h3>
            
            {totalReferrals > 0 && (
                <div style={{
                    fontSize: '0.85rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    marginBottom: '12px'
                }}>
                    <i className="fa-solid fa-chart-line" style={{ marginRight: '4px' }}></i>
                    Пригласил пользователей: <strong style={{ color: '#a0f0ff' }}>{totalReferrals}</strong>
                </div>
            )}
            
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '12px'
            }}>
                <input
                    type="text"
                    value={url}
                    readOnly
                    style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        color: 'white',
                        fontSize: '0.9rem',
                        outline: 'none'
                    }}
                />
                <button
                    onClick={handleCopy}
                    style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        background: copied ? 'rgba(104, 211, 145, 0.3)' : 'linear-gradient(135deg, #00838d 0%, #00b2ff 100%)',
                        color: 'white',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                    {copied ? 'Скопировано!' : 'Копировать'}
                </button>
            </div>
            
            <div style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'center'
            }}>
                <button
                    onClick={() => handleShare('telegram')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: '1px solid rgba(0, 178, 255, 0.5)',
                        background: 'rgba(0, 178, 255, 0.1)',
                        color: '#00B2FF',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <i className="fa-brands fa-telegram"></i>
                    Telegram
                </button>
                <button
                    onClick={() => handleShare('whatsapp')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: '1px solid rgba(37, 211, 102, 0.5)',
                        background: 'rgba(37, 211, 102, 0.1)',
                        color: '#25D366',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <i className="fa-brands fa-whatsapp"></i>
                    WhatsApp
                </button>
                <button
                    onClick={() => handleShare('vk')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: '1px solid rgba(0, 119, 255, 0.5)',
                        background: 'rgba(0, 119, 255, 0.1)',
                        color: '#0077FF',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <i className="fa-brands fa-vk"></i>
                    VK
                </button>
            </div>
        </div>
    );
};

export default ReferralLinkCard;
