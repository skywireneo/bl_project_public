import React, { useEffect, useState } from "react";
import { fetchActiveSystemVersions } from "../../../http/systemVersionAPI";
import { Card, Badge, Modal, EmptyState } from "../../ui/UIComponents";

const TYPE_CONFIG = {
    update: { label: "Обновление", icon: "fa-arrows-rotate", color: "info" },
    feature: { label: "Новая функция", icon: "fa-star", color: "success" },
    fix: { label: "Исправление", icon: "fa-bug", color: "warning" },
    hotfix: { label: "Срочное", icon: "fa-fire", color: "danger" },
    security: { label: "Безопасность", icon: "fa-shield-halved", color: "danger" },
    breaking: { label: "Важное", icon: "fa-triangle-exclamation", color: "warning" },
};

const SECTION_CONFIG = {
    features: { title: "Новые функции", icon: "fa-star", color: "#10b981" },
    fixes: { title: "Исправления", icon: "fa-bug", color: "#f59e0b" },
    hotfixes: { title: "Срочные исправления", icon: "fa-fire", color: "#ef4444" },
    improvements: { title: "Улучшения", icon: "fa-arrow-trend-up", color: "#3b82f6" },
    security: { title: "Безопасность", icon: "fa-shield-halved", color: "#ef4444" },
    breaking_changes: { title: "Важные изменения", icon: "fa-triangle-exclamation", color: "#f59e0b" },
    references: { title: "Ссылки", icon: "fa-link", color: "#8b5cf6" }
};

// Встроенный компонент модального окна (гарантирует отсутствие ошибок импорта)
function VersionDetailsContent({ version }) {
    const config = TYPE_CONFIG[version.change_type] || TYPE_CONFIG.update;
    const changes = version.changes_jsonb || {};
    const sections = Object.entries(changes).filter(([_, items]) => Array.isArray(items) && items.length > 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge variant={config.color} icon={config.icon}>{config.label}</Badge>
                {version.is_major && <Badge variant="danger" icon="fa-star">Мажорное обновление</Badge>}
                <span style={{ fontSize: 13, color: '#64748b', marginLeft: 'auto' }}>
                    {new Date(version.created_at || version.released_at).toLocaleString('ru-RU')}
                </span>
            </div>

            {version.description && (
                <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#a5b4fc', marginBottom: 8 }}>
                        <i className="fa-solid fa-info-circle" style={{ marginRight: 6 }} />Описание
                    </div>
                    <div style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{version.description}</div>
                </div>
            )}

            {sections.length > 0 ? (
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fa-solid fa-list-check" style={{ color: '#6366f1' }} /> Детали изменений
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {sections.map(([key, items]) => {
                            const secConfig = SECTION_CONFIG[key] || { title: key, icon: "fa-tag", color: "#64748b" };
                            return (
                                <div key={key}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: secConfig.color, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <i className={`fa-solid ${secConfig.icon}`} /> {secConfig.title}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {items.map((item, idx) => (
                                            <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{item.title}</div>
                                                {item.description && <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{item.description}</div>}
                                                {item.url && (
                                                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#6366f1', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                        <i className="fa-solid fa-external-link-alt" /> {item.url}
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: 20, color: '#64748b', fontSize: 14 }}>
                    <i className="fa-solid fa-clipboard-check" style={{ fontSize: 24, marginBottom: 8, display: 'block', opacity: 0.5 }} />
                    Детализированный список изменений не предоставлен.
                </div>
            )}

            {version.internal_notes && (
                <>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '16px 0' }} />
                    <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24', marginBottom: 8 }}>
                            <i className="fa-solid fa-lock" style={{ marginRight: 6 }} />Внутренние заметки
                        </div>
                        <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{version.internal_notes}</div>
                    </div>
                </>
            )}
        </div>
    );
}

export default function SystemVersionsPage() {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVersion, setSelectedVersion] = useState(null);

    useEffect(() => {
        loadVersions();
    }, []);

    const loadVersions = async () => {
        try {
            setLoading(true);
            const data = await fetchActiveSystemVersions();
            setVersions(data || []);
        } catch (err) {
            console.error("Ошибка загрузки версий:", err);
            // Не редиректим, просто показываем пустое состояние или ошибку
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div style={{ padding: 60, textAlign: 'center' }}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: '#6366f1' }} /></div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {versions.length === 0 ? (
                <Card>
                    <EmptyState icon="fa-code-branch" title="История версий пуста" description="Пока не было выпущено ни одного обновления" />
                </Card>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
                    {versions.map((v, idx) => {
                        const config = TYPE_CONFIG[v.change_type] || TYPE_CONFIG.update;
                        const isLatest = idx === 0;
                        return (
                            <Card
                                key={v.version_id || idx}
                                hoverable
                                onClick={() => setSelectedVersion(v)}
                                style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                            >
                                {isLatest && (
                                    <div style={{ position: 'absolute', top: 12, right: 12 }}>
                                        <Badge variant="success" icon="fa-check">Актуальная</Badge>
                                    </div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
                                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <i className={`fa-solid ${config.icon}`} style={{ fontSize: 20, color: config.color === 'info' ? '#60a5fa' : config.color === 'success' ? '#34d399' : config.color === 'warning' ? '#fbbf24' : '#f87171' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <span style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', fontFamily: 'monospace' }}>v{v.version}</span>
                                            <Badge variant={config.color}>{config.label}</Badge>
                                        </div>
                                        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', margin: 0, lineHeight: 1.4 }}>{v.title}</h3>
                                    </div>
                                </div>
                                {v.description && (
                                    <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {v.description}
                                    </p>
                                )}
                                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 12, color: '#64748b' }}>
                                        <i className="fa-regular fa-calendar" style={{ marginRight: 6 }} />
                                        {new Date(v.created_at || v.released_at).toLocaleDateString('ru-RU')}
                                    </span>
                                    <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}>Подробнее <i className="fa-solid fa-arrow-right" style={{ marginLeft: 4 }} /></span>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Модальное окно рендерится здесь, используя встроенный компонент */}
            <Modal open={!!selectedVersion} onClose={() => setSelectedVersion(null)} title={`Версия ${selectedVersion?.version}`} size="lg">
                {selectedVersion && <VersionDetailsContent version={selectedVersion} />}
            </Modal>
        </div>
    );
}