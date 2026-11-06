import React from 'react';
import { motion } from 'framer-motion';

function Tooltip({ text, children }) {
    return (
        <span title={text} style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {children}
            <i className="fa-solid fa-circle-info" style={{ fontSize: 10, color: '#64748b' }} />
        </span>
    );
}

function ScanResultDetail({ scan, onClose, onRescan }) {
    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '—';
        const n = parseInt(bytes);
        if (isNaN(n)) return '—';
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`;
        return `${(n / (1024 * 1024)).toFixed(2)} MB`;
    };

    const getStatusConfig = (status) => {
        const map = {
            'clean': { gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', icon: 'fa-circle-check', text: 'Безопасен', shadow: 'rgba(34,197,94,0.4)' },
            'infected': { gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', icon: 'fa-triangle-exclamation', text: 'Обнаружена угроза', shadow: 'rgba(239,68,68,0.4)' },
            'suspicious': { gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', icon: 'fa-exclamation-circle', text: 'Подозрительный', shadow: 'rgba(245,158,11,0.4)' },
            'timeout': { gradient: 'linear-gradient(135deg, #64748b, #475569)', icon: 'fa-clock', text: 'Таймаут', shadow: 'rgba(100,116,139,0.4)' },
            'error': { gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', icon: 'fa-circle-xmark', text: 'Ошибка', shadow: 'rgba(239,68,68,0.4)' }
        };
        return map[status] || { gradient: 'linear-gradient(135deg, #64748b, #475569)', icon: 'fa-circle-question', text: status || 'Неизвестно', shadow: 'rgba(100,116,139,0.4)' };
    };

    const getVerdictConfig = (verdict) => {
        const map = {
            'CLEAN': { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', color: '#22c55e', text: 'Безопасен' },
            'SUSPICIOUS': { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', color: '#f59e0b', text: 'Подозрительный' },
            'LIKELY_MALICIOUS': { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)', color: '#f97316', text: 'Вероятно вредоносный' },
            'MALICIOUS': { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', color: '#ef4444', text: 'Вредоносный' },
            'TIMEOUT': { bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.3)', color: '#94a3b8', text: 'Таймаут' },
            'ERROR': { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', color: '#ef4444', text: 'Ошибка' }
        };
        return map[verdict?.toUpperCase()] || { bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)', color: '#64748b', text: verdict || 'Неизвестно' };
    };

    const getSeverityConfig = (severity) => {
        const map = {
            'critical': { bg: 'rgba(239,68,68,0.2)', color: '#ef4444', text: 'Критический' },
            'high': { bg: 'rgba(249,115,22,0.2)', color: '#f97316', text: 'Высокий' },
            'medium': { bg: 'rgba(245,158,11,0.2)', color: '#f59e0b', text: 'Средний' },
            'low': { bg: 'rgba(34,197,94,0.2)', color: '#22c55e', text: 'Низкий' },
            'info': { bg: 'rgba(59,130,246,0.2)', color: '#3b82f6', text: 'Информация' }
        };
        return map[severity?.toLowerCase()] || { bg: 'rgba(100,116,139,0.15)', color: '#64748b', text: severity || 'Неизвестно' };
    };

    const getScoreConfig = (score) => {
        if (score >= 70) return { gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', text: 'Опасно' };
        if (score >= 30) return { gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', text: 'Подозрительно' };
        return { gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', text: 'Безопасно' };
    };

    const getConfidenceColor = (c) => c >= 80 ? '#22c55e' : c >= 50 ? '#f59e0b' : '#ef4444';

    const statusConfig = getStatusConfig(scan.status);
    const verdictConfig = scan.verdict ? getVerdictConfig(scan.verdict) : null;

    // Стили
    const sectionStyle = {
        marginBottom: 24,
        paddingBottom: 20,
        borderBottom: '1px solid rgba(255,255,255,0.06)'
    };

    const sectionTitleStyle = {
        fontSize: 14,
        fontWeight: 700,
        color: '#e2e8f0',
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    };

    const infoGridStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 10
    };

    const infoItemStyle = {
        padding: '12px 14px',
        background: 'rgba(0,0,0,0.25)',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.06)'
    };

    const labelStyle = {
        fontSize: 10,
        fontWeight: 600,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 4
    };

    const valueStyle = {
        fontSize: 13,
        color: '#e2e8f0',
        fontWeight: 500
    };

    const codeStyle = {
        fontSize: 11,
        color: '#a5b4fc',
        fontFamily: 'monospace',
        background: 'rgba(0,0,0,0.3)',
        padding: '4px 8px',
        borderRadius: 4,
        wordBreak: 'break-all'
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
                background: 'rgba(0,0,0,0.9)',
                backdropFilter: 'blur(15px)',
                zIndex: 3600,
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
                    maxWidth: 860,
                    maxHeight: '92vh',
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
                    padding: '16px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(15,23,42,0.5)',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <i className="fa-solid fa-shield-halved" style={{ color: '#fff', fontSize: 16 }} />
                        </div>
                        <h5 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
                            Детали проверки
                        </h5>
                        {scan.is_old_scan && (
                            <span style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#94a3b8',
                                background: 'rgba(148,163,184,0.15)',
                                padding: '4px 10px',
                                borderRadius: 6
                            }}>
                                <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 4 }} />
                                Старая
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: 'rgba(239,68,68,0.15)', border: 'none',
                            color: '#f87171', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14
                        }}
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {/* Тело */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                    {/* Статус */}
                    <div style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 14,
                        padding: 20,
                        marginBottom: 24,
                        textAlign: 'center'
                    }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '12px 24px',
                            background: statusConfig.gradient,
                            borderRadius: 10,
                            color: '#fff',
                            fontSize: 16,
                            fontWeight: 700,
                            boxShadow: `0 8px 24px ${statusConfig.shadow}`,
                            marginBottom: 12
                        }}>
                            <i className={`fa-solid ${statusConfig.icon}`} />
                            {statusConfig.text}
                        </div>

                        {scan.is_infected && (
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '8px 16px',
                                background: 'rgba(239,68,68,0.15)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 8,
                                color: '#ef4444',
                                fontSize: 13,
                                fontWeight: 600,
                                marginLeft: 8
                            }}>
                                <i className="fa-solid fa-bug" />
                                Заражён
                            </div>
                        )}

                        {verdictConfig && (
                            <div style={{
                                marginTop: 12,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: 10
                            }}>
                                <span style={{ fontSize: 12, color: '#64748b' }}>Вердикт:</span>
                                <span style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: verdictConfig.color,
                                    background: verdictConfig.bg,
                                    border: `1px solid ${verdictConfig.border}`,
                                    padding: '4px 12px',
                                    borderRadius: 6
                                }}>
                                    {verdictConfig.text}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Основные метрики */}
                    <div style={infoGridStyle}>
                        <div style={infoItemStyle}>
                            <div style={labelStyle}>
                                <Tooltip text="Общее количество обнаруженных угроз">
                                    <i className="fa-solid fa-bug" /> Угроз
                                </Tooltip>
                            </div>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: 40,
                                padding: '8px 14px',
                                borderRadius: 8,
                                fontSize: 18,
                                fontWeight: 700,
                                background: scan.threat_count > 0
                                    ? 'rgba(239,68,68,0.15)'
                                    : 'rgba(34,197,94,0.15)',
                                color: scan.threat_count > 0 ? '#ef4444' : '#22c55e'
                            }}>
                                {scan.threat_count || 0}
                            </div>
                        </div>

                        <div style={infoItemStyle}>
                            <div style={labelStyle}>
                                <Tooltip text="Уровень уверенности антивируса (0-100%)">
                                    <i className="fa-solid fa-chart-line" /> Уверенность
                                </Tooltip>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    flex: 1, height: 8,
                                    background: 'rgba(0,0,0,0.3)',
                                    borderRadius: 4, overflow: 'hidden'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${scan.confidence || 0}%`,
                                        background: getConfidenceColor(scan.confidence),
                                        borderRadius: 4,
                                        transition: 'width 0.5s'
                                    }} />
                                </div>
                                <span style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: getConfidenceColor(scan.confidence),
                                    fontFamily: 'monospace',
                                    minWidth: 40
                                }}>
                                    {scan.confidence || 0}%
                                </span>
                            </div>
                        </div>

                        <div style={infoItemStyle}>
                            <div style={labelStyle}>
                                <Tooltip text="Время проверки файла">
                                    <i className="fa-solid fa-stopwatch" /> Время
                                </Tooltip>
                            </div>
                            <div style={valueStyle}>
                                {scan.scan_duration_ms ? `${(scan.scan_duration_ms / 1000).toFixed(2)} сек` : '—'}
                            </div>
                        </div>

                        <div style={infoItemStyle}>
                            <div style={labelStyle}>
                                <Tooltip text="Дата проверки">
                                    <i className="fa-regular fa-clock" /> Дата
                                </Tooltip>
                            </div>
                            <div style={valueStyle}>{formatDate(scan.scanned_at)}</div>
                        </div>

                        <div style={infoItemStyle}>
                            <div style={labelStyle}>
                                <Tooltip text="Антивирусный движок">
                                    <i className="fa-solid fa-microchip" /> Движок
                                </Tooltip>
                            </div>
                            <div style={valueStyle}>{scan.scan_engine || '—'}</div>
                        </div>

                        <div style={infoItemStyle}>
                            <div style={labelStyle}>
                                <Tooltip text="Версия антивирусного движка">
                                    <i className="fa-solid fa-tag" /> Версия
                                </Tooltip>
                            </div>
                            <div style={valueStyle}>{scan.scan_version || '—'}</div>
                        </div>
                    </div>

                    {/* Информация о файле */}
                    <div style={{ ...sectionStyle, marginTop: 24 }}>
                        <div style={sectionTitleStyle}>
                            <i className="fa-solid fa-file" style={{ color: '#6366f1' }} />
                            Информация о файле
                        </div>
                        <div style={infoGridStyle}>
                            {scan.file_name && (
                                <div style={infoItemStyle}>
                                    <div style={labelStyle}>Имя файла</div>
                                    <div style={{ ...valueStyle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                        title={scan.file_name}>
                                        {scan.file_name}
                                    </div>
                                </div>
                            )}
                            {scan.file_size && (
                                <div style={infoItemStyle}>
                                    <div style={labelStyle}>Размер</div>
                                    <div style={valueStyle}>{formatFileSize(scan.file_size)}</div>
                                </div>
                            )}
                            {scan.mimetype && (
                                <div style={infoItemStyle}>
                                    <div style={labelStyle}>MIME</div>
                                    <div style={codeStyle}>{scan.mimetype}</div>
                                </div>
                            )}
                            {scan.file_table && (
                                <div style={infoItemStyle}>
                                    <div style={labelStyle}>Таблица</div>
                                    <div style={valueStyle}>{scan.file_table}</div>
                                </div>
                            )}
                            {scan.file_id && (
                                <div style={infoItemStyle}>
                                    <div style={labelStyle}>ID файла</div>
                                    <div style={codeStyle}>{scan.file_id}</div>
                                </div>
                            )}
                            {scan.file_hash && (
                                <div style={{ ...infoItemStyle, gridColumn: '1 / -1' }}>
                                    <div style={labelStyle}>
                                        <Tooltip text="SHA-256 хеш файла">Хеш SHA256</Tooltip>
                                    </div>
                                    <div style={codeStyle}>{scan.file_hash}</div>
                                </div>
                            )}
                            {scan.file_path && (
                                <div style={{ ...infoItemStyle, gridColumn: '1 / -1' }}>
                                    <div style={labelStyle}>Путь</div>
                                    <div style={{ ...codeStyle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                        title={scan.file_path}>
                                        {scan.file_path}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Информация о модуле */}
                    {(scan.module || scan.record_id) && (
                        <div style={sectionStyle}>
                            <div style={sectionTitleStyle}>
                                <i className="fa-solid fa-cube" style={{ color: '#6366f1' }} />
                                Модуль
                            </div>
                            <div style={infoGridStyle}>
                                {scan.module && (
                                    <div style={infoItemStyle}>
                                        <div style={labelStyle}>Модуль</div>
                                        <div style={{ ...valueStyle, color: '#818cf8' }}>{scan.module}</div>
                                    </div>
                                )}
                                {scan.record_id && (
                                    <div style={infoItemStyle}>
                                        <div style={labelStyle}>ID записи</div>
                                        <div style={codeStyle}>{scan.record_id}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Детали проверки */}
                    {scan.scan_details && (
                        <div style={sectionStyle}>
                            <div style={sectionTitleStyle}>
                                <i className="fa-solid fa-circle-info" style={{ color: '#6366f1' }} />
                                Детали проверки
                            </div>
                            <div style={{
                                background: 'rgba(0,0,0,0.25)',
                                borderRadius: 10,
                                padding: 16,
                                border: '1px solid rgba(255,255,255,0.06)'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    marginBottom: 12
                                }}>
                                    <span style={{ fontSize: 13, color: '#94a3b8' }}>
                                        <i className="fa-solid fa-chart-simple" style={{ marginRight: 6 }} />
                                        Балл опасности:
                                    </span>
                                    {(() => {
                                        const scoreConf = getScoreConfig(scan.scan_details.score);
                                        return (
                                            <span style={{
                                                padding: '6px 14px',
                                                background: scoreConf.gradient,
                                                borderRadius: 8,
                                                color: '#fff',
                                                fontSize: 16,
                                                fontWeight: 700,
                                                fontFamily: 'monospace'
                                            }}>
                                                {scan.scan_details.score || 0}
                                            </span>
                                        );
                                    })()}
                                </div>

                                {scan.scan_details.timedOut && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '10px 14px',
                                        background: 'rgba(245,158,11,0.1)',
                                        border: '1px solid rgba(245,158,11,0.3)',
                                        borderRadius: 8,
                                        color: '#fbbf24',
                                        fontSize: 13,
                                        marginBottom: 12
                                    }}>
                                        <i className="fa-solid fa-clock" />
                                        Проверка превысила лимит времени
                                    </div>
                                )}

                                {scan.scan_details.explanations?.length > 0 && (
                                    <div style={{ marginBottom: 12 }}>
                                        <div style={{ ...labelStyle, marginBottom: 8 }}>
                                            <Tooltip text="Пояснения к оценке">Пояснения</Tooltip>
                                        </div>
                                        <ul style={{
                                            margin: 0,
                                            paddingLeft: 20,
                                            color: '#94a3b8',
                                            fontSize: 13,
                                            lineHeight: 1.6
                                        }}>
                                            {scan.scan_details.explanations.map((exp, i) => (
                                                <li key={i}>{exp}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {scan.scan_details.scoreBreakdown && Object.keys(scan.scan_details.scoreBreakdown).length > 0 && (
                                    <div>
                                        <div style={{ ...labelStyle, marginBottom: 8 }}>Разбивка баллов</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {Object.entries(scan.scan_details.scoreBreakdown).map(([key, value]) => (
                                                <div key={key} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    padding: '8px 12px',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    borderRadius: 6,
                                                    fontSize: 13
                                                }}>
                                                    <span style={{ color: '#64748b' }}>{key}:</span>
                                                    <span style={{ color: '#e2e8f0', fontWeight: 600, fontFamily: 'monospace' }}>{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Обнаруженные угрозы */}
                    {scan.threats?.length > 0 && (
                        <div style={sectionStyle}>
                            <div style={{ ...sectionTitleStyle, color: '#ef4444' }}>
                                <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444' }} />
                                Угрозы ({scan.threats.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {scan.threats.map((threat, idx) => {
                                    const sevConf = getSeverityConfig(threat.severity);
                                    return (
                                        <div key={idx} style={{
                                            background: 'rgba(239,68,68,0.05)',
                                            border: '1px solid rgba(239,68,68,0.2)',
                                            borderRadius: 10,
                                            padding: 16
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                marginBottom: 10,
                                                flexWrap: 'wrap'
                                            }}>
                                                <span style={{
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    color: sevConf.color,
                                                    background: sevConf.bg,
                                                    padding: '3px 10px',
                                                    borderRadius: 6
                                                }}>
                                                    {sevConf.text}
                                                </span>
                                                {threat.type && (
                                                    <span style={{
                                                        fontSize: 11,
                                                        fontWeight: 500,
                                                        color: '#818cf8',
                                                        background: 'rgba(99,102,241,0.1)',
                                                        padding: '3px 10px',
                                                        borderRadius: 6
                                                    }}>
                                                        {threat.type}
                                                    </span>
                                                )}
                                                <span style={{
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                    color: '#f87171'
                                                }}>
                                                    {threat.name || 'Неизвестная угроза'}
                                                </span>
                                            </div>

                                            {threat.description && (
                                                <p style={{
                                                    fontSize: 13,
                                                    color: '#94a3b8',
                                                    lineHeight: 1.6,
                                                    margin: '0 0 12px',
                                                    padding: '10px 12px',
                                                    background: 'rgba(0,0,0,0.2)',
                                                    borderRadius: 6
                                                }}>
                                                    {threat.description}
                                                </p>
                                            )}

                                            {threat.rule && (
                                                <div style={{ marginBottom: 8 }}>
                                                    <div style={labelStyle}>Правило обнаружения</div>
                                                    <div style={codeStyle}>{threat.rule}</div>
                                                </div>
                                            )}

                                            {threat.score > 0 && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ fontSize: 12, color: '#64748b' }}>Оценка:</span>
                                                    <div style={{
                                                        flex: 1, height: 6, maxWidth: 120,
                                                        background: 'rgba(0,0,0,0.3)',
                                                        borderRadius: 3, overflow: 'hidden'
                                                    }}>
                                                        <div style={{
                                                            height: '100%',
                                                            width: `${Math.min(threat.score, 100)}%`,
                                                            background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                                                            borderRadius: 3
                                                        }} />
                                                    </div>
                                                    <span style={{
                                                        fontSize: 13,
                                                        fontWeight: 700,
                                                        color: '#ef4444',
                                                        fontFamily: 'monospace'
                                                    }}>
                                                        {threat.score}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Сработавшие правила */}
                    {scan.triggered_rules?.length > 0 && (
                        <div style={sectionStyle}>
                            <div style={sectionTitleStyle}>
                                <i className="fa-solid fa-gavel" style={{ color: '#6366f1' }} />
                                Правила ({scan.triggered_rules.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {scan.triggered_rules.map((rule, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '10px 14px',
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: 8
                                    }}>
                                        <i className="fa-solid fa-gavel" style={{ color: '#64748b', fontSize: 11 }} />
                                        <code style={{ color: '#a5b4fc', fontSize: 12, fontFamily: 'monospace' }}>{rule}</code>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Цепочки */}
                    {scan.chains?.length > 0 && (
                        <div style={sectionStyle}>
                            <div style={sectionTitleStyle}>
                                <i className="fa-solid fa-link" style={{ color: '#f59e0b' }} />
                                Цепочки ({scan.chains.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {scan.chains.map((chain, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '10px 14px',
                                        background: 'rgba(245,158,11,0.05)',
                                        border: '1px solid rgba(245,158,11,0.2)',
                                        borderRadius: 8
                                    }}>
                                        <i className="fa-solid fa-link" style={{ color: '#f59e0b', fontSize: 11 }} />
                                        <code style={{ color: '#fbbf24', fontSize: 12, fontFamily: 'monospace' }}>{chain}</code>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Техническая информация */}
                    <div style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
                        <div style={sectionTitleStyle}>
                            <i className="fa-solid fa-database" style={{ color: '#6366f1' }} />
                            Техническая информация
                        </div>
                        <div style={infoGridStyle}>
                            <div style={infoItemStyle}>
                                <div style={labelStyle}>ID проверки</div>
                                <div style={codeStyle}>{scan.id || '—'}</div>
                            </div>
                            <div style={infoItemStyle}>
                                <div style={labelStyle}>
                                    <Tooltip text="Seed для воспроизводимости">Seed</Tooltip>
                                </div>
                                <div style={codeStyle}>{scan.scan_seed || '—'}</div>
                            </div>
                            <div style={infoItemStyle}>
                                <div style={labelStyle}>Создано в БД</div>
                                <div style={valueStyle}>{formatDate(scan.created_at)}</div>
                            </div>
                            {scan.current_scan_id && (
                                <div style={infoItemStyle}>
                                    <div style={labelStyle}>Текущая проверка</div>
                                    <div style={codeStyle}>{scan.current_scan_id}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Футер */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '16px 24px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(15,23,42,0.5)',
                    flexShrink: 0,
                    gap: 12
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '8px 20px',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#e2e8f0',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}
                    >
                        <i className="fa-solid fa-arrow-left" style={{ fontSize: 11 }} />
                        Назад
                    </button>
                    {onRescan && (
                        <button
                            type="button"
                            onClick={() => onRescan(scan)}
                            style={{
                                padding: '8px 20px',
                                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                                border: 'none',
                                color: '#fff',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontSize: 13,
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}
                        >
                            <i className="fa-solid fa-rotate" style={{ fontSize: 11 }} />
                            Проверить повторно
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

export default ScanResultDetail;