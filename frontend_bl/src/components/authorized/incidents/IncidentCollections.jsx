import React, { useEffect, useState, useMemo, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getCollections } from "../../../http/incidentsAPI";
import { Card, Badge, Button, EmptyState, Avatar } from "../../ui/UIComponents";
import { Context } from "../../..";

// === ГЛОБАЛЬНЫЕ СТИЛИ И АНИМАЦИИ ===
const GLOBAL_STYLES = `
@keyframes floatIcon {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
}
.float-anim {
    animation: floatIcon 3s ease-in-out infinite;
}
@keyframes gradientFade {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
}
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
}

/* АДАПТИВНАЯ СЕТКА (Mobile First) */
.collections-grid {
    display: grid;
    grid-template-columns: 1fr; /* По умолчанию (мобильные): строго 1 колонка */
    gap: clamp(12px, 2vw, 20px);
    margin-bottom: 28px;
}

/* Десктоп: 4 колонки и поддержка span */
@media (min-width: 1024px) {
    .collections-grid {
        grid-template-columns: repeat(4, 1fr);
    }
    .col-span-1 { grid-column: span 1; }
    .col-span-2 { grid-column: span 2; }
    .col-span-3 { grid-column: span 3; }
    .col-span-4 { grid-column: span 4; }
    
    .row-span-1 { grid-row: span 1; }
    .row-span-2 { grid-row: span 2; }
    .row-span-3 { grid-row: span 3; }
}
`;

