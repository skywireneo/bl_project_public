// src/components/ui/Tooltip.jsx
import React, { useState, useRef, useEffect } from 'react';

/**
 * Универсальный компонент тултипа (всплывающей подсказки)
 * Поддерживает множество вариантов, позиций и анимаций
 */
const Tooltip = ({
    // Содержимое
    children,
    content = '',

    // Позиция
    position = 'top', // top, bottom, left, right

    // Вариант
    variant = 'default', // default, dark, light, primary, success, warning, danger, info

    // Размер
    size = 'md', // xs, sm, md, lg

    // Анимация
    animation = 'fade', // none, fade, slide, zoom, bounce

    // Поведение
    showOnHover = true,
    showOnClick = false,
    delay = 200,
    interactive = false,

    // Максимальная ширина
    maxWidth = '250px',

    // Отступ
    offset = 8,

    // Показывать стрелку
    showArrow = true,

    // Кастомные стили
    tooltipStyle = {},
    tooltipClassName = '',

    // Атрибуты
    id,
    className = '',

    // Показывать звёздочку режима разработки
    showDevModeIndicator = true,

    ...props
}) => {
    // === Состояния ===
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const triggerRef = useRef(null);
    const tooltipRef = useRef(null);
    const timeoutRef = useRef(null);

    // === Конфигурация размеров ===
    const sizeConfig = {
        xs: { padding: '2px 6px', fontSize: '0.65rem' },
        sm: { padding: '4px 8px', fontSize: '0.75rem' },
        md: { padding: '6px 12px', fontSize: '0.85rem' },
        lg: { padding: '8px 16px', fontSize: '0.95rem' },
    };

    // === Конфигурация цветов ===
    const variantConfig = {
        default: {
            background: '#374151',
            color: '#ffffff',
            border: 'none',
            shadow: '0 4px 12px rgba(0,0,0,0.15)',
        },
        dark: {
            background: '#1f2937',
            color: '#ffffff',
            border: 'none',
            shadow: '0 4px 12px rgba(0,0,0,0.25)',
        },
        light: {
            background: '#ffffff',
            color: '#374151',
            border: '1px solid #e5e7eb',
            shadow: '0 4px 12px rgba(0,0,0,0.1)',
        },
        primary: {
            background: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            shadow: '0 4px 12px rgba(59,130,246,0.3)',
        },
        success: {
            background: '#10b981',
            color: '#ffffff',
            border: 'none',
            shadow: '0 4px 12px rgba(16,185,129,0.3)',
        },
        warning: {
            background: '#f59e0b',
            color: '#ffffff',
            border: 'none',
            shadow: '0 4px 12px rgba(245,158,11,0.3)',
        },
        danger: {
            background: '#ef4444',
            color: '#ffffff',
            border: 'none',
            shadow: '0 4px 12px rgba(239,68,68,0.3)',
        },
        info: {
            background: '#06b6d4',
            color: '#ffffff',
            border: 'none',
            shadow: '0 4px 12px rgba(6,182,212,0.3)',
        },
    };

    // === Анимации ===
    const animations = {
        none: '',
        fade: 'opacity 0.2s ease',
        slide: 'all 0.2s ease',
        zoom: 'all 0.2s ease',
        bounce: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    };

    // === Получаем значения ===
    const currentSize = sizeConfig[size] || sizeConfig.md;
    const currentVariant = variantConfig[variant] || variantConfig.default;

    // === Вычисление позиции ===
    const calculatePosition = () => {
        if (!triggerRef.current) return { top: 0, left: 0 };

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current?.getBoundingClientRect() || { width: 100, height: 40 };

        let x = 0;
        let y = 0;

        switch (position) {
            case 'top':
                x = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
                y = triggerRect.top - tooltipRect.height - offset;
                break;
            case 'bottom':
                x = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
                y = triggerRect.bottom + offset;
                break;
            case 'left':
                x = triggerRect.left - tooltipRect.width - offset;
                y = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
                break;
            case 'right':
                x = triggerRect.right + offset;
                y = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
                break;
            default:
                break;
        }

        // Корректировка для видимости на экране
        const padding = 10;
        if (x < padding) x = padding;
        if (x + tooltipRect.width > window.innerWidth - padding) {
            x = window.innerWidth - tooltipRect.width - padding;
        }
        if (y < padding) y = padding;
        if (y + tooltipRect.height > window.innerHeight - padding) {
            y = window.innerHeight - tooltipRect.height - padding;
        }

        setCoords({ x, y });
    };

    // === Обработчики событий ===
    const showTooltip = () => {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
            setTimeout(calculatePosition, 0);
        }, delay);
    };

    const hideTooltip = () => {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setIsVisible(false);
        }, delay);
    };

    const handleClick = () => {
        if (showOnClick) {
            setIsVisible(!isVisible);
            setTimeout(calculatePosition, 0);
        }
    };

    // === Обработка клавиатуры ===
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (showOnClick) {
                setIsVisible(!isVisible);
                setTimeout(calculatePosition, 0);
            }
        }
    };

    // === Обновление позиции при изменении ===
    useEffect(() => {
        if (isVisible) {
            calculatePosition();
            window.addEventListener('resize', calculatePosition);
            window.addEventListener('scroll', calculatePosition, true);
        }
        return () => {
            window.removeEventListener('resize', calculatePosition);
            window.removeEventListener('scroll', calculatePosition, true);
        };
    }, [isVisible]);

    // === Очистка ===
    useEffect(() => {
        return () => clearTimeout(timeoutRef.current);
    }, []);

    // === Стили тултипа ===
    const tooltipBaseStyle = {
        position: 'fixed',
        zIndex: 9999,
        maxWidth,
        padding: currentSize.padding,
        fontSize: currentSize.fontSize,
        background: currentVariant.background,
        color: currentVariant.color,
        border: currentVariant.border,
        borderRadius: '6px',
        boxShadow: currentVariant.shadow,
        transition: animations[animation],
        opacity: isVisible ? 1 : 0,
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: isVisible ? 'auto' : 'none',
        ...(animation === 'zoom' && isVisible && { transform: 'scale(1)' }),
        ...(animation === 'zoom' && !isVisible && { transform: 'scale(0.9)' }),
        ...(animation === 'slide' && position === 'top' && { transform: isVisible ? 'translateY(0)' : 'translateY(10px)' }),
        ...(animation === 'slide' && position === 'bottom' && { transform: isVisible ? 'translateY(0)' : 'translateY(-10px)' }),
        ...(animation === 'slide' && position === 'left' && { transform: isVisible ? 'translateX(0)' : 'translateX(10px)' }),
        ...(animation === 'slide' && position === 'right' && { transform: isVisible ? 'translateX(0)' : 'translateX(-10px)' }),
        ...tooltipStyle,
    };

    // === Стили стрелки ===
    const getArrowStyle = () => {
        const arrowSize = '6px';
        const baseStyle = {
            position: 'absolute',
            width: arrowSize,
            height: arrowSize,
            background: currentVariant.background,
            border: currentVariant.border,
        };

        if (position === 'top') {
            return { ...baseStyle, bottom: `-${arrowSize}`, left: '50%', transform: 'translateX(-50%) rotate(45deg)', borderBottom: currentVariant.border, borderRight: currentVariant.border };
        }
        if (position === 'bottom') {
            return { ...baseStyle, top: `-${arrowSize}`, left: '50%', transform: 'translateX(-50%) rotate(45deg)', borderTop: currentVariant.border, borderLeft: currentVariant.border };
        }
        if (position === 'left') {
            return { ...baseStyle, right: `-${arrowSize}`, top: '50%', transform: 'translateY(-50%) rotate(45deg)', borderTop: currentVariant.border, borderRight: currentVariant.border };
        }
        if (position === 'right') {
            return { ...baseStyle, left: `-${arrowSize}`, top: '50%', transform: 'translateY(-50%) rotate(45deg)', borderTop: currentVariant.border, borderLeft: currentVariant.border };
        }
        return baseStyle;
    };

    // === Рендер ===
    return (
        <>
            <span
                ref={triggerRef}
                className={`tooltip-trigger ${className}`}
                onMouseEnter={showOnHover ? showTooltip : undefined}
                onMouseLeave={showOnHover ? hideTooltip : undefined}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                tabIndex={showOnClick ? 0 : -1}
                style={{ display: 'inline-flex', cursor: 'help' }}
                {...props}
            >
                {children}
            </span>

            {isVisible && (
                <span
                    ref={tooltipRef}
                    className={`tooltip-content ${tooltipClassName}`}
                    style={{
                        ...tooltipBaseStyle,
                        left: `${coords.x}px`,
                        top: `${coords.y}px`,
                    }}
                    role="tooltip"
                    id={id}
                >
                    {showArrow && <span style={getArrowStyle()} />}
                    {content}
                </span>
            )}
        </>
    );
};

