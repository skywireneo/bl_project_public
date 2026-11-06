// src/components/ui/badges/Badge.jsx
import React from 'react';
import DevModeIndicator from '../DevModeIndicator';

/**
 * Универсальный компонент бейджа (плашки статуса)
 * Поддерживает: типы, размеры, формы, анимации, иконки, счётчики и особые стили
 */

const Badge = ({
    // Основные свойства
    children,
    text = '',
    type = 'default', // default, success, warning, danger, info, pending, approved, rejected, blocked, moderated, system
    variant = 'solid', // solid, outline, ghost, gradient, neon

    // Размер
    size = 'md', // xs, sm, md, lg, xl

    // Иконка
    icon = null,
    iconPosition = 'left',
    iconOnly = false,

    // Счётчик
    count = null,
    showCount = false,
    maxCount = 99,

    // Форма
    shape = 'rounded', // rounded, pill, square, circle

    // Кастомные цвета
    color = null,
    backgroundColor = null,
    borderColor = null,

    // Поведение
    clickable = false,
    onClick = null,

    // Анимации
    animation = 'none', // none, pulse, bounce, shake, glow, ripple, fade, slide
    animated = false, // Устарело, используйте animation

    // Состояния
    disabled = false,
    active = false,

    // Эффекты
    shadow = 'none', // none, sm, md, lg, glow
    shadowColor = null,

    // Текст и стили
    title = '',
    className = '',
    style = {},

    // Отступы
    padding = null,
    margin = null,

    // Показать звёздочку режима разработки
    showDevModeIndicator = true,
}) => {

    // === КОНФИГУРАЦИЯ РАЗМЕРОВ ===
    const sizeConfig = {
        xs: { padding: '1px 4px', fontSize: '9px', iconSize: '8px', gap: '2px', borderRadius: '3px', minHeight: '14px' },
        sm: { padding: '2px 6px', fontSize: '10px', iconSize: '10px', gap: '3px', borderRadius: '4px', minHeight: '16px' },
        md: { padding: '4px 8px', fontSize: '12px', iconSize: '12px', gap: '4px', borderRadius: '6px', minHeight: '20px' },
        lg: { padding: '6px 12px', fontSize: '14px', iconSize: '14px', gap: '6px', borderRadius: '8px', minHeight: '24px' },
        xl: { padding: '8px 16px', fontSize: '16px', iconSize: '16px', gap: '8px', borderRadius: '10px', minHeight: '28px' }
    };

    // === КОНФИГУРАЦИЯ ЦВЕТОВ ===
    const typeConfig = {
        default: {
            solid: { bg: '#f3f4f6', color: '#374151', border: 'transparent' },
            outline: { bg: 'transparent', color: '#374151', border: '#d1d5db' },
            ghost: { bg: 'transparent', color: '#374151', border: 'transparent' }
        },
        success: {
            solid: { bg: '#10b981', color: '#ffffff', border: 'transparent' },
            outline: { bg: 'transparent', color: '#10b981', border: '#10b981' },
            ghost: { bg: 'transparent', color: '#10b981', border: 'transparent' }
        },
        warning: {
            solid: { bg: '#f59e0b', color: '#ffffff', border: 'transparent' },
            outline: { bg: 'transparent', color: '#f59e0b', border: '#f59e0b' },
            ghost: { bg: 'transparent', color: '#f59e0b', border: 'transparent' }
        },
        danger: {
            solid: { bg: '#ef4444', color: '#ffffff', border: 'transparent' },
            outline: { bg: 'transparent', color: '#ef4444', border: '#ef4444' },
            ghost: { bg: 'transparent', color: '#ef4444', border: 'transparent' }
        },
        info: {
            solid: { bg: '#3b82f6', color: '#ffffff', border: 'transparent' },
            outline: { bg: 'transparent', color: '#3b82f6', border: '#3b82f6' },
            ghost: { bg: 'transparent', color: '#3b82f6', border: 'transparent' }
        },
        pending: {
            solid: { bg: '#f59e0b', color: '#ffffff', border: 'transparent' },
            outline: { bg: 'transparent', color: '#f59e0b', border: '#f59e0b' },
            ghost: { bg: 'transparent', color: '#f59e0b', border: 'transparent' }
        },
        approved: {
            solid: { bg: '#10b981', color: '#ffffff', border: 'transparent' },
            outline: { bg: 'transparent', color: '#10b981', border: '#10b981' },
            ghost: { bg: 'transparent', color: '#10b981', border: 'transparent' }
        },
        rejected: {
            solid: { bg: '#ef4444', color: '#ffffff', border: 'transparent' },
            outline: { bg: 'transparent', color: '#ef4444', border: '#ef4444' },
            ghost: { bg: 'transparent', color: '#ef4444', border: 'transparent' }
        },
        blocked: {
            solid: { bg: '#ef4444', color: '#ffffff', border: 'transparent' },
            outline: { bg: 'transparent', color: '#ef4444', border: '#ef4444' },
            ghost: { bg: 'transparent', color: '#ef4444', border: 'transparent' }
        },
        moderated: {
            solid: { bg: '#22c55e', color: '#ffffff', border: 'transparent' },
            outline: { bg: 'transparent', color: '#22c55e', border: '#22c55e' },
            ghost: { bg: 'transparent', color: '#22c55e', border: 'transparent' }
        },
        system: {
            solid: { bg: '#6366f1', color: '#ffffff', border: 'transparent' },
            outline: { bg: 'transparent', color: '#6366f1', border: '#6366f1' },
            ghost: { bg: 'transparent', color: '#6366f1', border: 'transparent' }
        },
    };

    // === ФОРМЫ ===
    const shapeConfig = {
        rounded: '6px',
        pill: '50px',
        square: '4px',
        circle: '50%',
    };

    // === ТЕНИ ===
    const shadowConfig = {
        none: 'none',
        sm: '0 1px 2px rgba(0,0,0,0.1)',
        md: '0 2px 4px rgba(0,0,0,0.1)',
        lg: '0 4px 8px rgba(0,0,0,0.15)',
        glow: (color) => `0 0 10px ${color || 'rgba(59, 130, 246, 0.5)'}`,
    };

    // === АНИМАЦИИ ===
    const animationKeyframes = {
        pulse: '@keyframes badge-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }',
        bounce: '@keyframes badge-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }',
        shake: '@keyframes badge-shake { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-3deg); } 75% { transform: rotate(3deg); } }',
        glow: '@keyframes badge-glow { 0%, 100% { box-shadow: 0 0 3px currentColor; } 50% { box-shadow: 0 0 10px currentColor, 0 0 15px currentColor; } }',
        ripple: '@keyframes badge-ripple { 0% { transform: scale(0); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }',
        fade: '@keyframes badge-fade { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }',
        slide: '@keyframes badge-slide { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(3px); } 75% { transform: translateX(-3px); } }',
    };

    // === ПОЛУЧАЕМ ЗНАЧЕНИЯ ===
    const currentSize = sizeConfig[size] || sizeConfig.md;
    const currentType = typeConfig[type] || typeConfig.default;
    const currentVariant = currentType[variant] || currentType.solid;
    const borderRadius = shapeConfig[shape] || shapeConfig.rounded;
    const activeAnimation = animation !== 'none' ? animation : (animated ? 'pulse' : 'none');

    // === ОПРЕДЕЛЯЕМ ЦВЕТА ===
    let finalBg = backgroundColor || currentVariant.bg;
    let finalColor = color || currentVariant.color;
    let finalBorder = borderColor || currentVariant.border;

    // Обработка градиента
    if (variant === 'gradient') {
        const gradients = {
            default: 'linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)',
            success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            danger: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            info: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        };
        finalBg = gradients[type] || gradients.default;
    }

    // Обработка neon
    if (variant === 'neon') {
        const neonColors = {
            success: '#00ff88',
            warning: '#ffcc00',
            danger: '#ff0066',
            info: '#00ccff',
            default: '#ff00ff',
        };
        finalColor = neonColors[type] || neonColors.default;
        finalBg = 'transparent';
        finalBorder = `2px solid ${finalColor}`;
    }

    // === ФОРМАТИРУЕМ СЧЁТЧИК ===
    const formattedCount = count !== null && count > maxCount ? `${maxCount}+` : count;

    // === СТИЛИ ===
    const badgeStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: padding || (iconOnly ? '4px' : currentSize.padding),
        fontSize: currentSize.fontSize,
        fontWeight: '600',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: '1',
        color: finalColor,
        background: finalBg,
        border: variant !== 'ghost' ? `1px solid ${finalBorder}` : 'none',
        borderRadius: iconOnly ? '50%' : borderRadius,
        minHeight: iconOnly ? currentSize.minHeight * 1.5 : currentSize.minHeight,
        minWidth: iconOnly ? currentSize.minHeight * 1.5 : 'auto',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        cursor: clickable && !disabled ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        opacity: disabled ? '0.6' : '1',
        pointerEvents: disabled ? 'none' : 'auto',
        boxShadow: shadow === 'glow' ? shadowConfig.glow(shadowColor || finalColor) : shadowConfig[shadow],
        ...(margin ? { margin } : {}),
        ...(activeAnimation !== 'none' && {
            animation: `${activeAnimation} 2s ease-in-out infinite`,
        }),
        ...style,
    };

    // === СОСТОЯНИЯ ===
    const [isHovered, setIsHovered] = React.useState(false);

    if (isHovered && !disabled) {
        badgeStyle.transform = 'scale(1.02)';
    }

    // === РЕНДЕР ИКОНКИ ===
    const renderIcon = (position) => {
        if (!icon) return null;

        const isLeftIcon = position === 'left';
        const shouldRender = iconOnly
            ? true
            : (isLeftIcon && iconPosition === 'left') || (!isLeftIcon && iconPosition === 'right');

        if (!shouldRender) return null;

        if (typeof icon === 'string') {
            return (
                <i
                    className={icon}
                    style={{
                        fontSize: currentSize.iconSize,
                        marginRight: !iconOnly && (text || showCount) && isLeftIcon ? currentSize.gap : '0',
                        marginLeft: !iconOnly && (text || showCount) && !isLeftIcon ? currentSize.gap : '0',
                        display: 'inline-flex',
                        alignItems: 'center',
                    }}
                />
            );
        }
        return React.cloneElement(icon, {
            style: {
                width: currentSize.iconSize,
                height: currentSize.iconSize,
                ...icon.props.style
            }
        });
    };

    // === РЕНДЕР КОНТЕНТА ===
    const renderContent = () => {
        if (iconOnly) {
            return renderIcon('left');
        }

        const textContent = text || (children && React.Children.toArray(children).find(child => typeof child === 'string')) || '';
        const childElements = React.Children.toArray(children).filter(child => typeof child !== 'string') || [];

        return (
            <>
                {renderIcon('left')}
                {textContent && <span>{textContent}</span>}
                {childElements}
                {showCount && count !== null && (
                    <span style={{
                        marginLeft: (textContent || icon || childElements.length) ? currentSize.gap : '0',
                        fontSize: `${Math.max(currentSize.fontSize * 0.9, 10)}px`,
                        fontWeight: '700',
                    }}>
                        {formattedCount}
                    </span>
                )}
                {renderIcon('right')}
            </>
        );
    };

    // === ОБРАБОТЧИК КЛИКА ===
    const handleClick = (e) => {
        if (clickable && !disabled && onClick) {
            onClick(e);
        }
    };

    // === CSS ДЛЯ АНИМАЦИЙ ===
    const keyframesCSS = Object.values(animationKeyframes).join('\n');

    // === ИТОГОВЫЙ ЭЛЕМЕНТ ===
    const badgeElement = (
        <>
            <style>{keyframesCSS}</style>
            <span
                className={`badge badge--${type} badge--${variant} badge--${size} ${className}`}
                style={badgeStyle}
                title={title}
                onClick={handleClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                data-badge-type={type}
                data-badge-variant={variant}
            >
                {renderContent()}
            </span>
        </>
    );

    if (showDevModeIndicator) {
        return <DevModeIndicator>{badgeElement}</DevModeIndicator>;
    }

    return badgeElement;
};

