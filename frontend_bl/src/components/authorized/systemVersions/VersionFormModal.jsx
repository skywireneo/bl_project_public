import React, { useState, useEffect } from "react";
import { createSystemVersion, updateSystemVersion } from "../../../http/systemVersionAPI";
import { Button, Input, Textarea, FormField, Select, Badge, Alert } from "../../ui/UIComponents";

const CHANGE_CATEGORIES = [
    { value: "features", label: "Новые функции", icon: "fa-star", color: "#10b981" },
    { value: "fixes", label: "Исправления", icon: "fa-bug", color: "#f59e0b" },
    { value: "hotfixes", label: "Срочные исправления", icon: "fa-fire", color: "#ef4444" },
    { value: "improvements", label: "Улучшения", icon: "fa-arrow-trend-up", color: "#3b82f6" },
    { value: "security", label: "Безопасность", icon: "fa-shield-halved", color: "#ef4444" },
    { value: "breaking_changes", label: "Важные изменения", icon: "fa-triangle-exclamation", color: "#f59e0b" },
    { value: "references", label: "Ссылки", icon: "fa-link", color: "#8b5cf6" },
];

export default function VersionFormModal({ version, onClose, onSuccess }) {
    const isEdit = !!version;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        version: "", title: "", description: "", change_type: "update",
        is_major: false, internal_notes: ""
    });

    // Храним изменения как плоский массив для удобства, при отправке сгруппируем
    const [changesList, setChangesList] = useState([]);
    const [newChange, setNewChange] = useState({ category: "features", title: "", description: "", url: "" });

    useEffect(() => {
        if (version) {
            setFormData({
                version: version.version || "", title: version.title || "", description: version.description || "",
                change_type: version.change_type || "update", is_major: version.is_major || false, internal_notes: version.internal_notes || ""
            });
            const flatChanges = [];
            if (version.changes_jsonb) {
                Object.entries(version.changes_jsonb).forEach(([cat, items]) => {
                    items.forEach(item => flatChanges.push({ ...item, category: cat, id: Math.random() }));
                });
            }
            setChangesList(flatChanges);
        }
    }, [version]);

    const addChange = () => {
        if (!newChange.title.trim()) return;
        setChangesList([...changesList, { ...newChange, id: Date.now() }]);
        setNewChange({ category: newChange.category, title: "", description: "", url: "" });
    };

    const removeChange = (id) => setChangesList(changesList.filter(c => c.id !== id));

    const groupChanges = () => {
        const grouped = {};
        changesList.forEach(c => {
            if (!grouped[c.category]) grouped[c.category] = [];
            const { category, id, ...rest } = c;
            grouped[c.category].push(rest);
        });
        return grouped;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.version.trim() || !formData.title.trim()) {
            setError("Версия и заголовок обязательны");
            return;
        }
        setError("");
        setLoading(true);

        try {
            const payload = { ...formData, changes_jsonb: groupChanges() };
            if (isEdit) await updateSystemVersion(version.version_id, payload);
            else await createSystemVersion(payload);
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || "Ошибка сохранения");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {error && <Alert variant="error">{error}</Alert>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <FormField label="Номер версии *" required>
                    <Input placeholder="1.2.0" value={formData.version} onChange={e => setFormData({ ...formData, version: e.target.value })} />
                </FormField>
                <FormField label="Тип изменения">
                    <Select value={formData.change_type} onChange={e => setFormData({ ...formData, change_type: e.target.value })}>
                        {CHANGE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </Select>
                </FormField>
            </div>

            <FormField label="Заголовок *" required>
                <Input placeholder="Краткое название обновления" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
            </FormField>

            <FormField label="Описание для пользователей">
                <Textarea placeholder="Общее описание того, что изменилось..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </FormField>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="checkbox" id="is_major" checked={formData.is_major} onChange={e => setFormData({ ...formData, is_major: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: '#ef4444' }} />
                <label htmlFor="is_major" style={{ fontSize: 14, color: '#e2e8f0', cursor: 'pointer' }}>
                    <strong style={{ color: '#f87171' }}>Мажорное обновление</strong> <span style={{ color: '#64748b' }}>(требует особого внимания)</span>
                </label>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#f1f5f9' }}>
                    <i className="fa-solid fa-list-check" style={{ color: '#6366f1', marginRight: 8 }} /> Детали изменений
                </h4>

                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr auto', gap: 12, alignItems: 'end' }}>
                        <FormField label="Категория">
                            <Select value={newChange.category} onChange={e => setNewChange({ ...newChange, category: e.target.value })}>
                                {CHANGE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </Select>
                        </FormField>
                        <FormField label="Название пункта *">
                            <Input placeholder="Например: Исправлен баг..." value={newChange.title} onChange={e => setNewChange({ ...newChange, title: e.target.value })} />
                        </FormField>
                        <FormField label="Описание / Ссылка">
                            <Input placeholder="Детали или URL (необязательно)" value={newChange.description || newChange.url} onChange={e => setNewChange({ ...newChange, description: e.target.value })} />
                        </FormField>
                        <Button type="button" variant="primary" icon="fa-plus" onClick={addChange} style={{ marginBottom: 6 }} />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 250, overflowY: 'auto' }}>
                    {changesList.length === 0 && <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: 20 }}>Пока не добавлено ни одного изменения</div>}
                    {changesList.map(c => {
                        const catConfig = CHANGE_CATEGORIES.find(x => x.value === c.category) || CHANGE_CATEGORIES[0];
                        return (
                            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                                <i className={`fa-solid ${catConfig.icon}`} style={{ color: catConfig.color, width: 20, textAlign: 'center' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{c.title}</div>
                                    {(c.description || c.url) && <div style={{ fontSize: 12, color: '#94a3b8' }}>{c.description || c.url}</div>}
                                </div>
                                <Button type="button" size="sm" variant="ghost" icon="fa-xmark" onClick={() => removeChange(c.id)} style={{ color: '#f87171' }} />
                            </div>
                        );
                    })}
                </div>
            </div>

            <FormField label="Внутренние заметки (только для админов)">
                <Textarea placeholder="Технические детали, ссылки на задачи..." value={formData.internal_notes} onChange={e => setFormData({ ...formData, internal_notes: e.target.value })} />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Отмена</Button>
                <Button type="submit" variant="success" icon="fa-check" loading={loading}>{isEdit ? "Сохранить" : "Создать"}</Button>
            </div>
        </form>
    );
}