// === Вопросительный знак с тултипом ===
Tooltip.Question = ({
    size = 'md',
    variant = 'primary',
    content = 'Нажмите для справки',
    position = 'top',
    circleSize = '20px',
    showDevModeIndicator = true,
    ...props
}) => {
    const sizeMap = {
        xs: { width: '16px', height: '16px', fontSize: '0.6rem' },
        sm: { width: '18px', height: '18px', fontSize: '0.7rem' },
        md: { width: '20px', height: '20px', fontSize: '0.8rem' },
        lg: { width: '24px', height: '24px', fontSize: '0.9rem' },
    };

    const circleStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: circleSize,
        height: circleSize,
        borderRadius: '50%',
        background: variant === 'primary' ? '#3b82f6' :
            variant === 'success' ? '#10b981' :
                variant === 'warning' ? '#f59e0b' :
                    variant === 'danger' ? '#ef4444' :
                        variant === 'info' ? '#06b6d4' :
                            variant === 'dark' ? '#1f2937' : '#3b82f6',
        color: '#ffffff',
        fontSize: sizeMap[size]?.fontSize || sizeMap.md.fontSize,
        fontWeight: '600',
        cursor: 'help',
        transition: 'all 0.2s ease',
    };

    const questionElement = (
        <span
            style={circleStyle}
            {...props}
        >
            ?
        </span>
    );

    if (showDevModeIndicator) {
        return (
            <Tooltip content={content} position={position} variant={variant} size={size}>
                {questionElement}
            </Tooltip>
        );
    }

    return (
        <Tooltip content={content} position={position} variant={variant} size={size}>
            {questionElement}
        </Tooltip>
    );
};

// === Информационная иконка ===
Tooltip.Info = ({
    content = 'Информация',
    variant = 'info',
    size = 'sm',
    showDevModeIndicator = true,
    ...props
}) => {
    const infoElement = (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#06b6d4',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: '600',
                cursor: 'help',
            }}
            {...props}
        >
            i
        </span>
    );

    if (showDevModeIndicator) {
        return (
            <Tooltip content={content} position="top" variant={variant} size={size}>
                {infoElement}
            </Tooltip>
        );
    }

    return (
        <Tooltip content={content} position="top" variant={variant} size={size}>
            {infoElement}
        </Tooltip>
    );
};

// === Предустановленные тултипы ===
Tooltip.Help = (props) => (
    <Tooltip.Question
        variant="primary"
        content={props.content || 'Нажмите для справки'}
        {...props}
    />
);

Tooltip.Tip = (props) => (
    <Tooltip
        variant="info"
        content={props.content || 'Подсказка'}
        {...props}
    />
);

export default Tooltip;
