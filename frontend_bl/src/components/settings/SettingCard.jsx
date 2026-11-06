import React, { useState, useEffect } from "react";
import { Card, Badge, Button, Input, Select, Textarea, FormField } from "../ui/UIComponents"; // Проверьте правильность пути к вашей UI библиотеке
import DependencyConfirmModal from "./DependencyConfirmModal";
import SettingHistoryModal from "./SettingHistoryModal";

const TYPE_ICONS = {
    BOOL: "fa-toggle-on",
    VARCHAR: "fa-font",
    INTEGER: "fa-hashtag",
    "VARCHAR[]": "fa-list",
};

export default function SettingCard({ data, allSettings, updateValue, compact = false }) {
    const [isEditing, setIsEditing] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Безопасная инициализация состояния
    const [value, setValue] = useState(() => {
        if (data.type === "VARCHAR[]") {
            return Array.isArray(data.value) ? [...data.value] : (data.value ? [data.value] : []);
        }
        return [String(data.value ?? "")];
    });

    // Обновляем значение только при смене самой настройки (по имени), чтобы избежать бесконечных циклов
    useEffect(() => {
        if (data.type === "VARCHAR[]") {
            setValue(Array.isArray(data.value) ? [...data.value] : (data.value ? [data.value] : []));
        } else {
            setValue([String(data.value ?? "")]);
        }
        setIsEditing(false);
    }, [data.name, data.type]);

    const isActive = data.active !== false;
    const isBool = data.type === "BOOL";
    const isArray = data.type === "VARCHAR[]";
    const isInt = data.type === "INTEGER";

    const handleSave = () => {
        const willDeactivate = isBool && value[0] === "false" && data.dependent_names?.length > 0;
        const willActivate = isBool && value[0] === "true" && data.dependent_names?.length > 0;

        if (willDeactivate || willActivate) {
            setPendingAction({ type: willDeactivate ? 'deactivate' : 'activate', value });
            setShowConfirm(true);
        } else {
            executeUpdate();
        }
    };

    const executeUpdate = () => {
        setIsUpdating(true);
        const valToUpdate = pendingAction ? pendingAction.value : value;

        // Оборачиваем в Promise.resolve на случай, если updateValue вдруг не вернет промис
        Promise.resolve(updateValue(data.name, valToUpdate))
            .catch((err) => {
                console.error("Ошибка сохранения настройки:", err);
            })
            .finally(() => {
                setIsUpdating(false);
                setIsEditing(false);
                setShowConfirm(false);
                setPendingAction(null);
            });
    };

    const dependents = data.dependent_names?.map(name =>
        allSettings.find(s => s.name === name) || { name, name_text: name }
    ) || [];

    // --- КОМПАКТНЫЙ РЕЖИМ ---
    if (compact) {
        return (
            <>
                <Card
                    hoverable={!isEditing && isActive}
                    style={{
                        opacity: isActive ? 1 : 0.6,
                        borderColor: data.crit ? 'rgba(239,68,68,0.3)' : undefined
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className={`fa-solid ${TYPE_ICONS[data.type] || 'fa-gear'}`} style={{ color: '#818cf8', fontSize: 14 }} />
                            </div>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{data.name_text}</div>
                                <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{data.name}</div>
                            </div>
                        </div>
                        <Badge variant={isActive ? "success" : "default"} size="sm">{isActive ? "Активна" : "Неактивна"}</Badge>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 10, marginBottom: 12, minHeight: 40, display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#e2e8f0', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            {isArray ? `${value.filter(Boolean).length} элементов` : (value[0] === "true" ? "Включено" : value[0] === "false" ? "Отключено" : value[0] || "—")}
                        </span>
                    </div>

                    {isActive && !isEditing && (
                        <Button variant="secondary" size="sm" fullWidth icon="fa-pen" onClick={() => setIsEditing(true)}>Изменить</Button>
                    )}
                    {isEditing && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Button variant="ghost" size="sm" fullWidth onClick={() => setIsEditing(false)}>Отмена</Button>
                            <Button variant="success" size="sm" fullWidth icon="fa-check" loading={isUpdating} onClick={handleSave}>Сохранить</Button>
                        </div>
                    )}
                </Card>
                <DependencyConfirmModal
                    isOpen={showConfirm}
                    onClose={() => setShowConfirm(false)}
                    onConfirm={executeUpdate}
                    actionType={pendingAction?.type}
                    currentSetting={data}
                    dependents={dependents}
                />
            </>
        );
    }

    // --- ПОЛНЫЙ РЕЖИМ ---
    return (
        <>
            <Card style={{ opacity: isActive ? 1 : 0.7, borderColor: data.crit ? 'rgba(239,68,68,0.3)' : undefined, position: 'relative', overflow: 'hidden' }}>
                {!isActive && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,17,23,0.85)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                            <i className="fa-solid fa-lock" style={{ fontSize: 24, marginBottom: 8, display: 'block' }} />
                            <div style={{ fontSize: 14, fontWeight: 600 }}>Неактивна</div>
                            {data.dependence_name && <div style={{ fontSize: 12, marginTop: 4 }}>Зависит от: {data.dependence_name}</div>}
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className={`fa-solid ${TYPE_ICONS[data.type] || 'fa-gear'}`} style={{ color: '#818cf8', fontSize: 18 }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{data.name_text}</div>
                            <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{data.name}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {data.crit && <Badge variant="danger" icon="fa-triangle-exclamation" size="sm">Критическая</Badge>}
                        <Badge variant={isActive ? "success" : "default"} size="sm">{isActive ? "Активна" : "Неактивна"}</Badge>
                    </div>
                </div>

                {data.descr && (
                    <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 20, background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>
                        {data.descr}
                    </div>
                )}

                <FormField label="Значение" style={{ marginBottom: 20 }}>
                    {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {isBool ? (
                                <Select value={value[0]} onChange={e => setValue([e.target.value])}>
                                    <option value="true">Включить</option>
                                    <option value="false">Отключить</option>
                                </Select>
                            ) : isArray ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {value.map((val, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: 8 }}>
                                            <Input
                                                value={val}
                                                onChange={e => { const n = [...value]; n[idx] = e.target.value; setValue(n); }}
                                                placeholder="Элемент"
                                            />
                                            <Button variant="danger" size="sm" icon="fa-xmark" onClick={() => setValue(value.filter((_, i) => i !== idx))} />
                                        </div>
                                    ))}
                                    <Button variant="ghost" size="sm" icon="fa-plus" onClick={() => setValue([...value, ""])}>Добавить элемент</Button>
                                </div>
                            ) : (
                                isInt ? (
                                    <Input type="number" value={value[0]} onChange={e => /^\d*$/.test(e.target.value) && setValue([e.target.value])} />
                                ) : (
                                    <Textarea value={value[0]} onChange={e => setValue([e.target.value])} rows={3} />
                                )
                            )}
                        </div>
                    ) : (
                        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 12, fontSize: 14, color: '#e2e8f0', fontFamily: 'monospace', minHeight: 44, display: 'flex', alignItems: 'center', wordBreak: 'break-all' }}>
                            {isArray ? (value.filter(Boolean).join(', ') || 'Пусто') : (value[0] === "true" ? "Включено" : value[0] === "false" ? "Отключено" : value[0] || "—")}
                        </div>
                    )}
                </FormField>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {isEditing ? (
                        <>
                            <Button variant="ghost" onClick={() => setIsEditing(false)}>Отмена</Button>
                            <Button variant="success" icon="fa-check" loading={isUpdating} onClick={handleSave}>Сохранить</Button>
                        </>
                    ) : (
                        <>
                            <Button variant="secondary" icon="fa-pen" disabled={!isActive} onClick={() => setIsEditing(true)}>Редактировать</Button>
                            <Button variant="ghost" icon="fa-clock-rotate-left" onClick={() => setShowHistory(true)}>История</Button>
                        </>
                    )}
                </div>
            </Card>

            <DependencyConfirmModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={executeUpdate}
                actionType={pendingAction?.type}
                currentSetting={data}
                dependents={dependents}
            />

            <SettingHistoryModal
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                settingName={data.name}
                settingTitle={data.name_text}
            />
        </>
    );
}