import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Badge, EmptyState, Modal, Alert } from '../../../ui/UIComponents'; // <-- Проверь путь!
import { getCacheStats, clearCache } from '../../../../http/criticalActionsAPI'; // <-- Проверь путь!

function CacheManagementSection({ onLogUpdate }) {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(null); // id типа, который очищается

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedType, setSelectedType] = useState(null);

    // ИЗМЕНЕНИЕ 1: По умолчанию перезагрузка ВЫКЛЮЧЕНА
    const [triggerReload, setTriggerReload] = useState(false);

    const loadStats = async () => {
        setLoading(true);
        try {
            const response = await getCacheStats();
            setStats(response.data || []);
        } catch (err) {
            console.error('Ошибка загрузки статистики кеша:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

    const handleClearClick = (type) => {
        setSelectedType(type);
        setTriggerReload(false); // Сбрасываем при открытии модалки
        setModalOpen(true);
    };

    const confirmClear = async () => {
        if (!selectedType) return;
        setClearing(selectedType);
        setModalOpen(false);

        try {
            await clearCache(selectedType, triggerReload);
            await loadStats();
            if (onLogUpdate) onLogUpdate(); // Обновить логи критических действий, если нужно
        } catch (err) {
            console.error('Ошибка очистки кеша:', err);
            alert('Не удалось очистить кеш: ' + (err.response?.data?.message || err.message));
        } finally {
            setClearing(null);
            setSelectedType(null);
        }
    };

    if (loading) {
        return (
            <Card padding={24} style={{ marginTop: 24 }}>
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 20, marginRight: 8 }} />
                    Загрузка статистики кеша...
                </div>
            </Card>
        );
    }

    return (
        <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
                <Card padding={24} style={{ marginTop: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <i className="fa-solid fa-broom" style={{ color: '#8b5cf6' }} />
                            Управление кешем системы
                        </h3>
                        <Button variant="secondary" size="sm" icon="fa-rotate" onClick={loadStats}>Обновить</Button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                        {stats.map((item) => (
                            <div key={item.id} style={{
                                padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 12,
                                border: '1px solid rgba(255,255,255,0.05)', display: 'flex',
                                flexDirection: 'column', gap: 12
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{item.label}</div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontFamily: 'monospace' }}>
                                            {item.pattern}
                                        </div>
                                    </div>
                                    <Badge variant={item.count > 0 ? 'info' : 'default'}>
                                        {item.count} ключей
                                    </Badge>
                                </div>

                                {/* ИЗМЕНЕНИЕ 2: Вывод предупреждения на карточке */}
                                {item.warning && (
                                    <div style={{
                                        fontSize: 12, color: '#f59e0b', lineHeight: 1.4,
                                        display: 'flex', gap: 8, alignItems: 'flex-start',
                                        background: 'rgba(245, 158, 11, 0.05)',
                                        padding: '8px 10px',
                                        borderRadius: 8,
                                        border: '1px solid rgba(245, 158, 11, 0.15)'
                                    }}>
                                        <i className="fa-solid fa-triangle-exclamation" style={{ marginTop: 2, flexShrink: 0 }} />
                                        <span>{item.warning}</span>
                                    </div>
                                )}

                                <Button
                                    variant="danger"
                                    size="sm"
                                    fullWidth
                                    icon="fa-trash-can"
                                    loading={clearing === item.id}
                                    disabled={item.count === 0 || clearing !== null}
                                    onClick={() => handleClearClick(item.id)}
                                    style={{ marginTop: 'auto' }} // Прижимает кнопку к низу карточки
                                >
                                    Очистить раздел
                                </Button>
                            </div>
                        ))}
                    </div>
                </Card>
            </motion.div>

            {/* Модалка подтверждения очистки */}
            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={`Очистка кеша: ${stats.find(s => s.id === selectedType)?.label}`}
                size="md"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={clearing !== null}>Отмена</Button>
                        <Button variant="danger" icon="fa-trash-can" onClick={confirmClear} loading={clearing !== null}>
                            Подтвердить очистку
                        </Button>
                    </>
                }
            >
                <Alert variant="warning" icon="fa-triangle-exclamation" style={{ marginBottom: 16 }}>
                    Вы собираетесь удалить все закешированные данные для этого раздела. При следующем запросе данные будут загружаться напрямую из БД, что может создать кратковременную нагрузку.
                </Alert>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: 14, background: 'rgba(99,102,241,0.08)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)' }}>
                    <input
                        type="checkbox"
                        checked={triggerReload}
                        onChange={(e) => setTriggerReload(e.target.checked)}
                        style={{ width: 18, height: 18, marginTop: 2, accentColor: '#6366f1', cursor: 'pointer' }}
                    />
                    <div>
                        <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}>
                            Принудительная перезагрузка пользователей
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>
                            Если отмечено, все онлайн-пользователи получат команду на перезагрузку страницы с безопасной задержкой (защита от наплыва запросов).
                        </div>
                    </div>
                </label>
            </Modal>
        </>
    );
}

export default CacheManagementSection;