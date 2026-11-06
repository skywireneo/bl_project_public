import React, { useState, useEffect, useCallback, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Button, Modal, Alert, EmptyState, Select, Card, Badge } from '../../ui/UIComponents';
import { getStats, deleteStats } from '../../../http/statsAPI';
import { Context } from '../../..';

// ============================================================================
// ФОРМАТИРОВАНИЕ ДАТ ДЛЯ ГРАФИКОВ
// ============================================================================

/**
 * Форматирование даты для оси X графика в зависимости от гранулярности
 */
const formatXAxisDate = (dateStr, granularity) => {
    const date = new Date(dateStr);

    switch (granularity) {
        case 'minute':
            return date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        case 'hour':
            return date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        case 'day':
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'short'
            });
        case 'month':
            return date.toLocaleDateString('ru-RU', {
                month: 'short',
                year: 'numeric'
            });
        case 'year':
            return date.getFullYear().toString();
        default:
            return date.toLocaleDateString('ru-RU');
    }
};

/**
 * Форматирование даты для tooltip графика
 */
const formatTooltipDate = (dateStr, granularity) => {
    const date = new Date(dateStr);

    switch (granularity) {
        case 'minute':
        case 'hour':
            return date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        case 'day':
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        case 'month':
            return date.toLocaleDateString('ru-RU', {
                month: 'long',
                year: 'numeric'
            });
        case 'year':
            return date.getFullYear().toString();
        default:
            return date.toLocaleDateString('ru-RU');
    }
};

/**
 * Получить дату N дней назад от сейчас
 */
const getDateDaysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
};

// ============================================================================
// ХЕЛПЕРЫ ДЛЯ РАБОТЫ С ДАТАМИ В INPUT datetime-local
// ============================================================================

/**
 * Преобразовать ISO строку (UTC) в формат локального времени для input
 * Решает проблему с часовыми поясами: пользователь видит в input то же время,
 * что ввёл/выбрал, независимо от его timezone
 * 
 * @param {string} isoStr - ISO строка в UTC
 * @returns {string} - формат "YYYY-MM-DDTHH:mm" в локальном времени
 */
const isoToLocal = (isoStr) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Преобразовать значение из input (локальное время) в ISO строку (UTC)
 * 
 * @param {string} localStr - формат "YYYY-MM-DDTHH:mm" из input
 * @returns {string} - ISO строка в UTC
 */
const localToIso = (localStr) => {
    if (!localStr) return '';
    // new Date("2026-08-10T14:00") создаёт дату в локальном времени
    // .toISOString() корректно преобразует в UTC
    const date = new Date(localStr);
    if (isNaN(date.getTime())) return '';
    return date.toISOString();
};

/**
 * Форматирование периода хранения в человеко-читаемый вид
 * 
 * @param {number} minutes - срок хранения для минутных записей (в часах)
 * @param {number} hours - срок хранения для часовых записей (в часах)
 * @param {number} days - срок хранения для дневных записей (в днях)
 * @returns {Array} - массив строк для отображения
 */
const formatRetention = (retention) => {
    if (!retention) return [];

    const result = [];

    if (retention.minute && retention.minute > 0) {
        const hours = retention.minute;
        const days = hours / 24;
        const humanReadable = days >= 1
            ? `${Math.round(days)} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`
            : `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`;
        result.push({
            label: 'Минутные данные',
            value: humanReadable,
            raw: `${hours}ч`
        });
    }

    if (retention.hour && retention.hour > 0) {
        const hours = retention.hour;
        const days = hours / 24;
        const humanReadable = days >= 1
            ? `${Math.round(days)} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`
            : `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`;
        result.push({
            label: 'Часовые данные',
            value: humanReadable,
            raw: `${hours}ч`
        });
    }

    if (retention.day && retention.day > 0) {
        const days = retention.day;
        let humanReadable;
        if (days >= 365) {
            const years = Math.round(days / 365);
            humanReadable = `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`;
        } else if (days >= 30) {
            const months = Math.round(days / 30);
            humanReadable = `${months} ${months === 1 ? 'месяц' : months < 5 ? 'месяца' : 'месяцев'}`;
        } else {
            humanReadable = `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`;
        }
        result.push({
            label: 'Дневные данные',
            value: humanReadable,
            raw: `${days}д`
        });
    }

    return result;
};

// ============================================================================
// КОМПОНЕНТ StatsDisplay
// ============================================================================

