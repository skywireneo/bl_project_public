import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Button, Input, Select, Card, Badge, Modal, Alert, EmptyState
} from '../../../ui/UIComponents';

// ============================================================================
// КОМПОНЕНТ WHITELIST CARD
// ============================================================================

const WhitelistCard = ({
    listType,
    title,
    icon,
    color,
    data,
    loading,
    isEditing,
    tempItems,
    bulkText,
    mode,
    onLoad,
    onEdit,
    onCancel,
    onSave,
    onAddItem,
    onRemoveItem,
    onUpdateItem,
    onBulkTextChange,
    onGenerateTokens,
    generateTokenCount,
    onGenerateCountChange,
    delay = 0
}) => {
    // ИСПРАВЛЕНИЕ: Безопасная проверка на null/undefined и length
    const isLoaded = data !== null && data !== undefined;
    const isEmpty = isLoaded && (data?.length === 0);
    const itemCount = data?.length ?? 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
        >
            <Card
                padding={0}
                style={{
                    height: '100%',
                    borderLeft: `4px solid ${color}`,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <div style={{
                    height: 3,
                    background: `linear-gradient(90deg, ${color}, transparent)`
                }} />

                <div style={{
                    padding: '16px 20px',
                    background: `linear-gradient(135deg, ${color}15, transparent)`,
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <h4 style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 700,
                        color,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                    }}>
                        <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: `${color}20`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <i className={`fa-solid ${icon}`} style={{ fontSize: 14 }} />
                        </div>
                        {title}
                    </h4>
                    <Badge variant="default">{itemCount}</Badge>
                </div>

                <div style={{
                    padding: 18,
                    flex: 1,
                    maxHeight: 400,
                    overflowY: 'auto'
                }}>
                    {isEditing ? (
                        mode === 'bulk' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <p style={{
                                    fontSize: 12,
                                    color: '#94a3b8',
                                    margin: 0,
                                    lineHeight: 1.5,
                                    padding: '8px 12px',
                                    background: 'rgba(99, 102, 241, 0.08)',
                                    borderRadius: 8,
                                    borderLeft: '3px solid #6366f1'
                                }}>
                                    <i className="fa-solid fa-circle-info" style={{ marginRight: 6, color: '#a5b4fc' }} />
                                    Введите элементы списка, каждый с новой строки
                                </p>
                                <textarea
                                    value={bulkText}
                                    onChange={(e) => onBulkTextChange(e.target.value)}
                                    placeholder="Каждый элемент с новой строки..."
                                    style={{
                                        width: '100%',
                                        minHeight: 220,
                                        padding: 12,
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 10,
                                        color: '#e2e8f0',
                                        fontSize: 13,
                                        fontFamily: 'monospace',
                                        resize: 'vertical',
                                        outline: 'none',
                                        lineHeight: 1.6,
                                        boxSizing: 'border-box'
                                    }}
                                />

                                {listType === 'tokens' && (
                                    <>
                                        <Alert variant="warning">
                                            <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <i className="fa-solid fa-circle-info" />
                                                Токен должен содержать от 10 до 20 символов
                                            </div>
                                        </Alert>
                                        <div style={{
                                            display: 'flex',
                                            gap: 8,
                                            alignItems: 'center',
                                            padding: 12,
                                            background: 'rgba(0,0,0,0.25)',
                                            borderRadius: 10
                                        }}>
                                            <input
                                                type="number"
                                                value={generateTokenCount}
                                                onChange={(e) => onGenerateCountChange(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                                                min="1"
                                                max="100"
                                                style={{
                                                    width: 80,
                                                    padding: '8px 12px',
                                                    background: 'rgba(0,0,0,0.4)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: 8,
                                                    color: '#e2e8f0',
                                                    fontSize: 13
                                                }}
                                            />
                                            <Button
                                                variant="success"
                                                size="sm"
                                                onClick={() => onGenerateTokens(generateTokenCount)}
                                                icon="fa-wand-magic-sparkles"
                                                fullWidth
                                            >
                                                Сгенерировать
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {tempItems.map((item, index) => (
                                        <div key={index} style={{ display: 'flex', gap: 6 }}>
                                            <Input
                                                value={item}
                                                onChange={(e) => onUpdateItem(index, e.target.value)}
                                                placeholder={
                                                    listType === 'tokens'
                                                        ? `Токен ${index + 1} (10-20 символов)`
                                                        : `Элемент ${index + 1}`
                                                }
                                                style={{ fontSize: 13 }}
                                            />
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => onRemoveItem(index)}
                                                icon="fa-trash"
                                                style={{ padding: '10px 12px', flexShrink: 0 }}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {listType === 'tokens' && (
                                    <>
                                        <Alert variant="warning">
                                            <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <i className="fa-solid fa-circle-info" />
                                                Токен должен содержать от 10 до 20 символов
                                            </div>
                                        </Alert>
                                        <div style={{
                                            display: 'flex',
                                            gap: 8,
                                            alignItems: 'center',
                                            padding: 12,
                                            background: 'rgba(0,0,0,0.25)',
                                            borderRadius: 10
                                        }}>
                                            <input
                                                type="number"
                                                value={generateTokenCount}
                                                onChange={(e) => onGenerateCountChange(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                                                min="1"
                                                max="100"
                                                style={{
                                                    width: 80,
                                                    padding: '8px 12px',
                                                    background: 'rgba(0,0,0,0.4)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: 8,
                                                    color: '#e2e8f0',
                                                    fontSize: 13
                                                }}
                                            />
                                            <Button
                                                variant="success"
                                                size="sm"
                                                onClick={() => onGenerateTokens(generateTokenCount)}
                                                icon="fa-wand-magic-sparkles"
                                                fullWidth
                                            >
                                                Сгенерировать
                                            </Button>
                                        </div>
                                    </>
                                )}

                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={onAddItem}
                                    icon="fa-plus"
                                    fullWidth
                                >
                                    Добавить элемент
                                </Button>
                            </div>
                        )
                    ) : (
                        <>
                            {!isLoaded ? (
                                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                                    <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 36, color: '#f59e0b', marginBottom: 14 }} />
                                    <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 14 }}>
                                        Данные не загружены
                                    </p>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={onLoad}
                                        icon={loading ? 'fa-spinner fa-spin' : 'fa-sync'}
                                        disabled={loading}
                                        fullWidth
                                    >
                                        {loading ? 'Загрузка...' : 'Загрузить список'}
                                    </Button>
                                </div>
                            ) : isEmpty ? (
                                <EmptyState
                                    icon="fa-inbox"
                                    title="Список пуст"
                                    description="Нажмите «Редактировать» чтобы добавить элементы"
                                />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {data.map((item, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '10px 14px',
                                                background: 'rgba(255,255,255,0.03)',
                                                borderRadius: 8,
                                                fontSize: 12,
                                                gap: 10,
                                                border: '1px solid rgba(255,255,255,0.04)',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <span style={{
                                                color: '#e2e8f0',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                fontFamily: listType === 'tokens' ? 'monospace' : 'inherit',
                                                letterSpacing: listType === 'tokens' ? '0.5px' : 'normal',
                                                flex: 1
                                            }}>
                                                {item}
                                            </span>
                                            <Badge variant="default">{index + 1}</Badge>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div style={{
                    padding: 14,
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(0,0,0,0.25)'
                }}>
                    {isEditing ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Button
                                variant="success"
                                size="sm"
                                onClick={onSave}
                                icon="fa-check"
                                fullWidth
                            >
                                Сохранить
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={onCancel}
                                icon="fa-times"
                                style={{ padding: '8px 14px' }}
                            />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={onEdit}
                                icon="fa-pen"
                                fullWidth
                                disabled={!isLoaded}
                            >
                                Редактировать
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={onLoad}
                                icon={loading ? 'fa-spinner fa-spin' : 'fa-sync'}
                                disabled={loading || !isLoaded}
                                style={{ padding: '8px 14px' }}
                                title="Обновить"
                            />
                        </div>
                    )}
                </div>
            </Card>
        </motion.div>
    );
};

export default WhitelistCard;