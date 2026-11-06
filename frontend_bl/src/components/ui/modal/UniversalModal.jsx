import React, { useState, useEffect } from 'react';
import Badge from '../badges/Badge';
import DevModeIndicator from '../DevModeIndicator';
import Button from '../buttons/Button';

/**
 * Универсальный настраиваемый компонент модального окна
 * Заменяет все существующие модальные окна в системе
 * 
 * @param {Object} props - Параметры компонента
 * @param {boolean} props.isOpen - Состояние открытия модального окна (обязательный)
 * @param {Function} props.onClose - Callback для закрытия модального окна (обязательный)
 * @param {string} props.title - Заголовок модального окна
 * @param {string} props.icon - Иконка для заголовка (FontAwesome класс)
 * @param {React.ReactNode} props.children - Содержимое модального окна
 * @param {Array} props.actions - Массив кнопок действий [{label, onClick, variant, disabled, loading, icon}]
 * @param {Object} props.styles - Кастомные стили для настройки внешнего вида
 * @param {Object} props.size - Размеры модального окна {width, height, maxWidth, maxHeight}
 * @param {boolean} props.showCloseButton - Показывать кнопку закрытия в заголовке
 * @param {boolean} props.closeOnOverlayClick - Закрывать при клике на overlay
 * @param {boolean} props.closeOnEscape - Закрывать при нажатии Escape
 * @param {number} props.zIndex - Z-index модального окна
 * @param {boolean} props.showHeader - Показывать секцию заголовка
 * @param {boolean} props.showFooter - Показывать секцию футера
 * @param {string} props.className - CSS класс для дополнительной стилизации
 * @param {Function} props.onOverlayClick - Дополнительный обработчик клика по overlay
 * @param {boolean} props.preventCloseOnSubmit - Предотвращать закрытие во время загрузки
 * @param {React.ReactNode} props.headerContent - Кастомный контент заголовка
 * @param {React.ReactNode} props.footerContent - Кастомный контент футера
 * 
 * @param {string} props.animation - Тип анимации: 'fade' | 'slide-down' | 'slide-up' | 'zoom' | 'none' (по умолчанию: 'fade')
 * @param {number} props.animationDuration - Длительность анимации в мс (по умолчанию: 300)
 * @param {string} props.animationEasing - Функция easing для анимации (по умолчанию: 'ease-out')
 * @param {boolean} props.enableCloseAnimation - Включить анимацию закрытия (по умолчанию: true)
 * 
 * @param {string} props.overlayType - Тип оверлея: 'dimmed' | 'blur' | 'blur-dark' | 'transparent' | 'none' (по умолчанию: 'dimmed')
 * @param {string} props.overlayColor - Цвет оверлея (по умолчанию: '#000000')
 * @param {number} props.overlayOpacity - Прозрачность оверлея от 0 до 1 (по умолчанию: 0.5)
 * @param {number} props.overlayBlur - Интенсивность блюра в пикселях (по умолчанию: 0)
 */
