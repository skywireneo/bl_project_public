import React from 'react';
import { motion } from 'framer-motion';
import { Card, Badge, Button } from '../ui/UIComponents';

/**
 * Карточка пакета донатов
 * @param {Object} pkg - данные пакета
 * @param {Function} onSelect - callback при выборе пакета
 * @param {number} delay - задержка анимации
 * @param {boolean} isPopular - пометить как "популярный"
 */
export default function DonationPackageCard({ pkg, onSelect, delay = 0, isPopular = false }) {
    const {
        code_name,
        display_name,
        description,
        min_amount,
        max_amount,
        checks_granted,
        duration_days,
        icon,
        color,
        perks = []
    } = pkg;

    const priceLabel = max_amount
        ? `${min_amount}–${max_amount}₽`
        : `от ${min_amount}₽`;

    const durationLabel = duration_days === 30
        ? '1 месяц'
        : duration_days === 60
            ? '2 месяца'
            : duration_days === 90
                ? '3 месяца'
                : duration_days === 180
                    ? '6 месяцев'
                    : `${duration_days} дней`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            style={{ position: 'relative' }}
        >
            {isPopular && (
                <div style={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                    color: '#fff',
                    padding: '4px 14px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    zIndex: 2,
                    whiteSpace: 'nowrap'
                }}>
                    ПОПУЛЯРНЫЙ
                </div>
            )}

            <Card
                hoverable
                padding={0}
                style={{
                    height: '100%',
                    border: `1px solid ${color}40`,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Цветная полоска сверху */}
                <div style={{
                    height: 4,
                    background: `linear-gradient(90deg, ${color}, ${color}99)`
                }} />

                <div style={{ padding: 24, display: 'flex', flexDirection: 'column', flex: 1 }}>
                    {/* Заголовок */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginBottom: 16
                    }}>
                        <div style={{
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            background: `linear-gradient(135deg, ${color}, ${color}99)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 22,
                            boxShadow: `0 4px 16px ${color}40`
                        }}>
                            <i className={`fa-solid ${icon || 'fa-gift'}`} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{
                                margin: 0,
                                fontSize: 18,
                                fontWeight: 700,
                                color: '#f1f5f9'
                            }}>
                                {display_name}
                            </h3>
                            <div style={{
                                fontSize: 22,
                                fontWeight: 800,
                                color: color,
                                letterSpacing: -0.5,
                                marginTop: 4
                            }}>
                                {priceLabel}
                            </div>
                        </div>
                    </div>

                    {description && (
                        <p style={{
                            color: '#94a3b8',
                            fontSize: 13,
                            marginBottom: 16,
                            lineHeight: 1.5
                        }}>
                            {description}
                        </p>
                    )}

                    {/* Что даёт пакет */}
                    <div style={{
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 16
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: 10
                        }}>
                            <div>
                                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                                    Проверок
                                </div>
                                <div style={{
                                    fontSize: 20,
                                    fontWeight: 800,
                                    color: '#f1f5f9'
                                }}>
                                    {checks_granted}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                                    Срок
                                </div>
                                <div style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: '#f1f5f9',
                                    marginTop: 4
                                }}>
                                    {durationLabel}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Плюшки */}
                    {perks.length > 0 && (
                        <div style={{
                            marginBottom: 20,
                            flex: 1
                        }}>
                            <div style={{
                                fontSize: 11,
                                color: '#64748b',
                                marginBottom: 8,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                fontWeight: 600
                            }}>
                                Включено:
                            </div>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6
                            }}>
                                {perks.map(perk => (
                                    <div key={perk.perk_id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        fontSize: 13,
                                        color: '#cbd5e1'
                                    }}>
                                        <i
                                            className={`fa-solid ${perk.icon || 'fa-check'}`}
                                            style={{ color: perk.color || '#10b981', fontSize: 12 }}
                                        />
                                        {perk.display_name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Кнопка */}
                    <Button
                        variant="primary"
                        fullWidth
                        onClick={() => onSelect(pkg)}
                        icon="fa-heart"
                        style={{
                            background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                            marginTop: 'auto'
                        }}
                    >
                        Поддержать
                    </Button>
                </div>
            </Card>
        </motion.div>
    );
}