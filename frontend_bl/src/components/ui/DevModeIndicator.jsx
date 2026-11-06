import React from 'react';

/**
 * Компонент для отображения индикатора режима разработки
 * Если REACT_DEV_MODE = 1, показывает красную звёздочку
 */
const DevModeIndicator = ({
    children,
    showLabel = true,
    position = 'inline' // 'inline' | 'superscript'
}) => {
    // По умолчанию включаем режим разработчика если переменная не определена
    const isDevMode = process.env.REACT_DEV_MODE === '1' || process.env.REACT_DEV_MODE === undefined;

    if (!isDevMode) {
        return children;
    }

    const starStyle = {
        color: '#ef4444',
        fontWeight: '700',
        marginLeft: '4px',
        fontSize: position === 'superscript' ? '0.7em' : 'inherit',
        cursor: 'help',
        display: position === 'superscript' ? 'inline' : 'inline-flex',
        alignItems: 'center',
    };

    const containerStyle = position === 'superscript' ? {
        display: 'inline',
        position: 'relative'
    } : {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
    };

    return (
        <span style={containerStyle} title="UI Library Component">
            {children}
            {showLabel && (
                <span style={starStyle}>*</span>
            )}
        </span>
    );
};

/**
 * Хук для проверки режима разработки
 */
export const useDevMode = () => {
    return process.env.REACT_DEV_MODE === '1';
};

export default DevModeIndicator;
