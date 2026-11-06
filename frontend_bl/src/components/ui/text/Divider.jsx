// src/components/ui/text/Divider.jsx
import React from 'react';
import DevModeIndicator from '../DevModeIndicator';

/**
 * Универсальный компонент разделителя (HR)
 * С множеством стилей и настроек
 */
const Divider = ({
    // Ориентация
    orientation = 'horizontal', // horizontal, vertical

    // === СТИЛИ ЛИНИИ ===
    variant = 'solid', // solid, dashed, dotted, double, gradient, wave, zigzag, icon
    color = '#e5e7eb',
    colorEnd = null, // Для градиента

    // === ТОЛЩИНА ===
    thickness = '1px',

    // === ШИРИНА / ВЫСОТА ===
    width = null, // для горизонтального (px, %, rem)
    maxWidth = '100%', // максимальная ширина
    height = null, // для вертикального
    minHeight = '20px', // минимальная высота для вертикального

    // === ОТСТУПЫ ===
    margin = '16px 0',
    marginTop = null,
    marginBottom = null,
    marginLeft = null,
    marginRight = null,

    // === ЦЕНТРАЛЬНЫЙ КОНТЕНТ ===
    label = null, // текст по центру
    labelPosition = 'center', // left, center, right
    labelStyle = {}, // дополнительные стили для label

    // === ИКОНКА ПО ЦЕНТРУ ===
    icon = null, // иконка по центру
    iconPosition = 'center', // left, center, right

    // === СКОБКИ / КРУЖКИ ===
    hasCircles = false, // круги по краям
    circleSize = '6px',
    circleColor = '#e5e7eb',

    // === СООБЩЕНИЯ / ТЕКСТ ===
    content = null, // любой контент по центру
    contentPosition = 'center',

    // === ДОПОЛНИТЕЛЬНЫЕ ОПЦИИ ===
    align = 'center', // left, center, right (для позиционирования всей линии)
    flex = false, // использовать flex для выравнивания

    // === КЛАССЫ ===
    className = '',
    style = {},

    // Показывать звёздочку режима разработки
    showDevModeIndicator = true,

    // Остальные пропсы
    ...props
}) => {
    // === КОНФИГУРАЦИЯ СТИЛЕЙ ===
    const variantStyles = {
        solid: { borderStyle: 'solid' },
        dashed: { borderStyle: 'dashed' },
        dotted: { borderStyle: 'dotted' },
        double: { borderStyle: 'double', borderWidth: '3px' },
        gradient: { background: `linear-gradient(90deg, transparent, ${color}, transparent)` },
        wave: { background: `repeating-linear-gradient(90deg, ${color} 0px, ${color} 5px, transparent 5px, transparent 10px)` },
    };

    const isVertical = orientation === 'vertical';

    // Вычисляем отступы
    const computedMargin = margin ||
        `${marginTop || 16}px ${marginRight || 0}px ${marginBottom || 16}px ${marginLeft || 0}px`;

    // === РЕНДЕР ВАРИАНТА С ИКОНКОЙ / ТЕКСТОМ ПО ЦЕНТРУ ===
    if (label || icon || content) {
        const getAlignment = () => {
            switch (contentPosition || labelPosition) {
                case 'left': return 'flex-start';
                case 'right': return 'flex-end';
                default: return 'center';
            }
        };

        const lineContainerStyle = {
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            margin: computedMargin,
            width: isVertical ? 'auto' : width,
            ...style,
        };

        const lineStyle = {
            flex: 1,
            height: isVertical ? 'auto' : thickness,
            width: isVertical ? thickness : '100%',
            minHeight: isVertical ? minHeight : 'auto',
            background: variantStyles[variant]?.background || color,
            borderTop: !isVertical && !variantStyles[variant]?.background ? `${thickness} ${variantStyles[variant]?.borderStyle || 'solid'} ${color}` : 'none',
            borderLeft: isVertical && !variantStyles[variant]?.background ? `${thickness} ${variantStyles[variant]?.borderStyle || 'solid'} ${color}` : 'none',
            borderWidth: variantStyles[variant]?.borderWidth || 0,
            ...(variant === 'gradient' && { background: `linear-gradient(90deg, transparent, ${color}, transparent)` }),
            ...(variant === 'wave' && {
                background: `repeating-linear-gradient(90deg, ${color} 0px, ${color} 4px, transparent 4px, transparent 8px)`,
                height: thickness
            }),
        };

        // Круги по краям
        const circleStyle = {
            width: circleSize,
            height: circleSize,
            borderRadius: '50%',
            backgroundColor: circleColor,
            flexShrink: 0,
        };

        const contentStyle = {
            display: 'flex',
            alignItems: 'center',
            justifyContent: getAlignment(),
            gap: '8px',
            color: '#9ca3af',
            fontSize: '0.875rem',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            padding: '0 8px',
            flexShrink: 0,
            ...labelStyle,
        };

        const dividerWithContent = (
            <div className={`ui-divider ${className}`} style={lineContainerStyle} {...props}>
                {hasCircles && <div style={circleStyle} />}
                <div style={lineStyle} />
                <div style={contentStyle}>
                    {icon && <span className={icon} />}
                    {label && <span>{label}</span>}
                    {content}
                </div>
                <div style={lineStyle} />
                {hasCircles && <div style={circleStyle} />}
            </div>
        );

        if (showDevModeIndicator) {
            return <DevModeIndicator>{dividerWithContent}</DevModeIndicator>;
        }
        return dividerWithContent;
    }

    // === ПРОСТОЙ ВАРИАНТ БЕЗ ЦЕНТРАЛЬНОГО КОНТЕНТА ===
    const getAlignmentStyle = () => {
        switch (align) {
            case 'left': return isVertical ? { alignSelf: 'flex-start', height: '100%' } : { width: '100%' };
            case 'right': return isVertical ? { alignSelf: 'flex-end', height: '100%' } : { width: '100%' };
            default: return {};
        }
    };

    const dividerStyles = {
        display: isVertical ? 'inline-block' : 'block',
        width: isVertical ? thickness : (width || maxWidth),
        maxWidth: isVertical ? 'none' : maxWidth,
        height: isVertical ? (height || '100%') : thickness,
        minHeight: isVertical ? minHeight : 'auto',

        // Основной стиль линии
        background: variantStyles[variant]?.background || 'none',
        borderTop: !isVertical && variant !== 'gradient' && variant !== 'wave' ? `${thickness} ${variantStyles[variant]?.borderStyle || 'solid'} ${color}` : 'none',
        borderBottom: !isVertical && variant === 'double' ? `${thickness} solid ${color}` : 'none',
        borderLeft: isVertical && variant !== 'gradient' ? `${thickness} ${variantStyles[variant]?.borderStyle || 'solid'} ${color}` : 'none',

        margin: computedMargin,

        // Круги по краям (для простого варианта)
        ...(hasCircles && !isVertical && {
            position: 'relative',
            '&::before, &::after': {
                content: '""',
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                width: circleSize,
                height: circleSize,
                borderRadius: '50%',
                backgroundColor: circleColor,
            }
        }),

        ...getAlignmentStyle(),
        ...style,
    };

    const dividerElement = (
        <hr
            className={`ui-divider ui-divider--${variant} ${className}`}
            style={dividerStyles}
            {...props}
        />
    );

    if (showDevModeIndicator) {
        return <DevModeIndicator>{dividerElement}</DevModeIndicator>;
    }

    return dividerElement;
};