// Иконки и цвета для разных типов коллекций
const COLLECTION_META = {
    top_rated: { icon: 'fa-trophy', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)', accentColor: '#f59e0b', fadeGradient: 'linear-gradient(90deg, #f59e0b 0%, #ef4444 40%, transparent 100%)' },
    trending: { icon: 'fa-fire', gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)', accentColor: '#ec4899', fadeGradient: 'linear-gradient(90deg, #ec4899 0%, #f43f5e 40%, transparent 100%)' },
    latest: { icon: 'fa-clock', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)', accentColor: '#6366f1', fadeGradient: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 40%, transparent 100%)' },
    stale: { icon: 'fa-hourglass-half', gradient: 'linear-gradient(135deg, #64748b, #475569)', accentColor: '#64748b', fadeGradient: 'linear-gradient(90deg, #64748b 0%, #475569 40%, transparent 100%)' },
    my_recent: { icon: 'fa-user-clock', gradient: 'linear-gradient(135deg, #10b981, #059669)', accentColor: '#10b981', fadeGradient: 'linear-gradient(90deg, #10b981 0%, #059669 40%, transparent 100%)' },
    needs_attention: { icon: 'fa-bell', gradient: 'linear-gradient(135deg, #f59e0b, #dc2626)', accentColor: '#f59e0b', fadeGradient: 'linear-gradient(90deg, #f59e0b 0%, #dc2626 40%, transparent 100%)' },
    no_responsible: { icon: 'fa-user-slash', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', accentColor: '#ef4444', fadeGradient: 'linear-gradient(90deg, #ef4444 0%, #dc2626 40%, transparent 100%)' },
    high_priority: { icon: 'fa-bolt', gradient: 'linear-gradient(135deg, #ef4444, #f97316)', accentColor: '#ef4444', fadeGradient: 'linear-gradient(90deg, #ef4444 0%, #f97316 40%, transparent 100%)' },
    unverified_pvz: { icon: 'fa-location-crosshairs', gradient: 'linear-gradient(135deg, #a855f7, #ec4899)', accentColor: '#a855f7', fadeGradient: 'linear-gradient(90deg, #a855f7 0%, #ec4899 40%, transparent 100%)' },
    unpublished_tg: { icon: 'fa-paper-plane', gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)', accentColor: '#0ea5e9', fadeGradient: 'linear-gradient(90deg, #0ea5e9 0%, #0284c7 40%, transparent 100%)' },
    stats_overview: { icon: 'fa-chart-pie', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)', accentColor: '#6366f1', fadeGradient: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 40%, transparent 100%)' },

    // Новые типы для оспариваний и очереди
    new_incidents_queue: { icon: 'fa-inbox', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', accentColor: '#3b82f6', fadeGradient: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 40%, transparent 100%)' },
    contestation_needs_attention: { icon: 'fa-scale-balanced', gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)', accentColor: '#a855f7', fadeGradient: 'linear-gradient(90deg, #a855f7 0%, #7c3aed 40%, transparent 100%)' },
    my_contestations: { icon: 'fa-user-shield', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', accentColor: '#8b5cf6', fadeGradient: 'linear-gradient(90deg, #8b5cf6 0%, #6d28d9 40%, transparent 100%)' },
    contestation_no_responsible: { icon: 'fa-user-xmark', gradient: 'linear-gradient(135deg, #f43f5e, #e11d48)', accentColor: '#f43f5e', fadeGradient: 'linear-gradient(90deg, #f43f5e 0%, #e11d48 40%, transparent 100%)' },
    contestation_stale: { icon: 'fa-hourglass-end', gradient: 'linear-gradient(135deg, #64748b, #334155)', accentColor: '#64748b', fadeGradient: 'linear-gradient(90deg, #64748b 0%, #334155 40%, transparent 100%)' }
};

// Цвета статусов для статистики
const STATUS_COLORS = {
    new: '#6366f1',
    in_progress: '#f59e0b',
    resolved: '#10b981',
    closed: '#64748b',
    rejected: '#ef4444',
    contestation_new: '#3b82f6',
    contestation_in_progress: '#f59e0b',
    contestation_rejected: '#ef4444',
    contested_full: '#10b981',
    contested_partial: '#f97316',
    contestation_withdrawn: '#6b7280'
};

// Форматирование даты
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
};

// === Компонент градиентной полоски ===
const GradientStripe = ({ fadeGradient }) => (
    <div style={{ height: 4, background: fadeGradient, borderRadius: 2, marginBottom: 20, width: '100%', animation: 'gradientFade 4s ease-in-out infinite' }} />
);

// === Компонент ультра-компактного предупреждения о кэшировании ===
const CacheWarning = ({ isAdminOrDev, delay }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    if (!isAdminOrDev) return null;

    return (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay + 0.2, duration: 0.3 }} style={{ marginBottom: 16 }}>
            <div onClick={() => setIsExpanded(!isExpanded)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                background: isExpanded ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.06)',
                border: `1px solid ${isExpanded ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.15)'}`,
                borderRadius: 20, cursor: 'pointer', fontSize: 11, color: '#818cf8',
                width: 'fit-content', transition: 'all 0.2s ease', userSelect: 'none'
            }}
                onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
                onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}>
                <i className="fa-solid fa-circle-info" style={{ fontSize: 10 }} />
                <span style={{ fontWeight: 600 }}>Данные кэшируются</span>
                <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: 9, transition: 'transform 0.2s' }} />
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 8 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, fontSize: 11, color: '#a5b4fc', lineHeight: 1.5, display: 'flex', gap: 8 }}>
                            <i className="fa-solid fa-circle-info" style={{ marginTop: 2, flexShrink: 0, color: '#818cf8' }} />
                            <div>
                                <strong style={{ color: '#c7d2fe', display: 'block', marginBottom: 2 }}>Обратите внимание:</strong>
                                Обновление данных в результатах может происходить не мгновенно. Это связано с использованием механизмов кэширования на стороне сервера для обеспечения безопасности и производительности.
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// === Компонент карточки инцидента ===
const IncidentCard = ({ incident, detailLevel, index, baseDelay = 0 }) => {
    const navigate = useNavigate();
    const [hovered, setHovered] = useState(false);
    const scoreColor = incident.interest_score >= 8 ? '#ef4444' : incident.interest_score >= 5 ? '#f59e0b' : '#64748b';
    const cardDelay = baseDelay + 0.2 + index * 0.05;

    return (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: cardDelay, duration: 0.3 }}
            onClick={() => navigate(incident.id?.startsWith('D-') ? `/contestation/${incident.id}` : `/incidents/${incident.id}`)}
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            style={{ display: "flex", gap: 14, padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)", background: hovered ? 'rgba(99,102,241,0.06)' : 'transparent', borderRadius: 10, margin: '0 -8px', transform: hovered ? 'translateX(4px)' : 'translateX(0)' }}>

            <div style={{ width: 4, borderRadius: 2, background: `linear-gradient(180deg, ${scoreColor}, transparent)`, flexShrink: 0, opacity: hovered ? 1 : 0.3, transition: 'opacity 0.25s', boxShadow: hovered ? `0 0 12px ${scoreColor}80` : 'none' }} />

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", fontFamily: "monospace", letterSpacing: 0.5, flexShrink: 0 }}>#{String(incident.id)}</span>
                    </div>
                    <Badge variant="info">{incident.type}</Badge>
                </div>
                <div style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 10, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {incident.description}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", fontSize: 12, color: "#64748b" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <i className="fa-solid fa-calendar" style={{ fontSize: 10 }} />
                        <span>{formatDate(incident.date_create)}</span>
                    </div>
                    {incident.interest_score !== undefined && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: '2px 8px', background: `${scoreColor}15`, border: `1px solid ${scoreColor}30`, borderRadius: 6, color: scoreColor, fontWeight: 600, transition: 'all 0.2s' }}>
                            <i className="fa-solid fa-star" style={{ fontSize: 9 }} />
                            <span>{incident.interest_score}</span>
                        </div>
                    )}
                    {detailLevel === 'full' && incident.responsible && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                            <Avatar name={incident.responsible.login || 'U'} size={20} variant="success" />
                            <span style={{ color: "#cbd5e1", fontWeight: 600 }}>@{incident.responsible.login}</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// === Компонент статистики ===
const StatsOverview = ({ data, delay, isAdminOrDev, gridClass }) => {
    const meta = COLLECTION_META.stats_overview;
    const statusEntries = Object.entries(data.by_status || {}).filter(([_, count]) => count > 0);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }} className={gridClass}>
            <Card hoverable>
                <GradientStripe fadeGradient={meta.fadeGradient} />
                <div style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${meta.accentColor}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <i className={`fa-solid ${meta.icon}`} style={{ color: meta.accentColor, fontSize: 16 }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f8fafc", marginBottom: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.3 }}>{data.name}</h3>
                            <p style={{ fontSize: 12, color: "#64748b", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4 }}>{data.description}</p>
                        </div>
                    </div>
                </div>
                <CacheWarning isAdminOrDev={isAdminOrDev} delay={delay} />
                <div style={{ textAlign: "center", padding: "20px", background: "rgba(99,102,241,0.05)", borderRadius: 12, border: "1px solid rgba(99,102,241,0.1)", marginBottom: 16 }}>
                    <div style={{ fontSize: 48, fontWeight: 800, color: "#f1f5f9", letterSpacing: -2, lineHeight: 1 }}>{data.total}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>Всего записей</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
                    {statusEntries.map(([status, count], idx) => {
                        const color = STATUS_COLORS[status] || '#64748b';
                        const percent = data.total > 0 ? (count / data.total * 100) : 0;
                        return (
                            <motion.div key={status} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: delay + 0.3 + idx * 0.08, duration: 0.3 }} style={{ padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)", position: "relative", overflow: "hidden" }}>
                                <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, width: `${percent}%`, background: color, opacity: 0.6, transition: "width 0.8s ease" }} />
                                <div style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>{count}</div>
                                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                                    {status.replace('_', ' ')}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
                {statusEntries.length === 0 && <div style={{ textAlign: "center", padding: "20px", color: "#64748b", fontSize: 13 }}>Нет данных по статусам</div>}
            </Card>
        </motion.div>
    );
};

