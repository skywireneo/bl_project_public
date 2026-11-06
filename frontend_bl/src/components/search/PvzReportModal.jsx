import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Badge, Divider } from '../ui/UIComponents';

export default function PvzReportModal({ isOpen, onClose, pvz }) {
    const [activeSection, setActiveSection] = useState('overview');

    if (!pvz) return null;

    const stats = pvz.stats || {};
    const violations = pvz.violations || [];
    const personnel = pvz.personnel || [];
    const redFlags = pvz.red_flags || [];
    const fault = pvz.fault_distribution || {};
    const scoreCalc = pvz.score_calculation || {};
    const assessmentSummary = pvz.admin_assessment_summary || {};

    const getRiskColor = (level) => ({
        critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981'
    }[level] || '#64748b');

    const getRiskLabel = (level) => ({
        critical: 'Критический', high: 'Высокий', medium: 'Средний', low: 'Низкий'
    }[level] || 'Неизвестно');

    const getAssessmentColor = (type, value) => {
        if (!value) return '#6b7280';
        if (type === 'severity') {
            if (value === 'Критическая') return '#dc2626';
            if (value === 'Высокая') return '#ea580c';
            if (value === 'Средняя') return '#ca8a04';
            if (value === 'Низкая') return '#059669';
        }
        if (type === 'confidence') {
            if (value === 'Высокая') return '#059669';
            if (value === 'Средняя') return '#ca8a04';
            if (value === 'Низкая') return '#dc2626';
        }
        return '#6b7280';
    };

    const getAssessmentBg = (type, value) => {
        if (!value) return 'rgba(107,114,128,0.08)';
        if (type === 'severity') {
            if (value === 'Критическая') return 'rgba(220,38,38,0.1)';
            if (value === 'Высокая') return 'rgba(234,88,12,0.1)';
            if (value === 'Средняя') return 'rgba(202,138,4,0.1)';
            if (value === 'Низкая') return 'rgba(5,150,105,0.1)';
        }
        if (type === 'confidence') {
            if (value === 'Высокая') return 'rgba(5,150,105,0.1)';
            if (value === 'Средняя') return 'rgba(202,138,4,0.1)';
            if (value === 'Низкая') return 'rgba(220,38,38,0.1)';
        }
        return 'rgba(107,114,128,0.08)';
    };

    const getAssessmentBorder = (type, value) => {
        if (!value) return 'rgba(107,114,128,0.2)';
        if (type === 'severity') {
            if (value === 'Критическая') return 'rgba(220,38,38,0.3)';
            if (value === 'Высокая') return 'rgba(234,88,12,0.3)';
            if (value === 'Средняя') return 'rgba(202,138,4,0.3)';
            if (value === 'Низкая') return 'rgba(5,150,105,0.3)';
        }
        if (type === 'confidence') {
            if (value === 'Высокая') return 'rgba(5,150,105,0.3)';
            if (value === 'Средняя') return 'rgba(202,138,4,0.3)';
            if (value === 'Низкая') return 'rgba(220,38,38,0.3)';
        }
        return 'rgba(107,114,128,0.2)';
    };

    const getRiskExplanation = (level, score) => {
        switch (level) {
            case 'critical': return `Рейтинг ${score}/100 — очень низкий. Множество нарушений, в том числе серьёзных. Системные проблемы в работе пункта.`;
            case 'high': return `Рейтинг ${score}/100 — ниже среднего. Несколько зафиксированных нарушений. Стоит учитывать при выборе ПВЗ.`;
            case 'medium': return `Рейтинг ${score}/100 — средний. Отдельные инциденты, но не массовый характер.`;
            case 'low': return `Рейтинг ${score}/100 — хороший. Либо нарушений не было, либо они незначительные.`;
            default: return 'Недостаточно данных для оценки.';
        }
    };

    const getFaultExplanation = (adminPercent, employeePercent) => {
        if (adminPercent >= 50) return `Большинство нарушений (${adminPercent}%) по вине администрации. Серьёзный сигнал — проблемы в управлении.`;
        if (employeePercent >= 70) return `Почти все нарушения (${employeePercent}%) по вине сотрудников. Возможно, текучка или плохое обучение.`;
        return `Нарушения распределены между администрацией (${adminPercent}%) и сотрудниками (${employeePercent}%).`;
    };

    const formatDate = (d) => {
        if (!d) return '—';
        try { return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }); }
        catch { return d; }
    };

    const getPluralForm = (count, one, two, five) => {
        const n = Math.abs(count) % 100;
        const n1 = n % 10;
        if (n > 10 && n < 20) return five;
        if (n1 > 1 && n1 < 5) return two;
        if (n1 === 1) return one;
        return five;
    };

    const totalIncidents = stats.total_incidents || 0;
    const adminPercent = fault.administration?.percent || stats.admin_fault_percent || 0;
    const employeePercent = fault.employee?.percent || stats.employee_fault_percent || 0;
    const adminCount = stats.admin_fault_count || 0;
    const employeeCount = stats.employee_fault_count || 0;
    const totalBalls = Math.abs(scoreCalc.total_deductions || 0);
    const hasAssessment = assessmentSummary.max_severity || assessmentSummary.min_confidence;

    const sections = [
        { id: 'overview', label: 'Обзор', icon: 'fa-chart-simple' },
        { id: 'flags', label: 'Предупреждения', icon: 'fa-triangle-exclamation', badge: redFlags.length },
        { id: 'fault', label: 'Кто виноват', icon: 'fa-chart-pie' },
        { id: 'personnel', label: 'Персонал', icon: 'fa-users', badge: personnel.length },
        { id: 'history', label: 'Все нарушения', icon: 'fa-list', badge: violations.length },
        { id: 'calc', label: 'Расчёт рейтинга', icon: 'fa-calculator' },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25 }}
                        onClick={e => e.stopPropagation()}
                        style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', borderRadius: 20, maxWidth: 900, width: '100%', maxHeight: '90vh', overflow: 'auto', border: '1px solid rgba(245,158,11,0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
                    >
                        {/* Шапка */}
                        <div style={{ padding: '24px 28px', background: `linear-gradient(135deg, ${getRiskColor(pvz.risk_level)}20, ${getRiskColor(pvz.risk_level)}08)`, borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(10px)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{ width: 56, height: 56, borderRadius: 14, background: `linear-gradient(135deg, ${getRiskColor(pvz.risk_level)}, ${getRiskColor(pvz.risk_level)}dd)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${getRiskColor(pvz.risk_level)}40` }}>
                                        <i className="fa-solid fa-building" style={{ fontSize: 24, color: '#fff' }} />
                                    </div>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: 22, color: '#f1f5f9' }}>Подробный отчёт по ПВЗ</h2>
                                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>{pvz.type} • {pvz.address}</p>
                                    </div>
                                </div>
                                <button onClick={onClose} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#f87171', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="fa-solid fa-xmark" />
                                </button>
                            </div>
                            <div style={{ padding: 20, background: 'rgba(0,0,0,0.3)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                                <div>
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Рейтинг надёжности</div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                        <span style={{ fontSize: 48, fontWeight: 800, color: getRiskColor(pvz.risk_level), lineHeight: 1 }}>{pvz.reliability_score}</span>
                                        <span style={{ fontSize: 16, color: '#94a3b8' }}>/ 100</span>
                                    </div>
                                </div>
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{ fontSize: 12, color: '#94a3b8' }}>0 (плохо)</span>
                                        <span style={{ fontSize: 12, color: '#94a3b8' }}>100 (хорошо)</span>
                                    </div>
                                    <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${pvz.reliability_score}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} style={{ height: '100%', background: getRiskColor(pvz.risk_level) }} />
                                    </div>
                                    <div style={{ marginTop: 10 }}>
                                        <Badge variant={pvz.risk_level === 'low' ? 'success' : pvz.risk_level === 'medium' ? 'warning' : 'danger'}>Уровень риска: {getRiskLabel(pvz.risk_level)}</Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Навигация */}
                        <div style={{ display: 'flex', gap: 6, padding: '12px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto', flexWrap: 'wrap' }}>
                            {sections.map(s => (
                                <button key={s.id} onClick={() => setActiveSection(s.id)} style={{ padding: '8px 14px', background: activeSection === s.id ? 'rgba(245,158,11,0.15)' : 'transparent', border: activeSection === s.id ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent', borderRadius: 8, color: activeSection === s.id ? '#e2e8f0' : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                                    <i className={`fa-solid ${s.icon}`} style={{ fontSize: 11 }} />{s.label}
                                    {s.badge > 0 && <span style={{ padding: '1px 6px', borderRadius: 10, background: activeSection === s.id ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 10 }}>{s.badge}</span>}
                                </button>
                            ))}
                        </div>

                        <div style={{ padding: '24px 28px' }}>
                            {/* === СЕКЦИЯ: ОБЗОР === */}
                            {activeSection === 'overview' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <div style={{ padding: 18, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, marginBottom: 20 }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                            <i className="fa-solid fa-circle-info" style={{ color: '#fbbf24', fontSize: 18, marginTop: 2 }} />
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Что означает этот рейтинг?</div>
                                                <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.7 }}>{getRiskExplanation(pvz.risk_level, pvz.reliability_score)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ключевые цифры */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
                                        <div style={{ padding: 14, background: 'rgba(0,0,0,0.25)', borderRadius: 10, textAlign: 'center' }}>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: '#e2e8f0' }}>{totalIncidents}</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Инцидентов</div>
                                        </div>
                                        <div style={{ padding: 14, background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.15)', borderRadius: 10, textAlign: 'center' }}>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: '#fb923c' }}>{adminPercent}%</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Вина администрации</div>
                                        </div>
                                        <div style={{ padding: 14, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, textAlign: 'center' }}>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: '#a78bfa' }}>{employeePercent}%</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Вина сотрудников</div>
                                        </div>
                                        <div style={{ padding: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, textAlign: 'center' }}>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: '#f87171' }}>-{totalBalls}</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Сумма штрафов</div>
                                        </div>
                                        <div style={{ padding: 14, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, textAlign: 'center' }}>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: '#a5b4fc' }}>{personnel.length}</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Персонал с нарушениями</div>
                                        </div>
                                    </div>

                                    {/* ЭКСПЕРТНАЯ ОЦЕНКА МОДЕРАЦИИ */}
                                    {hasAssessment && (
                                        <div style={{ marginBottom: 20 }}>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <i className="fa-solid fa-gauge-high" style={{ color: '#818cf8' }} />
                                                Экспертная оценка модерации
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                                <div style={{ padding: 16, background: getAssessmentBg('severity', assessmentSummary.max_severity), border: `1px solid ${getAssessmentBorder('severity', assessmentSummary.max_severity)}`, borderRadius: 12, textAlign: 'center' }}>
                                                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
                                                        <i className="fa-solid fa-fire" style={{ marginRight: 4 }} /> Макс. серьёзность
                                                    </div>
                                                    <div style={{ fontSize: 20, fontWeight: 800, color: getAssessmentColor('severity', assessmentSummary.max_severity) }}>
                                                        {assessmentSummary.max_severity || '—'}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>Самая высокая из всех инцидентов</div>
                                                </div>
                                                <div style={{ padding: 16, background: getAssessmentBg('confidence', assessmentSummary.min_confidence), border: `1px solid ${getAssessmentBorder('confidence', assessmentSummary.min_confidence)}`, borderRadius: 12, textAlign: 'center' }}>
                                                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
                                                        <i className="fa-solid fa-shield-halved" style={{ marginRight: 4 }} /> Мин. уверенность
                                                    </div>
                                                    <div style={{ fontSize: 20, fontWeight: 800, color: getAssessmentColor('confidence', assessmentSummary.min_confidence) }}>
                                                        {assessmentSummary.min_confidence || '—'}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>Самая низкая из всех инцидентов</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Основная информация */}
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <i className="fa-solid fa-circle-info" style={{ color: '#818cf8' }} /> Основная информация
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                                        <div style={{ padding: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 8 }}>
                                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Адрес</div>
                                            <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{pvz.address}</div>
                                        </div>
                                        <div style={{ padding: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 8 }}>
                                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Статус адреса</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {pvz.is_verified ? (
                                                    <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><i className="fa-solid fa-circle-check" /> Подтверждён</span>
                                                ) : (
                                                    <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><i className="fa-solid fa-clock" /> Не проверен</span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ padding: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 8 }}>
                                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Тип ПВЗ</div>
                                            <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{pvz.type}</div>
                                        </div>
                                        <div style={{ padding: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 8 }}>
                                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Последний инцидент</div>
                                            <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{formatDate(stats.last_incident_date)}</div>
                                        </div>
                                        <div style={{ padding: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 8 }}>
                                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Штраф за тип ПВЗ</div>
                                            <div style={{ fontSize: 13, color: '#f87171', fontWeight: 600 }}>-{stats.type_ball || 0} баллов</div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* === СЕКЦИЯ: ПРЕДУПРЕЖДЕНИЯ === */}
                            {activeSection === 'flags' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    {redFlags.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: 40 }}>
                                            <i className="fa-solid fa-circle-check" style={{ fontSize: 48, color: '#10b981', marginBottom: 16 }} />
                                            <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Критических предупреждений нет</div>
                                            <div style={{ fontSize: 13, color: '#94a3b8' }}>Система не обнаружила тревожных сигналов для этого ПВЗ.</div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 }}>Система автоматически выявляет тревожные сигналы:</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {redFlags.map((flag, i) => (
                                                    <div key={i} style={{ padding: 18, background: `${flag.color}10`, border: `1px solid ${flag.color}30`, borderLeft: `4px solid ${flag.color}`, borderRadius: 10 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${flag.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <i className={`fa-solid ${flag.icon}`} style={{ color: flag.color, fontSize: 16 }} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: 15, fontWeight: 700, color: flag.color }}>{flag.title}</div>
                                                                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Серьёзность: {flag.severity === 'critical' ? 'Критическая' : flag.severity === 'high' ? 'Высокая' : 'Средняя'}</div>
                                                            </div>
                                                        </div>
                                                        <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, paddingLeft: 48 }}>{flag.description}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}

                            {/* === СЕКЦИЯ: КТО ВИНОВАТ === */}
                            {activeSection === 'fault' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 }}>
                                        Важно понимать, <strong style={{ color: '#cbd5e1' }}>по чьей вине</strong> происходят нарушения.
                                    </div>
                                    {totalIncidents === 0 ? (
                                        <div style={{ textAlign: 'center', padding: 40 }}>
                                            <i className="fa-solid fa-circle-check" style={{ fontSize: 48, color: '#10b981', marginBottom: 16 }} />
                                            <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Инцидентов не зафиксировано</div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                                <div style={{ padding: 20, background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 12, textAlign: 'center' }}>
                                                    <i className="fa-solid fa-crown" style={{ color: '#fb923c', fontSize: 28, marginBottom: 8 }} />
                                                    <div style={{ fontSize: 36, fontWeight: 800, color: '#fb923c' }}>{adminPercent}%</div>
                                                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.4 }}>Вина администрации<br /><strong style={{ color: '#fb923c' }}>{adminCount} инцидентов</strong></div>
                                                </div>
                                                <div style={{ padding: 20, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, textAlign: 'center' }}>
                                                    <i className="fa-solid fa-user" style={{ color: '#a78bfa', fontSize: 28, marginBottom: 8 }} />
                                                    <div style={{ fontSize: 36, fontWeight: 800, color: '#a78bfa' }}>{employeePercent}%</div>
                                                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.4 }}>Вина сотрудников<br /><strong style={{ color: '#a78bfa' }}>{employeeCount} инцидентов</strong></div>
                                                </div>
                                            </div>
                                            <div style={{ padding: 14, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>
                                                <i className="fa-solid fa-lightbulb" style={{ color: '#fbbf24', marginRight: 6 }} />{getFaultExplanation(adminPercent, employeePercent)}
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}

                            {/* === СЕКЦИЯ: ПЕРСОНАЛ === */}
                            {activeSection === 'personnel' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    {personnel.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: 40 }}>
                                            <i className="fa-solid fa-users-slash" style={{ fontSize: 48, color: '#64748b', marginBottom: 16 }} />
                                            <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Персонал с нарушениями не найден</div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>Список людей с нарушениями на этом ПВЗ.</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {personnel.map((p, i) => (
                                                    <div key={i} style={{ padding: 14, background: 'rgba(0,0,0,0.25)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                                            <div>
                                                                <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{p.post_name}</div>
                                                                <div style={{ fontSize: 12, color: '#94a3b8' }}>{p.incident_count} инцидентов • Последний: {formatDate(p.last_incident_date)}</div>
                                                            </div>
                                                            <Badge variant={p.role === 'administration' ? 'warning' : 'info'} icon={p.role === 'administration' ? 'fa-crown' : 'fa-user'}>
                                                                {p.role === 'administration' ? 'Руководитель' : 'Сотрудник'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}

                            {/* === СЕКЦИЯ: ВСЕ НАРУШЕНИЯ === */}
                            {activeSection === 'history' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    {violations.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: 40 }}>
                                            <i className="fa-solid fa-circle-check" style={{ fontSize: 48, color: '#10b981', marginBottom: 16 }} />
                                            <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Нарушений не зафиксировано</div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>Полный список зафиксированных нарушений.</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {violations.map((v, i) => (
                                                    <div key={i} style={{ padding: 14, background: 'rgba(0,0,0,0.25)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <code style={{ fontSize: 11, color: '#64748b', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 4 }}>#{v.incident_id}</code>
                                                                <span style={{ fontSize: 12, color: '#94a3b8' }}>{formatDate(v.date)}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                                <Badge variant={v.is_admin_fault ? 'warning' : 'info'} size="sm" icon={v.is_admin_fault ? 'fa-crown' : 'fa-user'}>{v.is_admin_fault ? 'Администрация' : 'Сотрудник'}</Badge>
                                                                {v.total_ball > 0 && <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 700 }}>-{v.total_ball}</span>}
                                                            </div>
                                                        </div>
                                                        <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{v.reason}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}

                            {/* === СЕКЦИЯ: РАСЧЁТ РЕЙТИНГА === */}
                            {activeSection === 'calc' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 }}>
                                        Рейтинг: из <strong style={{ color: '#e2e8f0' }}>100</strong> вычитаются штрафы за тип ПВЗ и каждый инцидент.
                                    </div>
                                    <div style={{ padding: 16, background: 'rgba(0,0,0,0.25)', borderRadius: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12 }}>
                                            <span style={{ color: '#94a3b8' }}><i className="fa-solid fa-plus-circle" style={{ marginRight: 6, color: '#10b981' }} />Начальный балл</span>
                                            <span style={{ color: '#10b981', fontWeight: 700 }}>+{scoreCalc.base_score || 100}</span>
                                        </div>
                                        {(scoreCalc.deductions || []).map((ded, i) => (
                                            <div key={i} style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 12 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <span style={{ color: '#94a3b8' }}><i className="fa-solid fa-minus-circle" style={{ marginRight: 6, color: '#f87171' }} />{ded.description || (ded.incident_id ? `Инцидент #${ded.incident_id}` : ded.type)}</span>
                                                    <span style={{ color: '#f87171', fontWeight: 700 }}>{ded.deduction}</span>
                                                </div>
                                                {ded.reason && <div style={{ paddingLeft: 20, fontSize: 11, color: '#64748b' }}>Причина: {ded.reason}{ded.date && <span style={{ marginLeft: 8 }}>({formatDate(ded.date)})</span>}</div>}
                                            </div>
                                        ))}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, paddingTop: 12, borderTop: '2px solid rgba(255,255,255,0.1)', marginTop: 8 }}>
                                            <span style={{ color: '#e2e8f0', fontWeight: 700 }}>Итоговый рейтинг</span>
                                            <span style={{ color: getRiskColor(pvz.risk_level), fontWeight: 700 }}>{scoreCalc.final_score || pvz.reliability_score} / 100</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <Divider />
                            <div style={{ padding: 18, background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 12, marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <i className="fa-solid fa-scale-balanced" style={{ color: '#fbbf24', fontSize: 18, marginTop: 2 }} />
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fde68a', marginBottom: 8 }}>Важная информация</div>
                                        <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.7 }}>
                                            Данные носят <strong style={{ color: '#fde68a' }}>справочный характер</strong> и <strong>не являются</strong> основанием для отказа в сотрудничестве.
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <Button variant="secondary" fullWidth icon="fa-solid fa-xmark" onClick={onClose}>Закрыть отчёт</Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}