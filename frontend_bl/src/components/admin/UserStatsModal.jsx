import React, { useState, useEffect, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, EmptyState } from '../ui/UIComponents';
import { getSystemStats } from '../../http/userAPI';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

// Оборачиваем в memo для предотвращения лишних ре-рендеров при обновлении родителя
const StatBox = memo(function StatBox({ icon, color, label, value }) {
    return (
        <div style={{
            background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 14
        }}>
            <div style={{
                width: 44, height: 44, borderRadius: 10, background: `${color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
                <i className={`fa-solid ${icon}`} style={{ color, fontSize: 18 }} />
            </div>
            <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>{value}</div>
            </div>
        </div>
    );
});

const UserStatsModal = memo(function UserStatsModal({ isOpen, onClose }) {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        if (isOpen) {
            setIsLoading(true);
            getSystemStats()
                .then(res => {
                    if (isMounted) setData(res);
                })
                .catch(err => {
                    if (isMounted) console.error('Ошибка загрузки статистики:', err);
                })
                .finally(() => {
                    if (isMounted) setIsLoading(false);
                });
        }
        return () => { isMounted = false; };
    }, [isOpen]);

    // Полная мемоизация всех преобразованных данных
    const processedData = useMemo(() => {
        if (!data) return null;

        const totalOs = (data.devices?.os_breakdown || []).reduce((sum, item) => sum + Number(item.count), 0);
        const osData = (data.devices?.os_breakdown || []).map(item => {
            const val = Number(item.count);
            const percent = totalOs > 0 ? ((val / totalOs) * 100).toFixed(0) : 0;
            return {
                name: item.os || 'Неизвестно',
                value: val,
                labelStr: `${item.os || 'Неизвестно'} (${percent}%)`
            };
        });

        const totalBrowser = (data.devices?.browser_breakdown || []).reduce((sum, item) => sum + Number(item.count), 0);
        const browserData = (data.devices?.browser_breakdown || []).map(item => {
            const val = Number(item.count);
            const percent = totalBrowser > 0 ? ((val / totalBrowser) * 100).toFixed(0) : 0;
            return {
                name: item.browser || 'Неизвестно',
                value: val,
                labelStr: `${item.browser || 'Неизвестно'} (${percent}%)`
            };
        });

        const mobileData = [
            { name: 'Мобильные', value: Number(data.devices?.mobile_ratio?.mobile || 0), color: '#f59e0b' },
            { name: 'Десктоп', value: Number(data.devices?.mobile_ratio?.desktop || 0), color: '#6366f1' }
        ];

        const hourlyData = (data.temporal?.hourly_activity_30d || []).map((count, hour) => ({
            hour: `${hour.toString().padStart(2, '0')}:00`,
            count: Number(count)
        }));

        const failReasons = data.security?.top_fail_reasons || [];

        return { osData, browserData, mobileData, hourlyData, failReasons };
    }, [data]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(8px)', zIndex: 4000, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: 20
                }}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 20, width: '100%', maxWidth: 1200, maxHeight: '90vh',
                        overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#1e293b', zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Статистика авторизаций и устройств</h2>
                            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                                Обзор активности пользователей за последние 30 дней
                                {data?.cached_at && <span style={{ opacity: 0.7 }}> (обновлено: {new Date(data.cached_at).toLocaleTimeString('ru-RU')})</span>}
                            </p>
                        </div>
                        <Button variant="ghost" size="sm" icon="fa-solid fa-xmark" onClick={onClose} />
                    </div>

                    <div style={{ padding: 24 }}>
                        {isLoading ? (
                            <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
                                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 32, marginBottom: 12 }} />
                                <div>Загрузка статистики...</div>
                            </div>
                        ) : !data ? (
                            <EmptyState icon="fa-solid fa-chart-pie" title="Нет данных" description="Не удалось загрузить статистику" />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                                    <StatBox icon="fa-solid fa-right-to-bracket" color="#6366f1" label="Входов за 24ч" value={data.overview?.total_logins_24h || 0} />
                                    <StatBox icon="fa-solid fa-triangle-exclamation" color="#ef4444" label="Процент ошибок" value={`${data.overview?.fail_rate_24h || 0}%`} />
                                    <StatBox icon="fa-solid fa-users" color="#10b981" label="Уникальных пользователей" value={data.overview?.unique_active_users_24h || 0} />
                                    <StatBox icon="fa-solid fa-laptop" color="#f59e0b" label="Активных устройств" value={data.overview?.total_active_devices || 0} />
                                </div>

                                <Card>
                                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <i className="fa-solid fa-clock" style={{ color: '#6366f1' }} /> Активность по часам (последние 30 дней)
                                    </h4>
                                    <div style={{ height: 300 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={processedData?.hourlyData || []}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                <XAxis dataKey="hour" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} interval={3} />
                                                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                                <Tooltip
                                                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0' }}
                                                    itemStyle={{ color: '#6366f1' }}
                                                    cursor={{ fill: 'rgba(99,102,241,0.1)' }}
                                                />
                                                {/* isAnimationActive={false} убирает "вырастание" столбцов при ре-рендере */}
                                                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                                    <Card>
                                        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <i className="fa-solid fa-desktop" style={{ color: '#10b981' }} /> Операционные системы
                                        </h4>
                                        <div style={{ height: 280 }}>
                                            {processedData?.osData.reduce((sum, item) => sum + item.value, 0) > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={processedData.osData}
                                                            dataKey="value"
                                                            nameKey="name"
                                                            cx="50%" cy="50%"
                                                            outerRadius={80}
                                                            label="labelStr"
                                                            labelLine={false}
                                                            isAnimationActive={false} // Ключевое исправление против мигания
                                                        >
                                                            {processedData.osData.map((entry, index) => (
                                                                <Cell key={`os-cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <EmptyState icon="fa-solid fa-chart-pie" title="Нет данных" description="Статистика пока не собрана" />
                                                </div>
                                            )}
                                        </div>
                                    </Card>

                                    <Card>
                                        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <i className="fa-solid fa-globe" style={{ color: '#f59e0b' }} /> Браузеры
                                        </h4>
                                        <div style={{ height: 280 }}>
                                            {processedData?.browserData.reduce((sum, item) => sum + item.value, 0) > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={processedData.browserData}
                                                            dataKey="value"
                                                            nameKey="name"
                                                            cx="50%" cy="50%"
                                                            outerRadius={80}
                                                            label="labelStr"
                                                            labelLine={false}
                                                            isAnimationActive={false} // Ключевое исправление против мигания
                                                        >
                                                            {processedData.browserData.map((entry, index) => (
                                                                <Cell key={`browser-cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <EmptyState icon="fa-solid fa-chart-pie" title="Нет данных" description="Статистика пока не собрана" />
                                                </div>
                                            )}
                                        </div>
                                    </Card>

                                    <Card>
                                        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <i className="fa-solid fa-mobile-screen-button" style={{ color: '#8b5cf6' }} /> Типы устройств
                                        </h4>
                                        <div style={{ height: 280 }}>
                                            {processedData?.mobileData.reduce((sum, item) => sum + item.value, 0) > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={processedData.mobileData}
                                                            dataKey="value"
                                                            nameKey="name"
                                                            cx="50%" cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={80}
                                                            paddingAngle={5}
                                                            isAnimationActive={false} // Ключевое исправление против мигания
                                                        >
                                                            {processedData.mobileData.map((entry, index) => (
                                                                <Cell key={`mobile-cell-${entry.name}`} fill={entry.color} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0' }} />
                                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <EmptyState icon="fa-solid fa-chart-pie" title="Нет данных" description="Статистика пока не собрана" />
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </div>

                                <Card>
                                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <i className="fa-solid fa-shield-halved" style={{ color: '#ef4444' }} /> Топ причин неудачных входов (24ч)
                                    </h4>
                                    <div style={{ height: 250 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart layout="vertical" data={processedData?.failReasons || []}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                                <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                                <YAxis dataKey="fail_reason" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={180} />
                                                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0' }} />
                                                <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={24} isAnimationActive={false} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
});

export default UserStatsModal;