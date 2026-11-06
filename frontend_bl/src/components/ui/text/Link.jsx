// src/components/ui/text/Link.jsx
import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import DevModeIndicator from '../DevModeIndicator';

/**
 * Универсальный компонент ссылки
 * Поддерживает внутренние, внешние ссылки и ссылки с иконками
 */
const Link = ({
    children,

    // Тип ссылки
    to = null, // Для внутренних ссылок (React Router)
    href = null, // Для внешних ссылок (обычный a href)
    onClick = null, // Для кликабельных элементов без ссылки
    external = null, // Явно указать - внешняя ссылка или нет (auto - определяется автоматически)

    // Стиль
    variant = 'default', // default, primary, success, warning, danger, ghost, underline, white
    size = 'md', // xs, sm, md, lg

    // Иконки
    icon = null,
    iconPosition = 'left', // left, right
    iconOnly = false,

    // Иконка для внешней ссылки
    showExternalIcon = null, // true, false, null (автоматически)
    externalIconPosition = 'right', // left, right

    // Состояния
    disabled = false,
    active = false,
    loading = false,

    // Открытие
    target = null, // _blank, _self, _parent, _top
    download = null, // true для атрибута download

    // Внешний вид
    underline = true,
    color = null,
    decoration = null, // none, underline, overline, line-through

    // Анимация
    hoverEffect = 'default', // default, opacity, scale, lift, glow

    // Отступы
    margin = null,
    padding = null,

    // Дополнительно
    title = '',
    className = '',
    style = {},

    // Показывать звёздочку режима разработки
    showDevModeIndicator = true,

    // Остальные пропсы
    ...props
}) => {
    // === КОНФИГУРАЦИЯ ===
    const sizeMap = {
        xs: { fontSize: '0.75rem', iconSize: '10px', gap: '4px' },
        sm: { fontSize: '0.875rem', iconSize: '12px', gap: '6px' },
        md: { fontSize: '1rem', iconSize: '14px', gap: '8px' },
        lg: { fontSize: '1.125rem', iconSize: '16px', gap: '10px' },
    };

    const variantColors = {
        default: { color: '#3b82f6', hover: '#2563eb' },
        primary: { color: '#3b82f6', hover: '#2563eb' },
        success: { color: '#10b981', hover: '#059669' },
        warning: { color: '#f59e0b', hover: '#d97706' },
        danger: { color: '#ef4444', hover: '#dc2626' },
        ghost: { color: '#64748b', hover: '#475569' },
        underline: { color: '#3b82f6', hover: '#2563eb' },
        white: { color: '#ffffff', hover: '#e5e7eb' },
        dark: { color: '#1f2937', hover: '#000000' },
    };

    const targetOptions = {
        '_blank': 'Открыть в новой вкладке',
        '_self': 'Открыть в текущей вкладке',
        '_parent': 'Открыть в родительском фрейме',
        '_top': 'Открыть в верхнем фрейме',
    };

    // === ОПРЕДЕЛЕНИЕ ТИПА ССЫЛКИ ===
    const isExternalByHref = href && (href.startsWith('http') || href.startsWith('//') || href.startsWith('www.'));
    const isExternalLink = external === true || (external === null && isExternalByHref);
    const shouldShowExternalIcon = showExternalIcon === true || (showExternalIcon === null && isExternalLink);

    // Определяем target
    let linkTarget = target;
    if (!linkTarget && isExternalLink) {
        linkTarget = '_blank';
    }

    // === СОСТОЯНИЯ ===
    const [isHovered, setIsHovered] = useState(false);
    const currentSize = sizeMap[size] || sizeMap.md;
    const currentVariant = variantColors[variant] || variantColors.default;
    const finalColor = color || currentVariant.color;
    const isActive = active || isHovered;

    // === ЭФФЕКТЫ ПРИ НАВЕДЕНИИ ===
    const getHoverTransform = () => {
        switch (hoverEffect) {
            case 'scale': return 'scale(1.05)';
            case 'lift': return 'translateY(-2px)';
            case 'glow': return 'none'; // обрабатывается отдельно через boxShadow
            default: return 'none';
        }
    };

    // === СТИЛИ ===
    const linkStyles = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: currentSize.gap,
        fontSize: currentSize.fontSize,
        fontWeight: '500',
        color: disabled ? '#9ca3af' : finalColor,
        textDecoration: decoration || (underline ? 'underline' : 'none'),
        textUnderlineOffset: '3px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : (loading ? 0.7 : 1),
        transition: 'all 0.2s ease',
        pointerEvents: disabled ? 'none' : 'auto',
        margin,
        padding,

        // Эффекты при наведении
        ...(isActive && !disabled && {
            color: currentVariant.hover,
            transform: getHoverTransform(),
            ...(hoverEffect === 'glow' && {
                textShadow: `0 0 8px ${currentVariant.hover}`,
            }),
        }),

        ...style,
    };

    // === РЕНДЕР ИКОНКИ ===
    const renderIcon = (iconProp, position) => {
        if (!iconProp) return null;

        const isLeft = position === 'left';

        if (typeof iconProp === 'string') {
            return <i className={iconProp} style={{ fontSize: currentSize.iconSize }} />;
        }
        return React.cloneElement(iconProp, {
            style: { width: currentSize.iconSize, height: currentSize.iconSize, ...iconProp.props.style }
        });
    };

    // === РЕНДЕР ВНЕШНЕЙ ИКОНКИ ===
    const renderExternalIcon = () => {
        if (!shouldShowExternalIcon || iconOnly) return null;

        const iconStyle = {
            fontSize: `calc(${currentSize.iconSize} * 0.8)`,
            marginLeft: externalIconPosition === 'left' ? '2px' : '0',
            marginRight: externalIconPosition === 'right' ? '2px' : '0',
        };

        return (
            <svg
                width={currentSize.iconSize}
                height={currentSize.iconSize}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={iconStyle}
            >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
        );
    };

    // === РЕНДЕР ЛОАДЕР ===
    const renderLoader = () => (
        <svg
            width={currentSize.iconSize}
            height={currentSize.iconSize}
            viewBox="0 0 24 24"
            style={{ animation: 'spin 1s linear infinite' }}
        >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" />
        </svg>
    );

    // === ОБРАБОТЧИКИ ===
    const handleMouseEnter = (e) => {
        setIsHovered(true);
        props.onMouseEnter?.(e);
    };

    const handleMouseLeave = (e) => {
        setIsHovered(false);
        props.onMouseLeave?.(e);
    };

    // === ОСНОВНОЙ КОНТЕНТ ===
    const linkContent = (
        <>
            {iconPosition === 'left' && renderIcon(icon, 'left')}
            {externalIconPosition === 'left' && shouldShowExternalIcon && !iconOnly && renderExternalIcon()}
            {!iconOnly && children}
            {loading && renderLoader()}
            {externalIconPosition === 'right' && shouldShowExternalIcon && !iconOnly && renderExternalIcon()}
            {iconPosition === 'right' && renderIcon(icon, 'right')}
        </>
    );

    // === РЕНДЕР ===
    // Внутренняя ссылка (React Router)
    if (to && !disabled) {
        return (
            <DevModeIndicator>
                <RouterLink
                    to={to}
                    className={`ui-link ${className}`}
                    style={linkStyles}
                    title={title}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    {...props}
                >
                    {linkContent}
                </RouterLink>
            </DevModeIndicator>
        );
    }

    // Внешняя ссылка или обычный href
    if ((href || isExternalLink) && !disabled) {
        const linkElement = (
            <a
                href={href}
                target={linkTarget}
                rel={linkTarget === '_blank' ? 'noopener noreferrer' : undefined}
                download={download || undefined}
                className={`ui-link ui-link--external ${className}`}
                style={linkStyles}
                title={title}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                {...props}
            >
                {linkContent}
            </a>
        );

        if (showDevModeIndicator) {
            return <DevModeIndicator>{linkElement}</DevModeIndicator>;
        }
        return linkElement;
    }

    // Кликабельный элемент без ссылки
    const clickableElement = (
        <span
            className={`ui-link ui-link--clickable ${className}`}
            style={linkStyles}
            title={title}
            onClick={disabled ? undefined : onClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            role="button"
            tabIndex={disabled ? -1 : 0}
            {...props}
        >
            {linkContent}
        </span>
    );

    if (showDevModeIndicator) {
        return <DevModeIndicator>{clickableElement}</DevModeIndicator>;
    }

    return clickableElement;
};

