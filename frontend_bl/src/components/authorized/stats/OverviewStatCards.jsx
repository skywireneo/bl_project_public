import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getOverviewStats } from "../../../http/statsAPI";

// === ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ===
const Card = ({ children, style = {}, padding = 24 }) => (
    <div style={{
        background: "linear-gradient(135deg,#1e2030 0%,#1a1d2e 100%)",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.06)",
        padding,
        ...style
    }}>
        {children}
    </div>
);

// === СКЕЛЕТОН ДЛЯ КАРТОЧКИ ===
const StatCardSkeleton = ({ delay = 0 }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}>
        <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div className="skeleton-box" style={{ width: 24, height: 24, borderRadius: 6 }} />
            </div>
            <div className="skeleton-box" style={{ width: "60%", height: 32, borderRadius: 8, marginBottom: 8 }} />
            <div className="skeleton-box" style={{ width: "80%", height: 14, borderRadius: 6 }} />
        </Card>
    </motion.div>
);

// === КАРТОЧКА СТАТИСТИКИ ===
const StatCard = ({ icon, number, label, color, delay = 0 }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}>
        <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <i className={`fa-solid ${icon}`} style={{ fontSize: 24, color }} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: -1 }}>
                {typeof number === 'number' ? number.toLocaleString('ru-RU') : '—'}
            </div>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500, marginTop: 4 }}>{label}</div>
        </Card>
    </motion.div>
);

// === СКЕЛЕТОН СТИЛИ ===
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
}
`;

// === ГЛАВНЫЙ КОМПОНЕНТ ===
export default function OverviewStatCards({ startDelay = 0.3 }) {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const loadStats = async () => {
            try {
                setIsLoading(true);
                const data = await getOverviewStats();
                if (isMounted) {
                    setStats(data);
                    setError(null);
                }
            } catch (err) {
                if (isMounted) {
                    console.error('[OverviewStatCards] Ошибка загрузки:', err);
                    setError(err?.response?.data?.message || err.message || 'Не удалось загрузить статистику');
                    setStats(null);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadStats();
        return () => { isMounted = false; };
    }, []);

    // Конфигурация карточек
    const cardsConfig = [
        {
            key: 'incidents_total',
            icon: 'fa-list-check',
            label: 'Всего инцидентов',
            color: '#6366f1',
        },
        {
            key: 'incidents_resolved',
            icon: 'fa-circle-check',
            label: 'Активных',
            color: '#10b981',
        },
        {
            key: 'pvz_total',
            icon: 'fa-location-dot',
            label: 'ПВЗ в базе',
            color: '#f59e0b',
        },
        {
            key: 'persons_names_total',
            icon: 'fa-user-shield',
            label: 'Персон в списке',
            color: '#ec4899',
        },
    ];

    // === СОСТОЯНИЕ ЗАГРУЗКИ ===
    if (isLoading) {
        return (
            <>
                <style>{SKELETON_STYLES}</style>
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
                    gap: "clamp(12px, 2vw, 20px)",
                    marginBottom: 28
                }}>
                    <StatCardSkeleton delay={startDelay} />
                    <StatCardSkeleton delay={startDelay + 0.1} />
                    <StatCardSkeleton delay={startDelay + 0.2} />
                    <StatCardSkeleton delay={startDelay + 0.3} />
                </div>
            </>
        );
    }

    // === СОСТОЯНИЕ ОШИБКИ ===
    if (error || !stats) {
        return (
            <div style={{
                padding: "16px 20px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 12,
                color: "#f87171",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 28
            }}>
                <i className="fa-solid fa-circle-exclamation" />
                Не удалось загрузить статистику
            </div>
        );
    }

    // === НОРМАЛЬНЫЙ РЕНДЕР ===
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
            gap: "clamp(12px, 2vw, 20px)",
            marginBottom: 28
        }}>
            {cardsConfig.map((card, idx) => (
                <StatCard
                    key={card.key}
                    icon={card.icon}
                    number={stats[card.key] ?? 0}
                    label={card.label}
                    color={card.color}
                    delay={startDelay + idx * 0.1}
                />
            ))}
        </div>
    );
}