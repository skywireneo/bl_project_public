// src/components/ui/buttons/Button.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import DevModeIndicator from '../DevModeIndicator';
import { ButtonGroup, ToggleGroup, IconGroup, Dropdown } from './ButtonGroup';

/**
 * Универсальная кнопка с множеством вариантов настройки
 * Поддерживает различные стили, размеры, анимации и состояния
 */
const Button = ({
  // Основное содержание
  children,
  onClick,
  to,
  type = 'button',

  // Внешний вид
  variant = 'primary', // primary, secondary, success, warning, danger, outline, ghost, link, gradient, neon
  size = 'md', // xs, sm, md, lg, xl
  color = null, // Пользовательский цвет (hex)
  backgroundColor = null,
  textColor = null,

  // Формы
  shape = 'rounded', // rounded, pill, square, circle
  fullWidth = false,

  // Иконки
  icon = null,
  iconPosition = 'left', // left, right
  iconOnly = false, // Только иконка без текста

  // Состояния
  disabled = false,
  isLoading = false,
  active = false,

  // Анимации
  animation = 'none', // none, pulse, bounce, shake, glow, ripple
  hoverEffect = 'default', // default, scale, lift, shine, glow, fill
  clickEffect = 'default', // default, scale, press, ripple

  // Тени
  shadow = 'default', // none, sm, md, lg, xl, colored, glow
  shadowColor = null,

  // Границы
  borderWidth = null,
  borderColor = null,
  borderStyle = 'solid',

  // Отступы
  padding = null,
  margin = null,

  // Дополнительные классы
  className = '',

  // Индивидуальные стили
  style = {},

  // Показывать звёздочку режима разработки
  showDevModeIndicator = true,

  // Атрибуты
  title = null,
  id = null,
  name = null,
  value = null,
  ...props
}) => {
  // === Конфигурация размеров ===
  const sizeConfig = {
    xs: { padding: '4px 8px', fontSize: '0.7rem', height: '24px', minWidth: '24px', iconSize: '10px' },
    sm: { padding: '6px 12px', fontSize: '0.8rem', height: '32px', minWidth: '32px', iconSize: '12px' },
    md: { padding: '10px 20px', fontSize: '0.9rem', height: '42px', minWidth: '42px', iconSize: '14px' },
    lg: { padding: '14px 28px', fontSize: '1rem', height: '52px', minWidth: '52px', iconSize: '16px' },
    xl: { padding: '18px 36px', fontSize: '1.15rem', height: '62px', minWidth: '62px', iconSize: '18px' },
  };

  // === Конфигурация форм ===
  const shapeConfig = {
    rounded: '8px',
    pill: '50px',
    square: '4px',
    circle: '50%',
  };

  // === Конфигурация цветов вариантов ===
  const variantColors = {
    primary: { bg: '#3b82f6', color: '#ffffff', hover: '#2563eb', active: '#1d4ed8', shadow: 'rgba(59, 130, 246, 0.5)' },
    secondary: { bg: '#64748b', color: '#ffffff', hover: '#475569', active: '#334155', shadow: 'rgba(100, 116, 139, 0.4)' },
    success: { bg: '#10b981', color: '#ffffff', hover: '#059669', active: '#047857', shadow: 'rgba(16, 185, 129, 0.5)' },
    warning: { bg: '#f59e0b', color: '#ffffff', hover: '#d97706', active: '#b45309', shadow: 'rgba(245, 158, 11, 0.5)' },
    danger: { bg: '#ef4444', color: '#ffffff', hover: '#dc2626', active: '#b91c1c', shadow: 'rgba(239, 68, 68, 0.5)' },
    info: { bg: '#06b6d4', color: '#ffffff', hover: '#0891b2', active: '#0e7490', shadow: 'rgba(6, 182, 212, 0.5)' },
    light: { bg: '#f1f5f9', color: '#1e293b', hover: '#e2e8f0', active: '#cbd5e1', shadow: 'rgba(241, 245, 249, 0.3)' },
    dark: { bg: '#1e293b', color: '#ffffff', hover: '#0f172a', active: '#020617', shadow: 'rgba(30, 41, 59, 0.5)' },
    outline: { bg: 'transparent', color: '#3b82f6', hover: '#eff6ff', active: '#dbeafe', shadow: 'transparent' },
    ghost: { bg: 'transparent', color: '#64748b', hover: '#f1f5f9', active: '#e2e8f0', shadow: 'transparent' },
    link: { bg: 'transparent', color: '#3b82f6', hover: 'transparent', active: 'transparent', shadow: 'transparent' },
    gradient: { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#ffffff', hover: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)', active: 'linear-gradient(135deg, #4c51bf 0%, #553c9a 100%)', shadow: 'rgba(102, 126, 234, 0.5)' },
    neon: { bg: '#1a1a2e', color: '#00ff88', hover: '#16213e', active: '#0f0f1a', shadow: 'rgba(0, 255, 136, 0.6)' },
  };

  // === Конфигурация теней ===
  const shadowConfig = {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    colored: (color) => `0 4px 14px 0 ${color || 'rgba(59, 130, 246, 0.4)'}`,
    glow: (color) => `0 0 20px ${color || 'rgba(59, 130, 246, 0.6)'}`,
  };

  // === Получаем текущие значения ===
  const currentSize = sizeConfig[size] || sizeConfig.md;
  const currentVariant = variantColors[variant] || variantColors.primary;
  const borderRadius = shapeConfig[shape] || shapeConfig.rounded;

  // === Определяем цвета ===
  const finalBg = backgroundColor || (typeof currentVariant.bg === 'function' ? currentVariant.bg() : currentVariant.bg);
  const finalColor = textColor || currentVariant.color;
  const finalHoverBg = backgroundColor ? backgroundColor : (typeof currentVariant.hover === 'function' ? currentVariant.hover() : currentVariant.hover);
  const finalShadow = shadow === 'colored' ? shadowConfig.colored(shadowColor || currentVariant.shadow) :
    shadow === 'glow' ? shadowConfig.glow(shadowColor || currentVariant.shadow) :
      shadowConfig[shadow] || shadowConfig.md;

  // === Проверяем специальные варианты ===
  const isGradient = variant === 'gradient';
  const isNeon = variant === 'neon';
  const isLink = variant === 'link';
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';

  // === Базовые стили ===
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: iconOnly ? '0' : '8px',
    fontWeight: '600',
    borderRadius: borderRadius,
    border: isOutline || isGhost ? `${borderWidth || '1px'} ${borderStyle} ${borderColor || currentVariant.color}` : 'none',
    cursor: (disabled || isLoading) ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: (disabled || isLoading) ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
    minWidth: iconOnly ? currentSize.height : currentSize.minWidth,
    height: iconOnly ? currentSize.height : 'auto',
    padding: padding || (iconOnly ? '0' : currentSize.padding),
    fontSize: currentSize.fontSize,
    color: finalColor,
    background: finalBg,
    boxShadow: finalShadow,
    textDecoration: isLink ? 'underline' : 'none',
    textUnderlineOffset: '4px',
    outline: 'none',
    ...(margin ? { margin } : {}),
    ...style,
  };

  // === Состояния ===
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // === Динамические стили на основе состояний ===
  const getStateStyles = () => {
    const stateStyles = {};

    if (isHovered && !disabled && !isLoading) {
      stateStyles.background = finalHoverBg;
      stateStyles.transform = getHoverTransform();
      stateStyles.boxShadow = getHoverShadow();
    }

    if (isPressed && !disabled && !isLoading) {
      stateStyles.transform = getClickTransform();
    }

    if (active && !disabled) {
      stateStyles.background = currentVariant.active;
      stateStyles.transform = 'scale(0.98)';
    }

    return stateStyles;
  };

  // === Анимации наведения ===
  const getHoverTransform = () => {
    switch (hoverEffect) {
      case 'scale': return 'scale(1.05)';
      case 'lift': return 'translateY(-2px)';
      case 'shine': return 'scale(1.02)';
      case 'glow': return 'scale(1.02)';
      case 'fill': return 'scale(1.02)';
      default: return 'translateY(-1px)';
    }
  };

  // === Анимации нажатия ===
  const getClickTransform = () => {
    switch (clickEffect) {
      case 'scale': return 'scale(0.95)';
      case 'press': return 'scale(0.97)';
      case 'ripple': return 'scale(0.98)';
      default: return 'scale(0.98)';
    }
  };

  // === Тень при наведении ===
  const getHoverShadow = () => {
    if (isGradient) return '0 8px 25px rgba(102, 126, 234, 0.5)';
    if (isNeon) return '0 0 25px rgba(0, 255, 136, 0.8), 0 0 50px rgba(0, 255, 136, 0.4)';
    if (isGhost || isOutline) return 'none';
    return shadowConfig.colored(shadowColor || currentVariant.shadow);
  };

  // === CSS анимации ===
  const animationKeyframes = {
    pulse: '@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }',
    bounce: '@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }',
    shake: '@keyframes shake { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-5deg); } 75% { transform: rotate(5deg); } }',
    glow: '@keyframes glow { 0%, 100% { box-shadow: 0 0 5px currentColor; } 50% { box-shadow: 0 0 20px currentColor, 0 0 30px currentColor; } }',
    ripple: '@keyframes ripple { 0% { transform: scale(0); opacity: 1; } 100% { transform: scale(4); opacity: 0; } }',
  };

  const activeAnimation = animation !== 'none' ? {
    animation: `${animation} 2s ease-in-out infinite`,
  } : {};

  // === Рендер иконки ===
  const renderIcon = () => {
    if (!icon) return null;

    const iconStyle = {
      fontSize: currentSize.iconSize,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    };

    if (typeof icon === 'string') {
      return <i className={icon} style={iconStyle} />;
    }

    return React.cloneElement(icon, { style: { ...iconStyle, ...icon.props.style } });
  };

  // === Рендер спиннера загрузки ===
  const renderSpinner = () => (
    <span
      style={{
        display: 'inline-block',
        width: currentSize.iconSize,
        height: currentSize.iconSize,
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  );

  // === Рендер контента ===
  const renderContent = () => {
    if (isLoading) {
      return renderSpinner();
    }

    const content = (
      <>
        {iconPosition === 'left' && renderIcon()}
        {!iconOnly && children}
        {iconPosition === 'right' && renderIcon()}
      </>
    );

    if (showDevModeIndicator) {
      return <DevModeIndicator>{content}</DevModeIndicator>;
    }

    return content;
  };

  // === Объединяем все стили ===
  const finalStyle = {
    ...baseStyle,
    ...getStateStyles(),
    ...activeAnimation,
  };

  // === Обработчики событий ===
  const handleMouseEnter = (e) => {
    setIsHovered(true);
    props.onMouseEnter?.(e);
  };

  const handleMouseLeave = (e) => {
    setIsHovered(false);
    setIsPressed(false);
    props.onMouseLeave?.(e);
  };

  const handleMouseDown = (e) => {
    setIsPressed(true);
    props.onMouseDown?.(e);
  };

  const handleMouseUp = (e) => {
    setIsPressed(false);
    props.onMouseUp?.(e);
  };

  // === Рендер ===
  const buttonProps = {
    type,
    onClick,
    disabled: disabled || isLoading,
    style: finalStyle,
    title,
    id,
    name,
    value,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    className: `ui-button ${variant} ${size} ${className}`.trim(),
    ...props,
  };

  if (to && !disabled) {
    return (
      <>
        <style>
          {Object.values(animationKeyframes).join('\n')}
          {'@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }'}
        </style>
        <Link to={to} {...buttonProps}>
          {renderContent()}
        </Link>
      </>
    );
  }

  return (
    <>
      <style>
        {Object.values(animationKeyframes).join('\n')}
        {'@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }'}
      </style>
      <button {...buttonProps}>
        {renderContent()}
      </button>
    </>
  );
};

// === Предустановленные кнопки ===

Button.Neon = ({ children, color = '#00ff88', ...props }) => (
  <Button variant="neon" shadow="glow" shadowColor={color} {...props}>
    {children}
  </Button>
);

Button.Gradient = ({ children, gradient = 'purple', ...props }) => {
  const gradients = {
    purple: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    blue: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
    green: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    orange: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
    pink: 'linear-gradient(135deg, #ec008c 0%, #fc6767 100%)',
  };
  return (
    <Button style={{ background: gradients[gradient] || gradients.purple }} variant="gradient" {...props}>
      {children}
    </Button>
  );
};

Button.Glass = ({ children, ...props }) => (
  <Button style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#ffffff' }} variant="ghost" hoverEffect="glow" {...props}>
    {children}
  </Button>
);

Button.ThreeD = ({ children, color = '#3b82f6', ...props }) => (
  <Button style={{ background: color, boxShadow: `0 6px 0 ${color}dd, 0 10px 20px ${color}44`, transform: 'translateY(0)', transition: 'all 0.1s ease' }}
    onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(4px)'; e.currentTarget.style.boxShadow = `0 2px 0 ${color}dd, 0 4px 10px ${color}44`; }}
    onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 6px 0 ${color}dd, 0 10px 20px ${color}44`; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 6px 0 ${color}dd, 0 10px 20px ${color}44`; }}
    {...props}>
    {children}
  </Button>
);

Button.Icon = ({ icon, children, ...props }) => (
  <Button icon={icon} iconOnly {...props}>{children}</Button>
);

Button.Arrow = ({ direction = 'left', children, ...props }) => (
  <Button icon={`fa-solid fa-arrow-${direction}`} variant="ghost" shape="pill" {...props}>{children}</Button>
);

Button.Social = ({ network, ...props }) => {
  const colors = { vk: '#0077ff', telegram: '#0088cc', whatsapp: '#25d366', instagram: '#e4405f', facebook: '#1877f2', twitter: '#1da1f2' };
  return <Button style={{ background: colors[network] || '#333' }} shape="circle" icon={`fa-brands fa-${network}`} iconOnly {...props} />;
};

// === Группы кнопок (импортируются из ButtonGroup) ===
Button.Group = ButtonGroup;
Button.ToggleGroup = ToggleGroup;
Button.IconGroup = IconGroup;
Button.Dropdown = Dropdown;

export default Button;
