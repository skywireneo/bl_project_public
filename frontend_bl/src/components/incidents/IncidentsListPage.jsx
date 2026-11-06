import React, { useState, useEffect, useMemo, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, Button, Badge, EmptyState, Alert, Input } from "../ui/UIComponents";
import { getAllIncidents, getIncidentStatus } from "../../http/incidentsAPI";
import RecentCreatedIncidents from "../mainPage/RecentCreatedIncidents";
import { Context } from "../..";

// === CSS-анимация скелетона ===
const SKELETON_STYLES = `
@keyframes skeleton-shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
}
.skeleton-box {
    background: linear-gradient(90deg, 
        rgba(255,255,255,0.04) 25%, 
        rgba(255,255,255,0.08) 50%, 
        rgba(255,255,255,0.04) 75%);
    background-size: 800px 100%;
    animation: skeleton-shimmer 1.6s ease-in-out infinite;
    border-radius: 8px;
}
.skeleton-line {
    height: 14px;
    margin-bottom: 10px;
    border-radius: 6px;
}
.skeleton-title { height: 18px; width: 40%; margin-bottom: 14px; }
.skeleton-field { height: 42px; margin-bottom: 10px; }
.skeleton-text-short { width: 50%; }
.skeleton-text-mid { width: 75%; }
.skeleton-text-long { width: 95%; }

@keyframes status-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.card-hover {
    transition: all 0.2s ease;
    cursor: pointer;
}
.card-hover:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(99,102,241,0.12);
    border-color: rgba(99,102,241,0.3) !important;
}

@keyframes status-check-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
    50% { box-shadow: 0 0 0 8px rgba(99,102,241,0); }
}

.status-check-active {
    animation: status-check-pulse 2s infinite;
}

/* === HOVER-ЭФФЕКТ НА СТРЕЛКЕ === */
.arrow-icon {
    transition: transform 0.25s ease, color 0.25s ease;
}
.card-hover:hover .arrow-icon {
    transform: translateX(4px);
    color: #a5b4fc;
}
`;

// === СКЕЛЕТОН КАРТОЧКИ ===
function IncidentCardSkeleton() {
    return (
        <Card>
            <div style={{ display: 'flex', gap: 16 }}>
                <div className="skeleton-box" style={{ width: 56, height: 56, borderRadius: 12, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div className="skeleton-box skeleton-line" style={{ width: '35%', height: 16, margin: 0 }} />
                        <div className="skeleton-box" style={{ width: 80, height: 22, borderRadius: 6 }} />
                    </div>
                    <div className="skeleton-box skeleton-line skeleton-text-long" />
                    <div className="skeleton-box skeleton-line skeleton-text-mid" />
                    <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                        <div className="skeleton-box" style={{ width: 60, height: 20, borderRadius: 6 }} />
                        <div className="skeleton-box" style={{ width: 90, height: 20, borderRadius: 6 }} />
                        <div className="skeleton-box" style={{ width: 110, height: 20, borderRadius: 6 }} />
                    </div>
                </div>
            </div>
        </Card>
    );
}

// === КОНФИГУРАЦИЯ СТАТУСОВ ===
const STATUS_CONFIGS = {
    new: {
        color: '#3b82f6',
        bg: 'rgba(59,130,246,0.12)',
        border: 'rgba(59,130,246,0.3)',
        icon: 'fa-circle-plus',
        label: 'Новый'
    },
    in_progress: {
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.12)',
        border: 'rgba(245,158,11,0.3)',
        icon: 'fa-spinner',
        label: 'В работе'
    },
    resolved: {
        color: '#10b981',
        bg: 'rgba(16,185,129,0.12)',
        border: 'rgba(16,185,129,0.3)',
        icon: 'fa-circle-check',
        label: 'Завершён'
    },
    closed: {
        color: '#64748b',
        bg: 'rgba(100,116,139,0.12)',
        border: 'rgba(100,116,139,0.3)',
        icon: 'fa-lock',
        label: 'Закрыт'
    },
    rejected: {
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.12)',
        border: 'rgba(239,68,68,0.3)',
        icon: 'fa-circle-xmark',
        label: 'Отклонён'
    },
    deleted: {
        color: '#64748b',
        bg: 'rgba(100,116,139,0.08)',
        border: 'rgba(100,116,139,0.2)',
        icon: 'fa-trash',
        label: 'Удалён'
    },
    withdrawn: {
        color: '#f97316', // Оранжевый, чтобы отличаться от "В работе" и "Отклонён"
        bg: 'rgba(249,115,22,0.12)',
        border: 'rgba(249,115,22,0.3)',
        icon: 'fa-circle-stop',
        label: 'Отозван'
    }
};

