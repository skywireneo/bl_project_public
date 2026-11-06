// src/components/ui/Pagination.jsx
import React, { useState, useEffect, useRef } from 'react';
import DevModeIndicator from './DevModeIndicator';

/**
 * Универсальный компонент пейджинга (пагинации)
 * Поддерживает множество вариантов, размеров и настроек
 */
const Pagination = ({
  // Основные параметры
  currentPage = 1,
  totalPages = 1,
  totalItems = null,
  onPageChange = () => { },
  onPageSizeChange = () => { },

  // Количество элементов на странице
  pageSize = 10,
  pageSizeOptions = [5, 10, 25, 50, 100],
  showPageSizeSelector = false,

  // Вариант
  variant = 'default', // default, minimal, compact, extended, pills, borderless

  // Размер
  size = 'md', // xs, sm, md, lg

  // Отображение элементов
  showFirstLast = true,
  showPrevNext = true,
  showPageNumbers = true,
  showTotalItems = false,
  showGoToPage = false,
  showCurrentPageInfo = false,

  // Количество соседних страниц (можно настроить отдельно слева и справа)
  siblingCount = 1,
  siblingCountLeft = null, // если не задано, используется siblingCount
  siblingCountRight = null, // если не задано, используется siblingCount

  // Количество страниц на краях
  boundaryCount = 1,

  // Дополнительные настройки
  hideEllipsis = false, // скрыть ellipsis и показать все страницы
  showEllipsisTooltip = true, // показать тултип с вводом при клике на ellipsis
  scrollToTopOnChange = false, // прокрутить к верху при смене страницы

  // Кастомные метки
  labels = {
    first: '«',
    last: '»',
    prev: '‹',
    next: '›',
    of: 'из',
    page: 'Страница',
    goTo: 'Перейти',
    itemsPerPage: 'На странице',
    showing: 'Показано',
    to: 'до',
    enterPage: 'Введите страницу',
    ellipsisTooltip: 'Показать больше страниц',
  },

  // Выравнивание
  align = 'center', // left, center, right

  // Состояния
  disabled = false,
  loading = false,

  // Кастомные стили
  color = null,
  backgroundColor = null,
  className = '',
  style = {},

  // Показывать звёздочку режима разработки
  showDevModeIndicator = true,
}) => {
  // === Состояния ===
  const [inputPage, setInputPage] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [activeEllipsis, setActiveEllipsis] = useState(null); // 'left' или 'right'
  const [tooltipPage, setTooltipPage] = useState('');
  const inputRef = useRef(null);
  const tooltipInputRef = useRef(null);

  // === Конфигурация размеров ===
  const sizeConfig = {
    xs: {
      padding: '2px 6px',
      fontSize: '0.7rem',
      minWidth: '24px',
      height: '24px',
      gap: '2px',
      inputWidth: '40px',
    },
    sm: {
      padding: '4px 8px',
      fontSize: '0.75rem',
      minWidth: '28px',
      height: '28px',
      gap: '4px',
      inputWidth: '50px',
    },
    md: {
      padding: '6px 12px',
      fontSize: '0.85rem',
      minWidth: '32px',
      height: '32px',
      gap: '6px',
      inputWidth: '60px',
    },
    lg: {
      padding: '8px 16px',
      fontSize: '0.95rem',
      minWidth: '40px',
      height: '40px',
      gap: '8px',
      inputWidth: '70px',
    },
  };

  // === Конфигурация цветов ===
  const colors = {
    primary: { bg: '#3b82f6', color: '#ffffff', hover: '#2563eb', active: '#1d4ed8' },
    secondary: { bg: '#64748b', color: '#ffffff', hover: '#475569', active: '#334155' },
    success: { bg: '#10b981', color: '#ffffff', hover: '#059669', active: '#047857' },
    warning: { bg: '#f59e0b', color: '#ffffff', hover: '#d97706', active: '#b45309' },
    danger: { bg: '#ef4444', color: '#ffffff', hover: '#dc2626', active: '#b91c1c' },
  };

  // === Конфигурация вариантов ===
  const variantConfig = {
    default: {
      borderRadius: '6px',
      border: '1px solid #e5e7eb',
      background: '#ffffff',
      gap: '4px',
    },
    minimal: {
      borderRadius: '4px',
      border: 'none',
      background: 'transparent',
      gap: '2px',
    },
    compact: {
      borderRadius: '4px',
      border: '1px solid #e5e7eb',
      background: '#f9fafb',
      gap: '2px',
    },
    extended: {
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      background: '#ffffff',
      gap: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
    pills: {
      borderRadius: '20px',
      border: 'none',
      background: 'transparent',
      gap: '4px',
    },
    borderless: {
      borderRadius: '0',
      border: 'none',
      background: 'transparent',
      gap: '2px',
    },
  };

  // === Получаем текущие значения ===
  const currentSize = sizeConfig[size] || sizeConfig.md;
  const currentVariant = variantConfig[variant] || variantConfig.default;
  const currentColor = colors[color] || colors.primary;

  // Используем отдельные значения для левой и правой стороны
  const leftSiblings = siblingCountLeft !== null ? siblingCountLeft : siblingCount;
  const rightSiblings = siblingCountRight !== null ? siblingCountRight : siblingCount;

  // === Валидация ===
  const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
  const validTotalPages = Math.max(1, totalPages);

  // === Вычисление диапазона страниц ===
  const getPageRange = () => {
    const pages = [];

    if (!showPageNumbers) return pages;
    if (hideEllipsis) {
      // Показать все страницы
      for (let i = 1; i <= validTotalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    const startPages = [];
    const endPages = [];
    const middlePages = [];

    // Начальные страницы (boundaryCount)
    for (let i = 1; i <= Math.min(boundaryCount, validTotalPages); i++) {
      startPages.push(i);
    }

    // Конечные страницы
    for (let i = Math.max(validTotalPages - boundaryCount + 1, boundaryCount + 1); i <= validTotalPages; i++) {
      if (i > 0) endPages.push(i);
    }

    // Средние страницы (around - вокруг текущей)
    const leftEdge = Math.max(boundaryCount + 1, validCurrentPage - leftSiblings);
    const rightEdge = Math.min(validTotalPages - boundaryCount, validCurrentPage + rightSiblings);

    // Добавляем страницы вокруг текущей
    for (let i = leftEdge; i <= rightEdge; i++) {
      if (i >= boundaryCount + 1 && i <= validTotalPages - boundaryCount) {
        middlePages.push(i);
      }
    }

    // Формируем итоговый массив с ellipsis
    let lastAdded = 0;

    // Начальные страницы
    startPages.forEach(p => {
      if (p !== lastAdded + 1 && p > 1) {
        pages.push('ellipsis-left');
      }
      pages.push(p);
      lastAdded = p;
    });

    // Средние страницы
    middlePages.forEach(p => {
      if (p !== lastAdded + 1 && p > lastAdded + 1) {
        pages.push('ellipsis-left');
      }
      pages.push(p);
      lastAdded = p;
    });

    // Конечные страницы
    endPages.forEach(p => {
      if (p !== lastAdded + 1) {
        pages.push('ellipsis-right');
      }
      pages.push(p);
      lastAdded = p;
    });

    // Удаляем дубликаты ellipsis
    const uniquePages = [];
    let lastWasEllipsis = false;
    pages.forEach(p => {
      if (p === 'ellipsis-left' || p === 'ellipsis-right') {
        if (!lastWasEllipsis) {
          uniquePages.push(p);
          lastWasEllipsis = true;
        }
      } else {
        uniquePages.push(p);
        lastWasEllipsis = false;
      }
    });

    return uniquePages;
  };

  const pageRange = getPageRange();

  // === Обработчики ===
  const goToPage = (page) => {
    const pageNum = Number(page);
    if (pageNum >= 1 && pageNum <= validTotalPages && pageNum !== validCurrentPage) {
      onPageChange(pageNum);
      if (scrollToTopOnChange) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
    setInputPage('');
    setTooltipPage('');
    setActiveEllipsis(null);
    setIsInputFocused(false);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      goToPage(inputPage);
    } else if (e.key === 'Escape') {
      setInputPage('');
      setIsInputFocused(false);
    }
  };

  const handleTooltipInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      goToPage(tooltipPage);
    } else if (e.key === 'Escape') {
      setTooltipPage('');
      setActiveEllipsis(null);
    }
  };

  const handlePageSizeChange = (e) => {
    onPageSizeChange(Number(e.target.value));
  };

  const handleEllipsisClick = (position) => {
    if (showEllipsisTooltip && !disabled && !loading) {
      setActiveEllipsis(activeEllipsis === position ? null : position);
      setTooltipPage('');
      setTimeout(() => tooltipInputRef.current?.focus(), 100);
    }
  };

  // === Проверка активности кнопок ===
  const isFirstDisabled = disabled || loading || validCurrentPage === 1;
  const isLastDisabled = disabled || loading || validCurrentPage === validTotalPages;
  const isPrevDisabled = disabled || loading || validCurrentPage === 1;
  const isNextDisabled = disabled || loading || validCurrentPage === validTotalPages;

  // === Стили ===
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: showPageSizeSelector || showTotalItems ? '12px' : '0',
    alignItems: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end',
    ...style,
  };

  const paginationStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: currentVariant.gap,
    padding: variant === 'extended' ? '12px 16px' : '4px',
    borderRadius: currentVariant.borderRadius,
    border: currentVariant.border,
    background: currentVariant.background,
    boxShadow: variant === 'extended' ? currentVariant.boxShadow : 'none',
    opacity: disabled ? 0.6 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
    ...(backgroundColor && { background: backgroundColor }),
    position: 'relative',
  };

  const buttonStyle = (isActive = false, isNav = false) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: currentSize.minWidth,
    height: currentSize.height,
    padding: currentSize.padding,
    fontSize: currentSize.fontSize,
    fontWeight: isActive ? '600' : '400',
    border: 'none',
    borderRadius: variant === 'pills' ? '50%' : isNav ? currentVariant.borderRadius : '4px',
    background: isActive
      ? (color ? currentColor.bg : '#3b82f6')
      : (variant === 'minimal' || variant === 'borderless' ? 'transparent' : '#f3f4f6'),
    color: isActive
      ? (color ? currentColor.color : '#ffffff')
      : (variant === 'minimal' || variant === 'borderless' ? '#3b82f6' : '#374151'),
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
  });

  const ellipsisButtonStyle = {
    ...buttonStyle(false),
    minWidth: currentSize.minWidth,
    cursor: showEllipsisTooltip ? 'pointer' : 'default',
    position: 'relative',
  };

  const infoStyle = {
    fontSize: currentSize.fontSize,
    color: '#6b7280',
    whiteSpace: 'nowrap',
  };

  const selectStyle = {
    padding: '4px 8px',
    fontSize: currentSize.fontSize,
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
    background: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    outline: 'none',
  };

  const inputStyle = {
    width: currentSize.inputWidth,
    padding: '4px 8px',
    fontSize: currentSize.fontSize,
    borderRadius: '4px',
    border: isInputFocused ? '1px solid #3b82f6' : '1px solid #e5e7eb',
    textAlign: 'center',
    outline: 'none',
  };

  const tooltipInputStyle = {
    width: '50px',
    padding: '4px 6px',
    fontSize: '0.75rem',
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
    textAlign: 'center',
    outline: 'none',
  };

  const tooltipStyle = {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: '8px',
    padding: '8px 12px',
    background: '#374151',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 1000,
    whiteSpace: 'nowrap',
  };

  // === Рендер кнопки страницы ===
  const renderPageButton = (page) => {
    if (page === 'ellipsis-left' || page === 'ellipsis-right') {
      const position = page === 'ellipsis-left' ? 'left' : 'right';
      const isActive = activeEllipsis === position;

      return (
        <div key={page} style={{ position: 'relative' }}>
          <button
            style={{
              ...ellipsisButtonStyle,
              background: isActive ? currentColor.bg : ellipsisButtonStyle.background,
              color: isActive ? currentColor.color : ellipsisButtonStyle.color,
            }}
            onClick={() => handleEllipsisClick(position)}
            disabled={disabled || loading || !showEllipsisTooltip}
            title={showEllipsisTooltip ? labels.ellipsisTooltip : undefined}
          >
            …
          </button>

          {/* Тултип с вводом */}
          {activeEllipsis === position && showEllipsisTooltip && (
            <div style={tooltipStyle}>
              <span>{labels.enterPage}:</span>
              <input
                ref={tooltipInputRef}
                type="number"
                min={1}
                max={validTotalPages}
                value={tooltipPage}
                onChange={(e) => setTooltipPage(e.target.value)}
                onKeyDown={handleTooltipInputKeyDown}
                onBlur={() => setTimeout(() => setActiveEllipsis(null), 200)}
                style={tooltipInputStyle}
              />
              <button
                onClick={() => goToPage(tooltipPage)}
                disabled={!tooltipPage}
                style={{
                  padding: '2px 8px',
                  fontSize: '0.7rem',
                  background: currentColor.bg,
                  color: currentColor.color,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {labels.goTo}
              </button>
            </div>
          )}
        </div>
      );
    }

    const isActive = page === validCurrentPage;
    return (
      <button
        key={page}
        style={buttonStyle(isActive)}
        onClick={() => goToPage(page)}
        disabled={disabled || loading}
      >
        {page}
      </button>
    );
  };

  // === Рендер навигационных кнопок ===
  const renderNavButton = (type, onClick, isDisabled, label) => (
    <button
      style={{ ...buttonStyle(false, true), ...(isDisabled && { opacity: 0.5, cursor: 'not-allowed' }) }}
      onClick={onClick}
      disabled={isDisabled}
      title={labels[type]}
    >
      {labels[type]}
    </button>
  );

  // === Рендер информации о странице ===
  const renderPageInfo = () => {
    if (!showCurrentPageInfo && !showTotalItems) return null;

    const startItem = totalItems ? (validCurrentPage - 1) * pageSize + 1 : null;
    const endItem = totalItems ? Math.min(validCurrentPage * pageSize, totalItems) : null;

    return (
      <div style={{ ...infoStyle, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {showCurrentPageInfo && (
          <span>
            {labels.page} {validCurrentPage} {labels.of} {validTotalPages}
          </span>
        )}
        {showTotalItems && totalItems && (
          <span>
            {labels.showing} {startItem} {labels.to} {endItem} ({totalItems})
          </span>
        )}
      </div>
    );
  };

  // === Рендер перехода к странице ===
  const renderGoToPage = () => {
    if (!showGoToPage) return null;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <input
          ref={inputRef}
          type="number"
          min={1}
          max={validTotalPages}
          value={inputPage}
          onChange={(e) => setInputPage(e.target.value)}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
          onKeyDown={handleInputKeyDown}
          placeholder="#"
          style={inputStyle}
          disabled={disabled || loading}
        />
        <button
          style={buttonStyle(false, true)}
          onClick={() => goToPage(inputPage)}
          disabled={disabled || loading || !inputPage}
        >
          {labels.goTo}
        </button>
      </div>
    );
  };

  // === Рендер селектора количества элементов ===
  const renderPageSizeSelector = () => {
    if (!showPageSizeSelector) return null;

    return (
      <select
        value={pageSize}
        onChange={handlePageSizeChange}
        style={selectStyle}
        disabled={disabled || loading}
      >
        {pageSizeOptions.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    );
  };

  // === Основной рендер ===
  const renderPagination = () => (
    <div style={paginationStyle}>
      {/* Первая страница */}
      {showFirstLast && renderNavButton('first', () => goToPage(1), isFirstDisabled)}

      {/* Предыдущая страница */}
      {showPrevNext && renderNavButton('prev', () => goToPage(validCurrentPage - 1), isPrevDisabled)}

      {/* Номера страниц */}
      {showPageNumbers && pageRange.map((page) => renderPageButton(page))}

      {/* Переход к странице */}
      {renderGoToPage()}

      {/* Следующая страница */}
      {showPrevNext && renderNavButton('next', () => goToPage(validCurrentPage + 1), isNextDisabled)}

      {/* Последняя страница */}
      {showFirstLast && renderNavButton('last', () => goToPage(validTotalPages), isLastDisabled)}
    </div>
  );

  // === Рендер с индикатором разработки ===
  const paginationElement = (
    <div style={containerStyle} className={`pagination-container ${className}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end' }}>
        {renderPagination()}
      </div>

      {/* Нижняя панель с информацией */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end' }}>
        {renderPageInfo()}
        {renderPageSizeSelector() && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={infoStyle}>{labels.itemsPerPage}:</span>
            {renderPageSizeSelector()}
          </div>
        )}
      </div>
    </div>
  );

  if (showDevModeIndicator) {
    return <DevModeIndicator>{paginationElement}</DevModeIndicator>;
  }

  return paginationElement;
};

// === Предустановленные варианты ===

// Компактный пейджинг
Pagination.Compact = (props) => (
  <Pagination
    variant="compact"
    size="sm"
    showFirstLast={false}
    showPageNumbers={true}
    siblingCount={2}
    {...props}
  />
);

// Минимальный пейджинг
Pagination.Minimal = (props) => (
  <Pagination
    variant="minimal"
    showFirstLast={true}
    showPrevNext={true}
    showPageNumbers={true}
    siblingCount={2}
    {...props}
  />
);

// Пейджинг с информацией
Pagination.Info = (props) => (
  <Pagination
    variant="extended"
    showFirstLast={true}
    showPrevNext={true}
    showPageNumbers={true}
    showCurrentPageInfo={true}
    showTotalItems={true}
    showPageSizeSelector={true}
    showEllipsisTooltip={true}
    {...props}
  />
);

// Только навигация (стрелки)
Pagination.Navigation = (props) => (
  <Pagination
    variant="minimal"
    showFirstLast={false}
    showPageNumbers={false}
    showPrevNext={true}
    {...props}
  />
);

// Таблетки (круглые кнопки)
Pagination.Pills = (props) => (
  <Pagination
    variant="pills"
    size="sm"
    showFirstLast={false}
    showPageNumbers={true}
    siblingCount={2}
    {...props}
  />
);

// С симметричными соседями (equal siblings)
Pagination.Symmetric = (props) => (
  <Pagination
    siblingCountLeft={props.siblingCountLeft || 2}
    siblingCountRight={props.siblingCountRight || 2}
    {...props}
  />
);

export default Pagination;