/**
 * Компонент для отображения статистики из statisticService
 * 
 * @param {Object} props
 * 
 * === ОБЯЗАТЕЛЬНЫЕ ПАРАМЕТРЫ ===
 * @param {string} props.metricName - имя метрики из METRICS_CONFIG (например, 'incidents:view')
 * @param {string} props.entityId - ID сущности (например, '09082026-QHEBN')
 * 
 * === РЕЖИМ ОТОБРАЖЕНИЯ ===
 * @param {'button'|'inline'} props.mode - режим отображения:
 *   - 'button' (по умолчанию) - только кнопка, по клику открывается модалка с полной инфой
 *   - 'inline' - сразу блок с графиком, доп. инфа в модалке по кнопке "Подробнее"
 * 
 * === ПАРАМЕТРЫ ЗАПРОСА ===
 * @param {string} props.defaultFrom - дата начала периода (ISO формат, по умолчанию 7 дней назад)
 * @param {string} props.defaultTo - дата конца периода (ISO формат, по умолчанию сейчас)
 * @param {string} props.defaultGranularity - гранулярность по умолчанию:
 *   'minute' | 'hour' | 'day' | 'month' | 'year' | 'auto' (по умолчанию 'auto')
 * 
 * === ОГРАНИЧЕНИЯ ===
 * @param {Array} props.allowedGranularities - массив доступных гранулярностей
 *   По умолчанию: ['minute', 'hour', 'day', 'month', 'year']
 * @param {string} props.minDate - минимальная доступная дата (ISO формат)
 * @param {string} props.maxDate - максимальная доступная дата (ISO формат)
 * @param {number} props.maxRange - максимальный диапазон в днях
 * 
 * === КОНТРОЛЫ UI ===
 * @param {boolean} props.allowDateChange - разрешить изменение дат
 * @param {boolean} props.allowGranularityChange - разрешить изменение гранулярности
 * @param {boolean} props.allowForceRefresh - разрешить принудительное обновление
 * @param {boolean} props.allowDelete - разрешить удаление статистики (по умолчанию true)
 * 
 * === ВИЗУАЛИЗАЦИЯ ===
 * @param {'area'|'bar'|'line'|'auto'} props.chartType - тип графика
 * @param {Array} props.showFields - какие поля показывать на графике
 * @param {string} props.chartColor - основной цвет графика
 * @param {number} props.chartHeight - высота графика в пикселях
 * 
 * === ТЕКСТ И ЗАГОЛОВКИ ===
 * @param {string} props.buttonLabel - текст кнопки в режиме 'button'
 * @param {string} props.buttonIcon - иконка кнопки
 * @param {'primary'|'secondary'|'neutral'|'ghost'} props.buttonVariant - вариант кнопки
 * @param {string} props.inlineTitle - заголовок в режиме 'inline'
 * @param {string} props.modalTitle - заголовок модалки
 * @param {string} props.detailsButtonLabel - текст кнопки "Подробнее" в inline mode
 * @param {string} props.detailsButtonIcon - иконка кнопки "Подробнее"
 * 
 * === НАСТРОЙКИ МОДАЛКИ ===
 * @param {'sm'|'md'|'lg'|'xl'} props.modalSize - размер модалки
 * @param {boolean} props.closeOnOutsideClick - закрывать по клику вне модалки
 * @param {boolean} props.closeOnEsc - закрывать по нажатию ESC
 * @param {boolean} props.enableSwipeClose - закрывать свайпом вниз (мобильные)
 * 
 * === ПОВЕДЕНИЕ ===
 * @param {boolean} props.showRefreshButton - показывать кнопку "Обновить"
 * 
 * === СОБЫТИЯ ===
 * @param {Function} props.onOpen - вызывается при открытии модалки
 * @param {Function} props.onClose - вызывается при закрытии модалки
 * @param {Function} props.onError - вызывается при ошибке API
 * @param {Function} props.onDataLoad - вызывается после успешной загрузки данных
 * @param {Function} props.onDelete - вызывается после успешного удаления
 */
