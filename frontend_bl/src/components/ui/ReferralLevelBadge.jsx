import React from 'react';
import { REFERRAL_LEVELS } from '../../utils/referralLevels';

/**
 * Бейдж уровня реферала
 */
const ReferralLevelBadge = ({ level, size = 'medium' }) => {
    const levelConfig = REFERRAL_LEVELS[level] || REFERRAL_LEVELS[1];
    
    const sizes = {
        small: { icon: '1rem', padding: '4px 8px', fontSize: '0.75rem' },
        medium: { icon: '1.2rem', padding: '6px 12px', fontSize: '0.85rem' },
        large: { icon: '1.5rem', padding: '8px 16px', fontSize: '1rem' }
    };
    
    const sizeConfig = sizes[size] || sizes.medium;
    
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: sizeConfig.padding,
                backgroundColor: levelConfig.bgColor,
                border: `1px solid ${levelConfig.color}40`,
                borderRadius: '20px',
                fontSize: sizeConfig.fontSize,
                fontWeight: 600,
                color: levelConfig.color,
                whiteSpace: 'nowrap'
            }}
        >
            <i className={`fa-solid ${levelConfig.icon}`} style={{ fontSize: sizeConfig.icon }}></i>
            {levelConfig.name}
        </span>
    );
};

export default ReferralLevelBadge;