// === Компонент карточки коллекции ===
const CollectionCard = ({ type, data, delay, isAdminOrDev, gridClass }) => {
    const meta = COLLECTION_META[type] || COLLECTION_META.latest;
    const detailLevel = data.incidents?.[0]?.responsible ? 'full' : 'card';
    const remainingCount = data.count - data.incidents.length;
    const { user } = useContext(Context);
    const isDev = ['DEVELOPER', 'TOP_LEVEL_DEVELOPER'].includes(user?.user?.status);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }} className={gridClass}>
            <Card hoverable style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <GradientStripe fadeGradient={meta.fadeGradient} />
                <div style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${meta.accentColor}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <i className={`fa-solid ${meta.icon}`} style={{ color: meta.accentColor, fontSize: 18 }} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f8fafc", marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.3 }}>{data.name}</h3>
                            <p style={{ fontSize: 12, color: "#64748b", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.5 }}>{data.description}</p>
                        </div>
                    </div>
                    {isDev && (<div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <Badge variant="default" icon="fa-solid fa-hashtag" style={{ fontSize: 11 }}>
                            {data.count} {data.count === 1 ? 'запись' : data.count < 5 ? 'записи' : 'записей'}
                        </Badge>
                    </div>)}
                </div>
                <CacheWarning isAdminOrDev={isAdminOrDev} delay={delay} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {data.incidents && data.incidents.length > 0 ? (
                        <>
                            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                                {data.incidents.map((incident, idx) => (
                                    <IncidentCard key={incident.id} incident={incident} detailLevel={detailLevel} index={idx} baseDelay={delay} />
                                ))}
                            </div>
                            {remainingCount > 0 && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 0.5, duration: 0.3 }} style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                                    <button style={{ background: 'none', border: 'none', padding: '8px 0', color: meta.accentColor, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', width: '100%', justifyContent: 'center' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.gap = '12px'; e.currentTarget.querySelector('i').style.transform = 'translateX(4px)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.gap = '8px'; e.currentTarget.querySelector('i').style.transform = 'translateX(0)'; }}>
                                        Показать ещё ({remainingCount})
                                        <i className="fa-solid fa-arrow-right" style={{ fontSize: 11, transition: 'transform 0.2s' }} />
                                    </button>
                                </motion.div>
                            )}
                        </>
                    ) : (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "30px 20px" }}>
                            <div style={{ textAlign: "center" }}>
                                <div className="float-anim" style={{ display: 'inline-block' }}>
                                    <i className={`fa-solid ${meta.icon}`} style={{ fontSize: 40, color: meta.accentColor, marginBottom: 16, opacity: 0.4 }} />
                                </div>
                                <div style={{ fontSize: 14, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>Здесь пока пусто</div>
                                <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>В этой категории пока нет записей</div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </motion.div>
    );
};

