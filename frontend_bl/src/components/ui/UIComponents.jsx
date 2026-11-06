import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const Button = React.forwardRef(({ children, variant = 'primary', size = 'md', icon, loading = false, disabled = false, fullWidth = false, type = 'button', onClick, style = {} }, ref) => {
    const variants = {
        primary: { bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none' },
        secondary: { bg: 'rgba(255,255,255,0.06)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' },
        neutral: { bg: 'rgba(255,255,255,0.06)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' },
        danger: { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none' },
        success: { bg: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none' },
        warning: { bg: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', border: 'none' },
        ghost: { bg: 'transparent', color: '#94a3b8', border: 'none' },
        premium: { bg: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff', border: 'none' },
    };
    const sizes = { sm: { padding: '6px 12px', fontSize: 12 }, md: { padding: '10px 20px', fontSize: 14 }, lg: { padding: '12px 24px', fontSize: 15 } };
    const v = variants[variant], s = sizes[size];
    return (
        <button ref={ref} type={type} disabled={disabled || loading} onClick={onClick}
            style={{ background: v.bg, color: v.color, border: v.border, ...s, borderRadius: 10, fontWeight: 600, cursor: disabled || loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: disabled ? 0.5 : 1, width: fullWidth ? '100%' : 'auto', fontFamily: 'inherit', ...style }}>
            {loading ? <i className="fa-solid fa-spinner fa-spin" /> : icon && <i className={icon} />}
            {children}
        </button>
    );
});

export const Input = React.forwardRef(({ icon, error, style = {}, ...props }, ref) => (
    <div style={{ position: 'relative', width: '100%' }}>
        {icon && <i className={`fa-solid ${icon}`} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 14, pointerEvents: 'none' }} />}
        <input ref={ref} style={{ width: '100%', padding: icon ? '10px 14px 10px 40px' : '10px 14px', background: 'rgba(0,0,0,0.3)', boxSizing: 'border-box', border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, color: '#e2e8f0', fontSize: 14, outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit', ...style }} {...props} />
    </div>
));

export const Select = React.forwardRef(({ error, style = {}, children, ...props }, ref) => (
    <select ref={ref} style={{ width: '100%', padding: '10px 36px 10px 14px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.3)', border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, color: '#e2e8f0', fontSize: 14, outline: 'none', appearance: 'none', fontFamily: 'inherit', cursor: 'pointer', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', ...style }} {...props}>
        {children}
    </select>
));

export const Textarea = React.forwardRef(({ error, style = {}, ...props }, ref) => (
    <textarea ref={ref} style={{ width: '100%', padding: '10px 14px', boxSizing: 'border-box', background: 'rgba(0,0,0,0.3)', border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, color: '#e2e8f0', fontSize: 14, outline: 'none', resize: 'vertical', minHeight: 100, fontFamily: 'inherit', ...style }} {...props} />
));

export const FormField = ({ label, required = false, error, hint, children, style = {} }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
        {label && <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label} {required && <span style={{ color: '#ef4444' }}>*</span>}</label>}
        {children}
        {hint && !error && <div style={{ fontSize: 12, color: '#64748b' }}>{hint}</div>}
        {error && <div style={{ fontSize: 12, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}><i className="fa-solid fa-circle-exclamation" /> {error}</div>}
    </div>
);

export const Card = ({ children, style = {}, padding = 24, hoverable = false, onClick }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <div onClick={onClick} onMouseEnter={() => hoverable && setHovered(true)} onMouseLeave={() => hoverable && setHovered(false)}
            style={{ background: 'linear-gradient(135deg,#1e2030 0%,#1a1d2e 100%)', borderRadius: 16, border: `1px solid ${hovered ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`, padding, transition: 'all 0.3s', cursor: onClick ? 'pointer' : 'default', boxShadow: hovered ? '0 8px 32px rgba(99,102,241,0.1)' : 'none', ...style }}>
            {children}
        </div>
    );
};

export const Badge = ({ children, variant = 'default', icon }) => {
    const variants = {
        default: { bg: 'rgba(255,255,255,0.08)', color: '#94a3b8' },
        danger: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
        warning: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
        success: { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
        info: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
        purple: { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa' },
    };
    const v = variants[variant] || variants.default;
    return <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, background: v.bg, color: v.color, whiteSpace: 'nowrap' }}>{icon && <i className={`fa-solid ${icon}`} style={{ fontSize: 10 }} />}{children}</span>;
};

export const Modal = ({ open, onClose, title, children, footer, size = 'md' }) => {
    const sizes = { sm: 420, md: 560, lg: 720, xl: 900 };
    return (
        <AnimatePresence>
            {open && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}
                        style={{ background: '#1a1d2e', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', maxWidth: sizes[size], width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {title && (
                            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>{title}</h3>
                                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16, padding: 4 }}><i className="fa-solid fa-xmark" /></button>
                            </div>
                        )}
                        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>{children}</div>
                        {footer && <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>{footer}</div>}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export const Alert = ({ variant = 'info', icon, title, children, onClose }) => {
    const variants = {
        info: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', color: '#60a5fa', icon: 'fa-circle-info' },
        success: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', color: '#34d399', icon: 'fa-circle-check' },
        warning: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', color: '#fbbf24', icon: 'fa-triangle-exclamation' },
        error: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#f87171', icon: 'fa-circle-xmark' },
        // Added danger variant to match standard UI libraries
        danger: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#f87171', icon: 'fa-circle-xmark' },
    };

    // Fallback to 'info' if an unknown variant is passed
    const v = variants[variant] || variants.info;

    return (
        <div style={{ background: v.bg, border: `1px solid ${v.border}`, borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', color: v.color, fontSize: 14 }}>
            <i className={`fa-solid ${icon || v.icon}`} style={{ marginTop: 2 }} />
            <div style={{ flex: 1 }}>
                {title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>}
                <div style={{ opacity: 0.9 }}>{children}</div>
            </div>
            {onClose && (
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7 }}>
                    <i className="fa-solid fa-xmark" />
                </button>
            )}
        </div>
    );
};

export const EmptyState = ({ icon = 'fa-inbox', title, description, action }) => (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
        <i className={`fa-solid ${icon}`} style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>{title}</div>
        {description && <div style={{ fontSize: 13, marginBottom: 16 }}>{description}</div>}
        {action}
    </div>
);

export const Avatar = ({ name, size = 42, variant = 'default' }) => {
    const initials = name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?';
    const bg = variant === 'danger' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : variant === 'success' ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)';
    return <div style={{ width: size, height: size, borderRadius: size * 0.25, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>;
};

export const Divider = ({ style = {} }) => <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '16px 0', ...style }} />;

export const StatCard = ({ icon, number, label, color, delay = 0, trend }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}>
        <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <i className={`fa-solid ${icon}`} style={{ fontSize: 24, color }} />
                {trend !== undefined && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: trend >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className={`fa-solid fa-arrow-${trend >= 0 ? 'up' : 'down'}`} style={{ fontSize: 10 }} />
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: -1 }}>{number}</div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500, marginTop: 4 }}>{label}</div>
        </Card>
    </motion.div>
);

export const Toggle = ({ checked, onChange, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => onChange(!checked)} style={{ width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', background: checked ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'all 0.2s' }}>
            <div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute', top: 3, left: checked ? 25 : 3, transition: 'left 0.2s' }} />
        </button>
        {label && <span style={{ fontSize: 14, color: '#e2e8f0' }}>{label}</span>}
    </div>
);

export const PageHeader = ({ title, subtitle, actions, breadcrumb }) => (
    <div style={{ padding: 'clamp(16px,2.5vw,24px) clamp(16px,3vw,32px)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', background: 'rgba(15,17,23,0.8)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ minWidth: 0 }}>
            {breadcrumb && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>{breadcrumb}</div>}
            <h1 style={{ fontSize: 'clamp(18px,2.5vw,22px)', fontWeight: 700, color: '#f1f5f9' }}>{title}</h1>
            {subtitle && <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{subtitle}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
);