const UniversalModal = ({
    // Основные параметры
    isOpen,
    onClose,
    title = '',
    icon = '',

    // Контент
    children,

    // Кнопки действий
    actions = [],

    // Стилизация
    styles = {},
    size = {},
    className = '',

    // Поведение
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    zIndex = 1050,
    showHeader = true,
    showFooter = true,
    preventCloseOnSubmit = false,

    // Дополнительные обработчики
    onOverlayClick = null,

    // Кастомный контент
    headerContent = null,
    footerContent = null,

    // Настройки анимации
    animation = 'fade',
    animationDuration = 300,
    animationEasing = 'ease-out',
    enableCloseAnimation = true,

    // Настройки оверлея
    overlayType = 'dimmed',
    overlayColor = '#000000',
    overlayOpacity = 0.5,
    overlayBlur = 0
}) => {
    // Состояние загрузки для предотвращения закрытия во время submit
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Состояние для анимации закрытия
    const [isClosing, setIsClosing] = useState(false);

    // Обработчик закрытия модального окна с анимацией
    const handleClose = () => {
        if (!preventCloseOnSubmit || !isSubmitting) {
            if (enableCloseAnimation && animation !== 'none') {
                // Запускаем анимацию закрытия
                setIsClosing(true);
                setTimeout(() => {
                    setIsClosing(false);
                    onClose();
                }, animationDuration);
            } else {
                onClose();
            }
        }
    };

    // Сброс состояния закрытия при открытии
    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
        }
    }, [isOpen]);

    // Обработчик клика по overlay
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            if (closeOnOverlayClick) {
                handleClose();
            }
            if (onOverlayClick) {
                onOverlayClick(e);
            }
        }
    };

    // Обработчик нажатия Escape
    useEffect(() => {
        if (!closeOnEscape || !isOpen) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeOnEscape]);

    // === Вспомогательные функции ===

    // Конвертация HEX в RGB
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
            : '0, 0, 0';
    };

    // Capitalize first letter
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

    // === Базовые стили модального окна ===
    const baseOverlayStyles = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: zIndex,
        padding: '1rem',
        ...styles.overlay
    };

    const baseModalStyles = {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: size.width || 'auto',
        height: size.height || 'auto',
        maxWidth: size.maxWidth || '600px',
        maxHeight: size.maxHeight || '80vh',
        ...styles.modal
    };

    // === Логика настроек оверлея ===
    const getOverlayStyles = () => {
        let overlayStyles = { ...baseOverlayStyles };

        switch (overlayType) {
            case 'dimmed':
                overlayStyles.backgroundColor = `rgba(${hexToRgb(overlayColor)}, ${overlayOpacity})`;
                break;
            case 'blur':
                overlayStyles.backgroundColor = `rgba(${hexToRgb(overlayColor)}, ${overlayOpacity * 0.3})`;
                overlayStyles.backdropFilter = `blur(${overlayBlur || 4}px)`;
                break;
            case 'blur-dark':
                overlayStyles.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                overlayStyles.backdropFilter = `blur(${overlayBlur || 8}px)`;
                break;
            case 'transparent':
                overlayStyles.backgroundColor = 'transparent';
                break;
            case 'none':
                overlayStyles.backgroundColor = 'transparent';
                overlayStyles.pointerEvents = 'none';
                break;
            default:
                overlayStyles.backgroundColor = `rgba(${hexToRgb(overlayColor)}, ${overlayOpacity})`;
        }

        // Применяем кастомный блюр если указан
        if (overlayBlur > 0 && overlayType !== 'blur' && overlayType !== 'blur-dark') {
            overlayStyles.backdropFilter = `blur(${overlayBlur}px)`;
        }

        return overlayStyles;
    };

    // === Логика анимации ===
    const getAnimationStyles = (isClosingAnimation = false) => {
        if (animation === 'none') return { overlayAnim: '', modalAnim: '' };

        const duration = `${animationDuration}ms`;
        const easing = animationEasing;

        // Выбираем анимацию открытия или закрытия
        const suffix = isClosingAnimation ? 'Out' : '';

        return {
            overlayAnim: `modalOverlay${capitalize(animation)}${suffix} ${duration} ${easing} ${isClosingAnimation ? 'forwards' : 'forwards'}`,
            modalAnim: `modal${capitalize(animation)}${suffix} ${duration} ${easing} ${isClosingAnimation ? 'forwards' : 'forwards'}`
        };
    };

    // === Вычисляем финальные стили ===
    const overlayStyles = getOverlayStyles();
    const animationStyles = getAnimationStyles(isClosing);

    // Применяем анимацию (открытие или закрытие)
    if (animation !== 'none') {
        overlayStyles.animation = animationStyles.overlayAnim;
    }

    const modalStyles = {
        ...baseModalStyles,
        ...(animation !== 'none' ? { animation: animationStyles.modalAnim } : {})
    };

    // === Остальные стили ===
    const headerStyles = {
        padding: '1.5rem 2rem',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        ...styles.header
    };

    const titleStyles = {
        fontSize: '1.35rem',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        ...styles.title
    };

    const bodyStyles = {
        padding: '1.5rem 2rem',
        flex: 1,
        overflowY: 'auto',
        ...styles.body
    };

    const footerStyles = {
        padding: '1.25rem 1.5rem',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '1rem',
        backgroundColor: '#f8fafc',
        ...styles.footer
    };

    // === Рендер кнопки ===
    const renderButton = (action, index) => {
        if (action.hidden) return null;

        const {
            label,
            onClick,
            variant = 'secondary',
            disabled = false,
            loading = false,
            icon: buttonIcon = '',
            className: buttonClassName = '',
            ...buttonProps
        } = action;

        // Обработчик клика
        const handleClick = async (e) => {
            if (disabled || loading) return;

            if (preventCloseOnSubmit) {
                setIsSubmitting(true);
            }

            try {
                if (onClick) {
                    await onClick(e);
                }
            } finally {
                if (preventCloseOnSubmit) {
                    setIsSubmitting(false);
                }
            }
        };

        return (
            <Button
                key={index}
                variant={variant === 'primary' ? 'primary' : variant === 'danger' ? 'danger' : 'secondary'}
                onClick={handleClick}
                disabled={disabled || loading}
                isLoading={loading}
                icon={buttonIcon}
                className={buttonClassName}
                {...buttonProps}
            >
                {label}
            </Button>
        );
    };

    // Если модальное окно закрыто, ничего не рендерим
    if (!isOpen) return null;

    return (
        <div
            style={overlayStyles}
            onClick={handleOverlayClick}
            className={className}
        >
            <div
                style={modalStyles}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Заголовок */}
                {showHeader && (headerContent || title || showCloseButton) && (
                    <div style={headerStyles}>
                        <DevModeIndicator>
                            <div style={titleStyles}>
                                {icon && <i className={icon}></i>}
                                {headerContent || title}
                            </div>
                        </DevModeIndicator>
                        {showCloseButton && (
                            <Button
                                variant="ghost"
                                iconOnly
                                icon="fa-solid fa-times"
                                onClick={handleClose}
                                disabled={preventCloseOnSubmit && isSubmitting}
                                title="Закрыть"
                            />
                        )}
                    </div>
                )}

                {/* Основное содержимое */}
                <div style={bodyStyles}>
                    {children}
                </div>

                {/* Футер с кнопками действий */}
                {showFooter && (footerContent || actions.length > 0) && (
                    <div style={footerStyles}>
                        {footerContent}
                        {actions.map((action, index) => renderButton(action, index))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UniversalModal;

