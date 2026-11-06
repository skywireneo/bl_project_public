import React from "react";
import { Modal, Button, Alert, Badge, Divider } from "../ui/UIComponents";

export default function DependencyConfirmModal({
    isOpen, onClose, onConfirm, actionType, currentSetting, dependents
}) {
    const isDeactivate = actionType === 'deactivate';

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            title={isDeactivate ? " Отключение настройки" : "ℹ️ Включение настройки"}
            size="md"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Отмена</Button>
                    <Button variant={isDeactivate ? "danger" : "success"} onClick={onConfirm} icon={isDeactivate ? "fa-lock" : "fa-unlock"}>
                        {isDeactivate ? "Отключить" : "Включить"}
                    </Button>
                </>
            }
        >
            <Alert variant={isDeactivate ? "warning" : "info"} icon={isDeactivate ? "fa-triangle-exclamation" : "fa-circle-info"}>
                {isDeactivate
                    ? `При отключении "${currentSetting.name_text}" все зависимые настройки будут автоматически деактивированы. Их значения сохранятся, но использоваться не будут.`
                    : `При включении "${currentSetting.name_text}" будут активированы все прямые зависимые настройки. Если зависимая настройка имеет тип BOOL и значение true, активируется вся цепочка.`}
            </Alert>

            {dependents && dependents.length > 0 && (
                <>
                    <Divider />
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>
                        Затронутые зависимые настройки ({dependents.length}):
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                        {dependents.map((dep, idx) => (
                            <div key={idx} style={{
                                background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 12,
                                border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{dep.name_text || dep.name}</div>
                                    <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{dep.name}</div>
                                </div>
                                <Badge variant={dep.active !== false ? "success" : "default"} size="sm">
                                    {dep.active !== false ? "Активна" : "Неактивна"}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </Modal>
    );
}