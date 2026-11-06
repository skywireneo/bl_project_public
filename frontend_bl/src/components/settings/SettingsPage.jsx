import React, { useState, useEffect, useMemo } from "react";
import { getSettings, updateValueInDb } from "../../http/settingsAPI";
import { PageHeader, Card, Badge, Button, Input, Select, EmptyState } from "../ui/UIComponents";
import SettingCard from "./SettingCard";

const GROUP_LABELS = {
    main: { label: "Основное", icon: "fa-gear", color: "#3b82f6" },
    security: { label: "Безопасность", icon: "fa-shield-halved", color: "#10b981" },
    tg: { label: "Telegram", icon: "fa-brands fa-telegram", color: "#06b6d4" },
    complaint: { label: "Жалобы", icon: "fa-flag", color: "#f59e0b" },
    contestation: { label: "Оспаривания", icon: "fa-gavel", color: "#8b5cf6" },
    pdf: { label: "PDF документы", icon: "fa-file-pdf", color: "#ef4444" },
    chat: { label: "Чаты", icon: "fa-comments", color: "#ec4899" },
    selfCheck: { label: "Самопроверка", icon: "fa-magnifying-glass", color: "#14b8a6" },
    notifications: { label: "Уведомления", icon: "fa-bell", color: "#f97316" },
    score: { label: "Оценки", icon: "fa-star", color: "#eab308" },
    comments: { label: "Комментарии", icon: "fa-comment", color: "#22c55e" },
    email: { label: "Почта", icon: "fa-envelope", color: "#0ea5e9" },
    recovery: { label: "Восстановление", icon: "fa-key", color: "#a855f7" },
    av: { label: "Антивирус", icon: "fa-virus", color: "#dc2626" },
};

const TYPE_LABELS = {
    all: "Все типы",
    BOOL: "Переключатель",
    VARCHAR: "Текст",
    INTEGER: "Число",
    "VARCHAR[]": "Список",
};

export default function SettingsPage() {
    const [settings, setSettings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [activeCategory, setActiveCategory] = useState("all");
    const [viewMode, setViewMode] = useState("full"); // 'full' | 'compact'

    useEffect(() => {
        getSettings()
            .then(data => setSettings(data || []))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, []);

    const filteredSettings = useMemo(() => {
        return settings.filter(s => {
            const matchCategory = activeCategory === "all" || s.group === activeCategory;
            const matchType = filterType === "all" || s.type === filterType;
            const matchStatus = filterStatus === "all" || (filterStatus === "active" ? s.active !== false : s.active === false);
            const matchSearch = !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.name_text && s.name_text.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchCategory && matchType && matchStatus && matchSearch;
        });
    }, [settings, activeCategory, filterType, filterStatus, searchTerm]);

    const groupedSettings = useMemo(() => {
        const groups = {};
        filteredSettings.forEach(s => {
            const g = s.group || "main";
            if (!groups[g]) groups[g] = [];
            groups[g].push(s);
        });
        return groups;
    }, [filteredSettings]);

    const categoryCounts = useMemo(() => {
        const counts = { all: settings.length };
        Object.keys(GROUP_LABELS).forEach(g => {
            counts[g] = settings.filter(s => s.group === g).length;
        });
        return counts;
    }, [settings]);

    if (isLoading) {
        return <div style={{ padding: 60, textAlign: 'center' }}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: '#6366f1' }} /></div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <PageHeader
                title="Настройки системы"
                subtitle="Управление конфигурацией приложения"
                actions={
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Badge variant="info">{settings.length} всего</Badge>
                        <Badge variant="success">{settings.filter(s => s.active !== false).length} активных</Badge>
                    </div>
                }
            />

            {/* Панель управления */}
            <Card style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: '1 1 300px' }}>
                    <Input icon="fa-magnifying-glass" placeholder="Поиск по названию или коду..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <Select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
                <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
                    <option value="all">Все статусы</option>
                    <option value="active">Активные</option>
                    <option value="inactive">Неактивные</option>
                </Select>
                <div style={{ flex: 1 }} />
                <Button variant={viewMode === 'full' ? 'primary' : 'secondary'} icon="fa-list" size="sm" onClick={() => setViewMode('full')} />
                <Button variant={viewMode === 'compact' ? 'primary' : 'secondary'} icon="fa-table-cells" size="sm" onClick={() => setViewMode('compact')} />
            </Card>

            {/* Табы категорий */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
                <Button
                    variant={activeCategory === 'all' ? 'primary' : 'secondary'}
                    size="sm"
                    icon="fa-layer-group"
                    onClick={() => setActiveCategory('all')}
                >
                    Все <span style={{ marginLeft: 6, opacity: 0.7 }}>({categoryCounts.all})</span>
                </Button>
                {Object.entries(GROUP_LABELS).map(([key, info]) => {
                    const count = categoryCounts[key] || 0;
                    if (count === 0) return null;
                    return (
                        <Button
                            key={key}
                            variant={activeCategory === key ? 'primary' : 'secondary'}
                            size="sm"
                            icon={info.icon}
                            onClick={() => setActiveCategory(key)}
                        >
                            {info.label} <span style={{ marginLeft: 6, opacity: 0.7 }}>({count})</span>
                        </Button>
                    );
                })}
            </div>

            {/* Контент */}
            {filteredSettings.length === 0 ? (
                <Card><EmptyState icon="fa-search" title="Ничего не найдено" description="Попробуйте изменить параметры поиска или фильтры" /></Card>
            ) : activeCategory === 'all' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {Object.entries(groupedSettings).map(([groupKey, groupItems]) => {
                        const info = GROUP_LABELS[groupKey] || { label: groupKey, icon: "fa-folder", color: "#64748b" };
                        return (
                            <div key={groupKey}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${info.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <i className={`fa-solid ${info.icon}`} style={{ color: info.color }} />
                                    </div>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{info.label}</h3>
                                    <Badge variant="default">{groupItems.length}</Badge>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${viewMode === 'compact' ? '300px' : '400px'}, 1fr))`, gap: 16 }}>
                                    {groupItems.map(s => (
                                        <SettingCard key={s.name} data={s} allSettings={settings} updateValue={updateValueInDb} compact={viewMode === 'compact'} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${viewMode === 'compact' ? '300px' : '400px'}, 1fr))`, gap: 16 }}>
                    {filteredSettings.map(s => (
                        <SettingCard key={s.name} data={s} allSettings={settings} updateValue={updateValueInDb} compact={viewMode === 'compact'} />
                    ))}
                </div>
            )}
        </div>
    );
}