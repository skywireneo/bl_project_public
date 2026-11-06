// src/components/ui/List.jsx
import React, { useState, useEffect, useRef } from 'react';
import DevModeIndicator from './DevModeIndicator';

/**
 * Универсальный компонент списка
 * Поддерживает множество вариантов, размеров и функций
 */
const List = ({
    // Данные
    items = [],
    children,

    // Режим
    mode = 'default', // default, select, radio, checkbox, actions

    // Внешний вид
    variant = 'default', // default, bordered, separated, card, flat, modern, glass, neon, gradient, cyber, minimal, elegant, luxury, dark, holographic, aurora, retro, nature, ocean, sunset, forest, candy, pastel, neon-glow

    // Размер
    size = 'md', // xs, sm, md, lg, xl

    // Состояния
    selected = null,
    onSelect = () => { },
    multiple = false,
    checked = [],
    onCheck = () => { },

    // Отображение
    showIcons = true,
    showNumbers = false,
    showDividers = true,
    hoverable = true,
    selectable = true,

    // Анимации
    animation = 'none', // none, fade, slide, scale, bounce, shimmer
    animateItems = false,

    // Заголовок
    header = null,
    headerStyle = {},

    // Поиск
    searchable = false,
    searchPlaceholder = 'Поиск...',
    onSearch = () => { },
    searchValue = '',
    onSearchChange = () => { },

    // Пагинация
    paginated = false,
    pageSize = 10,
    currentPage = 1,
    onPageChange = () => { },
    totalItems = null,

    // Пустое состояние
    emptyText = 'Нет элементов',
    emptyIcon = '📋',

    // Загрузка
    loading = false,
    loadingText = 'Загрузка...',

    // Кнопка "Показать еще"
    showMore = false,
    onShowMore = () => { },
    showMoreText = 'Показать еще',
    hasMore = false,

    // Группы
    groups = null,
    groupBy = null,

    // Сортировка
    sortable = false,
    sortBy = null,
    sortOrder = 'asc',
    onSort = () => { },

    // Кастомные стили
    color = null,
    backgroundColor = null,
    className = '',
    style = {},

    // Показывать звёздочку режима разработки
    showDevModeIndicator = true,

    ...props
}) => {
    // === Конфигурация размеров ===
    const sizeConfig = {
        xs: {
            padding: '6px 10px',
            fontSize: '0.75rem',
            iconSize: '0.75rem',
            gap: '6px',
            itemMinHeight: '28px',
            avatarSize: '24px',
        },
        sm: {
            padding: '8px 12px',
            fontSize: '0.8rem',
            iconSize: '0.8rem',
            gap: '8px',
            itemMinHeight: '36px',
            avatarSize: '32px',
        },
        md: {
            padding: '10px 16px',
            fontSize: '0.9rem',
            iconSize: '0.9rem',
            gap: '12px',
            itemMinHeight: '44px',
            avatarSize: '40px',
        },
        lg: {
            padding: '14px 20px',
            fontSize: '1rem',
            iconSize: '1rem',
            gap: '14px',
            itemMinHeight: '56px',
            avatarSize: '48px',
        },
        xl: {
            padding: '18px 24px',
            fontSize: '1.1rem',
            iconSize: '1.1rem',
            gap: '16px',
            itemMinHeight: '68px',
            avatarSize: '56px',
        },
    };

    // === Конфигурация вариантов (много красивых дизайнов) ===
    const variantConfig = {
        // Базовые
        default: {
            background: 'transparent',
            itemBackground: 'transparent',
            borderRadius: '0',
            itemBorderRadius: '0',
            border: 'none',
            itemBorder: 'none',
            shadow: 'none',
            hoverBackground: '#f9fafb',
            dividerColor: '#e5e7eb',
            textColor: '#374151',
            subTextColor: '#6b7280',
        },
        bordered: {
            background: '#ffffff',
            itemBackground: 'transparent',
            borderRadius: '8px',
            itemBorderRadius: '0',
            border: '1px solid #e5e7eb',
            itemBorder: 'none',
            shadow: 'none',
            hoverBackground: '#f9fafb',
            dividerColor: '#e5e7eb',
            textColor: '#374151',
            subTextColor: '#6b7280',
        },
        separated: {
            background: 'transparent',
            itemBackground: '#ffffff',
            borderRadius: '8px',
            itemBorderRadius: '8px',
            border: 'none',
            itemBorder: '1px solid #e5e7eb',
            shadow: '0 1px 3px rgba(0,0,0,0.1)',
            hoverBackground: '#f9fafb',
            dividerColor: '#e5e7eb',
            textColor: '#374151',
            subTextColor: '#6b7280',
        },
        card: {
            background: '#ffffff',
            itemBackground: '#ffffff',
            borderRadius: '12px',
            itemBorderRadius: '12px',
            border: 'none',
            itemBorder: 'none',
            shadow: '0 4px 12px rgba(0,0,0,0.08)',
            hoverBackground: '#f9fafb',
            dividerColor: '#f3f4f6',
            textColor: '#374151',
            subTextColor: '#6b7280',
        },
        flat: {
            background: '#f9fafb',
            itemBackground: 'transparent',
            borderRadius: '8px',
            itemBorderRadius: '0',
            border: 'none',
            itemBorder: 'none',
            shadow: 'none',
            hoverBackground: '#f3f4f6',
            dividerColor: '#e5e7eb',
            textColor: '#374151',
            subTextColor: '#6b7280',
        },
        modern: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            itemBackground: 'rgba(255,255,255,0.95)',
            borderRadius: '16px',
            itemBorderRadius: '12px',
            border: 'none',
            itemBorder: 'none',
            shadow: '0 8px 32px rgba(0,0,0,0.15)',
            hoverBackground: '#ffffff',
            dividerColor: 'rgba(255,255,255,0.3)',
            textColor: '#1f2937',
            subTextColor: '#6b7280',
        },

        // Красивые новые дизайны
        glass: {
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
            backdropFilter: 'blur(10px)',
            itemBackground: 'rgba(255,255,255,0.6)',
            borderRadius: '16px',
            itemBorderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.5)',
            itemBorder: 'none',
            shadow: '0 8px 32px rgba(0,0,0,0.08)',
            hoverBackground: 'rgba(255,255,255,0.9)',
            dividerColor: 'rgba(0,0,0,0.05)',
            textColor: '#1f2937',
            subTextColor: '#6b7280',
        },
        neon: {
            background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
            itemBackground: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
            itemBorderRadius: '8px',
            border: 'none',
            itemBorder: '1px solid rgba(0,255,255,0.2)',
            shadow: '0 0 20px rgba(0,255,255,0.3)',
            hoverBackground: 'rgba(0,255,255,0.1)',
            dividerColor: 'rgba(0,255,255,0.2)',
            textColor: '#00ffff',
            subTextColor: '#a0a0a0',
            glow: '0 0 10px rgba(0,255,255,0.5)',
        },
        gradient: {
            background: 'linear-gradient(45deg, #f093fb 0%, #f5576c 50%, #fa709a 100%)',
            itemBackground: '#ffffff',
            borderRadius: '16px',
            itemBorderRadius: '12px',
            border: 'none',
            itemBorder: 'none',
            shadow: '0 10px 40px rgba(245,87,108,0.3)',
            hoverBackground: '#ffffff',
            dividerColor: 'rgba(255,255,255,0.5)',
            textColor: '#ffffff',
            subTextColor: 'rgba(255,255,255,0.8)',
        },
        cyber: {
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            itemBackground: 'rgba(233,69,96,0.1)',
            borderRadius: '4px',
            itemBorderRadius: '0',
            border: 'none',
            itemBorder: '1px solid #e94560',
            shadow: '0 0 15px rgba(233,69,96,0.3)',
            hoverBackground: 'rgba(233,69,96,0.2)',
            dividerColor: 'rgba(233,69,96,0.3)',
            textColor: '#e94560',
            subTextColor: '#a0a0a0',
        },
        minimal: {
            background: 'transparent',
            itemBackground: 'transparent',
            borderRadius: '0',
            itemBorderRadius: '0',
            border: 'none',
            itemBorder: 'none',
            shadow: 'none',
            hoverBackground: 'rgba(0,0,0,0.03)',
            dividerColor: 'rgba(0,0,0,0.08)',
            textColor: '#1f2937',
            subTextColor: '#9ca3af',
        },
        elegant: {
            background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
            itemBackground: '#ffffff',
            borderRadius: '8px',
            itemBorderRadius: '8px',
            border: 'none',
            itemBorder: '1px solid rgba(0,0,0,0.05)',
            shadow: '0 2px 8px rgba(0,0,0,0.04)',
            hoverBackground: '#fafafa',
            dividerColor: 'rgba(0,0,0,0.05)',
            textColor: '#2d3436',
            subTextColor: '#636e72',
        },
        luxury: {
            background: 'linear-gradient(135deg, #1e130c 0%, #2d2319 50%, #1a1512 100%)',
            itemBackground: 'rgba(212,175,55,0.08)',
            borderRadius: '2px',
            itemBorderRadius: '0',
            border: 'none',
            itemBorder: '1px solid rgba(212,175,55,0.3)',
            shadow: 'inset 0 0 30px rgba(212,175,55,0.05)',
            hoverBackground: 'rgba(212,175,55,0.15)',
            dividerColor: 'rgba(212,175,55,0.2)',
            textColor: '#d4af37',
            subTextColor: '#a0a0a0',
        },
        dark: {
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            itemBackground: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
            itemBorderRadius: '8px',
            border: 'none',
            itemBorder: 'none',
            shadow: '0 4px 20px rgba(0,0,0,0.3)',
            hoverBackground: 'rgba(255,255,255,0.1)',
            dividerColor: 'rgba(255,255,255,0.1)',
            textColor: '#ffffff',
            subTextColor: '#a0a0a0',
        },
        holographic: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #fa709a 75%, #fee140 100%)',
            itemBackground: 'rgba(255,255,255,0.95)',
            borderRadius: '20px',
            itemBorderRadius: '16px',
            border: 'none',
            itemBorder: 'none',
            shadow: '0 15px 50px rgba(0,0,0,0.2)',
            hoverBackground: '#ffffff',
            dividerColor: 'rgba(0,0,0,0.1)',
            textColor: '#1f2937',
            subTextColor: '#6b7280',
            iridescent: 'linear-gradient(45deg, rgba(255,255,255,0.8), rgba(102,126,234,0.3), rgba(250,112,154,0.3), rgba(254,225,64,0.3))',
        },
        aurora: {
            background: 'linear-gradient(180deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
            itemBackground: 'rgba(255,255,255,0.08)',
            borderRadius: '24px',
            itemBorderRadius: '16px',
            border: 'none',
            itemBorder: '1px solid rgba(255,255,255,0.1)',
            shadow: '0 8px 32px rgba(0,0,0,0.3)',
            hoverBackground: 'rgba(255,255,255,0.12)',
            dividerColor: 'rgba(255,255,255,0.1)',
            textColor: '#ffffff',
            subTextColor: 'rgba(255,255,255,0.7)',
            aurora: 'linear-gradient(45deg, #00d2ff, #3a7bd5, #00d2ff)',
        },
        retro: {
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            itemBackground: '#ffffff',
            borderRadius: '0',
            itemBorderRadius: '0',
            border: 'none',
            itemBorder: '2px solid #333',
            shadow: '4px 4px 0px #333',
            hoverBackground: '#ffff00',
            dividerColor: '#333',
            textColor: '#333333',
            subTextColor: '#666666',
        },
        nature: {
            background: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
            itemBackground: 'rgba(255,255,255,0.95)',
            borderRadius: '20px',
            itemBorderRadius: '12px',
            border: 'none',
            itemBorder: 'none',
            shadow: '0 10px 40px rgba(0,0,0,0.15)',
            hoverBackground: '#ffffff',
            dividerColor: 'rgba(0,0,0,0.1)',
            textColor: '#2d5a27',
            subTextColor: '#5a8a3c',
        },
        ocean: {
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #4facfe 100%)',
            itemBackground: 'rgba(255,255,255,0.95)',
            borderRadius: '16px',
            itemBorderRadius: '12px',
            border: 'none',
            itemBorder: 'none',
            shadow: '0 10px 40px rgba(0,0,0,0.2)',
            hoverBackground: '#ffffff',
            dividerColor: 'rgba(0,0,0,0.1)',
            textColor: '#1e3c72',
            subTextColor: '#4a90d9',
        },
        sunset: {
            background: 'linear-gradient(135deg, #fe8c00 0%, #f83600 50%, #fe8c00 100%)',
            itemBackground: '#ffffff',
            borderRadius: '16px',
            itemBorderRadius: '12px',
            border: 'none',
            itemBorder: 'none',
            shadow: '0 10px 40px rgba(248,54,0,0.3)',
            hoverBackground: '#ffffff',
            dividerColor: 'rgba(0,0,0,0.1)',
            textColor: '#8b4000',
            subTextColor: '#d97b00',
        },
        forest: {
            background: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
            itemBackground: 'rgba(255,255,255,0.95)',
            borderRadius: '20px',
            itemBorderRadius: '16px',
            border: 'none',
            itemBorder: 'none',
            shadow: '0 10px 40px rgba(0,0,0,0.15)',
            hoverBackground: '#ffffff',
            dividerColor: 'rgba(0,0,0,0.1)',
            textColor: '#1a4731',
            subTextColor: '#4a7c59',
        },
        candy: {
            background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
            itemBackground: '#ffffff',
            borderRadius: '24px',
            itemBorderRadius: '20px',
            border: 'none',
            itemBorder: 'none',
            shadow: '0 10px 40px rgba(252,182,159,0.4)',
            hoverBackground: '#fff5f0',
            dividerColor: 'rgba(0,0,0,0.08)',
            textColor: '#d45d79',
            subTextColor: '#a67c52',
        },
        pastel: {
            background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            itemBackground: 'rgba(255,255,255,0.9)',
            borderRadius: '20px',
            itemBorderRadius: '16px',
            border: 'none',
            itemBorder: 'none',
            shadow: '0 10px 40px rgba(0,0,0,0.1)',
            hoverBackground: '#ffffff',
            dividerColor: 'rgba(0,0,0,0.08)',
            textColor: '#5d5d5d',
            subTextColor: '#8a8a8a',
        },
        neonGlow: {
            background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
            itemBackground: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            itemBorderRadius: '8px',
            border: 'none',
            itemBorder: '1px solid #00ff88',
            shadow: '0 0 15px rgba(0,255,136,0.4), inset 0 0 15px rgba(0,255,136,0.1)',
            hoverBackground: 'rgba(0,255,136,0.15)',
            dividerColor: 'rgba(0,255,136,0.3)',
            textColor: '#00ff88',
            subTextColor: '#00cc6a',
        },
    };

    // === Конфигурация цветов ===
    const colors = {
        primary: { bg: '#3b82f6', color: '#ffffff', hover: '#2563eb' },
        success: { bg: '#10b981', color: '#ffffff', hover: '#059669' },
        warning: { bg: '#f59e0b', color: '#ffffff', hover: '#d97706' },
        danger: { bg: '#ef4444', color: '#ffffff', hover: '#dc2626' },
        info: { bg: '#06b6d4', color: '#ffffff', hover: '#0891b2' },
        purple: { bg: '#8b5cf6', color: '#ffffff', hover: '#7c3aed' },
        pink: { bg: '#ec4899', color: '#ffffff', hover: '#db2777' },
    };

    // === Состояния ===
    const [internalSearch, setInternalSearch] = useState('');
    const searchInputRef = useRef(null);

    // === Получаем значения ===
    const currentSize = sizeConfig[size] || sizeConfig.md;
    const currentVariant = variantConfig[variant] || variantConfig.default;
    const currentColor = colors[color] || colors.primary;

    // === Поиск ===
    const searchTerm = searchValue || internalSearch;
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setInternalSearch(value);
        onSearchChange(value);
        onSearch(value);
    };

    // === Фильтрация ===
    const filteredItems = items.filter(item => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            (item.label && item.label.toLowerCase().includes(searchLower)) ||
            (item.title && item.title.toLowerCase().includes(searchLower)) ||
            (item.name && item.name.toLowerCase().includes(searchLower)) ||
            (item.description && item.description.toLowerCase().includes(searchLower))
        );
    });

    // === Группировка ===
    const groupedItems = groupBy ? filteredItems.reduce((groups, item) => {
        const group = item[groupBy] || 'Без группы';
        if (!groups[group]) {
            groups[group] = [];
        }
        groups[group].push(item);
        return groups;
    }, {}) : { 'default': filteredItems };

    // === Выбор ===
    const handleSelect = (item) => {
        if (!selectable) return;

        if (multiple) {
            const isSelected = Array.isArray(selected) && selected.includes(item.id);
            if (isSelected) {
                onSelect(selected.filter(id => id !== item.id));
            } else {
                onSelect([...selected, item.id]);
            }
        } else {
            onSelect(item.id === selected ? null : item.id);
        }
    };

    // === Чекбокс ===
    const handleCheck = (item) => {
        const isChecked = checked.includes(item.id);
        if (isChecked) {
            onCheck(checked.filter(id => id !== item.id));
        } else {
            onCheck([...checked, item.id]);
        }
    };

    // === Проверка выбранного ===
    const isSelected = (item) => {
        if (multiple) {
            return Array.isArray(selected) && selected.includes(item.id);
        }
        return selected === item.id;
    };

    const isChecked = (item) => checked.includes(item.id);

    // === Анимации ===
    const getItemAnimation = (index) => {
        if (!animateItems || animation === 'none') return {};

        const animations = {
            fade: {
                animation: `fadeIn 0.3s ease ${index * 0.05}s both`,
            },
            slide: {
                animation: `slideIn 0.3s ease ${index * 0.05}s both`,
            },
            scale: {
                animation: `scaleIn 0.3s ease ${index * 0.05}s both`,
            },
            bounce: {
                animation: `bounceIn 0.5s ease ${index * 0.05}s both`,
            },
            shimmer: {
                animation: `shimmer 2s infinite`,
                background: `linear-gradient(90deg, ${currentVariant.itemBackground} 25%, ${currentVariant.hoverBackground} 50%, ${currentVariant.itemBackground} 75%)`,
                backgroundSize: '200% 100%',
            },
        };

        return animations[animation] || {};
    };

    // === Стили ===
    const containerStyle = {
        background: currentVariant.background,
        borderRadius: currentVariant.borderRadius,
        border: currentVariant.border,
        boxShadow: currentVariant.shadow,
        overflow: 'hidden',
        ...(currentVariant.backdropFilter && { backdropFilter: currentVariant.backdropFilter }),
        ...(backgroundColor && { background: backgroundColor }),
        ...style,
    };

    const itemStyle = (item, index) => ({
        display: 'flex',
        alignItems: 'center',
        gap: currentSize.gap,
        padding: currentSize.padding,
        fontSize: currentSize.fontSize,
        minHeight: currentSize.itemMinHeight,
        background: isSelected(item)
            ? (color ? `${currentColor.bg}15` : `${currentVariant.textColor}10`)
            : hoverable
                ? currentVariant.hoverBackground
                : 'transparent',
        borderBottom: showDividers && index !== filteredItems.length - 1
            ? `1px solid ${currentVariant.dividerColor}`
            : 'none',
        cursor: selectable ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        borderRadius: index === 0 ? `${currentVariant.itemBorderRadius} ${currentVariant.itemBorderRadius} 0 0` :
            index === filteredItems.length - 1 ? `0 0 ${currentVariant.itemBorderRadius} ${currentVariant.itemBorderRadius}` :
                '0',
        border: currentVariant.itemBorder,
        color: currentVariant.textColor,
        ...(currentVariant.glow && isSelected(item) && { boxShadow: currentVariant.glow }),
        ...getItemAnimation(index),
    });

    // === Рендер элемента ===
    const renderItem = (item, index) => {
        const itemContent = (
            <div
                key={item.id || index}
                style={itemStyle(item, index)}
                onClick={() => {
                    if (mode === 'checkbox') {
                        handleCheck(item);
                    } else if (mode === 'select' || mode === 'radio') {
                        handleSelect(item);
                    } else if (item.onClick) {
                        item.onClick(item);
                    }
                }}
                {...props}
            >
                {/* Чекбокс */}
                {mode === 'checkbox' && (
                    <input
                        type="checkbox"
                        checked={isChecked(item)}
                        onChange={() => { }}
                        style={{
                            width: '16px',
                            height: '16px',
                            cursor: 'pointer',
                            accentColor: currentColor.bg,
                        }}
                    />
                )}

                {/* Радио кнопка */}
                {(mode === 'radio' || mode === 'select') && (
                    <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: `2px solid ${isSelected(item) ? currentColor.bg : currentVariant.textColor}40`,
                        background: isSelected(item) ? currentColor.bg : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        flexShrink: 0,
                    }}>
                        {isSelected(item) && (
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: '#fff',
                            }} />
                        )}
                    </div>
                )}

                {/* Номер */}
                {showNumbers && (
                    <span style={{
                        color: currentVariant.subTextColor,
                        fontWeight: '600',
                        minWidth: '24px',
                    }}>
                        {index + 1}.
                    </span>
                )}

                {/* Иконка */}
                {showIcons && item.icon && (
                    <span
                        className={item.icon}
                        style={{
                            fontSize: currentSize.iconSize,
                            color: item.iconColor || currentVariant.textColor,
                            flexShrink: 0,
                        }}
                    />
                )}

                {/* Аватар */}
                {item.avatar && (
                    <img
                        src={item.avatar}
                        alt=""
                        style={{
                            width: currentSize.avatarSize,
                            height: currentSize.avatarSize,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            flexShrink: 0,
                            border: `2px solid ${currentVariant.textColor}20`,
                        }}
                    />
                )}

                {/* Изображение */}
                {item.image && !item.avatar && (
                    <img
                        src={item.image}
                        alt=""
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            flexShrink: 0,
                        }}
                    />
                )}

                {/* Контент */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontWeight: item.bold ? '600' : '400',
                        color: isSelected(item) ? currentColor.bg : currentVariant.textColor,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                        {item.label || item.title || item.name}
                    </div>
                    {item.description && (
                        <div style={{
                            fontSize: '0.85em',
                            color: currentVariant.subTextColor,
                            marginTop: '2px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {item.description}
                        </div>
                    )}
                </div>

                {/* Дополнительный контент */}
                {item.badge && (
                    <span style={{
                        padding: '2px 8px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        borderRadius: '12px',
                        background: item.badgeColor || currentColor.bg,
                        color: item.badgeTextColor || '#fff',
                    }}>
                        {item.badge}
                    </span>
                )}

                {/* Статус */}
                {item.status && (
                    <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: item.status === 'online' ? '#10b981' :
                            item.status === 'offline' ? '#9ca3af' :
                                item.status === 'busy' ? '#ef4444' : '#f59e0b',
                        boxShadow: `0 0 8px ${item.status === 'online' ? '#10b981' : item.status === 'busy' ? '#ef4444' : '#f59e0b'}`,
                    }} />
                )}

                {/* Кнопка действий */}
                {item.actions && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {item.actions.map((action, i) => (
                            <button
                                key={i}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    action.onClick(item);
                                }}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '0.8rem',
                                    border: 'none',
                                    borderRadius: '4px',
                                    background: action.variant === 'danger' ? '#fee2e2' : '#f3f4f6',
                                    color: action.variant === 'danger' ? '#dc2626' : '#6b7280',
                                    cursor: 'pointer',
                                }}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );

        return itemContent;
    };

    // === Рендер заголовка ===
    const renderHeader = () => {
        if (!header) return null;

        return (
            <div style={{
                padding: currentSize.padding,
                borderBottom: `1px solid ${currentVariant.dividerColor}`,
                fontWeight: '600',
                color: currentVariant.textColor,
                ...headerStyle,
            }}>
                {header}
            </div>
        );
    };

    // === Рендер поиска ===
    const renderSearch = () => {
        if (!searchable) return null;

        return (
            <div style={{ padding: '12px', borderBottom: `1px solid ${currentVariant.dividerColor}` }}>
                <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder={searchPlaceholder}
                    style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: currentSize.fontSize,
                        border: `1px solid ${currentVariant.dividerColor}`,
                        borderRadius: '6px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: currentVariant.itemBackground,
                        color: currentVariant.textColor,
                    }}
                />
            </div>
        );
    };

    // === Рендер пустого состояния ===
    const renderEmpty = () => {
        if (filteredItems.length > 0) return null;

        return (
            <div style={{
                padding: '32px',
                textAlign: 'center',
                color: currentVariant.subTextColor,
            }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{emptyIcon}</div>
                <div>{emptyText}</div>
            </div>
        );
    };

    // === Рендер загрузки ===
    const renderLoading = () => {
        if (!loading) return null;

        return (
            <div style={{
                padding: '32px',
                textAlign: 'center',
                color: currentVariant.subTextColor,
            }}>
                <div style={{
                    width: '24px',
                    height: '24px',
                    border: `2px solid ${currentVariant.dividerColor}`,
                    borderTopColor: currentColor.bg,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 8px',
                }} />
                <div>{loadingText}</div>
            </div>
        );
    };

    // === Рендер "Показать еще" ===
    const renderShowMore = () => {
        if (!showMore || !hasMore || loading) return null;

        return (
            <button
                onClick={onShowMore}
                style={{
                    width: '100%',
                    padding: currentSize.padding,
                    border: 'none',
                    borderTop: `1px solid ${currentVariant.dividerColor}`,
                    background: 'transparent',
                    color: color ? currentColor.color : currentVariant.textColor,
                    fontSize: currentSize.fontSize,
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => e.target.style.background = currentVariant.hoverBackground}
                onMouseOut={(e) => e.target.style.background = 'transparent'}
            >
                {showMoreText}
            </button>
        );
    };

    // === Основной рендер ===
    const listElement = (
        <div style={containerStyle} className={`list-container ${className}`}>
            {renderHeader()}
            {renderSearch()}
            {renderLoading()}
            {renderEmpty()}

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {children || Object.entries(groupedItems).map(([groupName, groupItems]) => (
                    <div key={groupName}>
                        {groups && (
                            <div style={{
                                padding: '8px 16px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: currentVariant.subTextColor,
                                textTransform: 'uppercase',
                                background: currentVariant.hoverBackground,
                                borderBottom: `1px solid ${currentVariant.dividerColor}`,
                            }}>
                                {groupName}
                            </div>
                        )}
                        {groupItems.map((item, index) => renderItem(item, index))}
                    </div>
                ))}
            </div>

            {renderShowMore()}
        </div>
    );

    if (showDevModeIndicator) {
        return <DevModeIndicator>{listElement}</DevModeIndicator>;
    }

    return listElement;
};

// === Предустановленные варианты ===

// Список с иконками
List.Icons = (props) => (
    <List
        variant="separated"
        showIcons={true}
        hoverable={true}
        {...props}
    />
);

// Выбираемый список
List.Select = (props) => (
    <List
        mode="select"
        variant="bordered"
        hoverable={true}
        {...props}
    />
);

// Чекбокс список
List.Checkbox = (props) => (
    <List
        mode="checkbox"
        variant="bordered"
        {...props}
    />
);

// Карточки
List.Cards = (props) => (
    <List
        variant="card"
        showDividers={false}
        {...props}
    />
);

// Компактный
List.Compact = (props) => (
    <List
        size="sm"
        variant="flat"
        showDividers={true}
        {...props}
    />
);

// Современный
List.Modern = (props) => (
    <List
        variant="modern"
        showIcons={true}
        {...props}
    />
);

// Glass эффект
List.Glass = (props) => (
    <List
        variant="glass"
        showIcons={true}
        {...props}
    />
);

// Neon
List.Neon = (props) => (
    <List
        variant="neon"
        showIcons={true}
        {...props}
    />
);

// Gradient
List.Gradient = (props) => (
    <List
        variant="gradient"
        {...props}
    />
);

// Cyber
List.Cyber = (props) => (
    <List
        variant="cyber"
        showIcons={true}
        {...props}
    />
);

// Dark
List.Dark = (props) => (
    <List
        variant="dark"
        showIcons={true}
        {...props}
    />
);

// Luxury
List.Luxury = (props) => (
    <List
        variant="luxury"
        showIcons={true}
        {...props}
    />
);

// Nature
List.Nature = (props) => (
    <List
        variant="nature"
        showIcons={true}
        {...props}
    />
)

// Ocean
List.Ocean = (props) => (
    <List
        variant="ocean"
        showIcons={true}
        {...props}
    />
);

// Sunset
List.Sunset = (props) => (
    <List
        variant="sunset"
        {...props}
    />
);

// Pastel
List.Pastel = (props) => (
    <List
        variant="pastel"
        showIcons={true}
        {...props}
    />
);

// Holographic
List.Holographic = (props) => (
    <List
        variant="holographic"
        {...props}
    />
);

// Aurora
List.Aurora = (props) => (
    <List
        variant="aurora"
        showIcons={true}
        {...props}
    />
);

// Retro
List.Retro = (props) => (
    <List
        variant="retro"
        {...props}
    />
);

// Minimal
List.Minimal = (props) => (
    <List
        variant="minimal"
        {...props}
    />
);

// Elegant
List.Elegant = (props) => (
    <List
        variant="elegant"
        showIcons={true}
        {...props}
    />
);

// Neon Glow
List.NeonGlow = (props) => (
    <List
        variant="neonGlow"
        showIcons={true}
        {...props}
    />
);

export default List;