// === ПРЕДУСТАНОВЛЕННЫЕ КОМПОНЕНТЫ ===

// Статусы
Badge.Status = ({ status, showDevModeIndicator = true, ...props }) => {
    const statusConfig = {
        pending: { text: 'На модерации', type: 'pending', icon: 'fa-solid fa-clock' },
        approved: { text: 'Одобрен', type: 'approved', icon: 'fa-solid fa-check' },
        unblocked: { text: 'Разблокирован', type: 'approved', icon: 'fa-solid fa-unlock' },
        rejected: { text: 'Отклонён', type: 'rejected', icon: 'fa-solid fa-times' },
        blocked: { text: 'Заблокирован', type: 'blocked', icon: 'fa-solid fa-ban' },
        active: { text: 'Активен', type: 'success', icon: 'fa-solid fa-check-circle' },
        inactive: { text: 'Неактивен', type: 'default', icon: 'fa-solid fa-pause-circle' },
    };

    const config = statusConfig[status] || { text: 'Неизвестно', type: 'default', icon: 'fa-solid fa-question' };
    return <Badge {...config} showDevModeIndicator={showDevModeIndicator} {...props} />;
};

// Модерация
Badge.Moderation = ({ enabled, count, showDevModeIndicator = true, ...props }) => {
    if (enabled) {
        return (
            <Badge
                type="danger"
                icon="fa-solid fa-shield-halved"
                text="Модерация"
                showDevModeIndicator={showDevModeIndicator}
                {...props}
            />
        );
    }

    if (count > 0) {
        return (
            <Badge
                type="warning"
                icon="fa-solid fa-flag"
                count={count}
                showCount={true}
                showDevModeIndicator={showDevModeIndicator}
                {...props}
            />
        );
    }

    return (
        <Badge
            type="success"
            icon="fa-solid fa-shield-check"
            text="Без модерации"
            variant="ghost"
            showDevModeIndicator={showDevModeIndicator}
            {...props}
        />
    );
};

