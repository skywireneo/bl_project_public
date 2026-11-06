import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const AUTO_CLOSE_TIMEOUT = 0; // 30 секунд

function ErrorModal({ error, onClose }) {
    const timerRef = useRef(null);
    const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE_TIMEOUT);
    const intervalRef = useRef(null);
    const [isTimerActive, setIsTimerActive] = useState(true);

    useEffect(() => {
        if (!error) return;

        if (AUTO_CLOSE_TIMEOUT && AUTO_CLOSE_TIMEOUT > 0 && isTimerActive) {
            intervalRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    const newTime = prev - 100;
                    return newTime < 0 ? 0 : newTime;
                });
            }, 100);

            timerRef.current = setTimeout(() => {
                onClose();
            }, AUTO_CLOSE_TIMEOUT);

            return () => {
                if (timerRef.current) clearTimeout(timerRef.current);
                if (intervalRef.current) clearInterval(intervalRef.current);
            };
        }
    }, [onClose, error, isTimerActive]);

    const handleUserInteraction = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsTimerActive(false);
        setTimeLeft(0);
    };

    if (!error) return null;

    const {
        code,
        serviceCode,
        message,
        errors = [],
        timestamp,
        path,
        method,
        context,
        stack = [],
        additionalData,
        request
    } = error;

    const formatTimestamp = (ts) => {
        if (!ts) return '';
        try {
            return new Date(ts).toLocaleString('ru-RU');
        } catch {
            return ts;
        }
    };

    const styles = {
        overlay: {
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
        },
        content: {
            background: '#1a1d2e',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            maxWidth: 900,
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            color: '#e2e8f0'
        },
        header: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid rgba(239,68,68,0.2)',
            background: 'rgba(239,68,68,0.05)',
            position: 'relative'
        },
        title: {
            margin: 0,
            fontSize: 17,
            fontWeight: 700,
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            gap: 10
        },
        closeButton: {
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: 4,
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            transition: 'color 0.2s'
        },
        body: {
            padding: 24,
            overflowY: 'auto',
            flex: 1,
            background: '#1a1d2e'
        },
        section: {
            marginBottom: 24
        },
        sectionTitle: {
            fontSize: 12,
            fontWeight: 600,
            color: '#94a3b8',
            margin: '0 0 12px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        },
        row: {
            display: 'flex',
            padding: '10px 0',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            gap: 16
        },
        label: {
            fontWeight: 500,
            color: '#64748b',
            minWidth: 160,
            flexShrink: 0,
            fontSize: 13
        },
        value: {
            color: '#e2e8f0',
            wordBreak: 'break-word',
            flex: 1,
            fontSize: 13
        },
        valueDanger: {
            color: '#f87171',
            fontWeight: 600
        },
        valueSmall: {
            fontSize: 12,
            color: '#94a3b8'
        },
        code: {
            backgroundColor: 'rgba(0,0,0,0.3)',
            color: '#f87171',
            padding: '4px 8px',
            borderRadius: 6,
            fontFamily: "'Courier New', monospace",
            fontSize: 12,
            fontWeight: 600
        },
        codeInline: {
            backgroundColor: 'rgba(255,255,255,0.06)',
            color: '#e2e8f0',
            padding: '2px 6px',
            borderRadius: 4,
            fontFamily: "'Courier New', monospace",
            fontSize: 12
        },
        badge: {
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'rgba(59,130,246,0.15)',
            color: '#60a5fa',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'uppercase'
        },
        validationList: {
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8
        },
        validationItem: {
            backgroundColor: 'rgba(239,68,68,0.05)',
            borderLeft: '3px solid #ef4444',
            padding: '12px 16px',
            borderRadius: 8,
            color: '#e2e8f0',
            fontSize: 13
        },
        field: {
            color: '#f87171',
            fontWeight: 600
        },
        stack: {
            backgroundColor: '#0f1117',
            color: '#cbd5e1',
            padding: 16,
            borderRadius: 10,
            fontFamily: "'Courier New', monospace",
            fontSize: 12,
            border: '1px solid rgba(255,255,255,0.06)',
            maxHeight: 300,
            overflowY: 'auto'
        },
        stackLine: {
            padding: '2px 0',
            wordBreak: 'break-all'
        },
        footer: {
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
            padding: '16px 24px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            backgroundColor: 'rgba(0,0,0,0.2)'
        },
        button: {
            padding: '10px 20px',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontFamily: 'inherit'
        },
        buttonPrimary: {
            background: 'linear-gradient(135deg,#ef4444,#dc2626)',
            color: '#fff'
        },
        buttonSecondary: {
            background: 'rgba(255,255,255,0.06)',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.1)'
        },
        progressBar: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: 3,
            backgroundColor: '#ef4444',
            transition: 'width 0.1s linear',
            boxShadow: '0 0 10px rgba(239,68,68,0.5)'
        },
        autoCloseInfo: {
            fontSize: 12,
            color: '#94a3b8',
            marginLeft: 12,
            fontWeight: 400
        }
    };

    return (
        <>
            <style>
                {`
                    .error-modal-body::-webkit-scrollbar,
                    .error-stack-container::-webkit-scrollbar {
                        width: 6px;
                    }
                    .error-modal-body::-webkit-scrollbar-track,
                    .error-stack-container::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .error-modal-body::-webkit-scrollbar-thumb,
                    .error-stack-container::-webkit-scrollbar-thumb {
                        background: rgba(255,255,255,0.1);
                        border-radius: 3px;
                    }
                    .error-modal-body::-webkit-scrollbar-thumb:hover,
                    .error-stack-container::-webkit-scrollbar-thumb:hover {
                        background: rgba(255,255,255,0.2);
                    }
                    .error-modal-close-btn:hover {
                        color: #f1f5f9 !important;
                    }
                    .error-modal-btn-primary:hover {
                        filter: brightness(1.1);
                    }
                    .error-modal-btn-secondary:hover {
                        background: rgba(255,255,255,0.1) !important;
                    }
                    @media (max-width: 768px) {
                        .error-modal-content-responsive {
                            max-width: 95% !important;
                        }
                        .error-modal-header-responsive,
                        .error-modal-body-responsive,
                        .error-modal-footer-responsive {
                            padding: 16px !important;
                        }
                        .error-label-responsive {
                            min-width: 120px !important;
                            font-size: 12px !important;
                        }
                        .error-row-responsive {
                            flex-direction: column !important;
                            gap: 4px !important;
                        }
                        .error-modal-footer-responsive {
                            flex-direction: column !important;
                        }
                        .error-modal-btn-responsive {
                            width: 100% !important;
                        }
                    }
                `}
            </style>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={styles.overlay}
                onClick={onClose}
            >
                <motion.div
                    className="error-modal-content-responsive"
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ duration: 0.2 }}
                    style={styles.content}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleUserInteraction();
                    }}
                    onMouseMove={handleUserInteraction}
                    onKeyDown={handleUserInteraction}
                >
                    <div className="error-modal-header-responsive" style={styles.header}>
                        <h5 style={styles.title}>
                            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 20, color: '#ef4444' }} />
                            Детали ошибки
                            {AUTO_CLOSE_TIMEOUT > 0 && timeLeft > 0 && isTimerActive && (
                                <span style={styles.autoCloseInfo}>
                                    (закроется через {Math.ceil(timeLeft / 1000)}с)
                                </span>
                            )}
                        </h5>
                        <button
                            type="button"
                            className="error-modal-close-btn"
                            style={styles.closeButton}
                            onClick={onClose}
                            aria-label="Close"
                        >
                            <i className="fa-solid fa-xmark" />
                        </button>
                        {AUTO_CLOSE_TIMEOUT > 0 && timeLeft > 0 && isTimerActive && (
                            <div
                                style={{
                                    ...styles.progressBar,
                                    width: `${(timeLeft / AUTO_CLOSE_TIMEOUT) * 100}%`
                                }}
                            />
                        )}
                    </div>

                    <div className="error-modal-body error-modal-body-responsive" style={styles.body}>
                        <div style={styles.section}>
                            <div className="error-row-responsive" style={styles.row}>
                                <span className="error-label-responsive" style={styles.label}>Сообщение:</span>
                                <span style={{ ...styles.value, ...styles.valueDanger }}>
                                    {message || 'Неизвестная ошибка'}
                                </span>
                            </div>

                            {code && (
                                <div className="error-row-responsive" style={styles.row}>
                                    <span className="error-label-responsive" style={styles.label}>Код ошибки:</span>
                                    <span style={styles.value}>
                                        <code style={styles.code}>{code}</code>
                                    </span>
                                </div>
                            )}

                            {serviceCode && (
                                <div className="error-row-responsive" style={styles.row}>
                                    <span className="error-label-responsive" style={styles.label}>Код сервиса:</span>
                                    <span style={styles.value}>
                                        <code style={styles.code}>{serviceCode}</code>
                                    </span>
                                </div>
                            )}
                        </div>

                        {errors.length > 0 && (
                            <div style={styles.section}>
                                <h6 style={styles.sectionTitle}>Ошибки валидации:</h6>
                                <ul style={styles.validationList}>
                                    {errors.map((err, idx) => (
                                        <li key={idx} style={styles.validationItem}>
                                            {err.field && (
                                                <strong style={styles.field}>{err.field}:</strong>
                                            )}
                                            {' '}
                                            <span>{err.message}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {(path || method || timestamp) && (
                            <div style={styles.section}>
                                <h6 style={styles.sectionTitle}>Контекст запроса:</h6>
                                {path && (
                                    <div className="error-row-responsive" style={styles.row}>
                                        <span className="error-label-responsive" style={styles.label}>Путь:</span>
                                        <span style={styles.value}>
                                            <code style={styles.codeInline}>{path}</code>
                                        </span>
                                    </div>
                                )}
                                {method && (
                                    <div className="error-row-responsive" style={styles.row}>
                                        <span className="error-label-responsive" style={styles.label}>Метод:</span>
                                        <span style={styles.value}>
                                            <span style={styles.badge}>{method}</span>
                                        </span>
                                    </div>
                                )}
                                {timestamp && (
                                    <div className="error-row-responsive" style={styles.row}>
                                        <span className="error-label-responsive" style={styles.label}>Время:</span>
                                        <span style={styles.value}>{formatTimestamp(timestamp)}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {context && (context.userAgent || context.ip) && (
                            <div style={styles.section}>
                                <h6 style={styles.sectionTitle}>Информация о клиенте:</h6>
                                {context.ip && (
                                    <div className="error-row-responsive" style={styles.row}>
                                        <span className="error-label-responsive" style={styles.label}>IP:</span>
                                        <span style={styles.value}>
                                            <code style={styles.codeInline}>{context.ip}</code>
                                        </span>
                                    </div>
                                )}
                                {context.userAgent && (
                                    <div className="error-row-responsive" style={styles.row}>
                                        <span className="error-label-responsive" style={styles.label}>User Agent:</span>
                                        <span style={{ ...styles.value, ...styles.valueSmall }}>
                                            {context.userAgent}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {additionalData && Object.keys(additionalData).length > 0 && (
                            <div style={styles.section}>
                                <h6 style={styles.sectionTitle}>Дополнительная информация:</h6>
                                {Object.entries(additionalData).map(([key, value]) => (
                                    <div key={key} className="error-row-responsive" style={styles.row}>
                                        <span className="error-label-responsive" style={styles.label}>{key}:</span>
                                        <span style={styles.value}>
                                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {request && (
                            <div style={styles.section}>
                                <h6 style={styles.sectionTitle}>📋 Детали запроса (Admin):</h6>

                                {request.url && (
                                    <div className="error-row-responsive" style={styles.row}>
                                        <span className="error-label-responsive" style={styles.label}>URL:</span>
                                        <span style={styles.value}>
                                            <code style={styles.codeInline}>{request.url}</code>
                                        </span>
                                    </div>
                                )}

                                {request.method && (
                                    <div className="error-row-responsive" style={styles.row}>
                                        <span className="error-label-responsive" style={styles.label}>HTTP метод:</span>
                                        <span style={styles.value}>
                                            <span style={styles.badge}>{request.method}</span>
                                        </span>
                                    </div>
                                )}

                                {request.headers && Object.keys(request.headers).length > 0 && (
                                    <div style={{ marginTop: 16 }}>
                                        <div className="error-row-responsive" style={{ ...styles.row, borderBottom: 'none' }}>
                                            <span className="error-label-responsive" style={styles.label}>Headers:</span>
                                        </div>
                                        <div className="error-stack-container" style={{ ...styles.stack, maxHeight: 200, marginTop: 8 }}>
                                            {Object.entries(request.headers).map(([key, value]) => (
                                                <div key={key} style={styles.stackLine}>
                                                    <strong style={{ color: '#60a5fa' }}>{key}:</strong> {String(value)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {request.query && Object.keys(request.query).length > 0 && (
                                    <div style={{ marginTop: 16 }}>
                                        <div className="error-row-responsive" style={{ ...styles.row, borderBottom: 'none' }}>
                                            <span className="error-label-responsive" style={styles.label}>Query параметры:</span>
                                        </div>
                                        <div className="error-stack-container" style={{ ...styles.stack, maxHeight: 150, marginTop: 8 }}>
                                            {Object.entries(request.query).map(([key, value]) => (
                                                <div key={key} style={styles.stackLine}>
                                                    <strong style={{ color: '#60a5fa' }}>{key}:</strong> {String(value)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {request.body && (
                                    <div style={{ marginTop: 16 }}>
                                        <div className="error-row-responsive" style={{ ...styles.row, borderBottom: 'none' }}>
                                            <span className="error-label-responsive" style={styles.label}>Request Body:</span>
                                        </div>
                                        <div className="error-stack-container" style={{ ...styles.stack, maxHeight: 250, marginTop: 8 }}>
                                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                                                {typeof request.body === 'object'
                                                    ? JSON.stringify(request.body, null, 2)
                                                    : String(request.body)
                                                }
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                {request.response && (
                                    <div style={{ marginTop: 16 }}>
                                        <div className="error-row-responsive" style={{ ...styles.row, borderBottom: 'none' }}>
                                            <span className="error-label-responsive" style={styles.label}>Response Body:</span>
                                        </div>
                                        <div className="error-stack-container" style={{ ...styles.stack, maxHeight: 250, marginTop: 8 }}>
                                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                                                {typeof request.response === 'object'
                                                    ? JSON.stringify(request.response, null, 2)
                                                    : String(request.response)
                                                }
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                {request.statusCode && (
                                    <div className="error-row-responsive" style={{ ...styles.row, marginTop: 16 }}>
                                        <span className="error-label-responsive" style={styles.label}>Status Code:</span>
                                        <span style={styles.value}>
                                            <code style={{
                                                ...styles.code,
                                                backgroundColor: request.statusCode >= 500 ? 'rgba(239,68,68,0.15)' :
                                                    request.statusCode >= 400 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                                                color: request.statusCode >= 500 ? '#f87171' :
                                                    request.statusCode >= 400 ? '#fbbf24' : '#34d399'
                                            }}>
                                                {request.statusCode}
                                            </code>
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {stack.length > 0 && (
                            <div style={styles.section}>
                                <h6 style={styles.sectionTitle}>Stack Trace:</h6>
                                <div className="error-stack-container" style={styles.stack}>
                                    {stack.map((line, idx) => (
                                        <div key={idx} style={styles.stackLine}>
                                            {line}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="error-modal-footer-responsive" style={styles.footer}>
                        <button
                            type="button"
                            className="error-modal-btn-secondary error-modal-btn-responsive"
                            style={{ ...styles.button, ...styles.buttonSecondary }}
                            onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(error, null, 2));
                            }}
                        >
                            <i className="fa-solid fa-copy" /> Копировать JSON
                        </button>
                        <button
                            type="button"
                            className="error-modal-btn-primary error-modal-btn-responsive"
                            style={{ ...styles.button, ...styles.buttonPrimary }}
                            onClick={onClose}
                        >
                            Закрыть
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </>
    );
}

export default ErrorModal;