export default function StatsDisplay(props) {
    // === ДЕСТРУКТУРИЗАЦИЯ ПРОПСОВ С ЗНАЧЕНИЯМИ ПО УМОЛЧАНИЮ ===
    const {
        // Обязательные
        metricName,
        entityId,

        // Режим
        mode = 'button',

        // Параметры запроса
        defaultFrom = getDateDaysAgo(7),
        defaultTo = new Date().toISOString(),
        defaultGranularity = 'auto',

        // Ограничения
        allowedGranularities = ['minute', 'hour', 'day', 'month', 'year'],
        minDate = null,
        maxDate = null,
        maxRange = 365,

        // Контролы
        allowDateChange = true,
        allowGranularityChange = true,
        allowForceRefresh = true,
        allowDelete = true,

        // Визуализация
        chartType = 'area',
        showFields = ['count'],
        chartColor = '#6366f1',
        chartHeight = 220,

        // Текст
        buttonLabel = 'Показать статистику',
        buttonIcon = 'fa-chart-line',
        buttonVariant = 'secondary',
        inlineTitle = null,
        modalTitle = null,
        detailsButtonLabel = 'Подробнее',
        detailsButtonIcon = 'fa-info-circle',

        // Модалка
        modalSize = 'lg',
        closeOnOutsideClick = true,
        closeOnEsc = true,
        enableSwipeClose = true,

        // Поведение
        showRefreshButton = allowForceRefresh,

        // События
        onOpen = () => { },
        onClose = () => { },
        onError = () => { },
        onDataLoad = () => { },
        onDelete = () => { }
    } = props;

    // === СОСТОЯНИЕ ===
    const { user } = useContext(Context);
    const isAdminOrDev =
        user?.user?.status && ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"].includes(user.user.status);
    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    // currentParams - параметры, по которым загружены текущие данные
    const [currentParams, setCurrentParams] = useState({
        from: defaultFrom,
        to: defaultTo,
        granularity: defaultGranularity,
        force_refresh: false
    });

    // draftParams - черновик параметров (то, что пользователь ввёл, но ещё не применил)
    const [draftParams, setDraftParams] = useState({
        from: defaultFrom,
        to: defaultTo,
        granularity: defaultGranularity
    });

    // Ошибки валидации черновика
    const [draftError, setDraftError] = useState(null);

    // === ФУНКЦИЯ ЗАГРУЗКИ ДАННЫХ ===
    const loadData = useCallback(async (params, silent = false) => {
        if (!silent) setLoading(true);
        setError(null);

        try {
            const response = await getStats(
                metricName,
                entityId,
                params.from,
                params.to,
                params.granularity,
                'both',
                params.force_refresh
            );

            setData(response);
            onDataLoad(response);
        } catch (err) {
            console.error('[StatsDisplay] Ошибка загрузки:', err);
            setError(err);
            onError(err);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [metricName, entityId, onDataLoad, onError]);

    // === ФУНКЦИЯ УДАЛЕНИЯ СТАТИСТИКИ ===
    const handleDelete = useCallback(async () => {
        setDeleting(true);
        setError(null);

        try {
            await deleteStats(metricName, entityId);
            setData(null);
            setConfirmingDelete(false);
            onDelete();
        } catch (err) {
            console.error('[StatsDisplay] Ошибка удаления:', err);
            setError(err);
            onError(err);
        } finally {
            setDeleting(false);
        }
    }, [metricName, entityId, onDelete, onError]);

    // === АВТОЗАГРУЗКА ПРИ ОТКРЫТИИ МОДАЛКИ (button mode) ===
    useEffect(() => {
        if (mode === 'button' && modalOpen && !data && !loading) {
            loadData(currentParams);
        }
    }, [modalOpen, mode, data, loading, currentParams, loadData]);

    // === АВТОЗАГРУЗКА ПРИ МОНТИРОВАНИИ (inline mode) ===
    useEffect(() => {
        if (mode === 'inline' && !data && !loading) {
            loadData(currentParams);
        }
    }, [mode, data, loading, currentParams, loadData]);

    // === ОБРАБОТЧИКИ ===
    const handleOpen = () => {
        setModalOpen(true);
        onOpen();
    };

    const handleClose = () => {
        setModalOpen(false);
        onClose();
    };

    const handleRefresh = () => {
        loadData({ ...currentParams, force_refresh: true }, false);
    };

    /**
     * Обработка изменения поля в черновике
     * Обновляет draftParams, но НЕ делает запрос
     */
    const handleDraftChange = (key, value) => {
        const newDraft = { ...draftParams, [key]: value };
        setDraftParams(newDraft);
        setDraftError(null);

        // Валидация диапазона
        if (key === 'from' || key === 'to') {
            const fromDate = new Date(newDraft.from);
            const toDate = new Date(newDraft.to);

            if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
                setDraftError('Некорректная дата');
                return;
            }

            if (fromDate >= toDate) {
                setDraftError('Дата "С" должна быть меньше даты "По"');
                return;
            }

            const rangeDays = (toDate - fromDate) / (1000 * 60 * 60 * 24);
            if (rangeDays > maxRange) {
                setDraftError(`Диапазон не может превышать ${maxRange} дней`);
                return;
            }
        }
    };

    /**
     * Применить фильтры из черновика
     * Копирует draftParams в currentParams и запускает запрос
     */
    const handleApplyFilters = () => {
        if (draftError) return;

        const newParams = {
            ...draftParams,
            force_refresh: false
        };
        setCurrentParams(newParams);
        loadData(newParams);
    };

    /**
     * Проверить, есть ли несохранённые изменения в черновике
     */
    const hasUnsavedChanges = () => {
        return (
            draftParams.from !== currentParams.from ||
            draftParams.to !== currentParams.to ||
            draftParams.granularity !== currentParams.granularity
        );
    };

    /**
     * Сбросить черновик к текущим параметрам
     */
    const handleResetDraft = () => {
        setDraftParams({
            from: currentParams.from,
            to: currentParams.to,
            granularity: currentParams.granularity
        });
        setDraftError(null);
    };

    /**
     * Подтверждение удаления
     */
    const handleDeleteClick = () => {
        const confirmed = window.confirm(
            `Вы уверены, что хотите удалить ВСЮ статистику для метрики "${metricName}" и сущности "${entityId}"?\n\n` +
            `Это действие необратимо. Все исторические данные будут потеряны.`
        );

        if (confirmed) {
            handleDelete();
        }
    };

    // === ОПРЕДЕЛЕНИЕ ТИПА ГРАФИКА ===
    const getEffectiveChartType = () => {
        if (chartType === 'auto') {
            const gran = data?.meta?.effective_granularity || 'hour';
            if (gran === 'minute' || gran === 'hour') return 'line';
            if (gran === 'day') return 'bar';
            return 'area';
        }
        return chartType;
    };

    // === ПОДГОТОВКА ДАННЫХ ДЛЯ ГРАФИКА ===
    const prepareChartData = () => {
        if (!data?.data) return [];

        const gran = data.meta?.effective_granularity || 'hour';

        return data.data.map(point => ({
            time: point.time,
            timeFormatted: formatXAxisDate(point.time, gran),
            timeTooltip: formatTooltipDate(point.time, gran),
            count: point.count,
            unique_count: point.unique_count
        }));
    };

    // === РЕНДЕР ГРАФИКА ===
    const renderChart = (chartData, height = chartHeight) => {
        const effectiveChartType = getEffectiveChartType();

        const commonProps = {
            data: chartData,
            margin: { top: 5, right: 30, left: 20, bottom: 5 }
        };

        const xAxisProps = {
            dataKey: 'timeFormatted',
            stroke: '#64748b',
            fontSize: 11,
            interval: Math.max(0, Math.floor(chartData.length / 10))
        };

        const yAxisProps = {
            stroke: '#64748b',
            fontSize: 11
        };

        const tooltipProps = {
            contentStyle: {
                background: '#1a1d2e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#e2e8f0'
            },
            labelFormatter: (label) => {
                const point = chartData.find(p => p.timeFormatted === label);
                return point ? point.timeTooltip : label;
            }
        };

        const gridProps = {
            strokeDasharray: '3 3',
            stroke: 'rgba(255,255,255,0.06)'
        };

        const colors = {
            count: chartColor,
            unique_count: '#10b981'
        };

        if (effectiveChartType === 'area') {
            return (
                <ResponsiveContainer width="100%" height={height}>
                    <AreaChart {...commonProps}>
                        <defs>
                            {showFields.map(field => (
                                <linearGradient key={field} id={`gradient-${field}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors[field]} stopOpacity={0.5} />
                                    <stop offset="95%" stopColor={colors[field]} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid {...gridProps} />
                        <XAxis {...xAxisProps} />
                        <YAxis {...yAxisProps} />
                        <Tooltip {...tooltipProps} />
                        {showFields.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />}
                        {showFields.map(field => (
                            <Area
                                key={field}
                                type="monotone"
                                dataKey={field}
                                name={field === 'count' ? 'Всего' : 'Уникальные'}
                                stroke={colors[field]}
                                strokeWidth={2}
                                fill={`url(#gradient-${field})`}
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            );
        }

        if (effectiveChartType === 'bar') {
            return (
                <ResponsiveContainer width="100%" height={height}>
                    <BarChart {...commonProps}>
                        <CartesianGrid {...gridProps} />
                        <XAxis {...xAxisProps} />
                        <YAxis {...yAxisProps} />
                        <Tooltip {...tooltipProps} />
                        {showFields.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />}
                        {showFields.map(field => (
                            <Bar
                                key={field}
                                dataKey={field}
                                name={field === 'count' ? 'Всего' : 'Уникальные'}
                                fill={colors[field]}
                                radius={[4, 4, 0, 0]}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            );
        }

        return (
            <ResponsiveContainer width="100%" height={height}>
                <LineChart {...commonProps}>
                    <CartesianGrid {...gridProps} />
                    <XAxis {...xAxisProps} />
                    <YAxis {...yAxisProps} />
                    <Tooltip {...tooltipProps} />
                    {showFields.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />}
                    {showFields.map(field => (
                        <Line
                            key={field}
                            type="monotone"
                            dataKey={field}
                            name={field === 'count' ? 'Всего' : 'Уникальные'}
                            stroke={colors[field]}
                            strokeWidth={2}
                            dot={{ fill: colors[field], r: 3 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        );
    };

    // === РЕНДЕР КОНТРОЛОВ ===
    const renderControls = () => {
        if (!allowDateChange && !allowGranularityChange && !showRefreshButton && !allowDelete) {
            return null;
        }

        const hasChanges = hasUnsavedChanges();
        const hasValidation = !!draftError;

        return (
            <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    {/* Контролы дат */}
                    {allowDateChange && (
                        <>
                            <div style={{ flex: 1, minWidth: 150 }}>
                                <label style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4, display: 'block' }}>
                                    С
                                </label>
                                <input
                                    type="datetime-local"
                                    value={isoToLocal(draftParams.from)}
                                    onChange={(e) => {
                                        const isoValue = localToIso(e.target.value);
                                        if (isoValue) handleDraftChange('from', isoValue);
                                    }}
                                    min={minDate ? isoToLocal(minDate) : undefined}
                                    max={maxDate ? isoToLocal(maxDate) : undefined}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 8,
                                        color: '#e2e8f0',
                                        fontSize: 13
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1, minWidth: 150 }}>
                                <label style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4, display: 'block' }}>
                                    По
                                </label>
                                <input
                                    type="datetime-local"
                                    value={isoToLocal(draftParams.to)}
                                    onChange={(e) => {
                                        const isoValue = localToIso(e.target.value);
                                        if (isoValue) handleDraftChange('to', isoValue);
                                    }}
                                    min={minDate ? isoToLocal(minDate) : undefined}
                                    max={maxDate ? isoToLocal(maxDate) : undefined}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 8,
                                        color: '#e2e8f0',
                                        fontSize: 13
                                    }}
                                />
                            </div>
                        </>
                    )}

                    {/* Контрол гранулярности */}
                    {allowGranularityChange && (
                        <div style={{ minWidth: 150 }}>
                            <label style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4, display: 'block' }}>
                                Детализация
                            </label>
                            <Select
                                value={draftParams.granularity}
                                onChange={(e) => handleDraftChange('granularity', e.target.value)}
                                style={{ fontSize: 13 }}
                            >
                                <option value="auto">Авто</option>
                                {allowedGranularities.map(gran => (
                                    <option key={gran} value={gran}>
                                        {gran === 'minute' ? 'Минуты' :
                                            gran === 'hour' ? 'Часы' :
                                                gran === 'day' ? 'Дни' :
                                                    gran === 'month' ? 'Месяцы' :
                                                        'Годы'}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    )}

                    {/* Кнопки действий */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        {/* Кнопка Применить фильтры */}
                        {(allowDateChange || allowGranularityChange) && (
                            <Button
                                variant={hasChanges ? 'primary' : 'secondary'}
                                size="sm"
                                icon="fa-check"
                                onClick={handleApplyFilters}
                                disabled={!hasChanges || hasValidation || loading}
                            >
                                Применить фильтры
                            </Button>
                        )}

                        {/* Кнопка Сбросить */}
                        {hasChanges && (allowDateChange || allowGranularityChange) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                icon="fa-undo"
                                onClick={handleResetDraft}
                            >
                                Сбросить
                            </Button>
                        )}

                        {/* Кнопка обновления */}
                        {showRefreshButton && (
                            <Button
                                variant="ghost"
                                size="sm"
                                icon="fa-rotate"
                                onClick={handleRefresh}
                                loading={loading}
                            >
                                Обновить
                            </Button>
                        )}

                        {/* Кнопка удаления */}
                        {allowDelete && (
                            <Button
                                variant="ghost"
                                size="sm"
                                icon="fa-trash"
                                onClick={handleDeleteClick}
                                loading={deleting}
                                style={{ color: '#ef4444' }}
                            >
                                Очистить
                            </Button>
                        )}
                    </div>
                </div>

                {/* Ошибка валидации */}
                {draftError && (
                    <div style={{
                        marginTop: 8,
                        padding: '8px 12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 8,
                        color: '#fca5a5',
                        fontSize: 13
                    }}>
                        <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }} />
                        {draftError}
                    </div>
                )}
            </div>
        );
    };

    // === РЕНДЕР ОШИБКИ ===
    const renderError = () => {
        if (!error) return null;

        return (
            <Alert
                variant="error"
                title="Ошибка загрузки данных"
                onClose={() => setError(null)}
                style={{ marginBottom: 16 }}
            >
                {error.message || 'Не удалось загрузить статистику'}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    style={{ marginTop: 8 }}
                >
                    Повторить
                </Button>
            </Alert>
        );
    };

    // === РЕНДЕР ПРЕДУПРЕЖДЕНИЯ О ПРИБЛИЗИТЕЛЬНОСТИ ===
    const renderApproximateNotice = () => {
        // Показываем плашку если:
        // 1. Есть данные
        // 2. Метрика считает уникальных через HyperLogLog
        if (!data?.meta?.track_unique) return null;

        return (
            <Alert
                variant="info"
                icon="fa-info-circle"
                title="Статистика приблизительная"
                style={{ marginBottom: 16 }}
            >
                Подсчёт уникальных значений выполняется с использованием вероятностной структуры данных
                <strong> HyperLogLog</strong>, которая обеспечивает высокую производительность
                при минимальном потреблении памяти.
                <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
                    <strong>Точность:</strong> погрешность составляет около 0.5-2% от реального значения.
                    Для большинства аналитических задач этого достаточно.
                </div>
            </Alert>
        );
    };

    // === РЕНДЕР WARNING ===
    const renderWarning = () => {
        if (!data?.warning) return null;

        return (
            <Alert
                variant="warning"
                title="Данные обрезаны"
                style={{ marginBottom: 16 }}
            >
                {data.warning.hint}
                <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
                    Запрошено: {data.warning.original_count} точек,
                    Возвращено: {data.warning.returned_count} из {data.warning.max_allowed}
                </div>
            </Alert>
        );
    };

    // === РЕНДЕР SUMMARY ===
    const renderSummary = () => {
        if (!data?.summary) return null;

        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 12,
                marginBottom: 16
            }}>
                <Card padding={16}>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                        Всего
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>
                        {data.summary.total_count.toLocaleString('ru-RU')}
                    </div>
                </Card>

                {data.summary.total_unique !== undefined && data.meta?.track_unique && (
                    <Card padding={16}>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                            Уникальных
                            <span style={{ fontSize: 10, color: '#64748b', marginLeft: 4 }}>≈</span>
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>
                            {data.summary.total_unique.toLocaleString('ru-RU')}
                        </div>
                    </Card>
                )}

                <Card padding={16}>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                        Точек данных
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>
                        {data.summary.data_points}
                    </div>
                </Card>
            </div>
        );
    };

    // === РЕНДЕР META ИНФОРМАЦИИ ===
    const renderMeta = () => {
        if (!data?.meta) return null;

        const meta = data.meta;
        const retentionInfo = formatRetention(meta.retention);

        return (
            <Card padding={16} style={{ marginBottom: 16, background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 12 }}>
                    Информация о метрике
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 12 }}>
                    <div>
                        <div style={{ color: '#64748b', marginBottom: 2 }}>Метрика</div>
                        <div style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{meta.metric_name}</div>
                    </div>

                    <div>
                        <div style={{ color: '#64748b', marginBottom: 2 }}>Базовая гранулярность</div>
                        <Badge variant="info">{meta.base_granularity}</Badge>
                    </div>

                    <div>
                        <div style={{ color: '#64748b', marginBottom: 2 }}>Фактическая гранулярность</div>
                        <Badge variant="success">{meta.effective_granularity}</Badge>
                    </div>

                    <div>
                        <div style={{ color: '#64748b', marginBottom: 2 }}>Уникальные пользователи</div>
                        <Badge variant={meta.track_unique ? 'success' : 'default'}>
                            {meta.track_unique ? 'Считаются (HLL)' : 'Не считаются'}
                        </Badge>
                    </div>

                    <div>
                        <div style={{ color: '#64748b', marginBottom: 2 }}>Кеширование</div>
                        <Badge variant={meta.cache?.enabled ? 'success' : 'default'}>
                            {meta.cache?.enabled ? 'Включено' : 'Выключено'}
                        </Badge>
                    </div>

                    {/* Детализированное поле хранения */}
                    {retentionInfo.length > 0 && (
                        <div style={{ gridColumn: 'span 1' }}>
                            <div style={{ color: '#64748b', marginBottom: 6 }}>
                                Срок хранения данных
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {retentionInfo.map((item, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '4px 8px',
                                        background: 'rgba(0,0,0,0.3)',
                                        borderRadius: 4
                                    }}>
                                        <span style={{ color: '#94a3b8' }}>{item.label}:</span>
                                        <span style={{ color: '#e2e8f0', fontWeight: 500 }}>
                                            {item.value}
                                        </span>
                                    </div>
                                ))}
                                <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>
                                    После этого срока данные автоматически удаляются
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        );
    };

    // === РЕЖИМ BUTTON ===
    if (mode === 'button' && isAdminOrDev) {
        return (
            <>
                <Button
                    variant={buttonVariant}
                    icon={buttonIcon}
                    onClick={handleOpen}
                    disabled={loading}
                >
                    {buttonLabel}
                </Button>

                <Modal
                    open={modalOpen}
                    onClose={handleClose}
                    title={modalTitle || data?.meta?.metric_name || 'Статистика'}
                    size={modalSize}
                    closeOnOutsideClick={closeOnOutsideClick}
                    closeOnEsc={closeOnEsc}
                >
                    <div style={{ padding: '0 4px' }}>
                        {renderControls()}
                        {renderError()}
                        {renderApproximateNotice()}
                        {renderWarning()}

                        {loading && !data && (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, marginBottom: 12 }} />
                                <div>Загрузка данных...</div>
                            </div>
                        )}

                        {data && (
                            <>
                                {renderSummary()}
                                {renderChart(prepareChartData())}
                                {renderMeta()}
                            </>
                        )}

                        {!loading && !data && !error && (
                            <EmptyState
                                icon="fa-chart-line"
                                title="Нет данных"
                                description="Для выбранного периода данные отсутствуют"
                            />
                        )}
                    </div>
                </Modal>
            </>
        );
    }

    // === РЕЖИМ INLINE ===
    if (isAdminOrDev) {
        return (
            <>
                <Card padding={20}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                            {inlineTitle || data?.meta?.metric_name || 'Статистика'}
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={detailsButtonIcon}
                            onClick={handleOpen}
                        >
                            {detailsButtonLabel}
                        </Button>
                    </div>

                    {renderError()}

                    {loading && !data && (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, marginBottom: 12 }} />
                            <div>Загрузка данных...</div>
                        </div>
                    )}

                    {data && (
                        <>
                            {renderSummary()}
                            {renderChart(prepareChartData(), 180)}
                        </>
                    )}

                    {!loading && !data && !error && (
                        <EmptyState
                            icon="fa-chart-line"
                            title="Нет данных"
                            description="Для выбранного периода данные отсутствуют"
                        />
                    )}
                </Card>

                <Modal
                    open={modalOpen}
                    onClose={handleClose}
                    title={modalTitle || data?.meta?.metric_name || 'Статистика'}
                    size={modalSize}
                    closeOnOutsideClick={closeOnOutsideClick}
                    closeOnEsc={closeOnEsc}
                >
                    <div style={{ padding: '0 4px' }}>
                        {renderControls()}
                        {renderError()}
                        {renderApproximateNotice()}
                        {renderWarning()}

                        {data && (
                            <>
                                {renderSummary()}
                                {renderChart(prepareChartData())}
                                {renderMeta()}
                            </>
                        )}
                    </div>
                </Modal>
            </>
        );
    }
    return null
}