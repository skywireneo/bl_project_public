import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Badge, Input, FormField } from '../ui/UIComponents';
import { getHistory, getHistoryStatistics } from '../../http/incidentsAPI';

export default function SearchHistoryModal({ isOpen, onClose }) {
    const [history, setHistory] = useState(null);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Фильтры
    const [filters, setFilters] = useState({
        type: '',
        status: '',
        device_id: '',
        days: 7,
        limit: 50,
        offset: 0
    });

    // Загрузка данных при открытии
    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    // Перезагрузка при изменении фильтров
    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [filters]);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            const [historyResponse, statsResponse] = await Promise.all([
                getHistory(
                    null, // email (null = все для админа)
                    filters.type || undefined,
                    filters.status || undefined,
                    filters.device_id || undefined,
                    filters.days,
                    filters.limit,
                    filters.offset
                ),
                getHistoryStatistics(null, filters.days)
            ]);

            if (historyResponse.success) {
                setHistory(historyResponse.data);
            }
            if (statsResponse.success) {
                setStatistics(statsResponse.data);
            }
        } catch (err) {
            setError(err.message || 'Ошибка загрузки истории');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const variants = {
            'found': { variant: 'success', label: 'Найдено' },
            'not_found': { variant: 'warning', label: 'Не найдено' },
            'error': { variant: 'danger', label: 'Ошибка' },
            'rate_limited': { variant: 'danger', label: 'Лимит' }
        };
        const config = variants[status] || { variant: 'default', label: status };
        return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
    };

    const getTypeBadge = (type) => {
        return type === 'person'
            ? <Badge variant="info" size="sm" icon="fa-user">Человек</Badge>
            : <Badge variant="info" size="sm" icon="fa-building">ПВЗ</Badge>;
    };

    const getRiskColor = (level) => {
        switch (level) {
            case 'critical': return '#ef4444';
            case 'high': return '#f97316';
            case 'medium': return '#f59e0b';
            case 'low': return '#10b981';
            default: return '#64748b';
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    const handlePrevPage = () => {
        if (filters.offset > 0) {
            setFilters(prev => ({
                ...prev,
                offset: Math.max(0, prev.offset - prev.limit)
            }));
        }
    };

    const handleNextPage = () => {
        if (history?.hasMore) {
            setFilters(prev => ({
                ...prev,
                offset: prev.offset + prev.limit
            }));
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 20
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        maxWidth: 1200,
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}
                >
                    <Card padding={24}>
                        {/* Заголовок */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    background: 'rgba(99,102,241,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 22, color: '#818cf8' }} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: '#e2e8f0' }}>
                                        История поисковых запросов
                                    </h2>
                                    <div style={{ fontSize: 13, color: '#94a3b8' }}>
                                        Последние {filters.days} {filters.days === 1 ? 'день' : 'дней'}
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                icon="fa-xmark"
                                onClick={onClose}
                            >
                                Закрыть
                            </Button>
                        </div>

                        {/* Статистика */}
                        {statistics && (
                            <div style={{ marginBottom: 20 }}>
                                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', fontWeight: 600 }}>
                                    <i className="fa-solid fa-chart-line" style={{ marginRight: 6 }} />
                                    Статистика
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                                    <div style={{
                                        padding: 16,
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: 8
                                    }}>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Всего запросов</div>
                                        <div style={{ fontSize: 24, fontWeight: 800, color: '#818cf8' }}>
                                            {statistics.totals?.total_requests || 0}
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: 16,
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: 8
                                    }}>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Уникальных пользователей</div>
                                        <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>
                                            {statistics.totals?.unique_users || 0}
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: 16,
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: 8
                                    }}>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Среднее время</div>
                                        <div style={{ fontSize: 24, fontWeight: 800, color: '#fbbf24' }}>
                                            {Math.round(statistics.totals?.avg_execution_time || 0)}ms
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: 16,
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: 8
                                    }}>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Уникальных устройств</div>
                                        <div style={{ fontSize: 24, fontWeight: 800, color: '#f97316' }}>
                                            {statistics.totals?.unique_devices || 0}
                                        </div>
                                    </div>
                                </div>

                                {/* По типам и статусам */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                                    <div style={{
                                        padding: 12,
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: 8
                                    }}>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>По типам</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {statistics.by_type?.map(item => (
                                                <div key={item.search_type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                                    <span style={{ color: '#94a3b8' }}>
                                                        {item.search_type === 'person' ? 'Человек' : 'ПВЗ'}
                                                    </span>
                                                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{item.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: 12,
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: 8
                                    }}>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>По статусам</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {statistics.by_status?.map(item => (
                                                <div key={item.result_status} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                                    <span style={{ color: '#94a3b8' }}>
                                                        {item.result_status === 'found' && 'Найдено'}
                                                        {item.result_status === 'not_found' && 'Не найдено'}
                                                        {item.result_status === 'error' && 'Ошибки'}
                                                        {item.result_status === 'rate_limited' && 'Лимит'}
                                                    </span>
                                                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{item.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Фильтры */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', fontWeight: 600 }}>
                                <i className="fa-solid fa-filter" style={{ marginRight: 6 }} />
                                Фильтры
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                                <FormField label="Тип">
                                    <select
                                        value={filters.type}
                                        onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value, offset: 0 }))}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            background: 'rgba(0,0,0,0.2)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 6,
                                            color: '#e2e8f0',
                                            fontSize: 13
                                        }}
                                    >
                                        <option value="">Все</option>
                                        <option value="person">Человек</option>
                                        <option value="pvz">ПВЗ</option>
                                    </select>
                                </FormField>

                                <FormField label="Статус">
                                    <select
                                        value={filters.status}
                                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, offset: 0 }))}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            background: 'rgba(0,0,0,0.2)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 6,
                                            color: '#e2e8f0',
                                            fontSize: 13
                                        }}
                                    >
                                        <option value="">Все</option>
                                        <option value="found">Найдено</option>
                                        <option value="not_found">Не найдено</option>
                                        <option value="error">Ошибки</option>
                                        <option value="rate_limited">Лимит</option>
                                    </select>
                                </FormField>

                                <FormField label="Период (дней)">
                                    <select
                                        value={filters.days}
                                        onChange={(e) => setFilters(prev => ({ ...prev, days: parseInt(e.target.value), offset: 0 }))}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            background: 'rgba(0,0,0,0.2)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 6,
                                            color: '#e2e8f0',
                                            fontSize: 13
                                        }}
                                    >
                                        <option value="1">1 день</option>
                                        <option value="7">7 дней</option>
                                        <option value="14">14 дней</option>
                                        <option value="30">30 дней</option>
                                    </select>
                                </FormField>

                                <FormField label="Device ID">
                                    <Input
                                        placeholder="Опционально"
                                        value={filters.device_id}
                                        onChange={(e) => setFilters(prev => ({ ...prev, device_id: e.target.value, offset: 0 }))}
                                    />
                                </FormField>
                                <FormField label="Источник">
                                    <select
                                        value={filters.source || ''}
                                        onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value, offset: 0 }))}
                                        style={{
                                            width: '100%', padding: '8px 12px',
                                            background: 'rgba(0,0,0,0.2)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 6, color: '#e2e8f0', fontSize: 13
                                        }}
                                    >
                                        <option value="">Все</option>
                                        <option value="pdf_export">PDF-отчёты</option>
                                        <option value="search">Обычный поиск</option>
                                    </select>
                                </FormField>
                            </div>
                        </div>

                        {/* Ошибка */}
                        {error && (
                            <div style={{
                                padding: 12,
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 8,
                                color: '#f87171',
                                fontSize: 13,
                                marginBottom: 16
                            }}>
                                <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 8 }} />
                                {error}
                            </div>
                        )}

                        {/* Загрузка */}
                        {loading && (
                            <div style={{ textAlign: 'center', padding: 40 }}>
                                <div style={{
                                    width: 40,
                                    height: 40,
                                    border: '3px solid rgba(255,255,255,0.1)',
                                    borderTop: '3px solid #818cf8',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite',
                                    margin: '0 auto 12px'
                                }} />
                                <div style={{ color: '#94a3b8' }}>Загрузка...</div>
                            </div>
                        )}

                        {/* Список истории */}
                        {!loading && history && (
                            <div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {history.items?.map(item => (
                                        <div
                                            key={item.id}
                                            style={{
                                                padding: 16,
                                                background: 'rgba(0,0,0,0.2)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                borderRadius: 8
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {getTypeBadge(item.search_type)}
                                                    {getStatusBadge(item.result_status)}
                                                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                                                        {formatDate(item.created_at)}
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: 11, color: '#64748b' }}>
                                                    {item.execution_time_ms}ms
                                                </span>
                                            </div>

                                            <div style={{ marginBottom: 8 }}>
                                                <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 4 }}>
                                                    <strong>Email:</strong> {item.user_email}
                                                </div>
                                                {item.device_id && (
                                                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                                        <strong>Device:</strong> {item.device_id.substring(0, 20)}...
                                                    </div>
                                                )}
                                            </div>

                                            {/* Блок данных PDF-экспорта */}
                                            {item.result_summary?.type === 'pdf_export' && (
                                                <div style={{
                                                    marginTop: 12,
                                                    padding: 12,
                                                    background: 'rgba(59,130,246,0.08)',
                                                    border: '1px solid rgba(59,130,246,0.2)',
                                                    borderRadius: 8
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                        <i className="fa-solid fa-file-pdf" style={{ color: '#60a5fa' }} />
                                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd' }}>
                                                            PDF-отчёт
                                                        </span>
                                                        {item.result_summary.verify_code && (
                                                            <span style={{
                                                                padding: '2px 8px',
                                                                background: 'rgba(59,130,246,0.2)',
                                                                borderRadius: 4,
                                                                fontSize: 11,
                                                                color: '#bfdbfe',
                                                                fontFamily: 'monospace',
                                                                fontWeight: 700
                                                            }}>
                                                                {item.result_summary.verify_code}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, fontSize: 11 }}>
                                                        {item.result_summary.display_data && (
                                                            <>
                                                                <div>
                                                                    <div style={{ color: '#64748b' }}>Рейтинг</div>
                                                                    <div style={{ color: '#e2e8f0', fontWeight: 600 }}>
                                                                        {item.result_summary.display_data.reliability_score}/100
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ color: '#64748b' }}>Риск</div>
                                                                    <div style={{ color: '#fbbf24', fontWeight: 600 }}>
                                                                        {(item.result_summary.display_data.risk_level || 'low').toUpperCase()}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ color: '#64748b' }}>Инцидентов</div>
                                                                    <div style={{ color: '#e2e8f0', fontWeight: 600 }}>
                                                                        {item.result_summary.display_data.total_incidents}
                                                                    </div>
                                                                </div>
                                                                {item.result_summary.display_data.as_administration !== undefined && (
                                                                    <div>
                                                                        <div style={{ color: '#64748b' }}>Админ/Сотр</div>
                                                                        <div style={{ color: '#e2e8f0', fontWeight: 600 }}>
                                                                            <span style={{ color: '#fb923c' }}>{item.result_summary.display_data.as_administration}</span>
                                                                            /<span style={{ color: '#a78bfa' }}>{item.result_summary.display_data.as_employee}</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                        <div>
                                                            <div style={{ color: '#64748b' }}>Просмотров</div>
                                                            <div style={{ color: '#fbbf24', fontWeight: 600 }}>
                                                                <i className="fa-solid fa-eye" style={{ marginRight: 4, fontSize: 10 }} />
                                                                {item.result_summary.verify_count || 0}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {item.result_summary.data_fingerprint && (
                                                        <div style={{ marginTop: 8, fontSize: 10 }}>
                                                            <span style={{ color: '#64748b' }}>Хэш: </span>
                                                            <code style={{ color: '#a5b4fc', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                                                {item.result_summary.data_fingerprint.substring(0, 32)}...
                                                            </code>
                                                        </div>
                                                    )}

                                                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                                                        <a
                                                            href={`/verify/${item.id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                padding: '4px 10px',
                                                                background: 'rgba(59,130,246,0.15)',
                                                                border: '1px solid rgba(59,130,246,0.3)',
                                                                borderRadius: 4,
                                                                color: '#60a5fa',
                                                                fontSize: 11,
                                                                textDecoration: 'none',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <i className="fa-solid fa-external-link" style={{ marginRight: 4 }} />
                                                            Открыть страницу верификации
                                                        </a>
                                                    </div>
                                                </div>
                                            )}

                                            <div style={{
                                                padding: 8,
                                                background: 'rgba(0,0,0,0.3)',
                                                borderRadius: 4,
                                                fontSize: 12
                                            }}>
                                                {item.search_type === 'person' && (
                                                    <div style={{ color: '#c7d2fe' }}>
                                                        <i className="fa-solid fa-magnifying-glass" style={{ marginRight: 6 }} />
                                                        <strong>Запрос:</strong> {item.search_params?.string || '—'}
                                                    </div>
                                                )}
                                                {item.search_type === 'pvz' && (
                                                    <div style={{ color: '#c7d2fe' }}>
                                                        <i className="fa-solid fa-location-dot" style={{ marginRight: 6 }} />
                                                        <strong>Адрес:</strong> {item.search_params?.city}, {item.search_params?.street}, {item.search_params?.home}
                                                    </div>
                                                )}
                                            </div>

                                            {item.result_summary && (
                                                <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
                                                    {item.result_summary.found_count !== undefined && (
                                                        <span style={{ marginRight: 12 }}>
                                                            <i className="fa-solid fa-hashtag" style={{ marginRight: 4 }} />
                                                            Найдено: {item.result_summary.found_count}
                                                        </span>
                                                    )}
                                                    {item.result_summary.max_risk_level && (
                                                        <span style={{ color: getRiskColor(item.result_summary.max_risk_level) }}>
                                                            <i className="fa-solid fa-shield-halved" style={{ marginRight: 4 }} />
                                                            Риск: {item.result_summary.max_risk_level}
                                                        </span>
                                                    )}
                                                    {item.result_summary.error_code && (
                                                        <span style={{ color: '#f87171' }}>
                                                            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 4 }} />
                                                            {item.result_summary.error_code}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {history.items?.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                                            <i className="fa-solid fa-inbox" style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }} />
                                            <div>История пуста</div>
                                        </div>
                                    )}
                                </div>

                                {/* Пагинация */}
                                {history.total > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                            Показано {history.offset + 1}-{Math.min(history.offset + history.limit, history.total)} из {history.total}
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                icon="fa-chevron-left"
                                                onClick={handlePrevPage}
                                                disabled={filters.offset === 0}
                                            >
                                                Назад
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                icon="fa-chevron-right"
                                                onClick={handleNextPage}
                                                disabled={!history.hasMore}
                                            >
                                                Вперёд
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                </motion.div>
            </motion.div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </AnimatePresence>
    );
}