// Верификация
Badge.Verification = ({ verified, showDevModeIndicator = true, ...props }) => {
    if (!verified) return null;

    return (
        <Badge
            type="success"
            icon="fa-solid fa-circle-check"
            title="Проверен сотрудником"
            showDevModeIndicator={showDevModeIndicator}
            {...props}
        />
    );
};

// Системная проверка
Badge.SystemCheck = ({ systemReport, showDevModeIndicator = true, ...props }) => {
    if (!systemReport) return null;

    const isValid = systemReport.valid;
    const icon = isValid ? 'fa-solid fa-shield-check' : 'fa-solid fa-exclamation-triangle';
    const type = isValid ? 'success' : 'danger';
    const count = `${systemReport.passedChecks || 0}/${systemReport.totalChecks || 0}`;

    return (
        <Badge
            type={type}
            icon={icon}
            text={count}
            title={`Проверки: ${systemReport.passedChecks || 0} из ${systemReport.totalChecks || 0}`}
            showDevModeIndicator={showDevModeIndicator}
            {...props}
        />
    );
};

// Роль пользователя
Badge.Role = ({ role, showDevModeIndicator = true, ...props }) => {
    const roleConfig = {
        admin: { text: 'Админ', type: 'danger', icon: 'fa-solid fa-crown' },
        moderator: { text: 'Модератор', type: 'warning', icon: 'fa-solid fa-shield' },
        user: { text: 'Пользователь', type: 'info', icon: 'fa-solid fa-user' },
        guest: { text: 'Гость', type: 'default', icon: 'fa-solid fa-user-clock' },
        vip: { text: 'VIP', type: 'success', icon: 'fa-solid fa-star' },
    };

    const config = roleConfig[role] || roleConfig.guest;
    return <Badge {...config} showDevModeIndicator={showDevModeIndicator} {...props} />;
};

