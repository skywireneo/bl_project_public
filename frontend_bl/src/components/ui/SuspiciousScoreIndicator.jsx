import React, { useState } from 'react';

/**
 * Индикатор подозрительной активности
 */
const SuspiciousScoreIndicator = ({ score, showTooltip = true }) => {
    const [showTooltipState, setShowTooltipState] = useState(false);
    
    const getScoreColor = (score) => {
        if (score < 30) return { color: '#68D391', bg: 'rgba(104, 211, 145, 0.2)', label: 'Низкий' };
        if (score < 70) return { color: '#f6e05e', bg: 'rgba(246, 224, 94, 0.2)', label: 'Средний' };
        return { color: '#fc8181', bg: 'rgba(252, 129, 129, 0.2)', label: 'Высокий' };
    };
    
    const scoreColor = getScoreColor(score);
    
    const getReasons = (score) => {
        const reasons = [];
        if (score >= 30) reasons.push('Много неподтверждённых email');
        if (score >= 50) reasons.push('Быстрые регистрации');
        if (score >= 70) reasons.push('Одинаковые IP/устройства');
        if (score >= 90) reasons.push('Жалобы от рефералов');
        return reasons;
    };
    
    const reasons = getReasons(score);
    
    return (
        <div
            style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
            }}
            onMouseEnter={() => showTooltip && setShowTooltipState(true)}
            onMouseLeave={() => showTooltip && setShowTooltipState(false)}
        >
            <div
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    backgroundColor: scoreColor.bg,
                    border: `1px solid ${scoreColor.color}40`,
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: scoreColor.color
                }}
            >
                <div
                    style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: scoreColor.color,
                        animation: score >= 70 ? 'pulse 2s infinite' : 'none'
                    }}
                ></div>
                {score}%
            </div>
            
            {showTooltip && showTooltipState && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginBottom: '8px',
                        padding: '12px',
                        backgroundColor: 'rgba(30, 30, 47, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                        minWidth: '200px',
                        zIndex: 1000,
                        fontSize: '0.8rem'
                    }}
                >
                    <div style={{ fontWeight: 600, marginBottom: '8px', color: 'white' }}>
                        Статус: <span style={{ color: scoreColor.color }}>{scoreColor.label}</span>
                    </div>
                    {reasons.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: '16px', color: 'rgba(255, 255, 255, 0.8)' }}>
                            {reasons.map((reason, idx) => (
                                <li key={idx} style={{ marginBottom: '4px' }}>{reason}</li>
                            ))}
                        </ul>
                    ) : (
                        <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Нет критических проблем</div>
                    )}
                </div>
            )}
            
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
};

export default SuspiciousScoreIndicator;
