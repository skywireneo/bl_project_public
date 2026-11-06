import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Badge, PageHeader } from '../ui/UIComponents';
import { getIncidentsCaban, transition } from '../../http/incidentsAPI';

// --- КОНФИГУРАЦИЯ СУЩНОСТЕЙ И КОЛОНОК ---
const ENTITY_TYPES = {
    INCIDENTS: 'incidents',
    CONTESTATIONS: 'contestations'
};

const AVAILABLE_COLUMNS = {
    [ENTITY_TYPES.INCIDENTS]: ['new', 'in_progress', 'resolved', 'closed', 'rejected', 'withdrawn'],
    [ENTITY_TYPES.CONTESTATIONS]: ['contestation_new', 'contestation_in_progress', 'contestation_rejected', 'contested_full', 'contested_partial', 'contestation_withdrawn']
};

const DEFAULT_VISIBLE_COLUMNS = {
    [ENTITY_TYPES.INCIDENTS]: ['new', 'in_progress', 'resolved', 'rejected'],
    [ENTITY_TYPES.CONTESTATIONS]: ['contestation_new', 'contestation_in_progress', 'contestation_rejected']
};

const STORAGE_KEYS = {
    LAST_TYPE: 'kanban_last_entity_type',
    VISIBLE_COLUMNS: (type) => `kanban_visible_columns_${type}`
};

const LIMIT = 5;
const MOBILE_BREAKPOINT = 900;
const SMALL_MOBILE_BREAKPOINT = 480;

