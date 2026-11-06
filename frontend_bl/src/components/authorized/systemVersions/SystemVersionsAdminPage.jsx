import React, { useEffect, useState } from "react";
import { fetchSystemVersions, deactivateSystemVersion } from "../../../http/systemVersionAPI";
import { Card, Badge, Button, Input, Select, Modal, EmptyState, PageHeader, Alert } from "../../ui/UIComponents";
import VersionFormModal from "./VersionFormModal";

const TYPE_CONFIG = {
    update: { label: "Обновление", color: "info" },
    feature: { label: "Функция", color: "success" },
    fix: { label: "Исправление", color: "warning" },
    hotfix: { label: "Срочное", color: "danger" },
    security: { label: "Безопасность", color: "danger" },
    breaking: { label: "Важное", color: "warning" },
};

export default function SystemVersionsAdminPage() {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingVersion, setEditingVersion] = useState(null);

    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [filterActive, setFilterActive] = useState("all");

    useEffect(() => { loadVersions(); }, []);

    const loadVersions = async () => {
        try {
            setLoading(true);
            const data = await fetchSystemVersions();
            setVersions(data || []);
        } catch (err) {
            console.error("Ошибка:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeactivate = async (id) => {
        if (!window.confirm("Деактивировать эту версию? Она исчезнет из публичного списка.")) return;
        try {
            await deactivateSystemVersion(id);
            loadVersions();
        } catch (err) {
            alert("Ошибка при деактивации");
        }
    };

    const filtered = versions.filter(v => {
        const matchSearch = !search || v.version.toLowerCase().includes(search.toLowerCase()) || v.title.toLowerCase().includes(search.toLowerCase());
        const matchType = filterType === "all" || v.change_type === filterType;
        const matchActive = filterActive === "all" || (filterActive === "active" ? v.is_active : !v.is_active);
        return matchSearch && matchType && matchActive;
    });

    if (loading) return <div style={{ padding: 60, textAlign: 'center' }}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: '#6366f1' }} /></div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Card style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: '1 1 250px' }}>
                    <Input icon="fa-magnifying-glass" placeholder="Поиск по версии или названию..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
                    <option value="all">Все типы</option>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </Select>
                <Select value={filterActive} onChange={e => setFilterActive(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
                    <option value="all">Все статусы</option>
                    <option value="active">Активные</option>
                    <option value="inactive">Деактивированные</option>
                </Select>
                <div style={{ flex: 1 }} />
                <Button variant="success" icon="fa-plus" onClick={() => { setEditingVersion(null); setShowForm(true); }}>Создать версию</Button>
            </Card>

            <Card padding={0} style={{ overflow: 'hidden' }}>
                {filtered.length === 0 ? (
                    <EmptyState icon="fa-code-branch" title="Версии не найдены" description="Попробуйте изменить параметры фильтрации" />
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <th style={{ padding: '14px 20px', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>Версия</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>Название</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>Тип</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>Дата</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>Статус</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'right', color: '#94a3b8', fontWeight: 600 }}>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(v => {
                                    const tc = TYPE_CONFIG[v.change_type] || TYPE_CONFIG.update;
                                    return (
                                        <tr key={v.version_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '14px 20px' }}>
                                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f1f5f9' }}>v{v.version}</span>
                                                {v.is_major && <Badge variant="danger" style={{ marginLeft: 8, fontSize: 10 }}>MAJOR</Badge>}
                                            </td>
                                            <td style={{ padding: '14px 20px', color: '#e2e8f0', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</td>
                                            <td style={{ padding: '14px 20px' }}><Badge variant={tc.color}>{tc.label}</Badge></td>
                                            <td style={{ padding: '14px 20px', color: '#64748b' }}>{new Date(v.created_at).toLocaleDateString('ru-RU')}</td>
                                            <td style={{ padding: '14px 20px' }}>
                                                {v.is_active ? <Badge variant="success" icon="fa-check">Активна</Badge> : <Badge variant="default" icon="fa-ban">Скрыта</Badge>}
                                            </td>
                                            <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                    <Button size="sm" variant="secondary" icon="fa-pen" onClick={() => { setEditingVersion(v); setShowForm(true); }} />
                                                    {v.is_active && <Button size="sm" variant="danger" icon="fa-ban" onClick={() => handleDeactivate(v.version_id)} title="Деактивировать" />}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal open={showForm} onClose={() => setShowForm(false)} title={editingVersion ? "Редактирование версии" : "Создание версии"} size="lg">
                <VersionFormModal
                    version={editingVersion}
                    onClose={() => setShowForm(false)}
                    onSuccess={() => { setShowForm(false); loadVersions(); }}
                />
            </Modal>
        </div>
    );
}