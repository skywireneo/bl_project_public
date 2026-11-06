import React from "react";

export default function ActiveBadge({ active, size = 'sm' }) {
    if (active === undefined || active === null) return null;

    const isActive = active === true || active === 'true';
    const fontSize = size === 'xs' ? 10 : 11;
    const paddingV = size === 'xs' ? '2px' : '3px';
    const paddingH = size === 'xs' ? '6px' : '8px';

    if (isActive) {
        return (
            <span style={{
                fontSize,
                fontWeight: 600,
                color: '#22c55e',
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: 6,
                padding: `${paddingV} ${paddingH}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap'
            }}>
                <i className="fa-solid fa-circle" style={{ fontSize: 6, color: '#22c55e' }} />
                Активно
            </span>
        );
    }

    return (
        <span style={{
            fontSize,
            fontWeight: 600,
            color: '#94a3b8',
            background: 'rgba(148,163,184,0.08)',
            border: '1px solid rgba(148,163,184,0.2)',
            borderRadius: 6,
            padding: `${paddingV} ${paddingH}`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            whiteSpace: 'nowrap'
        }}>
            <i className="fa-solid fa-circle" style={{ fontSize: 6, color: '#64748b' }} />
            Неактивно
        </span>
    );
}