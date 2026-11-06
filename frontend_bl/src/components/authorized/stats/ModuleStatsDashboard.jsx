import React, { useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, EmptyState } from '../../ui/UIComponents';
import { getModuleStats } from '../../../http/statsAPI';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function ModuleStatsDashboard({ moduleName, title, icon, color }) {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const fetchData = async (force = false) => {
        if (!force && data) return;

        setIsLoading(true);
        try {
            const res = await getModuleStats(moduleName);
            setData(res);
        } catch (err) {
            console.error('Ошибка загрузки статистики модуля:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = () => {
        if (!isExpanded && !data) {
            fetchData();
        }
        setIsExpanded(prev => !prev);
    };

    const formatDataForChart = (rawData) => {
        if (!rawData || !Array.isArray(rawData)) return [];
        return rawData
            .map(item => ({
                name: item.name || 'Неизвестно',
                value: Number(item.count)
            }))
            .filter(item => item.name !== 'null' && item.name !== 'unknown' && item.value > 0);
    };

    // useMemo гарантирует, что массивы не будут пересоздаваться при каждом рендере
    const osData = useMemo(() => formatDataForChart(data?.by_os), [data?.by_os]);
    const browserData = useMemo(() => formatDataForChart(data?.by_browser), [data?.by_browser]);
    const deviceData = useMemo(() => formatDataForChart(data?.by_device_type), [data?.by_device_type]);
    const connectionData = useMemo(() => formatDataForChart(data?.by_connection), [data?.by_connection]);
    const langData = useMemo(() => formatDataForChart(data?.by_language), [data?.by_language]);
    const tzData = useMemo(() => formatDataForChart(data?.by_timezone), [data?.by_timezone]);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={handleToggle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className={`fa-solid ${icon}`} style={{ color, fontSize: 18 }} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{title}</h3>
                            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                                {isExpanded ? 'Нажмите, чтобы свернуть' : 'Нажмите, чтобы загрузить аналитику'}
                            </p>
                        </div>
                    </div>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
                        <i className="fa-solid fa-chevron-down" style={{ color: '#64748b', fontSize: 16 }} />
                    </motion.div>
                </div>

                <AnimatePresence initial={false}>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ paddingTop: 20, marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                {isLoading ? (
                                    <div style={{ textAlign: 'center', padding: 40 }}>
                                        <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24, color }} />
                                        <div style={{ marginTop: 12, color: '#64748b' }}>Загрузка аналитики...</div>
                                    </div>
                                ) : !data || data.total_actions === 0 ? (
                                    <EmptyState icon={icon} title="Нет данных" description={`Статистика по модулю "${moduleName}" пока не собрана`} />
                                ) : (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
                                            <StatBox label="Всего действий" value={data.total_actions} color="#6366f1" icon="fa-solid fa-bolt" />
                                            <StatBox label="Уникальных ОС" value={osData.length} color="#10b981" icon="fa-solid fa-desktop" />
                                            <StatBox label="Уникальных браузеров" value={browserData.length} color="#f59e0b" icon="fa-solid fa-globe" />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                                            <ChartCard title="Операционные системы" data={osData} />
                                            <ChartCard title="Браузеры" data={browserData} />
                                            <ChartCard title="Типы устройств" data={deviceData} />

                                            {connectionData.length > 0 && <ChartCard title="Типы соединений" data={connectionData} />}
                                            {langData.length > 0 && <ChartCard title="Языки интерфейса" data={langData} />}
                                            {tzData.length > 0 && <ChartCard title="Часовые пояса" data={tzData} />}
                                        </div>

                                        <div style={{ marginTop: 24, textAlign: 'right' }}>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                icon="fa-solid fa-rotate"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    fetchData(true);
                                                }}
                                            >
                                                Обновить данные
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    );
}

// Мемоизируем, чтобы избежать лишних ре-рендеров
const StatBox = memo(function StatBox({ label, value, color, icon }) {
    return (
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`fa-solid ${icon}`} style={{ color, fontSize: 16 }} />
            </div>
            <div>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>{value}</div>
            </div>
        </div>
    );
});

// Мемоизируем график и отключаем анимацию отрисовки (isAnimationActive={false})
// Это ключевое исправление против "мигания" надписей и секторов
const ChartCard = memo(function ChartCard({ title, data }) {
    if (!data || data.length === 0) return null;

    return (
        <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 12, textAlign: 'center' }}>{title}</h4>
            <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            isAnimationActive={false} // Отключает "перерисовку" при каждом рендере
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={false}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
});