// Онлайн статус
Badge.Online = ({ online, showDevModeIndicator = true, ...props }) => {
    return (
        <Badge
            type={online ? 'success' : 'default'}
            variant="ghost"
            size="xs"
            icon={online ? 'fa-solid fa-circle' : 'fa-solid fa-circle'}
            iconOnly
            showDevModeIndicator={showDevModeIndicator}
            title={online ? 'Онлайн' : 'Офлайн'}
            {...props}
        />
    );
};

// Уведомления
Badge.Notification = ({ count, showDevModeIndicator = true, ...props }) => {
    if (!count || count <= 0) return null;

    return (
        <Badge
            type="danger"
            variant="gradient"
            count={count}
            showCount={true}
            animation={count > 0 ? 'pulse' : 'none'}
            showDevModeIndicator={showDevModeIndicator}
            {...props}
        />
    );
};

// Прогресс
Badge.Progress = ({ value, max = 100, showDevModeIndicator = true, ...props }) => {
    const percent = Math.min(Math.round((value / max) * 100), 100);

    let type = 'default';
    if (percent >= 80) type = 'success';
    else if (percent >= 50) type = 'warning';
    else if (percent > 0) type = 'danger';

    return (
        <Badge
            type={type}
            text={`${percent}%`}
            showDevModeIndicator={showDevModeIndicator}
            {...props}
        />
    );
};

export default Badge;
