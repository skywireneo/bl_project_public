// src/components/ui/buttons/ButtonGroup.jsx
import React, { useState, useEffect, useRef } from 'react';
import Button from './Button';

/**
 * Группа кнопок - набор компонентов для работы с группами кнопок
 * Включает: ButtonGroup, ToggleGroup, IconGroup, Dropdown
 */

// === ButtonGroup - Простая группа кнопок ===
const ButtonGroup = ({
    children,
    variant = 'default',
    size = 'md',
    direction = 'horizontal',
    align = 'start',
    gap = '0',
    disabled = false,
    className = '',
    style = {},
    ...props
}) => {
    const gapValues = { '0': '0', '1': '4px', '2': '8px', '3': '12px', '4': '16px', '5': '20px', '6': '24px' };

    const groupStyle = {
        display: 'flex',
        flexDirection: direction === 'vertical' ? 'column' : 'row',
        gap: gapValues[gap] || gap,
        alignItems: align === 'stretch' ? 'stretch' : align === 'center' ? 'center' : align === 'end' ? 'flex-end' : 'flex-start',
        ...style
    };

    const childrenArray = React.Children.toArray(children);

    if (variant === 'outline') {
        return (
            <div
                className={`button-group button-group--outline ${className}`}
                style={groupStyle}
                {...props}
            >
                {childrenArray.map((child, index) => {
                    if (!React.isValidElement(child)) return child;
                    const isFirst = index === 0;
                    const isLast = index === childrenArray.length - 1;
                    return React.cloneElement(child, {
                        style: {
                            ...child.props.style,
                            borderTopRightRadius: isFirst ? undefined : '0',
                            borderBottomRightRadius: isFirst ? undefined : '0',
                            borderTopLeftRadius: isLast ? undefined : '0',
                            borderBottomLeftRadius: isLast ? undefined : '0',
                            marginRight: !isLast ? '-1px' : undefined
                        },
                        disabled: disabled || child.props.disabled,
                    });
                })}
            </div>
        );
    }

    if (variant === 'separated') {
        return (
            <div
                className={`button-group button-group--separated ${className}`}
                style={groupStyle}
                {...props}
            >
                {childrenArray.map((child) =>
                    React.isValidElement(child)
                        ? React.cloneElement(child, { disabled: disabled || child.props.disabled })
                        : child
                )}
            </div>
        );
    }

    return (
        <div
            className={`button-group button-group--default ${className}`}
            style={groupStyle}
            {...props}
        >
            {childrenArray.map((child) =>
                React.isValidElement(child)
                    ? React.cloneElement(child, { disabled: disabled || child.props.disabled })
                    : child
            )}
        </div>
    );
};

// === ToggleGroup - Группа переключателей ===
const ToggleGroup = ({
    options = [],
    value,
    onChange,
    variant = 'outline',
    size = 'md',
    direction = 'horizontal',
    disabled = false,
    className = '',
    style = {},
    ...props
}) => {
    const [selected, setSelected] = useState(value);

    useEffect(() => {
        if (value !== undefined) setSelected(value);
    }, [value]);

    const handleSelect = (optionValue) => {
        if (disabled) return;
        setSelected(optionValue);
        onChange?.(optionValue);
    };

    return (
        <ButtonGroup
            variant={variant}
            size={size}
            direction={direction}
            disabled={disabled}
            className={className}
            style={style}
            {...props}
        >
            {options.map((option) => (
                <Button
                    key={option.value}
                    variant={selected === option.value ? 'primary' : 'secondary'}
                    onClick={() => handleSelect(option.value)}
                    disabled={disabled || option.disabled}
                >
                    {option.icon && <span className={option.icon} style={{ marginRight: '6px' }} />}
                    {option.label}
                </Button>
            ))}
        </ButtonGroup>
    );
};

// === IconGroup - Группа иконок ===
const IconGroup = ({
    children,
    direction = 'horizontal',
    gap = '1',
    variant = 'circular',
    className = '',
    style = {},
    ...props
}) => {
    const childrenArray = React.Children.toArray(children);
    const gapValues = { '0': '0', '1': '4px', '2': '8px', '3': '12px', '4': '16px' };

    return (
        <div
            className={`button-icon-group ${className}`}
            style={{
                display: 'flex',
                flexDirection: direction === 'vertical' ? 'column' : 'row',
                gap: gapValues[gap] || gap,
                ...style
            }}
            {...props}
        >
            {childrenArray.map((child) =>
                React.isValidElement(child)
                    ? React.cloneElement(child, { shape: variant === 'circular' ? 'circle' : child.props.shape })
                    : child
            )}
        </div>
    );
};

// === Dropdown - Выпадающее меню ===
const Dropdown = ({
    trigger,
    items = [],
    direction = 'down',
    align = 'start',
    size = 'md',
    variant = 'primary',
    className = '',
    style = {},
    ...props
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const dropdownStyle = { position: 'relative', display: 'inline-block', ...style };
    const menuStyle = {
        position: 'absolute',
        top: direction === 'up' ? 'auto' : '100%',
        bottom: direction === 'up' ? '100%' : 'auto',
        [align === 'start' ? 'left' : 'right']: '0',
        marginTop: direction === 'up' ? '0' : '8px',
        minWidth: '180px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
        border: '1px solid #e5e7eb',
        padding: '8px 0',
        zIndex: '1000',
        opacity: isOpen ? 1 : 0,
        visibility: isOpen ? 'visible' : 'hidden',
        transform: isOpen ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'all 0.2s ease'
    };

    return (
        <div
            className={`button-dropdown ${className}`}
            style={dropdownStyle}
            ref={dropdownRef}
            {...props}
        >
            <div onClick={() => setIsOpen(!isOpen)}>
                {React.isValidElement(trigger)
                    ? trigger
                    : <Button variant={variant} size={size}>
                        {trigger}
                        <span style={{ marginLeft: '8px', fontSize: '0.8em' }}>▼</span>
                    </Button>
                }
            </div>
            <div style={menuStyle}>
                {items.map((item, index) => {
                    if (item.divider) {
                        return <div key={index} style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '8px 0' }} />;
                    }
                    return (
                        <div
                            key={index}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 16px',
                                cursor: item.disabled ? 'not-allowed' : 'pointer',
                                color: '#374151',
                                fontSize: size === 'sm' ? '0.8rem' : '0.9rem',
                                opacity: item.disabled ? 0.5 : 1
                            }}
                            onClick={() => {
                                if (!item.disabled && item.onClick) {
                                    item.onClick(item);
                                    setIsOpen(false);
                                }
                            }}
                        >
                            {item.icon && <span className={item.icon} style={{ fontSize: '1em', color: item.iconColor }} />}
                            <span>{item.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export { ButtonGroup, ToggleGroup, IconGroup, Dropdown };
export default ButtonGroup;