// === ПРЕДУСТАНОВЛЕННЫЕ КОМПОНЕНТЫ ===

// Ссылка "Назад"
Link.Back = ({ children, ...props }) => (
    <Link icon="fa-solid fa-arrow-left" iconPosition="left" variant="ghost" {...props}>
        {children || 'Назад'}
    </Link>
);

// Ссылка "Вперёд"
Link.Forward = ({ children, ...props }) => (
    <Link icon="fa-solid fa-arrow-right" iconPosition="right" variant="ghost" {...props}>
        {children || 'Вперёд'}
    </Link>
);

// Email ссылка
Link.Email = ({ children, email, ...props }) => (
    <Link
        href={`mailto:${email}`}
        icon="fa-solid fa-envelope"
        variant="primary"
        {...props}
    >
        {children || email}
    </Link>
);

// Телефон ссылка
Link.Phone = ({ children, phone, ...props }) => (
    <Link
        href={`tel:${phone}`}
        icon="fa-solid fa-phone"
        variant="primary"
        {...props}
    >
        {children || phone}
    </Link>
);

// Внешняя ссылка с иконкой
Link.External = ({ children, href, showExternalIcon = true, ...props }) => (
    <Link
        href={href}
        external={true}
        showExternalIcon={showExternalIcon}
        variant="primary"
        {...props}
    >
        {children || href}
    </Link>
);

// Ссылка на скачивание
Link.Download = ({ children, href, ...props }) => (
    <Link
        href={href}
        download={true}
        icon="fa-solid fa-download"
        variant="primary"
        {...props}
    >
        {children || 'Скачать'}
    </Link>
);

// Ссылка на документ
Link.Document = ({ children, href, ...props }) => (
    <Link
        href={href}
        icon="fa-solid fa-file-lines"
        variant="primary"
        {...props}
    >
        {children || 'Документ'}
    </Link>
);

// Ссылка на профиль
Link.Profile = ({ children, userId, ...props }) => (
    <Link
        to={`/profile/${userId}`}
        icon="fa-solid fa-user"
        variant="primary"
        {...props}
    >
        {children || 'Профиль'}
    </Link>
);

// Ссылка на настройки
Link.Settings = ({ children, ...props }) => (
    <Link
        to="/settings"
        icon="fa-solid fa-cog"
        variant="ghost"
        {...props}
    >
        {children || 'Настройки'}
    </Link>
);

// Ссылка на главную
Link.Home = ({ children, ...props }) => (
    <Link
        to="/"
        icon="fa-solid fa-home"
        variant="ghost"
        {...props}
    >
        {children || 'Главная'}
    </Link>
);

// Ссылка "Читать далее"
Link.ReadMore = ({ children, href, ...props }) => (
    <Link
        href={href}
        icon="fa-solid fa-arrow-right"
        iconPosition="right"
        variant="primary"
        underline={false}
        {...props}
    >
        {children || 'Читать далее'}
    </Link>
);

export default Link;
