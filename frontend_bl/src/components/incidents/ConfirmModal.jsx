import React from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/UIComponents"; // Укажи правильный путь к твоим UI-компонентам

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    variant = 'warning',
    confirmText = 'Подтвердить',
    isLoading = false
}) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            bg: 'linear-gradient(145deg, #1e293b, #0f172a)',
            border: 'rgba(239,68,68,0.3)',
            iconBg: 'linear-gradient(135deg, #ef4444, #dc2626)',
            iconColor: '#fff',
            icon: 'fa-triangle-exclamation',
            btnVariant: 'danger'
        },
        warning: {
            bg: 'linear-gradient(145deg, #1e293b, #0f172a)',
            border: 'rgba(234,179,8,0.3)',
            iconBg: 'linear-gradient(135deg, #eab308, #ca8a04)',
            iconColor: '#fff',
            icon: 'fa-triangle-exclamation',
            btnVariant: 'warning'
        },
        success: {
            bg: 'linear-gradient(145deg, #1e293b, #0f172a)',
            border: 'rgba(34,197,94,0.3)',
            iconBg: 'linear-gradient(135deg, #22c55e, #16a34a)',
            iconColor: '#fff',
            icon: 'fa-circle-check',
            btnVariant: 'success'
        },
        neutral: {
            bg: 'linear-gradient(145deg, #1e293b, #0f172a)',
            border: 'rgba(99,102,241,0.3)',
            iconBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            iconColor: '#fff',
            icon: 'fa-circle-question',
            btnVariant: 'primary'
        }
    };

    const style = variantStyles[variant] || variantStyles.warning;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(10px)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20
            }}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: style.bg,
                    border: `1px solid ${style.border}`,
                    borderRadius: 20,
                    padding: 32,
                    maxWidth: 480,
                    width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                }}
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring' }}
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: style.iconBg,
                        margin: '0 auto 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 10px 30px ${style.border}`
                    }}
                >
                    <i className={`fa-solid ${style.icon}`} style={{ color: style.iconColor, fontSize: 28 }} />
                </motion.div>
                <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>
                    {title}
                </h2>
                {description && (
                    <div style={{ color: '#94a3b8', margin: '0 0 24px', fontSize: 14, lineHeight: 1.6, textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
                        {description}
                    </div>
                )}
                <div style={{ display: 'flex', gap: 12 }}>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        fullWidth
                        disabled={isLoading}
                    >
                        Отмена
                    </Button>
                    <Button
                        variant={style.btnVariant}
                        onClick={onConfirm}
                        fullWidth
                        loading={isLoading}
                    >
                        {confirmText}
                    </Button>
                </div>
            </motion.div>
        </motion.div>
    );
}