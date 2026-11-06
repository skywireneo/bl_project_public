import React, { useContext, useEffect, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Context } from "../..";
import RecentCreatedIncidents from "./RecentCreatedIncidents";
import IncidentCollections from "../authorized/incidents/IncidentCollections";
import StatsDisplay from "../authorized/stats/StatsDisplay";
import OverviewStatCards from "../authorized/stats/OverviewStatCards";

const MOCK_TREND_DATA = [
    { day: "Пн", incidents: 2 },
    { day: "Вт", incidents: 4 },
    { day: "Ср", incidents: 3 },
    { day: "Чт", incidents: 6 },
    { day: "Пт", incidents: 5 },
    { day: "Сб", incidents: 2 },
    { day: "Вс", incidents: 8 },
];

const MOCK_SEVERITY_DATA = [
    { name: "Низкий", value: 45, color: "#10b981" },
    { name: "Средний", value: 30, color: "#3b82f6" },
    { name: "Высокий", value: 15, color: "#f59e0b" },
    { name: "Критический", value: 10, color: "#ef4444" },
];

const MOCK_TOP_PVZ = [
    { id: 1, address: "г. Москва, ул. Ленина, д. 42", count: 12, max: 12 },
    { id: 2, address: "г. Санкт-Петербург, Невский пр., д. 100", count: 8, max: 12 },
    { id: 3, address: "г. Казань, ул. Баумана, д. 15", count: 5, max: 12 },
];

const MOCK_RECENT_INCIDENTS = [
    { id: 1042, title: "Кража товара сотрудником", severity: "high", date: "2024-12-21", persons: "Иванов С.П." },
    { id: 1041, title: "Грубое обращение с клиентом", severity: "medium", date: "2024-12-20", persons: "Петрова А.В." },
    { id: 1040, title: "Фальсификация документов", severity: "critical", date: "2024-12-19", persons: "Козлов Д.А." },
];

// === ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ (из эталона) ===
const Card = ({ children, style = {}, padding = 24 }) => (
    <div style={{ background: "linear-gradient(135deg,#1e2030 0%,#1a1d2e 100%)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", padding, ...style }}>
        {children}
    </div>
);

const Badge = ({ children, variant = "default" }) => {
    const variants = {
        default: { bg: "rgba(255,255,255,0.08)", color: "#94a3b8" },
        danger: { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
        warning: { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
        success: { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
        info: { bg: "rgba(59,130,246,0.15)", color: "#60a5fa" },
    };
    const v = variants[variant] || variants.default;
    return (
        <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, background: v.bg, color: v.color, whiteSpace: "nowrap" }}>
            {children}
        </span>
    );
};

const StatCard = ({ icon, number, label, color, delay = 0, trend }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}>
        <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <i className={`fa-solid ${icon}`} style={{ fontSize: 24, color }} />
                {trend !== undefined && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: trend >= 0 ? "#10b981" : "#ef4444", display: "flex", alignItems: "center", gap: 4 }}>
                        <i className={`fa-solid fa-arrow-${trend >= 0 ? "up" : "down"}`} style={{ fontSize: 10 }} />
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: -1 }}>{number}</div>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500, marginTop: 4 }}>{label}</div>
        </Card>
    </motion.div>
);

