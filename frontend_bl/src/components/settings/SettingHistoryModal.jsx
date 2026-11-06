import React, { useState, useEffect } from "react";
import { Modal, Badge, Avatar, Divider, Button, Alert } from "../ui/UIComponents";
import { getSettingHistory } from "../../http/settingsAPI";

const formatValue = (val) => {
    if (Array.isArray(val)) return val.join(', ');
    return val !== null && val !== undefined ? String(val) : '—';
};

export default function SettingHistoryModal({ isOpen, onClose, settingName, settingTitle }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && settingName) {
            setLoading(true);
            getSettingHistory(settingName)
                .then(data => setHistory(data || []))
                .catch(() => setHistory([]))
                .finally(() => setLoading(false));
        }
    }, [isOpen, settingName]);

    return (
        <Modal open={isOpen} onClose={onClose} title={`История: ${settingTitle || settingName}`} size="md">
            {loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24, color: '#6366f1' }} />
                </div>
            ) : history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                    <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 32, marginBottom: 12, opacity: 0.5, display: 'block' }} />
                    История изменений для этой настройки пуста
                </div>
            ) : (
                <div style={{ position: 'relative', paddingLeft: 24 }}>
                    {/* Вертикальная линия таймлайна */}
                    <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: 'rgba(99,102,241,0.2)', borderRadius: 1 }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {history.map((item, idx) => (
                            <div key={item.id} style={{ position: 'relative' }}>
                                {/* Точка на таймлайне */}
                                <div style={{
                                    position: 'absolute', left: -24, top: 4, width: 16, height: 16, borderRadius: '50%',
                                    background: '#1e2030', border: '3px solid #6366f1', zIndex: 2
                                }} />

                                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <Avatar name={item.login || 'U'} size={28} variant="info" />
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{item.login || 'Неизвестно'}</div>
                                                <div style={{ fontSize: 11, color: '#64748b' }}>
                                                    {new Date(item.changed_at).toLocaleString('ru-RU')}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant="default">ID: {item.id}</Badge>
                                    </div>

                                    <Divider style={{ margin: '12px 0' }} />

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div>
                                            <div style={{ fontSize: 11, color: '#f87171', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>
                                                <i className="fa-solid fa-arrow-down" style={{ marginRight: 4 }} />Было
                                            </div>
                                            <div style={{
                                                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                                borderRadius: 8, padding: 10, fontSize: 13, color: '#fca5a5', fontFamily: 'monospace', wordBreak: 'break-all'
                                            }}>
                                                {formatValue(item.old_value)}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, color: '#34d399', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>
                                                <i className="fa-solid fa-arrow-up" style={{ marginRight: 4 }} />Стало
                                            </div>
                                            <div style={{
                                                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                                                borderRadius: 8, padding: 10, fontSize: 13, color: '#6ee7b7', fontFamily: 'monospace', wordBreak: 'break-all'
                                            }}>
                                                {formatValue(item.new_value)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Modal>
    );
}