// === Компонент доступа закрыт ===
const AccessDeniedCard = ({ data, type, delay, gridClass }) => {
    const meta = COLLECTION_META[type] || COLLECTION_META.latest;
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }} className={gridClass}>
            <Card style={{ height: '100%', opacity: 0.7 }}>
                <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, marginBottom: 20, width: '100%', backgroundSize: '100% 100%', backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.15) 0%, transparent 100%)' }} />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center" }}>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                        <i className="fa-solid fa-lock" style={{ fontSize: 24, color: "#64748b" }} />
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f8fafc", marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.3 }}>{data.name}</h3>
                    <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{data.description}</p>
                    <Badge variant="default" icon="fa-shield">Требуется повышение доступа</Badge>
                </div>
            </Card>
        </motion.div>
    );
};

// === Компонент ошибки ===
const ErrorCard = ({ data, type, delay, gridClass }) => {
    const meta = COLLECTION_META[type] || COLLECTION_META.latest;
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }} className={gridClass}>
            <Card style={{ height: '100%' }}>
                <div style={{ height: 4, background: "linear-gradient(90deg, #ef4444, transparent)", borderRadius: 2, marginBottom: 20, width: '100%' }} />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center" }}>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                        <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 24, color: "#ef4444" }} />
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f8fafc", marginBottom: 8 }}>{data.name || type}</h3>
                    <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{data.message || "Ошибка при загрузке данных"}</p>
                </div>
            </Card>
        </motion.div>
    );
};

