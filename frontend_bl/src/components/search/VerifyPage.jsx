import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getVerifyInfo } from '../../http/verifyAPI';

export default function VerifyPage() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(null);

    useEffect(() => {
        if (!token) { setError('Токен верификации не указан'); setLoading(false); return; }
        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await getVerifyInfo(token);
                setResult(data);
            } catch (err) {
                setError(err.message || 'Ошибка при проверке документа');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleString('ru-RU', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch { return dateStr; }
    };

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'found': return { icon: 'fa-magnifying-glass', color: '#f59e0b', label: 'Найдены записи' };
            case 'not_found': return { icon: 'fa-circle-check', color: '#10b981', label: 'Записей не найдено' };
            default: return { icon: 'fa-question', color: '#64748b', label: status };
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, background: '#0f1117'
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{
                    maxWidth: 720, width: '100%',
                    background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                    borderRadius: 20,
                    border: '1px solid rgba(99,102,241,0.2)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    overflow: 'hidden'
                }}
            >
                {/* Шапка */}
                <div style={{
                    padding: '24px 32px',
                    background: 'rgba(99,102,241,0.05)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 12px',
                        boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                    }}>
                        <i className="fa-solid fa-shield-halved" style={{ fontSize: 22, color: '#fff' }} />
                    </div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                        Проверка подлинности документа
                    </h1>
                    <p style={{ fontSize: 13, color: '#94a3b8', margin: '6px 0 0' }}>
                        Сверьте данные ниже с PDF-отчётом
                    </p>
                </div>

                <div style={{ padding: '32px' }}>
                    {/* Загрузка */}
                    {loading && (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                style={{
                                    width: 40, height: 40,
                                    border: '3px solid rgba(99,102,241,0.2)',
                                    borderTopColor: '#6366f1',
                                    borderRadius: '50%',
                                    margin: '0 auto 16px'
                                }}
                            />
                            <p style={{ color: '#94a3b8', fontSize: 14 }}>Проверяем документ...</p>
                        </div>
                    )}

                    {/* Ошибка */}
                    {error && !loading && (
                        <div style={{ textAlign: 'center', padding: 20 }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: '50%',
                                background: 'rgba(239,68,68,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px'
                            }}>
                                <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 28, color: '#ef4444' }} />
                            </div>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>Ошибка проверки</h2>
                            <p style={{ fontSize: 14, color: '#94a3b8' }}>{error}</p>
                        </div>
                    )}

                    {/* ❌ НЕ найден */}
                    {result && !result.valid && !loading && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: 72, height: 72, borderRadius: '50%',
                                background: 'rgba(239,68,68,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 20px'
                            }}>
                                <i className="fa-solid fa-circle-xmark" style={{ fontSize: 32, color: '#ef4444' }} />
                            </div>
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>
                                Документ не найден
                            </h2>
                            <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 24 }}>
                                Запись с данным идентификатором не найдена в системе.
                            </p>
                            <div style={{
                                padding: 16,
                                background: 'rgba(239,68,68,0.06)',
                                border: '1px solid rgba(239,68,68,0.2)',
                                borderRadius: 12,
                                textAlign: 'left',
                                marginBottom: 24
                            }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#fca5a5', marginBottom: 8 }}>
                                    Возможные причины:
                                </div>
                                <ul style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
                                    <li>Документ был подделан или изменён</li>
                                    <li>Ссылка введена с ошибкой</li>
                                    <li>Запись удалена по истечении срока хранения</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* СРОК ИСТЁК */}
                    {result && result.valid && result.data && result.data.expired && !loading && (
                        <div>
                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', damping: 12, delay: 0.2 }}
                                    style={{
                                        width: 72, height: 72, borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 16px',
                                        boxShadow: '0 8px 24px rgba(245,158,11,0.4)'
                                    }}
                                >
                                    <i className="fa-solid fa-clock" style={{ fontSize: 32, color: '#fff' }} />
                                </motion.div>
                                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
                                    Срок действия отчёта истёк
                                </h2>
                                <p style={{ fontSize: 13, color: '#94a3b8' }}>
                                    Этот отчёт больше не является действительным
                                </p>
                            </div>

                            {/* Информация о датах */}
                            <div style={{
                                padding: 20,
                                background: 'rgba(245,158,11,0.06)',
                                border: '1px solid rgba(245,158,11,0.2)',
                                borderRadius: 12,
                                marginBottom: 20
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                                        <span style={{ color: '#94a3b8' }}>
                                            <i className="fa-solid fa-calendar-plus" style={{ marginRight: 6, color: '#818cf8' }} />
                                            Дата генерации:
                                        </span>
                                        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                                            {formatDate(result.data.created_at)}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                                        <span style={{ color: '#94a3b8' }}>
                                            <i className="fa-solid fa-calendar-xmark" style={{ marginRight: 6, color: '#f59e0b' }} />
                                            Срок истёк:
                                        </span>
                                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                                            {formatDate(result.data.expires_at)}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                                        <span style={{ color: '#94a3b8' }}>
                                            <i className="fa-solid fa-eye" style={{ marginRight: 6, color: '#818cf8' }} />
                                            Всего просмотров:
                                        </span>
                                        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                                            {result.data.verify_count}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Предупреждение */}
                            <div style={{
                                padding: 16,
                                background: 'rgba(239,68,68,0.08)',
                                border: '1px solid rgba(239,68,68,0.25)',
                                borderRadius: 10,
                                marginBottom: 20
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#fca5a5', lineHeight: 1.7 }}>
                                    <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444', marginTop: 2, flexShrink: 0 }} />
                                    <div>
                                        <strong style={{ color: '#fecaca' }}>Проверка отклонена</strong>
                                        <br />
                                        Срок действия этого отчёта истёк. Данные для сверки недоступны —
                                        актуальность информации не гарантируется.
                                        <br /><br />
                                        <strong style={{ color: '#fecaca' }}>Требуется новая проверка.</strong>
                                        Обратитесь к лицу, предоставившему документ, с просьбой сгенерировать
                                        актуальный отчёт.
                                    </div>
                                </div>
                            </div>

                            {/* Что можно узнать */}
                            <div style={{
                                padding: 16,
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: 10,
                                marginBottom: 20
                            }}>
                                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', fontWeight: 600 }}>
                                    <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }} />
                                    Что можно подтвердить
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <i className="fa-solid fa-circle-check" style={{ color: '#10b981' }} />
                                        <span style={{ color: '#e2e8f0' }}>Отчёт действительно был сгенерирован в системе</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <i className="fa-solid fa-circle-check" style={{ color: '#10b981' }} />
                                        <span style={{ color: '#e2e8f0' }}>Тип проверки: <strong>{result.data.search_type_label}</strong></span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <i className="fa-solid fa-circle-check" style={{ color: '#10b981' }} />
                                        <span style={{ color: '#e2e8f0' }}>Инициатор: <strong>{result.data.requester_email_masked}</strong></span>
                                    </div>
                                </div>
                            </div>

                            {/* Идентификатор */}
                            <div style={{
                                padding: 10, background: 'rgba(0,0,0,0.3)',
                                borderRadius: 6, marginBottom: 20
                            }}>
                                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Идентификатор записи</div>
                                <code style={{ fontSize: 11, color: '#94a3b8', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                                    {result.data.id}
                                </code>
                            </div>

                            <button
                                onClick={() => navigate('/')}
                                style={{
                                    width: '100%', padding: '12px',
                                    background: 'rgba(99,102,241,0.1)',
                                    border: '1px solid rgba(99,102,241,0.3)',
                                    borderRadius: 10, color: '#a5b4fc',
                                    fontSize: 14, fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                <i className="fa-solid fa-house" style={{ marginRight: 6 }} />
                                На главную
                            </button>
                        </div>
                    )}

                    {/*  ПОДЛИННЫЙ */}
                    {result && result.valid && result.data && !result.data.expired && !loading && (
                        <div>
                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', damping: 12, delay: 0.2 }}
                                    style={{
                                        width: 72, height: 72, borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 16px',
                                        boxShadow: '0 8px 24px rgba(34,197,94,0.4)'
                                    }}
                                >
                                    <i className="fa-solid fa-check" style={{ fontSize: 32, color: '#fff' }} />
                                </motion.div>
                                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
                                    Документ подлинный
                                </h2>
                                <p style={{ fontSize: 13, color: '#94a3b8' }}>
                                    Проверка действительно проводилась • Просмотр #{result.data.verify_count}
                                </p>
                            </div>

                            {/* ВЕРИФИКАЦИОННЫЙ КОД — крупно */}
                            {result.data.verify_code && (
                                <div style={{
                                    padding: 20,
                                    background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(99,102,241,0.1))',
                                    border: '2px solid rgba(59,130,246,0.3)',
                                    borderRadius: 12,
                                    marginBottom: 20,
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>
                                        🔐 Сверьте код в PDF с этим кодом
                                    </div>
                                    <div style={{
                                        fontSize: 32, fontWeight: 800, color: '#60a5fa',
                                        letterSpacing: 4, fontFamily: 'monospace',
                                        marginBottom: 8
                                    }}>
                                        {result.data.verify_code}
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(result.data.verify_code, 'code')}
                                        style={{
                                            padding: '4px 12px',
                                            background: 'rgba(59,130,246,0.15)',
                                            border: '1px solid rgba(59,130,246,0.3)',
                                            borderRadius: 6,
                                            color: '#60a5fa',
                                            fontSize: 11,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {copied === 'code' ? '✓ Скопировано' : '📋 Копировать'}
                                    </button>
                                </div>
                            )}

                            {/* Данные для сверки */}
                            <div style={{
                                padding: 16,
                                background: 'rgba(250,204,21,0.06)',
                                border: '1px solid rgba(250,204,21,0.2)',
                                borderRadius: 10,
                                marginBottom: 20,
                                fontSize: 12,
                                color: '#fde68a',
                                lineHeight: 1.6
                            }}>
                                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6, color: '#fbbf24' }} />
                                <strong>Сравните значения ниже с вашим PDF-отчётом.</strong>
                                {' '}Если хоть одно значение отличается — документ был изменён и не является подлинным.
                            </div>

                            {result.data.display_data && (
                                <div style={{
                                    padding: 20,
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: 12,
                                    marginBottom: 20
                                }}>
                                    <div style={{
                                        fontSize: 12, color: '#94a3b8', marginBottom: 12,
                                        textTransform: 'uppercase', fontWeight: 600
                                    }}>
                                        <i className="fa-solid fa-table-cells" style={{ marginRight: 6 }} />
                                        Данные документа (сверьте с PDF)
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {result.data.search_type === 'person' && (
                                            <>
                                                <DataRow label="Рейтинг надёжности" value={`${result.data.display_data.reliability_score} / 100`} color="#60a5fa" />
                                                <DataRow label="Уровень риска" value={(result.data.display_data.risk_level || 'low').toUpperCase()} color="#fbbf24" />
                                                <DataRow label="Всего инцидентов" value={result.data.display_data.total_incidents} />
                                                <DataRow label="Как администрация ПВЗ" value={result.data.display_data.as_administration} color="#fb923c" />
                                                <DataRow label="Как сотрудник" value={result.data.display_data.as_employee} color="#a78bfa" />
                                                <DataRow label="Сумма штрафов" value={`-${result.data.display_data.total_violation_balls} баллов`} color="#f87171" />
                                                <DataRow label="ПВЗ в истории" value={result.data.display_data.pvz_count} />

                                                {result.data.display_data.names_masked?.length > 0 && (
                                                    <div>
                                                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>ФИО (маскированные)</div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                            {result.data.display_data.names_masked.map((n, i) => (
                                                                <span key={i} style={{
                                                                    padding: '3px 8px', background: 'rgba(99,102,241,0.1)',
                                                                    borderRadius: 4, fontSize: 12, color: '#c7d2fe'
                                                                }}>{n}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {result.data.display_data.positions?.length > 0 && (
                                                    <div>
                                                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Должности</div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                            {result.data.display_data.positions.map((p, i) => (
                                                                <span key={i} style={{
                                                                    padding: '3px 8px', background: 'rgba(251,146,60,0.1)',
                                                                    borderRadius: 4, fontSize: 12, color: '#fdba74'
                                                                }}>{p}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {result.data.display_data.first_incident_date && (
                                                    <DataRow label="Первый инцидент" value={formatDate(result.data.display_data.first_incident_date)} />
                                                )}
                                                {result.data.display_data.last_incident_date && (
                                                    <DataRow label="Последний инцидент" value={formatDate(result.data.display_data.last_incident_date)} />
                                                )}
                                            </>
                                        )}

                                        {result.data.search_type === 'pvz' && (
                                            <>
                                                <DataRow label="Адрес" value={result.data.display_data.address_masked} color="#60a5fa" />
                                                <DataRow label="Тип ПВЗ" value={result.data.display_data.type} />
                                                <DataRow label="Рейтинг надёжности" value={`${result.data.display_data.reliability_score} / 100`} color="#60a5fa" />
                                                <DataRow label="Уровень риска" value={(result.data.display_data.risk_level || 'low').toUpperCase()} color="#fbbf24" />
                                                <DataRow label="Всего инцидентов" value={result.data.display_data.total_incidents} />
                                                <DataRow label="Вина администрации" value={`${result.data.display_data.admin_fault_percent}%`} color="#fb923c" />
                                                <DataRow label="Вина сотрудников" value={`${result.data.display_data.employee_fault_percent}%`} color="#a78bfa" />
                                                <DataRow label="Сумма штрафов" value={`-${result.data.display_data.total_violation_balls} баллов`} color="#f87171" />
                                                <DataRow label="Персонал с нарушениями" value={result.data.display_data.personnel_count} />
                                                {result.data.display_data.last_incident_date && (
                                                    <DataRow label="Последний инцидент" value={formatDate(result.data.display_data.last_incident_date)} />
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Мета-данные */}
                            <div style={{
                                padding: 16,
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: 12,
                                marginBottom: 20
                            }}>
                                <div style={{
                                    fontSize: 12, color: '#94a3b8', marginBottom: 12,
                                    textTransform: 'uppercase', fontWeight: 600
                                }}>
                                    <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }} />
                                    Информация о проверке
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <DataRow label="Дата генерации" value={formatDate(result.data.created_at)} icon="fa-calendar" />
                                    <DataRow label="Тип отчёта" value={result.data.search_type_label} icon={result.data.search_type === 'person' ? 'fa-user-shield' : 'fa-store'} />
                                    <DataRow label="Результат поиска" value={result.data.result_status_label} icon="fa-magnifying-glass" />
                                    <DataRow label="Запросил" value={result.data.requester_email_masked} icon="fa-envelope" />
                                    <DataRow label="Просмотров" value={result.data.verify_count} icon="fa-eye" color="#fbbf24" />
                                </div>
                            </div>

                            {/* Хэш */}
                            {result.data.data_fingerprint && (
                                <div style={{
                                    padding: 12, background: 'rgba(0,0,0,0.3)',
                                    borderRadius: 8, marginBottom: 20
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                                            🔏 Хэш данных документа
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(result.data.data_fingerprint, 'hash')}
                                            style={{
                                                padding: '2px 8px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: 4,
                                                color: '#94a3b8',
                                                fontSize: 10,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {copied === 'hash' ? '✓ Скопировано' : '📋 Копировать'}
                                        </button>
                                    </div>
                                    <code style={{
                                        fontSize: 10, color: '#a5b4fc', wordBreak: 'break-all',
                                        fontFamily: 'monospace', lineHeight: 1.4
                                    }}>
                                        {result.data.data_fingerprint}
                                    </code>
                                </div>
                            )}

                            {/* Идентификатор */}
                            <div style={{
                                padding: 10, background: 'rgba(0,0,0,0.3)',
                                borderRadius: 6, marginBottom: 20
                            }}>
                                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Идентификатор записи</div>
                                <code style={{ fontSize: 11, color: '#94a3b8', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                                    {result.data.id}
                                </code>
                            </div>

                            {/* Предупреждение */}
                            <div style={{
                                padding: 14,
                                background: 'rgba(250,204,21,0.06)',
                                border: '1px solid rgba(250,204,21,0.2)',
                                borderRadius: 10,
                                marginBottom: 20
                            }}>
                                <div style={{ fontSize: 12, color: '#fde68a', lineHeight: 1.6 }}>
                                    <i className="fa-solid fa-circle-info" style={{ marginRight: 6, color: '#fbbf24' }} />
                                    Данная страница подтверждает факт проведения проверки и отображает ключевые данные отчёта.
                                    Сравните эти данные с вашим PDF — если они совпадают, документ подлинный.
                                </div>
                            </div>

                            <button
                                onClick={() => navigate('/')}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(99,102,241,0.1)',
                                    border: '1px solid rgba(99,102,241,0.3)',
                                    borderRadius: 10,
                                    color: '#a5b4fc',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                <i className="fa-solid fa-house" style={{ marginRight: 6 }} />
                                На главную
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

// Вспомогательный компонент для строки данных
function DataRow({ label, value, icon, color }) {
    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', gap: 12, fontSize: 13
        }}>
            <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                {icon && <i className={`fa-solid ${icon}`} style={{ width: 14, textAlign: 'center', color: '#6366f1' }} />}
                {label}
            </div>
            <div style={{ color: color || '#e2e8f0', fontWeight: 600, textAlign: 'right' }}>
                {value !== null && value !== undefined ? String(value) : '—'}
            </div>
        </div>
    );
}