export default function KanbanBoardPage() {
    const navigate = useNavigate();

    // Основной тип сущности (Инциденты / Оспаривания)
    const [entityType, setEntityType] = useState(() => {
        return localStorage.getItem(STORAGE_KEYS.LAST_TYPE) || ENTITY_TYPES.INCIDENTS;
    });

    // Фильтр "Мои" / "Все"
    const [viewType, setViewType] = useState('me');

    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingColumns, setLoadingColumns] = useState({});
    const [transitioning, setTransitioning] = useState({});
    const [toast, setToast] = useState(null);
    const [draggedIncident, setDraggedIncident] = useState(null);

    // Размеры экрана
    const [screenWidth, setScreenWidth] = useState(window.innerWidth);
    const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
    const [isSmallMobile, setIsSmallMobile] = useState(window.innerWidth < SMALL_MOBILE_BREAKPOINT);
    const [activeTab, setActiveTab] = useState(null);

    // Настройки видимости колонок
    const [visibleColumns, setVisibleColumns] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.VISIBLE_COLUMNS(entityType));
            return saved ? JSON.parse(saved) : DEFAULT_VISIBLE_COLUMNS[entityType];
        } catch {
            return DEFAULT_VISIBLE_COLUMNS[entityType];
        }
    });
    const [showColumnSettings, setShowColumnSettings] = useState(false);

    // Следим за размером экрана
    useEffect(() => {
        const handleResize = () => {
            setScreenWidth(window.innerWidth);
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
            setIsSmallMobile(window.innerWidth < SMALL_MOBILE_BREAKPOINT);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Сохранение выбранного типа сущности
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.LAST_TYPE, entityType);
    }, [entityType]);

    // Сброс и загрузка настроек колонок при смене типа сущности
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.VISIBLE_COLUMNS(entityType));
            setVisibleColumns(saved ? JSON.parse(saved) : DEFAULT_VISIBLE_COLUMNS[entityType]);
        } catch {
            setVisibleColumns(DEFAULT_VISIBLE_COLUMNS[entityType]);
        }
        setActiveTab(null); // Сбрасываем активную вкладку для корректного пересчета
        loadBoard(viewType, entityType);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityType]);

    // Сохранение видимых колонок при их изменении
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.VISIBLE_COLUMNS(entityType), JSON.stringify(visibleColumns));
    }, [visibleColumns, entityType]);

    // Установка активной вкладки при первой загрузке или изменении колонок
    useEffect(() => {
        if (isMobile && columns.length > 0) {
            const firstVisible = columns.find(col => visibleColumns.includes(col.code));
            if (!activeTab || !visibleColumns.includes(activeTab)) {
                setActiveTab(firstVisible ? firstVisible.code : null);
            }
        }
    }, [columns, isMobile, activeTab, visibleColumns]);

    // Загрузка всей доски
    const loadBoard = async (currentViewType = viewType, currentEntityType = entityType) => {
        setLoading(true);
        try {
            // ИСПРАВЛЕНО: 'all' передается как columnCode, entityType как 5-й параметр (адаптируйте под ваш API, если нужно)
            const response = await getIncidentsCaban(currentViewType, 'all', LIMIT, 1, currentEntityType);
            setColumns(response.columns || []);
        } catch (error) {
            showToast('Ошибка загрузки доски', 'error');
            console.error('[loadBoard]', error);
        } finally {
            setLoading(false);
        }
    };

    // Дозагрузка конкретной колонки
    const loadMore = async (columnCode, currentPage) => {
        setLoadingColumns(prev => ({ ...prev, [columnCode]: true }));
        try {
            const response = await getIncidentsCaban(viewType, columnCode, LIMIT, currentPage + 1, entityType);
            const newColumn = response.columns?.[0];

            if (newColumn) {
                setColumns(prev => prev.map(col => {
                    if (col.code === columnCode) {
                        return {
                            ...col,
                            incidents: [...col.incidents, ...newColumn.incidents],
                            pagination: newColumn.pagination
                        };
                    }
                    return col;
                }));
            }
        } catch (error) {
            showToast('Ошибка дозагрузки колонки', 'error');
            console.error('[loadMore]', error);
        } finally {
            setLoadingColumns(prev => ({ ...prev, [columnCode]: false }));
        }
    };

    // Смена типа фильтра (Мои / Все)
    const handleViewTypeChange = (newViewType) => {
        setViewType(newViewType);
        loadBoard(newViewType, entityType);
    };

    // Смена типа сущности (Инциденты / Оспаривания)
    const handleEntityTypeChange = (newEntityType) => {
        setEntityType(newEntityType);

        // Для оспариваний доступен только фильтр "Все"
        if (newEntityType === ENTITY_TYPES.CONTESTATIONS) {
            setViewType('all');
        }

        setShowColumnSettings(false);
    };

    // Сброс настроек колонок к значениям по умолчанию
    const handleResetColumns = () => {
        setVisibleColumns(DEFAULT_VISIBLE_COLUMNS[entityType]);
        showToast('Настройки колонок сброшены', 'success');
    };

    // Обработка drag-and-drop
    const handleDragStart = (e, incidentId, fromColumnCode) => {
        const fromColumn = columns.find(c => c.code === fromColumnCode);
        const incident = fromColumn?.incidents.find(i => i.id === incidentId);

        if (!incident || !fromColumn) return;

        setDraggedIncident({
            id: incidentId,
            fromColumnCode,
            availableTransitions: fromColumn.available_transitions || []
        });

        e.dataTransfer.setData('incidentId', incidentId);
        e.dataTransfer.setData('fromColumnCode', fromColumnCode);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = (e) => {
        setDraggedIncident(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, toColumnCode) => {
        e.preventDefault();
        const incidentId = e.dataTransfer.getData('incidentId');
        const fromColumnCode = e.dataTransfer.getData('fromColumnCode');

        setDraggedIncident(null);

        if (!incidentId || !fromColumnCode || fromColumnCode === toColumnCode) return;

        const fromColumn = columns.find(c => c.code === fromColumnCode);
        const incident = fromColumn?.incidents.find(i => i.id === incidentId);
        if (!incident) return;

        if (!fromColumn.available_transitions?.includes(toColumnCode)) {
            showToast(`Переход из "${fromColumn.name}" в "${columns.find(c => c.code === toColumnCode)?.name}" невозможен`, 'error');
            return;
        }

        const toColumn = columns.find(c => c.code === toColumnCode);

        if (toColumn.need_alert) {
            const confirmMessage = toColumn.descr || `Вы уверены, что хотите перевести запись в статус "${toColumn.name}"?`;
            if (!window.confirm(confirmMessage)) {
                return;
            }
        }

        await performTransition(incidentId, toColumnCode, fromColumnCode, incident);
    };

    const performTransition = async (incidentId, targetStatusCode, fromColumnCode, incident) => {
        setTransitioning(prev => ({ ...prev, [incidentId]: true }));

        try {
            await transition(incidentId, targetStatusCode);
            showToast(`Успешно переведён`, 'success');
            await loadBoard(viewType, entityType);
        } catch (error) {
            showToast(error?.message || 'Ошибка при изменении статуса', 'error');
            console.error('[performTransition]', error);
        } finally {
            setTransitioning(prev => ({ ...prev, [incidentId]: false }));
        }
    };

    const showToast = (message, variant = 'info') => {
        setToast({ message, variant });
        setTimeout(() => setToast(null), 3500);
    };

    const canDropToColumn = (columnCode) => {
        if (!draggedIncident) return null;
        if (draggedIncident.fromColumnCode === columnCode) return null;
        return draggedIncident.availableTransitions.includes(columnCode);
    };

    const getDropHighlightStyle = (columnCode) => {
        const canDrop = canDropToColumn(columnCode);
        if (canDrop === null) return {};

        if (canDrop) {
            return {
                background: 'rgba(16, 185, 129, 0.08)',
                borderColor: 'rgba(16, 185, 129, 0.5)',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)'
            };
        } else {
            return {
                background: 'rgba(239, 68, 68, 0.08)',
                borderColor: 'rgba(239, 68, 68, 0.5)',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
            };
        }
    };

    useEffect(() => {
        loadBoard(viewType, entityType);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const truncateEmail = (email) => {
        if (!email) return '';
        if (!isSmallMobile) return email;
        return email.length > 15 ? email.substring(0, 12) + '...' : email;
    };

    const truncateTg = (tg) => {
        if (!tg) return '';
        if (!isSmallMobile) return tg;
        return tg.length > 12 ? tg.substring(0, 9) + '...' : tg;
    };

    const responsive = {
        padding: isSmallMobile ? 12 : isMobile ? 16 : 20,
        cardPadding: isSmallMobile ? 12 : isMobile ? 14 : 16,
        columnPadding: isSmallMobile ? 12 : isMobile ? 14 : 16,
        gap: isSmallMobile ? 12 : isMobile ? 14 : 20,
        headerPadding: isSmallMobile ? 12 : isMobile ? 16 : 32,
        fontSize: {
            id: isSmallMobile ? 11 : isMobile ? 12 : 13,
            description: isSmallMobile ? 12 : isMobile ? 12 : 13,
            date: isSmallMobile ? 10 : 11,
            meta: isSmallMobile ? 10 : 11,
            columnName: isSmallMobile ? 14 : isMobile ? 15 : 16,
            columnSubtext: isSmallMobile ? 10 : 11
        },
        iconSize: isSmallMobile ? 10 : 12,
        badgePadding: isSmallMobile ? '3px 6px' : isMobile ? '3px 8px' : '4px 10px'
    };

    const renderIncidentCard = (inc, col) => (
        <motion.div
            key={inc.id}
            layout
            draggable={!isMobile}
            onDragStart={(e) => !isMobile && handleDragStart(e, inc.id, col.code)}
            onDragEnd={handleDragEnd}
            // Динамический роутинг: оспаривания идут на /contestation/, инциденты на /incidents/
            onClick={() => navigate(entityType === ENTITY_TYPES.CONTESTATIONS ? `/contestation/${inc.id}` : `/incidents/${inc.id}`)}
            style={{
                background: '#1e2030',
                borderRadius: isSmallMobile ? 10 : 12,
                padding: responsive.cardPadding,
                border: '1px solid rgba(255,255,255,0.06)',
                cursor: transitioning[inc.id] ? 'wait' : 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s, opacity 0.2s, border-color 0.2s',
                opacity: transitioning[inc.id] ? 0.5 : 1,
                overflow: 'hidden',
                width: '100%',
                boxSizing: 'border-box'
            }}
            whileHover={{ borderColor: 'rgba(99,102,241,0.3)' }}
        >
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                marginBottom: 8, gap: 8, flexWrap: isSmallMobile ? 'wrap' : 'nowrap'
            }}>
                <span style={{
                    fontSize: responsive.fontSize.id, fontWeight: 700, color: '#f1f5f9',
                    fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap', flex: isSmallMobile ? '1 1 auto' : '1 1 60%', minWidth: 0
                }}>
                    #{inc.id}
                </span>
                <Badge variant="info" style={{
                    flexShrink: 0, fontSize: isSmallMobile ? 10 : 11, padding: responsive.badgePadding,
                    maxWidth: isSmallMobile ? '45%' : 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                    {inc.type}
                </Badge>
            </div>

            <div style={{
                fontSize: responsive.fontSize.description, color: '#cbd5e1', marginBottom: 10,
                lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'break-word'
            }}>
                {inc.description || 'Нет описания'}
            </div>

            <div style={{
                fontSize: responsive.fontSize.date, color: '#64748b', marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 4
            }}>
                <i className="fa-solid fa-calendar" style={{ fontSize: responsive.iconSize }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {formatDate(inc.date_create)}
                </span>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', margin: '8px 0' }} />

            <div style={{
                fontSize: responsive.fontSize.meta, color: '#94a3b8', marginBottom: inc.responsible ? 4 : 0,
                display: 'flex', alignItems: 'center', gap: 6, flexWrap: isSmallMobile ? 'wrap' : 'nowrap'
            }}>
                <i className="fa-solid fa-user-plus" style={{ color: '#6366f1', fontSize: responsive.iconSize, flexShrink: 0 }} />
                <span style={{ flexShrink: 0 }}>Добавил:</span>
                <span style={{ color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
                    {inc.user_add_email ? truncateEmail(inc.user_add_email) : inc.user_add_tg ? truncateTg(inc.user_add_tg) : 'Неизвестно'}
                </span>
                {inc.user_add_tg && inc.user_add_email && !isSmallMobile && (
                    <span style={{ color: '#64748b', flexShrink: 0 }}>@{truncateTg(inc.user_add_tg)}</span>
                )}
            </div>

            {inc.responsible && (
                <div style={{
                    fontSize: responsive.fontSize.meta, color: '#94a3b8',
                    display: 'flex', alignItems: 'center', gap: 6, flexWrap: isSmallMobile ? 'wrap' : 'nowrap'
                }}>
                    <i className="fa-solid fa-user-shield" style={{ color: '#10b981', fontSize: responsive.iconSize, flexShrink: 0 }} />
                    <span style={{ flexShrink: 0 }}>Ответственный:</span>
                    <span style={{ color: '#cbd5e1', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
                        @{inc.responsible.login}
                    </span>
                </div>
            )}
        </motion.div>
    );

    const renderColumn = (col) => {
        const pagination = col.pagination || {};
        const hasMore = pagination.page < pagination.total_pages;
        const highlightStyle = !isMobile ? getDropHighlightStyle(col.code) : {};
        const columnColor = col.button_color === 'success' ? '#10b981'
            : col.button_color === 'danger' ? '#ef4444'
                : col.button_color === 'warning' ? '#f59e0b' : '#6366f1';

        return (
            <div
                key={col.code}
                style={{
                    flex: isMobile ? 'none' : 1, width: isMobile ? '100%' : 'auto',
                    minWidth: isMobile ? 'auto' : 280, maxWidth: isMobile ? '100%' : 'none',
                    background: highlightStyle.background || 'rgba(0,0,0,0.2)',
                    borderRadius: isSmallMobile ? 12 : 16, padding: responsive.columnPadding,
                    minHeight: isMobile ? 'auto' : 500,
                    border: `1px solid ${highlightStyle.borderColor || 'rgba(255,255,255,0.04)'}`,
                    boxShadow: highlightStyle.boxShadow || 'none', display: 'flex',
                    flexDirection: 'column', transition: 'all 0.2s ease',
                    boxSizing: 'border-box', overflow: 'hidden'
                }}
                onDrop={(e) => !isMobile && handleDrop(e, col.code)}
                onDragOver={!isMobile ? handleDragOver : undefined}
            >
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 16, paddingBottom: 12, borderBottom: `2px solid ${columnColor}`, gap: 8
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                        <h3 style={{
                            fontSize: responsive.fontSize.columnName, fontWeight: 700,
                            color: columnColor === '#6366f1' ? '#c7d2fe' : columnColor, margin: 0,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                            {col.name}
                        </h3>
                        {col.button_text && (
                            <span style={{
                                fontSize: responsive.fontSize.columnSubtext, color: '#64748b',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>
                                {col.button_text}
                            </span>
                        )}
                    </div>
                    <Badge variant="default" style={{ flexShrink: 0, fontSize: isSmallMobile ? 10 : 11, padding: responsive.badgePadding }}>
                        {col.incidents_count}
                    </Badge>
                </div>

                <div style={{
                    display: 'flex', flexDirection: 'column', gap: responsive.gap,
                    flex: 1, overflowY: isMobile ? 'visible' : 'auto', width: '100%'
                }}>
                    <AnimatePresence>
                        {col.incidents.map(inc => renderIncidentCard(inc, col))}
                    </AnimatePresence>

                    {col.incidents.length === 0 && (
                        <div style={{
                            textAlign: 'center', padding: isSmallMobile ? '24px 16px' : '30px 20px',
                            color: '#475569', fontSize: 13, background: 'rgba(0,0,0,0.1)',
                            borderRadius: 12, border: '1px dashed rgba(255,255,255,0.06)'
                        }}>
                            {isMobile ? 'Нет записей' : 'Перетащите сюда'}
                        </div>
                    )}

                    {hasMore && (
                        <button
                            onClick={() => loadMore(col.code, pagination.page)}
                            disabled={loadingColumns[col.code]}
                            style={{
                                marginTop: 8, padding: '10px 16px', borderRadius: 10,
                                border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)',
                                color: '#c7d2fe', fontWeight: 600, fontSize: 12,
                                cursor: loadingColumns[col.code] ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                opacity: loadingColumns[col.code] ? 0.6 : 1, transition: 'all 0.2s', width: '100%'
                            }}
                        >
                            {loadingColumns[col.code] ? (
                                <><i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }} /> Загрузка...</>
                            ) : (
                                <><i className="fa-solid fa-chevron-down" /> Загрузить ещё</>
                            )}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // Фильтруем колонки для отображения на основе настроек
    const displayedColumns = columns.filter(col => visibleColumns.includes(col.code));

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            overflow: 'hidden', width: '100%', boxSizing: 'border-box'
        }}>
            <div style={{
                padding: `clamp(12px, 3vw, ${responsive.headerPadding}px) clamp(12px, 3vw, ${responsive.headerPadding}px) 0`,
                flexShrink: 0, width: '100%', boxSizing: 'border-box'
            }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    marginBottom: isMobile ? 12 : 20,
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? 12 : 0, width: '100%', boxSizing: 'border-box'
                }}>
                    <div style={{ flex: isMobile ? 'none' : 1, minWidth: 0, width: isMobile ? '100%' : 'auto' }}>
                        <PageHeader
                            title={entityType === ENTITY_TYPES.INCIDENTS ? "Канбан-доска инцидентов" : "Канбан-доска оспариваний"}
                            subtitle="Управление состояниями"
                        />
                    </div>

                    <div style={{
                        display: 'flex', gap: isSmallMobile ? 8 : 12,
                        alignItems: 'center', flexWrap: 'wrap', flexShrink: 0
                    }}>
                        {/* Переключатель сущности */}
                        <div style={{
                            display: 'flex', background: 'rgba(0,0,0,0.2)',
                            borderRadius: 12, padding: 4, border: '1px solid rgba(255,255,255,0.06)'
                        }}>
                            <button
                                onClick={() => handleEntityTypeChange(ENTITY_TYPES.INCIDENTS)}
                                style={{
                                    padding: isSmallMobile ? '6px 12px' : '8px 16px', borderRadius: 8, border: 'none',
                                    background: entityType === ENTITY_TYPES.INCIDENTS ? '#6366f1' : 'transparent',
                                    color: entityType === ENTITY_TYPES.INCIDENTS ? '#fff' : '#94a3b8',
                                    fontWeight: 600, fontSize: isSmallMobile ? 12 : 13, cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                Инциденты
                            </button>
                            <button
                                onClick={() => handleEntityTypeChange(ENTITY_TYPES.CONTESTATIONS)}
                                style={{
                                    padding: isSmallMobile ? '6px 12px' : '8px 16px', borderRadius: 8, border: 'none',
                                    background: entityType === ENTITY_TYPES.CONTESTATIONS ? '#6366f1' : 'transparent',
                                    color: entityType === ENTITY_TYPES.CONTESTATIONS ? '#fff' : '#94a3b8',
                                    fontWeight: 600, fontSize: isSmallMobile ? 12 : 13, cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                Оспаривания
                            </button>
                        </div>

                        {/* Фильтр типа (Мои / Все) - ТОЛЬКО ДЛЯ ИНЦИДЕНТОВ */}
                        {entityType === ENTITY_TYPES.INCIDENTS && (
                            <div style={{
                                display: 'flex', background: 'rgba(0,0,0,0.2)',
                                borderRadius: 12, padding: 4, border: '1px solid rgba(255,255,255,0.06)'
                            }}>
                                <button
                                    onClick={() => handleViewTypeChange('me')}
                                    style={{
                                        padding: isSmallMobile ? '6px 12px' : '8px 16px', borderRadius: 8, border: 'none',
                                        background: viewType === 'me' ? '#6366f1' : 'transparent',
                                        color: viewType === 'me' ? '#fff' : '#94a3b8',
                                        fontWeight: 600, fontSize: isSmallMobile ? 12 : 13, cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    Мои
                                </button>
                                <button
                                    onClick={() => handleViewTypeChange('all')}
                                    style={{
                                        padding: isSmallMobile ? '6px 12px' : '8px 16px', borderRadius: 8, border: 'none',
                                        background: viewType === 'all' ? '#6366f1' : 'transparent',
                                        color: viewType === 'all' ? '#fff' : '#94a3b8',
                                        fontWeight: 600, fontSize: isSmallMobile ? 12 : 13, cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    Все
                                </button>
                            </div>
                        )}

                        {/* Кнопка обновить */}
                        <button
                            onClick={() => loadBoard(viewType, entityType)}
                            disabled={loading}
                            style={{
                                padding: isSmallMobile ? '6px 12px' : '8px 16px', borderRadius: 10,
                                border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)',
                                color: '#c7d2fe', fontWeight: 600, fontSize: isSmallMobile ? 12 : 13,
                                cursor: loading ? 'not-allowed' : 'pointer', display: 'flex',
                                alignItems: 'center', gap: 6, opacity: loading ? 0.6 : 1,
                                transition: 'all 0.2s', whiteSpace: 'nowrap'
                            }}
                        >
                            <i className="fa-solid fa-arrows-rotate" style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                            {!isSmallMobile && 'Обновить'}
                        </button>

                        {/* Кнопка настроек колонок */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowColumnSettings(!showColumnSettings)}
                                style={{
                                    padding: isSmallMobile ? '6px 12px' : '8px 16px', borderRadius: 10,
                                    border: '1px solid rgba(99,102,241,0.3)',
                                    background: showColumnSettings ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)',
                                    color: '#c7d2fe', fontWeight: 600, fontSize: isSmallMobile ? 12 : 13,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                    transition: 'all 0.2s', whiteSpace: 'nowrap'
                                }}
                            >
                                <i className="fa-solid fa-sliders" />
                                {!isSmallMobile && 'Колонки'}
                            </button>

                            {showColumnSettings && (
                                <div style={{
                                    position: 'absolute', top: '120%', right: 0, width: 240,
                                    background: '#1e2030', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 12, padding: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                    zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8
                                }}>
                                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>
                                        Отображать колонки:
                                    </div>

                                    {AVAILABLE_COLUMNS[entityType].map(colCode => {
                                        const colMeta = columns.find(c => c.code === colCode);
                                        const colName = colMeta ? colMeta.name : colCode;

                                        return (
                                            <label
                                                key={colCode}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                                                    fontSize: 13, color: visibleColumns.includes(colCode) ? '#f1f5f9' : '#64748b'
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={visibleColumns.includes(colCode)}
                                                    onChange={() => {
                                                        setVisibleColumns(prev => {
                                                            if (!prev.includes(colCode) || prev.length > 1) {
                                                                return prev.includes(colCode)
                                                                    ? prev.filter(c => c !== colCode)
                                                                    : [...prev, colCode];
                                                            }
                                                            return prev;
                                                        });
                                                    }}
                                                    style={{ accentColor: '#6366f1', cursor: 'pointer' }}
                                                />
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {colName}
                                                </span>
                                            </label>
                                        );
                                    })}

                                    {/* Кнопка сброса настроек */}
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 4, paddingTop: 8 }}>
                                        <button
                                            onClick={handleResetColumns}
                                            style={{
                                                width: '100%', padding: '8px', borderRadius: 8,
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                color: '#fca5a5', fontWeight: 600, fontSize: 12,
                                                cursor: 'pointer', display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', gap: 6, transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                        >
                                            <i className="fa-solid fa-rotate-left" />
                                            Сбросить по умолчанию
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Мобильные табы */}
                {isMobile && displayedColumns.length > 0 && (
                    <div style={{
                        display: 'flex', gap: 8, overflowX: 'auto', overflowY: 'hidden',
                        paddingBottom: 8, marginBottom: 16, WebkitOverflowScrolling: 'touch',
                        marginLeft: -responsive.padding, marginRight: -responsive.padding,
                        paddingLeft: responsive.padding, paddingRight: responsive.padding,
                        width: `calc(100% + ${responsive.padding * 2}px)`
                    }}>
                        {displayedColumns.map(col => {
                            const tabColor = col.button_color === 'success' ? '#10b981'
                                : col.button_color === 'danger' ? '#ef4444'
                                    : col.button_color === 'warning' ? '#f59e0b' : '#6366f1';
                            const isActive = activeTab === col.code;

                            return (
                                <button
                                    key={col.code}
                                    onClick={() => setActiveTab(col.code)}
                                    style={{
                                        padding: isSmallMobile ? '6px 12px' : '8px 14px', borderRadius: 10,
                                        border: `1px solid ${isActive ? tabColor : 'rgba(255,255,255,0.06)'}`,
                                        background: isActive ? `${tabColor}1a` : 'rgba(0,0,0,0.2)',
                                        color: isActive ? tabColor : '#94a3b8', fontWeight: 600,
                                        fontSize: isSmallMobile ? 11 : 12, cursor: 'pointer',
                                        whiteSpace: 'nowrap', display: 'flex', alignItems: 'center',
                                        gap: 6, transition: 'all 0.2s', flexShrink: 0
                                    }}
                                >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isSmallMobile ? 80 : 120 }}>
                                        {col.name}
                                    </span>
                                    <span style={{
                                        background: isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                                        padding: '2px 6px', borderRadius: 6, fontSize: isSmallMobile ? 9 : 10, flexShrink: 0
                                    }}>
                                        {col.incidents_count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Доска */}
            <div style={{
                padding: `0 clamp(12px, 3vw, ${responsive.headerPadding}px) clamp(12px, 3vw, ${responsive.headerPadding}px)`,
                flex: 1, overflowX: 'hidden', overflowY: 'auto', width: '100%',
                boxSizing: 'border-box', WebkitOverflowScrolling: 'touch'
            }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                        <div style={{ color: '#94a3b8', fontSize: 15 }}>Загрузка доски...</div>
                    </div>
                ) : displayedColumns.length === 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                        <div style={{ color: '#64748b', fontSize: 15 }}>Нет видимых колонок. Настройте отображение в фильтрах.</div>
                    </div>
                ) : (
                    <div style={{
                        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                        gap: responsive.gap, width: '100%', boxSizing: 'border-box'
                    }}>
                        {isMobile
                            ? displayedColumns.filter(col => col.code === activeTab).map(col => renderColumn(col))
                            : displayedColumns.map(col => renderColumn(col))
                        }
                    </div>
                )}
            </div>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 50, x: '-50%' }}
                        style={{
                            position: 'fixed', bottom: isSmallMobile ? 16 : 24, left: '50%',
                            transform: 'translateX(-50%)', padding: isSmallMobile ? '10px 16px' : '12px 20px',
                            borderRadius: 12,
                            background: toast.variant === 'error' ? '#7f1d1d' : toast.variant === 'success' ? '#064e3b' : '#1e293b',
                            color: '#fff', fontSize: isSmallMobile ? 13 : 14, fontWeight: 500,
                            border: `1px solid ${toast.variant === 'error' ? '#991b1b' : toast.variant === 'success' ? '#047857' : '#334155'}`,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 1000,
                            display: 'flex', alignItems: 'center', gap: 8,
                            maxWidth: 'calc(100vw - 32px)', boxSizing: 'border-box'
                        }}
                    >
                        <i className={`fa-solid ${toast.variant === 'error' ? 'fa-circle-exclamation' : toast.variant === 'success' ? 'fa-circle-check' : 'fa-circle-info'}`} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word' }}>
                            {toast.message}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}