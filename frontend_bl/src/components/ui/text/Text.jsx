// src/components/ui/text/Text.jsx
import React from 'react';
import DevModeIndicator from '../DevModeIndicator';

/**
 * Универсальный текстовый компонент с множеством стилей и настроек
 */
const Text = ({
    children,

    // === ТИП ЭЛЕМЕНТА ===
    // variant - какой HTML тег использовать
    variant = 'span',

    // === ЦВЕТ ТЕКСТА ===
    // type - цветовая схема (зависит от colorMap)
    type = 'default',

    // === РАЗМЕР ===
    // size - размер шрифта
    size = 'md',

    // === ВЕС ШРИФТА ===
    weight = 'normal',

    // === ВЫРАВНИВАНИЕ ===
    align = 'left',

    // === СТИЛИ ТЕКСТА ===
    italic = false,
    underline = false,
    strike = false,
    uppercase = false,
    lowercase = false,
    capitalize = false,
    lineHeight = 'normal', // normal, none, 1, 1.5, 2, 3

    // === ЯВНЫЙ ЦВЕТ ===
    color = null,

    // === ФОН ===
    backgroundColor = null,
    backgroundImage = null,
    backgroundSize = 'cover',
    backgroundPosition = 'center',

    // === ГРАНИЦЫ ===
    border = null,
    borderTop = null,
    borderBottom = null,
    borderLeft = null,
    borderRight = null,
    borderRadius = null,

    // === ОТСТУПЫ (ВНЕ) ===
    margin = null,
    marginTop = null,
    marginBottom = null,
    marginLeft = null,
    marginRight = null,
    marginX = null,
    marginY = null,

    // === ОТСТУПЫ (ВНУТРИ) ===
    padding = null,
    paddingTop = null,
    paddingBottom = null,
    paddingLeft = null,
    paddingRight = null,
    paddingX = null,
    paddingY = null,

    // === ТЕНЬ ===
    shadow = 'none',
    shadowColor = null,

    // === АНИМАЦИЯ ===
    animation = 'none',

    // === ПОВЕДЕНИЕ ===
    truncate = false,
    selectable = true,
    wrap = true,
    whitespace = 'normal', // normal, nowrap, pre, pre-line, pre-wrap

    // === ШИРИНА / ВЫСОТА ===
    width = null,
    height = null,
    minWidth = null,
    maxWidth = null,
    minHeight = null,
    maxHeight = null,

    // === ПОЗИЦИОНИРОВАНИЕ ===
    position = null,
    top = null,
    right = null,
    bottom = null,
    left = null,
    zIndex = null,
    float = null, // left, right, none
    clear = null, // left, right, both, none

    // === FLEX ===
    flex = null,
    flexGrow = null,
    flexShrink = null,
    flexBasis = null,
    justifyContent = null,
    alignItems = null,
    alignSelf = null,
    order = null,

    // === GRID ===
    gridColumn = null,
    gridRow = null,
    gridArea = null,

    // === КЛАССЫ ===
    className = '',

    // === СТИЛИ ===
    style = {},

    // === DEV MODE ===
    showDevModeIndicator = true,

    // Остальные пропсы
    ...props
}) => {
    // === КОНФИГУРАЦИЯ ===
    // Размеры шрифтов
    const sizeMap = {
        // Абсолютные
        'xs': '0.75rem',    // 12px
        'sm': '0.875rem',   // 14px
        'base': '1rem',     // 16px
        'md': '1rem',       // 16px
        'lg': '1.125rem',   // 18px
        'xl': '1.25rem',    // 20px
        // Относительные
        '2xl': '1.5rem',    // 24px
        '3xl': '1.875rem',  // 30px
        '4xl': '2.25rem',   // 36px
        '5xl': '3rem',      // 48px
        '6xl': '3.75rem',   // 60px
        '7xl': '4.5rem',    // 72px
        '8xl': '6rem',      // 96px
        '9xl': '8rem',      // 128px
    };

    // Веса шрифтов
    const weightMap = {
        'thin': '100',
        'extralight': '200',
        'light': '300',
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
        'extrabold': '800',
        'black': '900',
    };

    // Цветовые схемы
    const colorMap = {
        // Основные
        'default': '#374151',     // Серый 700
        'primary': '#3b82f6',    // Синий 500
        'secondary': '#64748b',  // Серый 500
        'success': '#10b981',    // Зелёный 500
        'warning': '#f59e0b',    // Жёлтый 500
        'danger': '#ef4444',     // Красный 500
        'info': '#06b6d4',       // Голубой 500

        // Оттенки серого
        'muted': '#9ca3af',      // Серый 400
        'light': '#f9fafb',      // Серый 50
        'dark': '#1e293b',       // Серый 800
        'black': '#000000',
        'white': '#ffffff',

        // Цветные оттенки (50-900)
        'blue': { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
        'green': { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' },
        'red': { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d' },
        'yellow': { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12' },
        'purple': { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87' },
    };

    // Карта теней
    const shadowMap = {
        'none': 'none',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'sm': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        'glow': `0 0 15px ${shadowColor || '#3b82f6'}`,
    };

    // Карта анимаций
    const animationMap = {
        'none': 'none',
        'fade': 'text-fade 2s ease-in-out infinite',
        'slide': 'text-slide 1s ease-in-out infinite',
        'pulse': 'text-pulse 2s ease-in-out infinite',
        'bounce': 'text-bounce 1s ease-in-out infinite',
        'shake': 'text-shake 0.5s ease-in-out infinite',
        'wiggle': 'text-wiggle 0.5s ease-in-out infinite',
        'flash': 'text-flash 1s ease-in-out infinite',
        'spin': 'text-spin 1s linear infinite',
    };

    // Карта line-height
    const lineHeightMap = {
        'none': '1',
        'tight': '1.25',
        'snug': '1.375',
        'normal': '1.5',
        'relaxed': '1.625',
        'loose': '2',
    };

    // === ВЫЧИСЛЯЕМЫЕ ЗНАЧЕНИЯ ===
    // Размер
    const fontSize = sizeMap[size] || size || sizeMap.md;

    // Вес
    const fontWeight = weightMap[weight] || weight || '400';

    // Цвет
    let textColor;
    if (color) {
        textColor = color;
    } else if (colorMap[type]) {
        if (typeof colorMap[type] === 'object') {
            textColor = colorMap[type][500] || colorMap[type];
        } else {
            textColor = colorMap[type];
        }
    } else {
        textColor = colorMap.default;
    }

    // Тень
    const finalShadow = shadow !== 'none' ? shadowMap[shadow] || shadow : 'none';

    // Line height
    const finalLineHeight = lineHeightMap[lineHeight] || lineHeight;

    // === CSS KEYFRAMES ===
    const keyframes = `
        @keyframes text-fade { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes text-slide { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(5px); } 75% { transform: translateX(-5px); } }
        @keyframes text-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.98); } }
        @keyframes text-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes text-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @keyframes text-wiggle { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-3deg); } 75% { transform: rotate(3deg); } }
        @keyframes text-flash { 0%, 50%, 100% { opacity: 1; } 25%, 75% { opacity: 0; } }
        @keyframes text-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    `;

    // === СТИЛИ ===
    const textStyles = {
        // Основные
        display: variant.match(/^h[1-6]$/) ? 'block' : (truncate ? 'block' : 'inline'),
        fontSize,
        fontWeight,
        textAlign: align,
        color: textColor,
        lineHeight: finalLineHeight,

        // Стили текста
        fontStyle: italic ? 'italic' : 'normal',
        textDecoration: [
            underline ? 'underline' : null,
            strike ? 'line-through' : null
        ].filter(Boolean).join(' ') || 'none',
        textTransform: [
            uppercase ? 'uppercase' : null,
            lowercase ? 'lowercase' : null,
            capitalize ? 'capitalize' : null
        ].filter(Boolean).join(' ') || 'none',

        // Фон
        backgroundColor,
        backgroundImage,
        backgroundSize,
        backgroundPosition,

        // Границы
        border,
        borderTop,
        borderBottom,
        borderLeft,
        borderRight,
        borderRadius,

        // Отступы - margin
        margin: margin || undefined,
        marginTop: marginY || marginTop || undefined,
        marginBottom: marginY || marginBottom || undefined,
        marginLeft: marginX || marginLeft || undefined,
        marginRight: marginX || marginRight || undefined,

        // Отступы - padding
        padding: padding || undefined,
        paddingTop: paddingY || paddingTop || undefined,
        paddingBottom: paddingY || paddingBottom || undefined,
        paddingLeft: paddingX || paddingLeft || undefined,
        paddingRight: paddingX || paddingRight || undefined,

        // Тень
        textShadow: finalShadow !== 'none' && shadow !== 'inner' ? finalShadow : 'none',
        boxShadow: shadow === 'inner' ? finalShadow : (shadow !== 'none' && shadow !== 'glow' ? finalShadow : 'none'),

        // Анимация
        ...(animation !== 'none' && { animation: animationMap[animation] || 'none' }),

        // Поведение
        overflow: truncate ? 'hidden' : undefined,
        textOverflow: truncate ? 'ellipsis' : undefined,
        whiteSpace: !wrap ? 'nowrap' : (truncate ? 'nowrap' : whitespace),
        userSelect: selectable ? 'auto' : 'none',

        // Размеры
        width,
        height,
        minWidth,
        maxWidth,
        minHeight,
        maxHeight,

        // Позиционирование
        position,
        top,
        right,
        bottom,
        left,
        zIndex,
        float,
        clear,

        // Flex
        flex,
        flexGrow,
        flexShrink,
        flexBasis,
        justifyContent,
        alignItems,
        alignSelf,
        order,

        // Grid
        gridColumn,
        gridRow,
        gridArea,

        // Дополнительные стили
        ...style,
    };

    // Очищаем undefined значения
    Object.keys(textStyles).forEach(key => {
        if (textStyles[key] === undefined) {
            delete textStyles[key];
        }
    });

    // === ТЕГ ===
    const Component = variant;

    // === РЕНДЕР ===
    const textElement = (
        <>
            <style>{keyframes}</style>
            <Component
                className={`ui-text ui-text--${type} ${className}`}
                style={textStyles}
                {...props}
            >
                {children}
            </Component>
        </>
    );

    if (showDevModeIndicator) {
        return <DevModeIndicator>{textElement}</DevModeIndicator>;
    }

    return textElement;
};

// === ПРЕДУСТАНОВЛЕННЫЕ КОМПОНЕНТЫ ===

// === Заголовки ===
// H1 - самый большой заголовок
Text.H1 = (props) => (
    <Text
        variant="h1"
        size="5xl"
        weight="bold"
        lineHeight="tight"
        marginBottom="0.5em"
        {...props}
    />
);

// H2
Text.H2 = (props) => (
    <Text
        variant="h2"
        size="4xl"
        weight="bold"
        lineHeight="tight"
        marginBottom="0.5em"
        {...props}
    />
);

// H3
Text.H3 = (props) => (
    <Text
        variant="h3"
        size="3xl"
        weight="semibold"
        lineHeight="tight"
        marginBottom="0.5em"
        {...props}
    />
);

// H4
Text.H4 = (props) => (
    <Text
        variant="h4"
        size="2xl"
        weight="semibold"
        lineHeight="tight"
        marginBottom="0.5em"
        {...props}
    />
);

// H5
Text.H5 = (props) => (
    <Text
        variant="h5"
        size="xl"
        weight="medium"
        lineHeight="tight"
        marginBottom="0.5em"
        {...props}
    />
);

// H6
Text.H6 = (props) => (
    <Text
        variant="h6"
        size="lg"
        weight="medium"
        lineHeight="tight"
        marginBottom="0.5em"
        {...props}
    />
);

// === Блочные элементы ===
// Параграф
Text.P = (props) => <Text variant="p" size="md" lineHeight="relaxed" marginBottom="1em" {...props} />;

// Маленький текст
Text.Small = (props) => <Text variant="small" size="sm" {...props} />;

// Большой текст
Text.Large = (props) => <Text variant="span" size="lg" {...props} />;

// Ссылка внутри текста
Text.Link = (props) => <Text variant="a" color="primary" underline {...props} />;

// === Форматирование ===
// Жирный
Text.Bold = (props) => <Text weight="bold" {...props} />;

// Курсив
Text.Italic = (props) => <Text italic {...props} />;

// Подчёркнутый
Text.Underline = (props) => <Text underline {...props} />;

// Зачёркнутый
Text.Strike = (props) => <Text strike {...props} />;

// Заглавные
Text.Uppercase = (props) => <Text uppercase {...props} />;

// Строчные
Text.Lowercase = (props) => <Text lowercase {...props} />;

// Капитализация
Text.Capitalize = (props) => <Text capitalize {...props} />;

// Моноширинный (код)
Text.Code = (props) => (
    <Text
        variant="code"
        backgroundColor="#f1f5f9"
        color="#475569"
        padding="2px 6px"
        borderRadius="4px"
        fontSize="0.9em"
        whitespace="pre"
        {...props}
    />
);

// Блок кода
Text.CodeBlock = (props) => (
    <Text
        variant="pre"
        backgroundColor="#1e293b"
        color="#e2e8f0"
        padding="16px"
        borderRadius="8px"
        whitespace="pre"
        overflow="auto"
        marginBottom="1em"
        {...props}
    />
);

// === Цветовые схемы (основные) ===
Text.Default = (props) => <Text type="default" {...props} />;
Text.Primary = (props) => <Text type="primary" {...props} />;
Text.Secondary = (props) => <Text type="secondary" {...props} />;
Text.Success = (props) => <Text type="success" {...props} />;
Text.Warning = (props) => <Text type="warning" {...props} />;
Text.Danger = (props) => <Text type="danger" {...props} />;
Text.Info = (props) => <Text type="info" {...props} />;
Text.Muted = (props) => <Text type="muted" {...props} />;
Text.Light = (props) => <Text type="light" {...props} />;
Text.Dark = (props) => <Text type="dark" {...props} />;
Text.White = (props) => <Text type="white" {...props} />;

// === Размеры ===
Text.Xs = (props) => <Text size="xs" {...props} />;
Text.Sm = (props) => <Text size="sm" {...props} />;
Text.Md = (props) => <Text size="md" {...props} />;
Text.Lg = (props) => <Text size="lg" {...props} />;
Text.Xl = (props) => <Text size="xl" {...props} />;
Text['2xl'] = (props) => <Text size="2xl" {...props} />;
Text['3xl'] = (props) => <Text size="3xl" {...props} />;
Text['4xl'] = (props) => <Text size="4xl" {...props} />;
Text['5xl'] = (props) => <Text size="5xl" {...props} />;

// === Веса ===
Text.Light = (props) => <Text weight="light" {...props} />;
Text.Normal = (props) => <Text weight="normal" {...props} />;
Text.Medium = (props) => <Text weight="medium" {...props} />;
Text.Semibold = (props) => <Text weight="semibold" {...props} />;
Text.Bold = (props) => <Text weight="bold" {...props} />;

// === Выравнивание ===
Text.Left = (props) => <Text align="left" {...props} />;
Text.Center = (props) => <Text align="center" {...props} />;
Text.Right = (props) => <Text align="right" {...props} />;
Text.Justify = (props) => <Text align="justify" {...props} />;

// === Специальные ===
// Текст с троеточием
Text.Truncate = (props) => <Text truncate {...props} />;

// НеSELECTABLE текст
Text.Unselectable = (props) => <Text selectable={false} {...props} />;

// Текст-контейнер
Text.Block = (props) => <Text display="block" {...props} />;

// Инлайн-блок
Text.InlineBlock = (props) => <Text display="inline-block" {...props} />;

// Флекс
Text.Flex = (props) => <Text display="flex" {...props} />;

// С тенью
Text.Shadowed = (props) => <Text shadow="md" {...props} />;
Text.Glow = (props) => <Text shadow="glow" {...props} />;

// Анимированный
Text.Animated = ({ animation = 'pulse', ...props }) => <Text animation={animation} {...props} />;

export default Text;