function MainPageLayout() {
    const { user } = useContext(Context);
    const navigate = useNavigate();

    useEffect(() => {
        document.title = "BlacklistPVZ";
    }, []);

    const userName = user?.user?.login || "Гость";

    //  Константы для расчёта задержек
    // Порядок появления:
    // 0.0 - Приветственный баннер
    // 0.1 - RecentCreatedIncidents (внутри свои задержки)
    // 0.3 - StatCards (4 штуки с шагом 0.1)
    // 0.7 - График 1 (динамика)
    // 0.8 - График 2 (серьёзность)
    // 1.0 - Топ ПВЗ
    // 1.1 - Последние инциденты (блок с фейковыми данными)
    // 1.3 - Первая группа IncidentCollections (latest, top_rated, trending)
    // 1.3 + 3*0.15 = 1.75 - Вторая группа IncidentCollections

    return (
        <div style={{ padding: "clamp(16px, 3vw, 32px)" }}>
            {/* 1. Приветственный баннер */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0, duration: 0.4 }}
                style={{
                    background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)",
                    borderRadius: 20,
                    border: "1px solid rgba(99,102,241,0.2)",
                    padding: "clamp(24px, 4vw, 40px)",
                    marginBottom: 28,
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                <h2 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 800, marginBottom: 12, color: "#f1f5f9" }}>
                    <i className="fa-solid fa-hand-wave" style={{ marginRight: 10, color: "#a5b4fc" }} />
                    Добро пожаловать в систему BlackList {/*userName ? ", " + userName : null*/}
                </h2>
                <p style={{ fontSize: 14, color: "#94a3b8", maxWidth: 640, lineHeight: 1.7, marginBottom: 20 }}>
                    Централизованная система учёта инцидентов и ведения чёрных списков.
                </p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button
                        onClick={() => navigate('/incidents/new')}
                        style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                    >
                        <i className="fa-solid fa-file-circle-plus" /> Сообщить о нарушении
                    </button>

                    <button
                        onClick={() => navigate('/check-person')}
                        style={{ background: "rgba(255,255,255,0.06)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.1)", padding: "10px 20px", borderRadius: 10, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                    >
                        <i className="fa-solid fa-circle-user" /> Проверить человека
                    </button>

                    <button
                        onClick={() => navigate('/search/pvz')}
                        style={{ background: "rgba(255,255,255,0.06)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.1)", padding: "10px 20px", borderRadius: 10, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                    >
                        <i className="fa-solid fa-store" /> Проверить ПВЗ
                    </button>

                    <button
                        onClick={() => navigate('/about')}
                        style={{ background: "rgba(255,255,255,0.06)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.1)", padding: "10px 20px", borderRadius: 10, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                    >
                        <i className="fa-solid fa-circle-info" /> Подробнее о нас
                    </button>
                </div>
            </motion.div>

            {/* RecentCreatedIncidents */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
            >
                <RecentCreatedIncidents />
            </motion.div>

            {/* 2. Статистика (StatCards) */}
            <OverviewStatCards startDelay={0.3} />

            {/* 3. Графики */}
            {/* <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(380px, 100%), 1fr))", gap: 20, marginBottom: 28 }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.4 }}>
                    <Card>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 10, color: "#f1f5f9" }}>
                            <i className="fa-solid fa-chart-area" style={{ color: "#6366f1" }} /> Динамика за неделю
                        </h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={MOCK_TREND_DATA}>
                                <defs>
                                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip contentStyle={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e2e8f0" }} />
                                <Area type="monotone" dataKey="incidents" stroke="#6366f1" strokeWidth={2} fill="url(#colorInc)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.4 }}>
                    <Card>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 10, color: "#f1f5f9" }}>
                            <i className="fa-solid fa-chart-pie" style={{ color: "#6366f1" }} /> По серьёзности
                        </h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={MOCK_SEVERITY_DATA} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                                    {MOCK_SEVERITY_DATA.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e2e8f0" }} />
                                <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                </motion.div>
            </div> */}

            {/* 4. Нижний блок: Топ ПВЗ и Последние инциденты */}
            {/* <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(380px, 100%), 1fr))", gap: 20, marginBottom: 28 }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0, duration: 0.4 }}>
                    <Card>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 10, color: "#f1f5f9" }}>
                            <i className="fa-solid fa-trophy" style={{ color: "#f59e0b" }} /> Топ проблемных ПВЗ
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {MOCK_TOP_PVZ.map((p, i) => {
                                const pct = (p.count / p.max) * 100;
                                return (
                                    <div key={p.id}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                                            <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8, color: "#e2e8f0" }}>
                                                <span style={{ color: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : "#cd7f32", fontWeight: 700 }}>#{i + 1}</span>
                                                {p.address.split(",")[0]}
                                            </span>
                                            <Badge variant={p.count > 0 ? "danger" : "success"}>{p.count}</Badge>
                                        </div>
                                        <div style={{ height: 6, background: "rgba(0,0,0,0.3)", borderRadius: 3, overflow: "hidden" }}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 0.8, delay: 1.2 + i * 0.1 }}
                                                style={{ height: "100%", background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.4 }}>
                    <Card>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>
                                <i className="fa-solid fa-clock-rotate-left" style={{ color: "#6366f1", marginRight: 10 }} /> Последние инциденты
                            </h3>
                            <button style={{ background: "rgba(255,255,255,0.06)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.1)", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                                Все <i className="fa-solid fa-arrow-right" style={{ fontSize: 10 }} />
                            </button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {MOCK_RECENT_INCIDENTS.map((inc) => {
                                const severityVariant = inc.severity === "critical" ? "danger" : inc.severity === "high" ? "warning" : "info";
                                const severityLabel = inc.severity === "critical" ? "Крит" : inc.severity === "high" ? "Выс" : "Сред";
                                return (
                                    <div
                                        key={inc.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 14,
                                            padding: "12px 0",
                                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                                            cursor: "pointer",
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <Badge variant={severityVariant}>{severityLabel}</Badge>
                                        <div style={{ flex: 1, minWidth: 200 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 2 }}>{inc.title}</div>
                                            <div style={{ fontSize: 12, color: "#64748b" }}>{inc.persons}</div>
                                        </div>
                                        <div style={{ fontSize: 12, color: "#64748b", minWidth: 90, textAlign: "right" }}>{inc.date}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </motion.div>
            </div> */}

            {/*  5. Первая группа коллекций - для всех пользователей */}
            <IncidentCollections
                types="latest,most_viewed,most_interesting"
                gridConfig={{
                    most_viewed: { colSpan: 2, rowSpan: 1 },               // Ширина 2, Высота 1
                }}
                startDelay={0.8}
                itemDelay={0.15}
            />

            {/*  6. Вторая группа коллекций - для модераторов/разработчиков */}
            {/* Задержка: 1.3 + 3 карточки × 0.15 = 1.75 */}
            {/* <IncidentCollections
                types="latest,top_rated,my_recent,needs_attention,stats_overview"
                startDelay={1.75}
                itemDelay={0.15}
            /> */}
        </div>
    );
}

export default MainPageLayout;