// === ПРЕДУСТАНОВЛЕННЫЕ КОМПОНЕНТЫ ===

// Тонкий разделитель
Divider.Thin = (props) => (
    <Divider thickness="1px" color="#e5e7eb" {...props} />
);

// Средний разделитель
Divider.Medium = (props) => (
    <Divider thickness="2px" color="#d1d5db" {...props} />
);

// Толстый разделитель
Divider.Thick = (props) => (
    <Divider thickness="4px" color="#9ca3af" {...props} />
);

// Очень толстый разделитель
Divider.XThick = (props) => (
    <Divider thickness="8px" color="#6b7280" {...props} />
);

// Пунктирный разделитель
Divider.Dashed = (props) => (
    <Divider variant="dashed" color="#9ca3af" thickness="2px" {...props} />
);

// Точечный разделитель
Divider.Dotted = (props) => (
    <Divider variant="dotted" color="#9ca3af" thickness="2px" {...props} />
);

// Двойной разделитель
Divider.Double = (props) => (
    <Divider variant="double" color="#9ca3af" thickness="3px" {...props} />
);

// Градиентный разделитель
Divider.Gradient = (props) => (
    <Divider variant="gradient" color="#3b82f6" {...props} />
);

// Волновой разделитель
Divider.Wave = (props) => (
    <Divider variant="wave" color="#3b82f6" thickness="3px" {...props} />
);

