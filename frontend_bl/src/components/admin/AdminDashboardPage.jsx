import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, Button, StatCard } from '../ui/UIComponents';
// import { getDashboardStats } from '../../http/mock/adminAPI';
import IncidentCollections from '../authorized/incidents/IncidentCollections';
import StatsDisplay from '../authorized/stats/StatsDisplay';
import OverviewStatCards from '../authorized/stats/OverviewStatCards';
import UserStatsModal from './UserStatsModal';
import ModuleStatsDashboard from '../authorized/stats/ModuleStatsDashboard';

const SectionHeader = ({ title, subtitle, icon, color = '#6366f1' }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
        marginTop: 8,
        paddingBottom: 12,
        borderBottom: '1px solid rgba(255,255,255,0.06)'
    }}>
        <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `${color}15`, // 15 = ~10% прозрачности в hex
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
        }}>
            <i className={`fa-solid ${icon}`} style={{ color: color, fontSize: 20 }} />
        </div>
        <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0, letterSpacing: '-0.02em' }}>
                {title}
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0', lineHeight: 1.4 }}>
                {subtitle}
            </p>
        </div>
    </div>
);

export default function AdminDashboardPage() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(true);
    const [sysStats, setSysStats] = useState({ cpu: 34, mem: 58, disk: 67 });
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

    useEffect(() => {
        // getDashboardStats().then(setStats);

        const interval = setInterval(() => {
            setSysStats({
                cpu: Math.floor(20 + Math.random() * 50),
                mem: Math.floor(40 + Math.random() * 40),
                disk: 67
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    if (!stats) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Загрузка...</div>;

    // Базовые настройки для всех графиков статистики (чтобы не дублировать код)
    const baseStatsConfig = {
        mode: "button",
        defaultFrom: "2026-07-10T00:00:00Z",
        defaultTo: "2029-08-11T00:00:00Z",
        defaultGranularity: "hour",
        allowedGranularities: ['minute', 'hour', 'day', 'month'],
        minDate: "2025-01-01",
        maxRange: 365,
        allowDateChange: true,
        allowGranularityChange: true,
        allowForceRefresh: true,
        chartType: "line",
        chartHeight: 300,
        modalSize: "xl",
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: 'clamp(16px, 3vw, 32px)', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>

                <OverviewStatCards startDelay={0.3} />

                {/* Сетка из двух блоков: Быстрые действия + Статистика */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                    gap: 20
                }}>
                    {/* БЛОК 1: Быстрые действия */}
                    <Card>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="fa-solid fa-bolt" style={{ color: '#6366f1' }} />
                            Быстрые действия
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                            <Button variant="secondary" icon="fa-solid fa-table-columns" onClick={() => navigate('/admin/kanban')}>
                                Канбан доска
                            </Button>
                            <Button variant="secondary" icon="fa-solid fa-gear" onClick={() => navigate('/admin/settings')}>
                                Настройки справочников
                            </Button>
                            <Button variant="secondary" icon="fa-solid fa-list" onClick={() => navigate('/incidents')}>
                                Все инциденты
                            </Button>
                            <Button variant="secondary" icon="fa-solid fa-building" onClick={() => navigate('/search/pvz')}>
                                Поиск ПВЗ
                            </Button>
                            <Button variant="secondary" icon="fa-solid fa-building" onClick={() => navigate('/admin-redis')}>
                                Редис админка
                            </Button>
                            <Button variant="secondary" icon="fa-solid fa-building" onClick={() => navigate('/admin-db')}>
                                Админка бд
                            </Button>
                            <Button variant="secondary" icon="fa-solid fa-building" onClick={() => navigate('/admin-s3')}>
                                Админка S3
                            </Button>
                        </div>
                    </Card>

                    {/* БЛОК 2: Статистика и аналитика */}
                    <Card>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="fa-solid fa-chart-line" style={{ color: '#10b981' }} />
                            Статистика и аналитика
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                            <Button
                                variant="secondary"
                                icon="fa-solid fa-chart-pie"
                                onClick={() => setIsStatsModalOpen(true)}
                                style={{ justifyContent: 'flex-start' }}
                            >
                                Статистика авторизаций и устройств
                            </Button>
                            {/* Скрытые StatsDisplay, которые открываются по кнопке */}
                            <StatsDisplay
                                {...baseStatsConfig}
                                metricName="page:incidentList_view"
                                entityId="incidentList"
                                showFields={['count']}
                                chartColor="#10b981"
                                buttonLabel="Просмотры страницы инцидентов"
                                buttonIcon="fa-solid fa-eye"
                                buttonVariant="secondary"
                                modalTitle="📊 Просмотры страницы инцидентов"
                            />

                            <StatsDisplay
                                metricName="incidents:create"
                                entityId="incidentList_view"
                                mode="button"
                                defaultFrom="2026-07-10T00:00:00Z"
                                defaultTo="2029-08-11T00:00:00Z"
                                defaultGranularity="hour"
                                allowedGranularities={['hour', 'day', 'month']}
                                minDate="2025-01-01"
                                maxRange={365}
                                allowDateChange={true}
                                allowGranularityChange={true}
                                allowForceRefresh={true}
                                chartType="line"
                                showFields={['count']}
                                chartColor="#10b981"
                                chartHeight={300}
                                buttonLabel="Открыть статистику созданий инцидентов"
                                buttonIcon="fa-solid fa-chart-bar"
                                buttonVariant="secondary"
                                modalTitle="Статистика созданий инцидентов"
                                modalSize="xl"
                                onOpen={() => console.log('Модалка открыта')}
                                onClose={() => console.log('Модалка закрыта')}
                                onError={(err) => console.error('Ошибка:', err)}
                                onDataLoad={(data) => console.log('Данные загружены:', data)}
                            />

                            <StatsDisplay
                                metricName="contestation:create"
                                entityId="contestationList_view"
                                mode="button"
                                defaultFrom="2026-07-10T00:00:00Z"
                                defaultTo="2029-08-11T00:00:00Z"
                                defaultGranularity="hour"
                                allowedGranularities={['hour', 'day', 'month']}
                                minDate="2025-01-01"
                                maxRange={365}
                                allowDateChange={true}
                                allowGranularityChange={true}
                                allowForceRefresh={true}
                                chartType="line"
                                showFields={['count']}
                                chartColor="#10b981"
                                chartHeight={300}
                                buttonLabel="Открыть статистику созданий оспариваний"
                                buttonIcon="fa-solid fa-chart-bar"
                                buttonVariant="secondary"
                                modalTitle="Статистика созданий оспариваний"
                                modalSize="xl"
                                onOpen={() => console.log('Модалка открыта')}
                                onClose={() => console.log('Модалка закрыта')}
                                onError={(err) => console.error('Ошибка:', err)}
                                onDataLoad={(data) => console.log('Данные загружены:', data)}
                            />

                            <StatsDisplay
                                metricName="search:get"
                                entityId="pvz"
                                mode="button"
                                defaultFrom="2026-07-10T00:00:00Z"
                                defaultTo="2029-08-11T00:00:00Z"
                                defaultGranularity="hour"
                                allowedGranularities={['hour', 'day', 'month']}
                                minDate="2025-01-01"
                                maxRange={365}
                                allowDateChange={true}
                                allowGranularityChange={true}
                                allowForceRefresh={true}
                                chartType="line"
                                showFields={['count']}
                                chartColor="#10b981"
                                chartHeight={300}
                                buttonLabel="Открыть статистику поиска ПВЗ"
                                buttonIcon="fa-solid fa-chart-bar"
                                buttonVariant="secondary"
                                modalTitle="Статистика поиска ПВЗ"
                                modalSize="xl"
                                onOpen={() => console.log('Модалка открыта')}
                                onClose={() => console.log('Модалка закрыта')}
                                onError={(err) => console.error('Ошибка:', err)}
                                onDataLoad={(data) => console.log('Данные загружены:', data)}
                            />

                            <StatsDisplay
                                metricName="search:get"
                                entityId="persone"
                                mode="button"
                                defaultFrom="2026-07-10T00:00:00Z"
                                defaultTo="2029-08-11T00:00:00Z"
                                defaultGranularity="hour"
                                allowedGranularities={['hour', 'day', 'month']}
                                minDate="2025-01-01"
                                maxRange={365}
                                allowDateChange={true}
                                allowGranularityChange={true}
                                allowForceRefresh={true}
                                chartType="line"
                                showFields={['count']}
                                chartColor="#10b981"
                                chartHeight={300}
                                buttonLabel="Открыть статистику поиска персон"
                                buttonIcon="fa-solid fa-chart-bar"
                                buttonVariant="secondary"
                                modalTitle="Статистика поиска персон"
                                modalSize="xl"
                                onOpen={() => console.log('Модалка открыта')}
                                onClose={() => console.log('Модалка закрыта')}
                                onError={(err) => console.error('Ошибка:', err)}
                                onDataLoad={(data) => console.log('Данные загружены:', data)}
                            />

                            {/* <StatsDisplay
                                {...baseStatsConfig}
                                metricName="incident:upload_files"
                                entityId="incident_files"
                                showFields={['count', 'total_size_mb']}
                                chartColor="#f59e0b"
                                buttonLabel="Загрузка файлов"
                                buttonIcon="fa-solid fa-cloud-arrow-up"
                                buttonVariant="secondary"
                                modalTitle="📁 Статистика загрузки файлов"
                            />

                            <StatsDisplay
                                {...baseStatsConfig}
                                metricName="user:login"
                                entityId="user_activity"
                                showFields={['count', 'unique_users']}
                                chartColor="#ec4899"
                                buttonLabel="Активность пользователей"
                                buttonIcon="fa-solid fa-users"
                                buttonVariant="secondary"
                                modalTitle="👥 Активность пользователей в системе"
                            />

                            <StatsDisplay
                                {...baseStatsConfig}
                                metricName="api:errors"
                                entityId="api_health"
                                showFields={['count', 'error_rate']}
                                chartColor="#ef4444"
                                buttonLabel="Ошибки API"
                                buttonIcon="fa-solid fa-triangle-exclamation"
                                buttonVariant="secondary"
                                modalTitle=" Ошибки API и здоровье системы"
                            />

                            <StatsDisplay
                                {...baseStatsConfig}
                                metricName="pvz:search"
                                entityId="pvz_activity"
                                showFields={['count']}
                                chartColor="#06b6d4"
                                buttonLabel="Поиск ПВЗ"
                                buttonIcon="fa-solid fa-store"
                                buttonVariant="secondary"
                                modalTitle="🏬 Статистика поиска по ПВЗ"
                            /> */}
                        </div>
                    </Card>
                </div>
            </div>

            <SectionHeader
                title="Рабочие очереди инцидентов"
                subtitle="Мониторинг, распределение и обработка входящих обращений"
                icon="fa-file-circle-exclamation"
                color="#6366f1"
            />

            <IncidentCollections
                types="new_incidents_queue, stale, needs_attention, latest, no_ai_analysis, unverified_pvz, unpublished_tg, my_recent, high_priority, no_admin_assessment, last_assessment_not_approved, stats_overview"
                gridConfig={{
                    new_incidents_queue: { colSpan: 1, rowSpan: 2 }, // Ширина 2, Высота 2
                    stale: { colSpan: 1, rowSpan: 1 },               // Ширина 2, Высота 1
                    stats_overview: { colSpan: 4, rowSpan: 1 },               // Ширина 2, Высота 1
                    // Для всех остальных типов, не указанных здесь, по умолчанию будет 1x1
                }}
                startDelay={0.8}
                itemDelay={0.15}
            />

            <div style={{ marginTop: 40 }}>
                <SectionHeader
                    title="Рабочие очереди оспариваний"
                    subtitle="Мониторинг и обработка запросов на пересмотр решений"
                    icon="fa-scale-balanced"
                    color="#a855f7"
                />
            </div>

            <IncidentCollections
                types="contestation_needs_attention, my_contestations, contestation_no_responsible, contestation_stale, contestation_no_admin_assessment, contestation_last_assessment_not_approved"
                // Для оспариваний можно оставить всё 1x1, или тоже настроить:
                gridConfig={{
                    contestation_needs_attention: { colSpan: 2, rowSpan: 1 },
                    contestation_stale: { colSpan: 2, rowSpan: 1 }
                }}
                startDelay={0.8}
                itemDelay={0.15}
            />

            <ModuleStatsDashboard
                moduleName="incidentCreate"
                title="Аналитика создания инцидентов"
                icon="fa-solid fa-file-circle-plus"
                color="#6366f1"
            />
            <UserStatsModal
                isOpen={isStatsModalOpen}
                onClose={() => setIsStatsModalOpen(false)}
            />
        </div>
    );
}