// === Главный компонент ===
export default function IncidentCollections({ types, startDelay = 0, itemDelay = 0.15, gridConfig = {} }) {
    const { user } = useContext(Context);
    const isAdminOrDev = user?.user?.status && ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"].includes(user.user.status);

    const [collections, setCollections] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCollections = async () => {
            if (!types) return;
            setLoading(true);
            try {
                const response = await getCollections(types);
                setCollections(response);
            } catch (error) {
                console.error('[IncidentCollections] Ошибка загрузки:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCollections();
    }, [types]);

    const collectionEntries = useMemo(() => Object.entries(collections), [collections]);

    // Хелпер для получения CSS-классов сетки
    const getGridClasses = (type) => {
        const config = gridConfig[type] || { colSpan: 1, rowSpan: 1 };
        return `collection-item col-span-${config.colSpan || 1} row-span-${config.rowSpan || 1}`;
    };

    if (loading) {
        return (
            <>
                <style>{GLOBAL_STYLES}</style>
                <div className="collections-grid">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="collection-item col-span-1 row-span-1">
                            <Card>
                                <div style={{ height: 4, background: "linear-gradient(90deg, rgba(255,255,255,0.1) 0%, transparent 100%)", borderRadius: 2, marginBottom: 20, width: '100%', animation: "pulse 2s ease-in-out infinite" }} />
                                <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.05)", animation: "pulse 2s ease-in-out infinite", flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ height: 14, background: "rgba(255,255,255,0.05)", borderRadius: 4, marginBottom: 8, width: '80%', animation: "pulse 2s ease-in-out infinite" }} />
                                        <div style={{ height: 14, background: "rgba(255,255,255,0.05)", borderRadius: 4, marginBottom: 8, width: '60%', animation: "pulse 2s ease-in-out infinite" }} />
                                    </div>
                                </div>
                                {[1, 2].map((j) => (
                                    <div key={j} style={{ height: 60, background: "rgba(255,255,255,0.03)", borderRadius: 8, marginBottom: 8, animation: "pulse 2s ease-in-out infinite", animationDelay: `${j * 0.1}s` }} />
                                ))}
                            </Card>
                        </div>
                    ))}
                </div>
            </>
        );
    }

    if (collectionEntries.length === 0) return null;

    return (
        <>
            <style>{GLOBAL_STYLES}</style>
            <div className="collections-grid">
                {collectionEntries.map(([type, data], index) => {
                    const computedDelay = startDelay + index * itemDelay;
                    const gridClass = getGridClasses(type);

                    if (data.access_denied) {
                        return <AccessDeniedCard key={type} data={data} type={type} delay={computedDelay} gridClass={gridClass} />;
                    }
                    if (data.error) {
                        return <ErrorCard key={type} data={data} type={type} delay={computedDelay} gridClass={gridClass} />;
                    }
                    if (type === 'stats_overview') {
                        return <StatsOverview key={type} data={data} delay={computedDelay} isAdminOrDev={isAdminOrDev} gridClass={gridClass} />;
                    }
                    return <CollectionCard key={type} type={type} data={data} delay={computedDelay} isAdminOrDev={isAdminOrDev} gridClass={gridClass} />;
                })}
            </div>
        </>
    );
}