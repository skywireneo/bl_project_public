import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../../../ui/UIComponents';
import { getFileScanResults, getScanById, rescanFile, rescanSingleFile } from '../../../../http/antivirusAPI';
import ScanResultDetail from './ScanResultDetail';

function AntivirusScanResultViewer({
    isOpen,
    onClose,
    moduleName,
    recordId,
    fileName = null,
    fileId = null,
    onRescanComplete = null,
    getHistory = null
}) {
    const [loading, setLoading] = useState(true);
    const [scans, setScans] = useState([]);
    const [detailScan, setDetailScan] = useState(null);
    const [error, setError] = useState(null);
    const [rescanning, setRescanning] = useState(false);

    useEffect(() => {
        if (isOpen && moduleName && recordId) {
            loadScanResults();
        }
    }, [isOpen, moduleName, recordId, fileName]);

    // Блокировка скролла
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Клавиша Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => {
            if (e.key === 'Escape' && !detailScan) onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, detailScan, onClose]);

    const loadScanResults = async () => {
        try {
            setLoading(true);
            setError(null);

            let response;
            if (getHistory) {
                response = await getHistory(moduleName, recordId, fileName, fileId);
            } else {
                response = await getFileScanResults(moduleName, recordId, fileName, fileId);
            }

            if (response.success) {
                if (Array.isArray(response.history)) {
                    setScans(response.history);
                } else if (Array.isArray(response.data)) {
                    setScans(response.data);
                } else if (response.scan) {
                    setScans([response.scan]);
                } else if (response.data?.scan) {
                    setScans([response.data.scan]);
                } else if (Array.isArray(response)) {
                    setScans(response);
                } else {
                    setScans([]);
                }
            } else {
                throw new Error(response.message || 'Не удалось загрузить результаты');
            }
        } catch (err) {
            console.error('Ошибка загрузки результатов проверки:', err);
            setError(err.message || 'Ошибка при загрузке результатов');
        } finally {
            setLoading(false);
        }
    };

    const handleRescan = async (scan = null) => {
        try {
            setRescanning(true);
            setError(null);

            let response;
            if (moduleName === 'files_single') {
                response = await rescanSingleFile(recordId);
            } else {
                response = await rescanFile(moduleName, recordId, fileName, fileId);
            }

            if (response.success) {
                await loadScanResults();
                if (onRescanComplete) {
                    onRescanComplete(response);
                }
            } else {
                throw new Error(response.message || 'Не удалось запустить проверку');
            }
        } catch (err) {
            console.error('Ошибка повторной проверки:', err);
            setError(err.message || 'Ошибка при запуске проверки');
        } finally {
            setRescanning(false);
        }
    };

    const handleViewDetail = async (scan) => {
        try {
            const response = await getScanById(scan.id);
            if (response.success) {
                if (Array.isArray(response.data)) {
                    setDetailScan(response.data[0]);
                } else if (response.scan) {
                    setDetailScan(response.scan);
                } else if (response.data) {
                    setDetailScan(response.data);
                }
            }
        } catch (err) {
            console.error('Ошибка получения деталей:', err);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusConfig = (status) => {
        const configs = {
            'clean': { icon: 'fa-circle-check', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', text: 'Безопасен' },
            'infected': { icon: 'fa-triangle-exclamation', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', text: 'Угроза' },
            'suspicious': { icon: 'fa-exclamation-circle', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', text: 'Подозрительный' },
            'timeout': { icon: 'fa-clock', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.3)', text: 'Таймаут' },
            'error': { icon: 'fa-circle-xmark', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', text: 'Ошибка' }
        };
        return configs[status] || { icon: 'fa-circle-question', color: '#64748b', bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)', text: status || 'Неизвестно' };
    };

    if (!isOpen) return null;

    // Стили для кнопок
    const primaryBtnStyle = {
        padding: '8px 16px',
        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
        border: 'none',
        color: '#fff',
        borderRadius: 8,
        cursor: rescanning ? 'not-allowed' : 'pointer',
        fontSize: 13,
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transition: 'all 0.2s',
        opacity: rescanning ? 0.6 : 1
    };

    const secondaryBtnStyle = {
        padding: '8px 16px',
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#e2e8f0',
        borderRadius: 8,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: 13,
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transition: 'all 0.2s'
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(10px)',
                zIndex: 3500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 20,
                    width: '100%',
                    maxWidth: 640,
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
                }}
            >
                {/* Заголовок */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(15,23,42,0.5)',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <i className="fa-solid fa-shield-virus" style={{ color: '#fff', fontSize: 18 }} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
                                Антивирусная проверка
                            </h4>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                {fileName || 'Все файлы'} • {scans.length} {scans.length === 1 ? 'проверка' : 'проверок'}
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: 'rgba(239,68,68,0.15)',
                            border: 'none',
                            color: '#f87171',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            transition: 'all 0.2s'
                        }}
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {/* Панель инструментов */}
                <div style={{
                    display: 'flex',
                    gap: 8,
                    padding: '12px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    flexShrink: 0
                }}>
                    <button
                        type="button"
                        onClick={() => handleRescan()}
                        disabled={rescanning}
                        style={primaryBtnStyle}
                    >
                        {rescanning ? (
                            <>
                                <motion.i
                                    className="fa-solid fa-rotate"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    style={{ fontSize: 12 }}
                                />
                                Запуск...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-rotate" style={{ fontSize: 12 }} />
                                Проверить повторно
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={loadScanResults}
                        disabled={loading}
                        style={secondaryBtnStyle}
                    >
                        <i className="fa-solid fa-arrows-rotate" style={{ fontSize: 12 }} />
                        Обновить
                    </button>
                </div>

                {/* Контент */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: 24,
                    minHeight: 200
                }}>
                    {loading ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '40px 20px',
                            gap: 16
                        }}>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    border: '3px solid rgba(99,102,241,0.2)',
                                    borderTopColor: '#6366f1'
                                }}
                            />
                            <span style={{ color: '#94a3b8', fontSize: 14 }}>Загрузка результатов...</span>
                        </div>
                    ) : error ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '40px 20px',
                            gap: 16,
                            textAlign: 'center'
                        }}>
                            <div style={{
                                width: 64,
                                height: 64,
                                borderRadius: '50%',
                                background: 'rgba(239,68,68,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444', fontSize: 24 }} />
                            </div>
                            <p style={{ color: '#94a3b8', margin: 0, fontSize: 14 }}>{error}</p>
                            <button
                                type="button"
                                onClick={loadScanResults}
                                style={primaryBtnStyle}
                            >
                                <i className="fa-solid fa-arrows-rotate" style={{ fontSize: 12 }} />
                                Попробовать снова
                            </button>
                        </div>
                    ) : scans.length === 0 ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '40px 20px',
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
                            <p style={{ color: '#94a3b8', margin: 0, fontSize: 14 }}>Проверок пока нет</p>
                            <button
                                type="button"
                                onClick={() => handleRescan()}
                                disabled={rescanning}
                                style={primaryBtnStyle}
                            >
                                <i className="fa-solid fa-play" style={{ fontSize: 12 }} />
                                Запустить первую проверку
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <AnimatePresence>
                                {scans.map((scan, idx) => {
                                    const config = getStatusConfig(scan.status);
                                    return (
                                        <motion.button
                                            type="button"
                                            key={scan.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            onClick={() => handleViewDetail(scan)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 14,
                                                padding: '14px 16px',
                                                background: scan.is_old_scan
                                                    ? 'rgba(0,0,0,0.15)'
                                                    : 'rgba(255,255,255,0.04)',
                                                border: `1px solid ${scan.is_old_scan ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)'}`,
                                                borderStyle: scan.is_old_scan ? 'dashed' : 'solid',
                                                borderRadius: 12,
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                width: '100%',
                                                transition: 'all 0.2s',
                                                opacity: scan.is_old_scan ? 0.7 : 1
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = `${config.bg}`;
                                                e.currentTarget.style.borderColor = config.border;
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = scan.is_old_scan
                                                    ? 'rgba(0,0,0,0.15)'
                                                    : 'rgba(255,255,255,0.04)';
                                                e.currentTarget.style.borderColor = scan.is_old_scan
                                                    ? 'rgba(255,255,255,0.05)'
                                                    : 'rgba(255,255,255,0.08)';
                                            }}
                                        >
                                            {/* Иконка статуса */}
                                            <div style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 10,
                                                background: config.bg,
                                                border: `1px solid ${config.border}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <i className={`fa-solid ${config.icon}`}
                                                    style={{ color: config.color, fontSize: 18 }} />
                                            </div>

                                            {/* Информация */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    marginBottom: 6,
                                                    flexWrap: 'wrap'
                                                }}>
                                                    <span style={{
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        color: config.color,
                                                        background: config.bg,
                                                        border: `1px solid ${config.border}`,
                                                        padding: '3px 10px',
                                                        borderRadius: 6
                                                    }}>
                                                        {config.text}
                                                    </span>
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
                                                        <Badge variant="info" style={{ fontSize: 10 }}>
                                                            <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 4 }} />
                                                            Старая
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    fontSize: 11,
                                                    color: '#64748b',
                                                    flexWrap: 'wrap'
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
                                                </div>

                                                {scan.file_name && (
                                                    <div style={{
                                                        fontSize: 12,
                                                        color: '#94a3b8',
                                                        marginTop: 4,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}>
                                                        <i className="fa-solid fa-file" style={{ marginRight: 6, color: '#64748b' }} />
                                                        {scan.file_name}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Стрелка */}
                                            <i className="fa-solid fa-chevron-right"
                                                style={{ color: '#475569', fontSize: 12, flexShrink: 0 }} />
                                        </motion.button>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Детали проверки */}
            <AnimatePresence>
                {detailScan && (
                    <ScanResultDetail
                        scan={detailScan}
                        onClose={() => setDetailScan(null)}
                        onRescan={handleRescan}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default AntivirusScanResultViewer;