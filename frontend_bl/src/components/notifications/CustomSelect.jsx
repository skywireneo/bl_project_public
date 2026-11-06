import React, { useState } from 'react';

export default function CustomSelect({ value, onChange, options, placeholder }) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <select
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={{
                    width: '100%', padding: '11px 40px 11px 14px', fontSize: 13, fontWeight: 500,
                    fontFamily: 'inherit', background: 'rgba(15, 17, 23, 0.8)',
                    border: `1px solid ${isFocused ? 'rgba(99, 102, 241, 0.6)' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: 10, color: value ? '#e2e8f0' : '#64748b', outline: 'none',
                    cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isFocused ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none',
                }}
            >
                <option value="" disabled style={{ background: '#1a1d2e', color: '#64748b' }}>{placeholder}</option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value} style={{ background: '#1a1d2e', color: '#e2e8f0', padding: '8px 12px' }}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <div style={{
                position: 'absolute', right: 12, top: '50%',
                transform: `translateY(-50%) ${isFocused ? 'rotate(180deg)' : 'rotate(0deg)'}`,
                color: isFocused ? '#818cf8' : '#64748b', fontSize: 11, pointerEvents: 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
                <i className="fa-solid fa-chevron-down" />
            </div>
        </div>
    );
}