const getStatusConfig = (statusCode) => STATUS_CONFIGS[statusCode] || {
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.08)',
    border: 'rgba(148,163,184,0.2)',
    icon: 'fa-circle-question',
    label: 'Неизвестно'
};

// === КОМПОНЕНТ БЕЙДЖА СТАТУСА ===
function StatusBadge({ status, statusName, size = 'md' }) {
    const cfg = getStatusConfig(status);
    const displayName = statusName || cfg.label;
    const fontSize = size === 'sm' ? 11 : 12;
    const paddingV = size === 'sm' ? '3px' : '4px';
    const paddingH = size === 'sm' ? '8px' : '12px';
    const iconSize = size === 'sm' ? 9 : 10;

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: `${paddingV} ${paddingH}`,
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            borderRadius: 8,
            fontSize,
            fontWeight: 600,
            color: cfg.color,
            whiteSpace: 'nowrap',
            lineHeight: 1.3
        }}>
            <i className={`fa-solid ${cfg.icon}`} style={{ fontSize: iconSize }} />
            {displayName}
        </span>
    );
}

// === КОМПОНЕНТ ПРОВЕРКИ СТАТУСА ===
function StatusChecker({ isAdminOrDev, navigate }) {
    const [incidentId, setIncidentId] = useState('');
    const [checking, setChecking] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleCheck = async () => {
        if (!incidentId.trim()) {
            setError('Введите ID инцидента');
            return;
        }

        setChecking(true);
        setError(null);
        setResult(null);

        try {
            const response = await getIncidentStatus(incidentId.trim());
            setResult(response);
        } catch (err) {
            setError(err?.response?.data?.message || err.message || 'Инцидент не найден');
        } finally {
            setChecking(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleCheck();
        }
    };

    const handleClear = () => {
        setIncidentId('');
        setResult(null);
        setError(null);
    };

    const canViewIncident = result && (
        result.status === 'resolved' ||
        isAdminOrDev
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ marginBottom: 24 }}
        >
            <Card style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(139,92,246,0.04) 100%)',
                border: '1px solid rgba(99,102,241,0.15)'
            }}>
                <div style={{ marginBottom: 16 }}>
                    <h3 style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#f1f5f9',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                    }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ color: '#6366f1' }} />
                        Проверить статус инцидента
                    </h3>
                    <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 0' }}>
                        Введите ID инцидента, чтобы узнать его текущий статус
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: result || error ? 16 : 0 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <i className="fa-solid fa-hashtag" style={{
                            position: 'absolute',
                            left: 14,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#64748b',
                            fontSize: 14,
                            pointerEvents: 'none'
                        }} />
                        <input
                            type="text"
                            value={incidentId}
                            onChange={(e) => setIncidentId(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Например: 11082026-XARHS"
                            disabled={checking}
                            style={{
                                width: '100%',
                                padding: '12px 14px 12px 40px',
                                background: 'rgba(15,17,23,0.6)',
                                border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: 10,
                                color: '#e2e8f0',
                                fontSize: 14,
                                fontFamily: 'monospace',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => {
                                if (!error) e.target.style.borderColor = 'rgba(99,102,241,0.5)';
                            }}
                            onBlur={(e) => {
                                if (!error) e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                            }}
                        />
                    </div>
                    <Button
                        variant="primary"
                        icon={checking ? 'fa-solid fa-spinner' : 'fa-solid fa-search'}
                        onClick={handleCheck}
                        loading={checking}
                        disabled={!incidentId.trim() || checking}
                        style={{ flexShrink: 0 }}
                    >
                        {checking ? 'Проверка...' : 'Проверить'}
                    </Button>
                    {(result || error || incidentId) && (
                        <Button
                            variant="secondary"
                            icon="fa-solid fa-xmark"
                            onClick={handleClear}
                            style={{ flexShrink: 0 }}
                        >
                            Очистить
                        </Button>
                    )}
                </div>

                {/* Результат проверки */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div style={{
                                padding: '14px 16px',
                                background: 'rgba(239,68,68,0.08)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 10,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12
                            }}>
                                <i className="fa-solid fa-circle-xmark" style={{ color: '#ef4444', fontSize: 20 }} />
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f87171' }}>
                                        Инцидент не найден
                                    </div>
                                    {/* <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                                        {error}
                                    </div> */}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {result && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div style={{
                                padding: 16,
                                background: 'rgba(0,0,0,0.2)',
                                border: `1px solid ${getStatusConfig(result.status).border}`,
                                borderRadius: 10
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: 16,
                                    marginBottom: 12,
                                    flexWrap: 'wrap'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 10,
                                            background: getStatusConfig(result.status).bg,
                                            border: `1px solid ${getStatusConfig(result.status).border}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <i className={`fa-solid ${getStatusConfig(result.status).icon}`} style={{
                                                fontSize: 20,
                                                color: getStatusConfig(result.status).color
                                            }} />
                                        </div>
                                        <div>
                                            <div style={{
                                                fontSize: 11,
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.5,
                                                marginBottom: 2
                                            }}>
                                                Статус инцидента
                                            </div>
                                            <div style={{
                                                fontSize: 16,
                                                fontWeight: 700,
                                                color: getStatusConfig(result.status).color
                                            }}>
                                                {result.status_name || getStatusConfig(result.status).label}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            fontSize: 11,
                                            color: '#64748b',
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5,
                                            marginBottom: 2
                                        }}>
                                            ID инцидента
                                        </div>
                                        <div style={{
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: '#e2e8f0',
                                            fontFamily: 'monospace'
                                        }}>
                                            {result.id}
                                        </div>
                                    </div>
                                </div>

                                {canViewIncident ? (
                                    <Button
                                        variant="primary"
                                        icon="fa-arrow-right"
                                        onClick={() => navigate(`/incidents/${result.id}`)}
                                        fullWidth
                                    >
                                        Открыть инцидент
                                    </Button>
                                ) : (
                                    <div style={{
                                        padding: '12px 16px',
                                        background: 'rgba(245,158,11,0.08)',
                                        border: '1px solid rgba(245,158,11,0.2)',
                                        borderRadius: 8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10
                                    }}>
                                        <i className="fa-solid fa-lock" style={{ color: '#fbbf24', fontSize: 14 }} />
                                        <span style={{ fontSize: 13, color: '#fbbf24' }}>
                                            Доступ к инциденту появится после завершения обработки
                                        </span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    );
}

export default function IncidentsListPage() {
    const navigate = useNavigate();
    const { user } = useContext(Context)
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [total, setTotal] = useState(0);

    const isAdminOrDev =
        user?.user?.status && ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"].includes(user.user.status);

    const [currentPage, setCurrentPage] = useState(0);
    const [limit] = useState(10);

    // === НОВОЕ: поиск и сортировка ===
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const totalPages = Math.ceil(total / limit);

    useEffect(() => {
        let isMounted = true;

        const fetchIncidents = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await getAllIncidents(limit, currentPage);

                if (isMounted) {
                    setIncidents(response.data || []);
                    setTotal(response.total || 0);
                }
            } catch (err) {
                console.error("Ошибка загрузки инцидентов:", err);
                if (isMounted) {
                    setError(err?.response?.data?.message || err.message || "Не удалось загрузить список инцидентов");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchIncidents();
        return () => { isMounted = false; };
    }, [currentPage, limit]);

    // === КЛИЕНТСКАЯ ФИЛЬТРАЦИЯ ===
    const filteredIncidents = useMemo(() => {
        let result = incidents;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(inc =>
                (inc.id && String(inc.id).toLowerCase().includes(q)) ||
                (inc.user_description && inc.user_description.toLowerCase().includes(q)) ||
                (inc.add_reason_name && inc.add_reason_name.toLowerCase().includes(q))
            );
        }

        if (statusFilter !== 'all') {
            result = result.filter(inc => inc.status === statusFilter);
        }

        return result;
    }, [incidents, searchQuery, statusFilter]);

    // === ПОДСЧЁТ СТАТИСТИКИ ПО СТАТУСАМ (для фильтра) ===
    const statusCounts = useMemo(() => {
        const counts = { all: incidents.length };
        incidents.forEach(inc => {
            if (inc.status) {
                counts[inc.status] = (counts[inc.status] || 0) + 1;
            }
        });
        return counts;
    }, [incidents]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatRelativeDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';

        const now = new Date();
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / (1000 * 60));
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffMin < 1) return 'только что';
        if (diffMin < 60) return `${diffMin} мин. назад`;
        if (diffHour < 24) return `${diffHour} ч. назад`;
        if (diffDay < 7) return `${diffDay} дн. назад`;
        return '';
    };

    const resetFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
    };

    return (
        <div>
            <style>{SKELETON_STYLES}</style>

            {/* === ШАПКА === */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
                flexWrap: 'wrap',
                gap: 16
            }}>
                <div>
                    <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 12 }} />
                                Загрузка...
                            </span>
                        ) : (
                            <>
                                Показано <strong style={{ color: '#e2e8f0' }}>{filteredIncidents.length}</strong>
                                {searchQuery || statusFilter !== 'all'
                                    ? <> из <strong style={{ color: '#e2e8f0' }}>{total}</strong></>
                                    : null}
                                {' '}инцидентов (мы показываем здесь только несколько последних, все посмотреть нельзя)
                            </>
                        )}
                    </p>
                </div>
                <Button icon="fa-plus" variant="primary" onClick={() => navigate('/incidents/new')}>
                    Сообщить о нарушении
                </Button>
            </div>

            {/* === ПРОВЕРКА СТАТУСА ИНЦИДЕНТА === */}
            <StatusChecker isAdminOrDev={isAdminOrDev} navigate={navigate} />

            <RecentCreatedIncidents />

            {/* === ПАНЕЛЬ ФИЛЬТРОВ === */}
            {!loading && !error && isAdminOrDev && incidents.length > 0 && (
                null
                // <motion.div
                //     initial={{ opacity: 0, y: -10 }}
                //     animate={{ opacity: 1, y: 0 }}
                //     style={{
                //         display: 'flex',
                //         flexDirection: 'column',
                //         gap: 12,
                //         marginBottom: 20,
                //         padding: 16,
                //         background: 'rgba(0,0,0,0.2)',
                //         border: '1px solid rgba(255,255,255,0.06)',
                //         borderRadius: 12
                //     }}
                // >
                //     {/* Поиск */}
                //     <div style={{ position: 'relative' }}>
                //         <i className="fa-solid fa-search" style={{
                //             position: 'absolute',
                //             left: 14,
                //             top: '50%',
                //             transform: 'translateY(-50%)',
                //             color: '#64748b',
                //             fontSize: 14,
                //             pointerEvents: 'none'
                //         }} />
                //         <input
                //             type="text"
                //             value={searchQuery}
                //             onChange={(e) => setSearchQuery(e.target.value)}
                //             placeholder="Поиск по ID, описанию или причине..."
                //             style={{
                //                 width: '100%',
                //                 padding: '10px 14px 10px 40px',
                //                 background: 'rgba(15,17,23,0.6)',
                //                 border: '1px solid rgba(255,255,255,0.1)',
                //                 borderRadius: 10,
                //                 color: '#e2e8f0',
                //                 fontSize: 14,
                //                 outline: 'none',
                //                 transition: 'all 0.2s'
                //             }}
                //             onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                //             onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                //         />
                //     </div>

                //     {/* Фильтры по статусам */}
                //     <div style={{
                //         display: 'flex',
                //         gap: 8,
                //         flexWrap: 'wrap',
                //         alignItems: 'center'
                //     }}>
                //         <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginRight: 4 }}>
                //             Статус:
                //         </span>
                //         <button
                //             onClick={() => setStatusFilter('all')}
                //             style={{
                //                 padding: '5px 12px',
                //                 borderRadius: 8,
                //                 border: `1px solid ${statusFilter === 'all' ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                //                 background: statusFilter === 'all' ? 'rgba(99,102,241,0.15)' : 'rgba(0,0,0,0.2)',
                //                 color: statusFilter === 'all' ? '#a5b4fc' : '#94a3b8',
                //                 fontSize: 12,
                //                 fontWeight: 600,
                //                 cursor: 'pointer',
                //                 display: 'inline-flex',
                //                 alignItems: 'center',
                //                 gap: 6,
                //                 transition: 'all 0.2s'
                //             }}
                //         >
                //             Все
                //             {statusCounts.all > 0 && (
                //                 <span style={{
                //                     padding: '1px 6px',
                //                     background: statusFilter === 'all' ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)',
                //                     borderRadius: 4,
                //                     fontSize: 10
                //                 }}>
                //                     {statusCounts.all}
                //                 </span>
                //             )}
                //         </button>

                //         {Object.entries(STATUS_CONFIGS).map(([key, cfg]) => {
                //             const count = statusCounts[key] || 0;
                //             if (count === 0 && statusFilter !== key) return null;
                //             const isActive = statusFilter === key;

                //             return (
                //                 <button
                //                     key={key}
                //                     onClick={() => setStatusFilter(key)}
                //                     style={{
                //                         padding: '5px 12px',
                //                         borderRadius: 8,
                //                         border: `1px solid ${isActive ? cfg.border : 'rgba(255,255,255,0.1)'}`,
                //                         background: isActive ? cfg.bg : 'rgba(0,0,0,0.2)',
                //                         color: isActive ? cfg.color : '#94a3b8',
                //                         fontSize: 12,
                //                         fontWeight: 600,
                //                         cursor: 'pointer',
                //                         display: 'inline-flex',
                //                         alignItems: 'center',
                //                         gap: 6,
                //                         transition: 'all 0.2s'
                //                     }}
                //                 >
                //                     <i className={`fa-solid ${cfg.icon}`} style={{ fontSize: 9 }} />
                //                     {cfg.label}
                //                     {count > 0 && (
                //                         <span style={{
                //                             padding: '1px 6px',
                //                             background: isActive ? `${cfg.color}30` : 'rgba(255,255,255,0.06)',
                //                             borderRadius: 4,
                //                             fontSize: 10,
                //                             color: isActive ? cfg.color : '#94a3b8'
                //                         }}>
                //                             {count}
                //                         </span>
                //                     )}
                //                 </button>
                //             );
                //         })}

                //         {(searchQuery || statusFilter !== 'all') && (
                //             <button
                //                 onClick={resetFilters}
                //                 style={{
                //                     padding: '5px 12px',
                //                     borderRadius: 8,
                //                     border: '1px solid rgba(239,68,68,0.3)',
                //                     background: 'rgba(239,68,68,0.08)',
                //                     color: '#f87171',
                //                     fontSize: 12,
                //                     fontWeight: 600,
                //                     cursor: 'pointer',
                //                     display: 'inline-flex',
                //                     alignItems: 'center',
                //                     gap: 6,
                //                     marginLeft: 'auto'
                //                 }}
                //             >
                //                 <i className="fa-solid fa-xmark" style={{ fontSize: 10 }} />
                //                 Сбросить
                //             </button>
                //         )}
                //     </div>
                // </motion.div>
            )}

            {/* === ОШИБКА === */}
            {error && (
                <Alert variant="danger" icon="fa-circle-exclamation" style={{ marginBottom: 20 }}>
                    <strong>Ошибка загрузки</strong><br />
                    {error}
                </Alert>
            )}

            {/* === ЗАГРУЗКА === */}
            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[...Array(5)].map((_, i) => (
                        <IncidentCardSkeleton key={i} />
                    ))}
                </div>
            )}

            {/* === ПУСТОЕ СОСТОЯНИЕ === */}
            {!loading && !error && incidents.length === 0 && (
                <Card>
                    <EmptyState
                        icon="fa-folder-open"
                        title="Инцидентов пока нет"
                        description="Нажмите кнопку выше, чтобы сообщить о нарушении"
                        action={
                            <Button variant="primary" icon="fa-plus" onClick={() => navigate('/incidents/new')}>
                                Сообщить о нарушении
                            </Button>
                        }
                    />
                </Card>
            )}

            {/* === ПУСТОЕ СОСТОЯНИЕ ПРИ ФИЛЬТРАЦИИ === */}
            {!loading && !error && incidents.length > 0 && filteredIncidents.length === 0 && (
                <Card>
                    <EmptyState
                        icon="fa-filter"
                        title="Ничего не найдено"
                        description="Попробуйте изменить параметры поиска или сбросить фильтры"
                        action={
                            <Button variant="secondary" icon="fa-rotate-left" onClick={resetFilters}>
                                Сбросить фильтры
                            </Button>
                        }
                    />
                </Card>
            )}

            {/* === СПИСОК ИНЦИДЕНТОВ === */}
            {!loading && filteredIncidents.length > 0 && (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <AnimatePresence>
                            {filteredIncidents.map((inc, idx) => {
                                const contactInfo = [
                                    inc.user_add_email,
                                    inc.user_add_tg ? "@" + inc.user_add_tg : null
                                ].filter(Boolean).join(', ');
                                const relativeDate = formatRelativeDate(inc.date_create);
                                const statusCfg = getStatusConfig(inc.status);

                                return (
                                    <motion.div
                                        key={inc.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ delay: Math.min(idx * 0.06, 0.5), duration: 0.35 }}
                                    >
                                        <div
                                            onClick={() => navigate(`/incidents/${inc.id}`)}
                                            className="card-hover"
                                            style={{
                                                background: 'linear-gradient(135deg,#1e2030 0%,#1a1d2e 100%)',
                                                borderRadius: 14,
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                padding: '18px 20px',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            {/* Цветная полоска слева со статусом */}
                                            <div style={{
                                                position: 'absolute',
                                                left: 0,
                                                top: 0,
                                                bottom: 0,
                                                width: 4,
                                                background: statusCfg.color
                                            }} />

                                            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                                {/* === ИКОНКА СТАТУСА === */}
                                                <div style={{
                                                    width: 52,
                                                    height: 52,
                                                    borderRadius: 12,
                                                    background: statusCfg.bg,
                                                    border: `1px solid ${statusCfg.border}`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    <i className={`fa-solid ${statusCfg.icon}`} style={{
                                                        fontSize: 20,
                                                        color: statusCfg.color
                                                    }} />
                                                </div>

                                                {/* === ОСНОВНОЙ КОНТЕНТ === */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    {/* Верхняя строка: ID + статус */}
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'flex-start',
                                                        gap: 12,
                                                        marginBottom: 8,
                                                        flexWrap: 'wrap'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                            <span style={{
                                                                fontSize: 16,
                                                                fontWeight: 700,
                                                                color: '#f1f5f9',
                                                                fontFamily: 'monospace',
                                                                letterSpacing: 0.5
                                                            }}>
                                                                #{inc.id}
                                                            </span>
                                                            <StatusBadge status={inc.status} statusName={inc.status_name} size="sm" />
                                                        </div>

                                                        {/* Правая часть: дата */}
                                                        {inc.date_create && (
                                                            <div style={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'flex-end',
                                                                flexShrink: 0
                                                            }}>
                                                                <span style={{
                                                                    fontSize: 12,
                                                                    color: '#94a3b8',
                                                                    fontWeight: 600
                                                                }}>
                                                                    {formatDate(inc.date_create)}
                                                                </span>
                                                                {relativeDate && (
                                                                    <span style={{
                                                                        fontSize: 10,
                                                                        color: '#475569',
                                                                        fontStyle: 'italic',
                                                                        marginTop: 1
                                                                    }}>
                                                                        {relativeDate}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Описание */}
                                                    {inc.user_description && (
                                                        <p style={{
                                                            fontSize: 13,
                                                            color: '#cbd5e1',
                                                            lineHeight: 1.5,
                                                            marginBottom: 8,
                                                            margin: '0 0 8px 0'
                                                        }}>
                                                            {inc.user_description}
                                                        </p>
                                                    )}

                                                    {/* Нижняя строка: метаданные */}
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        flexWrap: 'wrap',
                                                        marginTop: 10
                                                    }}>
                                                        {/* Причина */}
                                                        {inc.add_reason_name && (
                                                            <span style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 5,
                                                                padding: '3px 10px',
                                                                background: 'rgba(139,92,246,0.1)',
                                                                border: '1px solid rgba(139,92,246,0.2)',
                                                                borderRadius: 6,
                                                                fontSize: 11,
                                                                color: '#c4b5fd',
                                                                fontWeight: 600
                                                            }}>
                                                                <i className="fa-solid fa-tag" style={{ fontSize: 9 }} />
                                                                {inc.add_reason_name}
                                                            </span>
                                                        )}

                                                        {/* Interest Score */}
                                                        {inc.interest_score !== undefined && inc.interest_score > 0 && (
                                                            <span style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 5,
                                                                padding: '3px 10px',
                                                                background: 'rgba(245,158,11,0.1)',
                                                                border: '1px solid rgba(245,158,11,0.2)',
                                                                borderRadius: 6,
                                                                fontSize: 11,
                                                                color: '#fbbf24',
                                                                fontWeight: 600
                                                            }}>
                                                                <i className="fa-solid fa-fire" style={{ fontSize: 10 }} />
                                                                {inc.interest_score}
                                                            </span>
                                                        )}

                                                        {/* Просмотры (только для админов) */}
                                                        {inc.views !== undefined && inc.views > 0 && (
                                                            <span style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 5,
                                                                padding: '3px 10px',
                                                                background: 'rgba(99,102,241,0.08)',
                                                                border: '1px solid rgba(99,102,241,0.15)',
                                                                borderRadius: 6,
                                                                fontSize: 11,
                                                                color: '#a5b4fc',
                                                                fontWeight: 600
                                                            }}>
                                                                <i className="fa-solid fa-eye" style={{ fontSize: 10 }} />
                                                                {inc.views.toLocaleString('ru-RU')}
                                                            </span>
                                                        )}

                                                        {/* Опубликовано в TG */}
                                                        {inc.tg_post === true && (
                                                            <span style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 5,
                                                                padding: '3px 10px',
                                                                background: 'rgba(14,165,233,0.1)',
                                                                border: '1px solid rgba(14,165,233,0.25)',
                                                                borderRadius: 6,
                                                                fontSize: 11,
                                                                color: '#38bdf8',
                                                                fontWeight: 600
                                                            }}>
                                                                <i className="fa-brands fa-telegram" style={{ fontSize: 10 }} />
                                                                TG
                                                            </span>
                                                        )}

                                                        {/* Контакты (если есть) */}
                                                        {contactInfo && (
                                                            <span style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 5,
                                                                fontSize: 11,
                                                                color: '#64748b',
                                                                marginLeft: 'auto'
                                                            }}>
                                                                <i className="fa-solid fa-user" style={{ fontSize: 10 }} />
                                                                {contactInfo.length > 40
                                                                    ? contactInfo.substring(0, 37) + '...'
                                                                    : contactInfo}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Стрелка с классом для hover-эффекта */}
                                                <i className="fa-solid fa-chevron-right arrow-icon" style={{
                                                    color: '#475569',
                                                    fontSize: 14,
                                                    flexShrink: 0,
                                                    marginTop: 18
                                                }} />
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* === ПАГИНАЦИЯ === */}
                    {totalPages > 1 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: 16,
                                marginTop: 28,
                                padding: 16,
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 12
                            }}
                        >
                            <Button
                                variant="secondary"
                                icon="fa-chevron-left"
                                size="sm"
                                disabled={currentPage === 0}
                                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                            >
                                Назад
                            </Button>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                color: '#e2e8f0',
                                fontSize: 14,
                                fontWeight: 600
                            }}>
                                <span style={{
                                    padding: '4px 12px',
                                    background: 'rgba(99,102,241,0.15)',
                                    border: '1px solid rgba(99,102,241,0.3)',
                                    borderRadius: 6,
                                    color: '#a5b4fc'
                                }}>
                                    {currentPage + 1}
                                </span>
                                <span style={{ color: '#475569' }}>из</span>
                                <span>{totalPages}</span>
                            </div>

                            <Button
                                variant="secondary"
                                icon="fa-chevron-right"
                                size="sm"
                                disabled={currentPage >= totalPages - 1}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                            >
                                Вперёд
                            </Button>
                        </motion.div>
                    )}
                </>
            )}
        </div>
    );
}