// Разделитель с кругами
Divider.WithCircles = (props) => (
    <Divider hasCircles={true} circleSize="8px" circleColor="#9ca3af" {...props} />
);

// Разделитель с точками по краям
Divider.Dotted = (props) => (
    <Divider hasCircles={true} circleSize="4px" circleColor="#9ca3af" {...props} />
);

// Разделитель с текстом
Divider.WithLabel = ({ label, ...props }) => (
    <Divider label={label} {...props} />
);

// Разделитель с иконкой
Divider.WithIcon = ({ icon, ...props }) => (
    <Divider icon={icon} {...props} />
);

// Разделитель с контентом
Divider.WithContent = ({ content, ...props }) => (
    <Divider content={content} {...props} />
);

// Вертикальный разделитель
Divider.Vertical = ({ height = '100%', ...props }) => (
    <Divider orientation="vertical" height={height} {...props} />
);

// Вертикальный тонкий
Divider.VerticalThin = (props) => (
    <Divider orientation="vertical" thickness="1px" minHeight="20px" color="#e5e7eb" {...props} />
);

// Вертикальный средний
Divider.VerticalMedium = (props) => (
    <Divider orientation="vertical" thickness="2px" minHeight="30px" color="#d1d5db" {...props} />
);

// === СТИЛИЗОВАННЫЕ ВАРИАНТЫ ===

// Тёмный разделитель
Divider.Dark = (props) => (
    <Divider color="#374151" thickness="1px" {...props} />
);

// Светлый разделитель
Divider.Light = (props) => (
    <Divider color="#f3f4f6" thickness="1px" {...props} />
);

// Акцентный разделитель (синий)
Divider.Accent = (props) => (
    <Divider color="#3b82f6" thickness="2px" {...props} />
);

// Успех (зелёный)
Divider.Success = (props) => (
    <Divider color="#10b981" thickness="2px" {...props} />
);

// Опасность (красный)
Divider.Danger = (props) => (
    <Divider color="#ef4444" thickness="2px" {...props} />
);

// Предупреждение (жёлтый)
Divider.Warning = (props) => (
    <Divider color="#f59e0b" thickness="2px" {...props} />
);

// === ПРИМЕРЫ С КОНТЕНТОМ ===

Divider.Or = (props) => (
    <Divider label="или" variant="dashed" {...props} />
);

Divider.Equals = (props) => (
    <Divider label="=" variant="dotted" {...props} />
);

Divider.Arrow = (props) => (
    <Divider icon="fa-solid fa-arrow-down" {...props} />
);

Divider.Heart = (props) => (
    <Divider icon="fa-solid fa-heart" color="#ef4444" {...props} />
);

Divider.Star = (props) => (
    <Divider icon="fa-solid fa-star" color="#f59e0b" {...props} />
);

Divider.Check = (props) => (
    <Divider icon="fa-solid fa-check" color="#10b981" {...props} />
);

export default Divider;
