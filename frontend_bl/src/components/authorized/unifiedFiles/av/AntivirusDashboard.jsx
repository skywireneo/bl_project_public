import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Badge, Alert } from '../../../ui/UIComponents';
import { getScanHistory, getScanStatistics, getScanById } from '../../../../http/antivirusAPI';
import ScanResultDetail from './ScanResultDetail';
import AntivirusInfoModal from './AntivirusInfoModal';

function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function getVerdictConfig(verdict) {
    const map = {
        'CLEAN': { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', color: '#22c55e', text: 'Безопасен', icon: 'fa-circle-check' },
        'SUSPICIOUS': { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', color: '#f59e0b', text: 'Подозрительный', icon: 'fa-exclamation-circle' },
        'LIKELY_MALICIOUS': { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)', color: '#f97316', text: 'Вероятно вредоносный', icon: 'fa-triangle-exclamation' },
        'MALICIOUS': { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', color: '#ef4444', text: 'Вредоносный', icon: 'fa-skull-crossbones' },
        'TIMEOUT': { bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.3)', color: '#94a3b8', text: 'Таймаут', icon: 'fa-clock' },
        'ERROR': { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', color: '#ef4444', text: 'Ошибка', icon: 'fa-circle-xmark' }
    };
    return map[verdict?.toUpperCase()] || { bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)', color: '#64748b', text: verdict || 'Неизвестно', icon: 'fa-circle-question' };
}

function getStatusConfig(status) {
    const map = {
        'clean': { icon: 'fa-circle-check', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', text: 'Безопасен', gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
        'infected': { icon: 'fa-triangle-exclamation', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', text: 'Угроза', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)' },
        'suspicious': { icon: 'fa-exclamation-circle', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', text: 'Подозрительный', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
        'timeout': { icon: 'fa-clock', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.3)', text: 'Таймаут', gradient: 'linear-gradient(135deg, #64748b, #475569)' },
        'error': { icon: 'fa-circle-xmark', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', text: 'Ошибка', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)' }
    };
    return map[status] || { icon: 'fa-circle-question', color: '#64748b', bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)', text: status || 'Неизвестно', gradient: 'linear-gradient(135deg, #64748b, #475569)' };
}

function getConfidenceColor(confidence) {
    if (confidence >= 80) return '#22c55e';
    if (confidence >= 50) return '#f59e0b';
    return '#ef4444';
}

function AntivirusDashboard() {
    const [loading, setLoading] = useState(true);
    const [statistics, setStatistics] = useState(null);
    const [history, setHistory] = useState([]);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 20
    });
    const [filters, setFilters] = useState({
        status: '',
        infectedOnly: false,
        fileTable: ''
    });
    const [detailScan, setDetailScan] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, [pagination.currentPage, filters]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const statsResponse = await getScanStatistics();
            if (statsResponse.success) {
                setStatistics(statsResponse.statistics || statsResponse.data);
            }

            const historyResponse = await getScanHistory({
                page: pagination.currentPage,
                limit: pagination.itemsPerPage,
                status: filters.status || undefined,
                infectedOnly: filters.infectedOnly,
                fileTable: filters.fileTable || undefined
            });

            if (historyResponse.success) {
                const historyData = Array.isArray(historyResponse.data)
                    ? historyResponse.data
                    : (historyResponse.data?.scans || []);
                setHistory(historyData);

                if (historyResponse.pagination) {
                    setPagination(prev => ({
                        ...prev,
                        totalPages: historyResponse.pagination.totalPages || 1,
                        totalItems: historyResponse.pagination.totalItems || 0
                    }));
                } else if (historyResponse.totalPages) {
                    setPagination(prev => ({
                        ...prev,
                        totalPages: historyResponse.totalPages || 1,
                        totalItems: historyResponse.totalItems || 0
                    }));
                }
            }
        } catch (err) {
            console.error('Ошибка загрузки данных:', err);
            setError(err.message || 'Ошибка при загрузке данных');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (scan) => {
        setDetailScan(scan);
        setDetailLoading(true);
        try {
            const response = await getScanById(scan.id);
            if (response.success) {
                let fullScan;
                if (Array.isArray(response.data)) {
                    fullScan = response.data[0];
                } else if (response.scan) {
                    fullScan = response.scan;
                } else if (response.data) {
                    fullScan = response.data;
                }
                if (fullScan) setDetailScan(fullScan);
            }
        } catch (err) {
            console.error('Ошибка загрузки деталей:', err);
        } finally {
            setDetailLoading(false);
        }
    };

    const getModuleConfigName = (moduleConfig) => {
        if (!moduleConfig) return null;
        if (typeof moduleConfig === 'string') return moduleConfig;
        return moduleConfig.name || moduleConfig;
    };

    // Стили
    const pageStyle = {
        maxWidth: 1400,
        margin: '0 auto',
        width: '100%'
    };

    const headerStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16
    };

    const filterSelectStyle = {
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        color: '#e2e8f0',
        fontSize: 13,
        outline: 'none',
        cursor: 'pointer',
        minWidth: 140
    };

    const statCardStyle = (gradient) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 18px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        transition: 'all 0.2s'
    });

    const statIconStyle = (gradient) => ({
        width: 48,
        height: 48,
        borderRadius: 12,
        background: gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: 20,
        flexShrink: 0
    });

    return (
        <div style={pageStyle}>
            {/* Заголовок */}
            <div style={headerStyle}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 14,
                            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <i className="fa-solid fa-shield-virus" style={{ color: '#fff', fontSize: 22 }} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                                Антивирусная защита
                            </h1>
                            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                                История проверок и статистика
                            </p>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                        variant="secondary"
                        icon="fa-circle-question"
                        onClick={() => setShowInfo(true)}
                    >
                        Как это работает?
                    </Button>
                    <Button
                        variant="secondary"
                        icon="fa-arrows-rotate"
                        onClick={loadData}
                        disabled={loading}
                    >
                        Обновить
                    </Button>
                </div>
            </div>

            {/* Фильтры */}
            <Card style={{ marginBottom: 20 }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap'
                }}>
                    <div style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                    }}>
                        <i className="fa-solid fa-filter" style={{ color: '#6366f1' }} />
                        Фильтры
                    </div>

                    <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        style={filterSelectStyle}
                    >
                        <option value="">Все статусы</option>
                        <option value="clean">Безопасен</option>
                        <option value="infected">Угроза</option>
                        <option value="suspicious">Подозрительный</option>
                        <option value="error">Ошибка</option>
                    </select>

                    <select
                        value={filters.fileTable}
                        onChange={(e) => setFilters(prev => ({ ...prev, fileTable: e.target.value }))}
                        style={filterSelectStyle}
                    >
                        <option value="">Все типы файлов</option>
                        <option value="files">Модульные файлы</option>
                        <option value="files_single">Системные файлы</option>
                    </select>

                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 14px',
                        background: filters.infectedOnly ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.2)',
                        border: `1px solid ${filters.infectedOnly ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 13,
                        color: filters.infectedOnly ? '#f87171' : '#94a3b8',
                        transition: 'all 0.2s'
                    }}>
                        <input
                            type="checkbox"
                            checked={filters.infectedOnly}
                            onChange={(e) => setFilters(prev => ({ ...prev, infectedOnly: e.target.checked }))}
                            style={{ accentColor: '#ef4444', cursor: 'pointer' }}
                        />
                        <i className="fa-solid fa-bug" style={{ fontSize: 11 }} />
                        Только угрозы
                    </label>

                    {(filters.status || filters.infectedOnly || filters.fileTable) && (
                        <button
                            type="button"
                            onClick={() => setFilters({ status: '', infectedOnly: false, fileTable: '' })}
                            style={{
                                padding: '8px 14px',
                                background: 'rgba(99,102,241,0.1)',
                                border: '1px solid rgba(99,102,241,0.3)',
                                borderRadius: 8,
                                color: '#818cf8',
                                fontSize: 12,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            <i className="fa-solid fa-xmark" style={{ fontSize: 10 }} />
                            Сбросить
                        </button>
                    )}
                </div>
            </Card>

            {/* Статистика */}
            {statistics && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: 12,
                        marginBottom: 20
                    }}
                >
                    <div style={statCardStyle()}>
                        <div style={statIconStyle('linear-gradient(135deg, #6366f1, #818cf8)')}>
                            <i className="fa-solid fa-virus-scan" />
                        </div>
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace' }}>
                                {statistics.total_scans || 0}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Всего проверок
                            </div>
                        </div>
                    </div>

                    <div style={statCardStyle()}>
                        <div style={statIconStyle('linear-gradient(135deg, #22c55e, #16a34a)')}>
                            <i className="fa-solid fa-circle-check" />
                        </div>
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e', fontFamily: 'monospace' }}>
                                {statistics.clean_count || 0}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Безопасно
                            </div>
                        </div>
                    </div>

                    <div style={statCardStyle()}>
                        <div style={statIconStyle('linear-gradient(135deg, #ef4444, #dc2626)')}>
                            <i className="fa-solid fa-triangle-exclamation" />
                        </div>
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444', fontFamily: 'monospace' }}>
                                {statistics.infected_count || 0}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Заражено
                            </div>
                        </div>
                    </div>

                    <div style={statCardStyle()}>
                        <div style={statIconStyle('linear-gradient(135deg, #f59e0b, #d97706)')}>
                            <i className="fa-solid fa-exclamation-circle" />
                        </div>
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace' }}>
                                {statistics.suspicious_count || 0}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Подозрительно
                            </div>
                        </div>
                    </div>

                    <div style={statCardStyle()}>
                        <div style={statIconStyle('linear-gradient(135deg, #8b5cf6, #7c3aed)')}>
                            <i className="fa-solid fa-bug" />
                        </div>
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#a78bfa', fontFamily: 'monospace' }}>
                                {statistics.total_threats || 0}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Всего угроз
                            </div>
                        </div>
                    </div>

                    <div style={statCardStyle()}>
                        <div style={statIconStyle('linear-gradient(135deg, #64748b, #475569)')}>
                            <i className="fa-solid fa-clock" />
                        </div>
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' }}>
                                {statistics.timeout_count || 0}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Таймауты
                            </div>
                        </div>
                    </div>

                    {statistics.last_scan_at && (
                        <div style={statCardStyle()}>
                            <div style={statIconStyle('linear-gradient(135deg, #06b6d4, #0891b2)')}>
                                <i className="fa-regular fa-clock" />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {formatDate(statistics.last_scan_at)}
                                </div>
                                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Последняя проверка
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Основной контент */}
            <Card>
                {loading && history.length === 0 ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '60px 20px',
                        gap: 16
                    }}>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: '50%',
                                border: '3px solid rgba(99,102,241,0.2)',
                                borderTopColor: '#6366f1'
                            }}
                        />
                        <span style={{ color: '#94a3b8', fontSize: 14 }}>Загрузка данных...</span>
                    </div>
                ) : error ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '60px 20px',
                        gap: 16,
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            background: 'rgba(239,68,68,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444', fontSize: 28 }} />
                        </div>
                        <p style={{ color: '#94a3b8', margin: 0, fontSize: 14 }}>{error}</p>
                        <Button variant="primary" icon="fa-arrows-rotate" onClick={loadData}>
                            Попробовать снова
                        </Button>
                    </div>
                ) : history.length === 0 ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '60px 20px',
                        gap: 16,
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: 'rgba(99,102,241,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <i className="fa-solid fa-shield-halved" style={{ color: '#6366f1', fontSize: 32 }} />
                        </div>
                        <div>
                            <p style={{ color: '#f1f5f9', margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>
                                Проверок пока нет
                            </p>
                            <p style={{ color: '#64748b', margin: 0, fontSize: 13 }}>
                                Проверки появятся после загрузки файлов
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <AnimatePresence>
                                {history.map((scan, idx) => {
                                    const statusConf = getStatusConfig(scan.status);
                                    const verdictConf = scan.verdict ? getVerdictConfig(scan.verdict) : null;

                                    return (
                                        <motion.button
                                            type="button"
                                            key={scan.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            onClick={() => handleViewDetail(scan)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 16,
                                                padding: '16px 20px',
                                                background: scan.is_old_scan
                                                    ? 'rgba(0,0,0,0.15)'
                                                    : 'rgba(255,255,255,0.03)',
                                                border: `1px solid ${scan.is_old_scan ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)'}`,
                                                borderStyle: scan.is_old_scan ? 'dashed' : 'solid',
                                                borderRadius: 14,
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                width: '100%',
                                                transition: 'all 0.2s',
                                                opacity: scan.is_old_scan ? 0.75 : 1
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = statusConf.bg;
                                                e.currentTarget.style.borderColor = statusConf.border;
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = scan.is_old_scan
                                                    ? 'rgba(0,0,0,0.15)'
                                                    : 'rgba(255,255,255,0.03)';
                                                e.currentTarget.style.borderColor = scan.is_old_scan
                                                    ? 'rgba(255,255,255,0.05)'
                                                    : 'rgba(255,255,255,0.08)';
                                            }}
                                        >
                                            {/* Иконка статуса */}
                                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                                <div style={{
                                                    width: 52,
                                                    height: 52,
                                                    borderRadius: 14,
                                                    background: statusConf.bg,
                                                    border: `2px solid ${statusConf.border}`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <i className={`fa-solid ${statusConf.icon}`}
                                                        style={{ color: statusConf.color, fontSize: 20 }} />
                                                </div>
                                                {scan.is_old_scan && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: -4,
                                                        right: -4,
                                                        width: 22,
                                                        height: 22,
                                                        borderRadius: 6,
                                                        background: '#475569',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: 9,
                                                        color: '#fff',
                                                        border: '2px solid #0f172a'
                                                    }} title="Старая проверка">
                                                        <i className="fa-solid fa-rotate" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Информация */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    marginBottom: 8,
                                                    flexWrap: 'wrap'
                                                }}>
                                                    <span style={{
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        color: statusConf.color,
                                                        background: statusConf.bg,
                                                        border: `1px solid ${statusConf.border}`,
                                                        padding: '3px 10px',
                                                        borderRadius: 6
                                                    }}>
                                                        {statusConf.text}
                                                    </span>

                                                    {scan.file_table && (
                                                        <span style={{
                                                            fontSize: 11,
                                                            fontWeight: 500,
                                                            color: scan.file_table === 'files_single' ? '#06b6d4' : '#818cf8',
                                                            background: scan.file_table === 'files_single' ? 'rgba(6,182,212,0.1)' : 'rgba(99,102,241,0.1)',
                                                            padding: '3px 8px',
                                                            borderRadius: 4
                                                        }}>
                                                            {scan.file_table === 'files_single' ? 'Системный' : 'Модульный'}
                                                        </span>
                                                    )}

                                                    {scan.threat_count > 0 && (
                                                        <span style={{
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            color: '#ef4444',
                                                            background: 'rgba(239,68,68,0.1)',
                                                            padding: '3px 8px',
                                                            borderRadius: 6,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 4
                                                        }}>
                                                            <i className="fa-solid fa-bug" style={{ fontSize: 9 }} />
                                                            {scan.threat_count}
                                                        </span>
                                                    )}

                                                    {scan.is_old_scan && (
                                                        <span style={{
                                                            fontSize: 10,
                                                            fontWeight: 500,
                                                            color: '#94a3b8',
                                                            background: 'rgba(148,163,184,0.1)',
                                                            padding: '2px 6px',
                                                            borderRadius: 4
                                                        }}>
                                                            Старая
                                                        </span>
                                                    )}
                                                </div>

                                                {scan.file_name && (
                                                    <div style={{
                                                        fontSize: 14,
                                                        fontWeight: 500,
                                                        color: '#e2e8f0',
                                                        marginBottom: 4,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}>
                                                        <i className="fa-solid fa-file" style={{ marginRight: 8, color: '#64748b', fontSize: 12 }} />
                                                        {scan.file_name}
                                                    </div>
                                                )}

                                                {scan.file_path && (
                                                    <div style={{
                                                        fontSize: 11,
                                                        color: '#64748b',
                                                        fontFamily: 'monospace',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        marginBottom: 8
                                                    }}>
                                                        <i className="fa-solid fa-folder" style={{ marginRight: 6 }} />
                                                        {scan.file_path}
                                                    </div>
                                                )}

                                                {/* Детали: вердикт, уверенность, модуль */}
                                                <div style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: 10,
                                                    paddingTop: 8,
                                                    borderTop: '1px solid rgba(255,255,255,0.05)',
                                                    marginBottom: 8
                                                }}>
                                                    {verdictConf && (
                                                        <span style={{
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            color: verdictConf.color,
                                                            background: verdictConf.bg,
                                                            border: `1px solid ${verdictConf.border}`,
                                                            padding: '3px 8px',
                                                            borderRadius: 4,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4
                                                        }}>
                                                            <i className={`fa-solid ${verdictConf.icon}`} style={{ fontSize: 9 }} />
                                                            {verdictConf.text}
                                                        </span>
                                                    )}

                                                    {scan.confidence !== undefined && scan.confidence !== null && (
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 8,
                                                            minWidth: 150,
                                                            flex: '0 1 200px'
                                                        }}>
                                                            <span style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap' }}>
                                                                Уверенность:
                                                            </span>
                                                            <div style={{
                                                                flex: 1,
                                                                height: 6,
                                                                background: 'rgba(0,0,0,0.3)',
                                                                borderRadius: 3,
                                                                overflow: 'hidden'
                                                            }}>
                                                                <div style={{
                                                                    height: '100%',
                                                                    width: `${scan.confidence}%`,
                                                                    background: getConfidenceColor(scan.confidence),
                                                                    borderRadius: 3
                                                                }} />
                                                            </div>
                                                            <span style={{
                                                                fontSize: 11,
                                                                fontWeight: 700,
                                                                color: getConfidenceColor(scan.confidence),
                                                                fontFamily: 'monospace',
                                                                minWidth: 36
                                                            }}>
                                                                {scan.confidence}%
                                                            </span>
                                                        </div>
                                                    )}

                                                    {scan.module_config && (
                                                        <span style={{
                                                            fontSize: 11,
                                                            color: '#818cf8',
                                                            background: 'rgba(99,102,241,0.1)',
                                                            padding: '3px 8px',
                                                            borderRadius: 4,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4
                                                        }}>
                                                            <i className="fa-solid fa-cog" style={{ fontSize: 9 }} />
                                                            {getModuleConfigName(scan.module_config)}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Мета */}
                                                <div style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: 12,
                                                    fontSize: 11,
                                                    color: '#64748b'
                                                }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <i className="fa-regular fa-clock" style={{ fontSize: 10 }} />
                                                        {formatDate(scan.scanned_at)}
                                                    </span>
                                                    {scan.scan_duration_ms && (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <i className="fa-solid fa-stopwatch" style={{ fontSize: 10 }} />
                                                            {(scan.scan_duration_ms / 1000).toFixed(2)} сек
                                                        </span>
                                                    )}
                                                    {scan.module && (
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                            color: '#94a3b8',
                                                            background: 'rgba(0,0,0,0.2)',
                                                            padding: '2px 8px',
                                                            borderRadius: 4
                                                        }}>
                                                            <i className="fa-solid fa-microchip" style={{ fontSize: 10 }} />
                                                            {scan.module}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Стрелка */}
                                            <i className="fa-solid fa-chevron-right"
                                                style={{ color: '#475569', fontSize: 14, flexShrink: 0, alignSelf: 'center' }} />
                                        </motion.button>
                                    );
                                })}
                            </AnimatePresence>
                        </div>

                        {/* Пагинация */}
                        {pagination.totalPages > 1 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: 16,
                                marginTop: 20,
                                paddingTop: 16,
                                borderTop: '1px solid rgba(255,255,255,0.06)',
                                flexWrap: 'wrap'
                            }}>
                                <button
                                    type="button"
                                    disabled={pagination.currentPage === 1}
                                    onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 8,
                                        background: pagination.currentPage === 1 ? 'rgba(0,0,0,0.2)' : 'rgba(99,102,241,0.15)',
                                        border: `1px solid ${pagination.currentPage === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.3)'}`,
                                        color: pagination.currentPage === 1 ? '#475569' : '#818cf8',
                                        cursor: pagination.currentPage === 1 ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <i className="fa-solid fa-chevron-left" style={{ fontSize: 12 }} />
                                </button>

                                <span style={{
                                    fontSize: 13,
                                    color: '#94a3b8'
                                }}>
                                    Страница <strong style={{ color: '#f1f5f9' }}>{pagination.currentPage}</strong> из <strong style={{ color: '#f1f5f9' }}>{pagination.totalPages}</strong>
                                    <span style={{ color: '#64748b', marginLeft: 8 }}>
                                        ({pagination.totalItems} записей)
                                    </span>
                                </span>

                                <button
                                    type="button"
                                    disabled={pagination.currentPage === pagination.totalPages}
                                    onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 8,
                                        background: pagination.currentPage === pagination.totalPages ? 'rgba(0,0,0,0.2)' : 'rgba(99,102,241,0.15)',
                                        border: `1px solid ${pagination.currentPage === pagination.totalPages ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.3)'}`,
                                        color: pagination.currentPage === pagination.totalPages ? '#475569' : '#818cf8',
                                        cursor: pagination.currentPage === pagination.totalPages ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <i className="fa-solid fa-chevron-right" style={{ fontSize: 12 }} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </Card>

            {/* Модалка деталей */}
            <AnimatePresence>
                {detailScan && (
                    <ScanResultDetail
                        scan={detailScan}
                        detailLoading={detailLoading}
                        onClose={() => setDetailScan(null)}
                    />
                )}
            </AnimatePresence>

            {/* Модалка информации */}
            <AnimatePresence>
                {showInfo && (
                    <AntivirusInfoModal onClose={() => setShowInfo(false)} />
                )}
            </AnimatePresence>
        </div>
    );
}

export default AntivirusDashboard;