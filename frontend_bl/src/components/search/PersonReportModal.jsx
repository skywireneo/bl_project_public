import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Badge, Divider } from '../ui/UIComponents';

export default function PersonReportModal({ isOpen, onClose, group }) {
    const [activeSection, setActiveSection] = useState('overview');

    if (!group) return null;

    const roleAnalysis = group.role_analysis || { as_administration: [], as_employee: [], stats: {} };
    const redFlags = group.red_flags || [];
    const trends = group.trends;
    const pvzHistory = group.pvz_history || [];
    const positions = group.positions || [];
    const birthDates = group.birth_dates || [];
    const persons = group.persons || [];
    const scoreCalc = group.score_calculation || {};
    const stats = group.stats || {};
    const allIncidents = group.incidents || [];
    const assessmentSummary = group.admin_assessment_summary || {};

    // Сбор всех данных из персон
    const allNames = [], allPhones = [], allTg = [];
    persons.forEach(p => {
        (p.data?.names || []).forEach(n => { if (n?.name && !allNames.includes(n.name)) allNames.push(n.name); });
        (p.data?.phones || []).forEach(ph => { if (ph?.phone && !allPhones.includes(ph.phone)) allPhones.push(ph.phone); });
        (p.data?.tg_accounts || []).forEach(tg => { if (tg?.username && !allTg.find(t => t.username === tg.username)) allTg.push(tg); });
    });

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
            case 'critical':
                return `Рейтинг ${score}/100 указывает на серьёзные проблемы. Человек был замечен в множестве подтверждённых нарушений, в том числе в роли руководителя ПВЗ. Рекомендуется повышенное внимание при взаимодействии.`;
            case 'high':
                return `Рейтинг ${score}/100 говорит о том, что у человека есть зафиксированные нарушения. Стоит быть внимательнее при сотрудничестве и проверять информацию дополнительно.`;
            case 'medium':
                return `Рейтинг ${score}/100 — средний показатель. Есть некоторые инциденты в истории, но они не носят системного характера.`;
            case 'low':
                return `Рейтинг ${score}/100 — хороший показатель. Либо инцидентов не было, либо они единичные и незначительные.`;
            default:
                return 'Недостаточно данных для оценки.';
        }
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

    const totalIncidents = (roleAnalysis.stats?.admin_count || 0) + (roleAnalysis.stats?.employee_count || 0);
    const adminCount = roleAnalysis.stats?.admin_count || 0;
    const employeeCount = roleAnalysis.stats?.employee_count || 0;
    const totalBalls = Math.abs(scoreCalc.total_deductions || 0);
    const hasAssessment = assessmentSummary.max_severity || assessmentSummary.min_confidence;

    const sections = [
        { id: 'overview', label: 'Обзор', icon: 'fa-chart-simple' },
        { id: 'flags', label: 'Предупреждения', icon: 'fa-triangle-exclamation', badge: redFlags.length },
        { id: 'roles', label: 'Нарушения по ролям', icon: 'fa-users-gear', badge: totalIncidents },
        { id: 'history', label: 'Все инциденты', icon: 'fa-list', badge: allIncidents.length },
        { id: 'pvz', label: 'Места работы', icon: 'fa-location-dot', badge: pvzHistory.length },
        { id: 'trends', label: 'Динамика', icon: 'fa-chart-line' },
        { id: 'calc', label: 'Расчёт рейтинга', icon: 'fa-calculator' },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(10px)',
                        zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 20, overflowY: 'auto'
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25 }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                            borderRadius: 20,
                            maxWidth: 900, width: '100%', maxHeight: '90vh',
                            overflow: 'auto',
                            border: '1px solid rgba(99,102,241,0.2)',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                        }}
                    >
                        {/* Шапка */}
                        <div style={{
                            padding: '24px 28px',
                            background: `linear-gradient(135deg, ${getRiskColor(group.risk_level)}20, ${getRiskColor(group.risk_level)}08)`,
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            position: 'sticky', top: 0, zIndex: 10,
                            backdropFilter: 'blur(10px)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{
                                        width: 56, height: 56, borderRadius: 14,
                                        background: `linear-gradient(135deg, ${getRiskColor(group.risk_level)}, ${getRiskColor(group.risk_level)}dd)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: `0 4px 14px ${getRiskColor(group.risk_level)}40`
                                    }}>
                                        <i className="fa-solid fa-user" style={{ fontSize: 24, color: '#fff' }} />
                                    </div>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: 22, color: '#f1f5f9' }}>Подробный отчёт</h2>
                                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
                                            Человек #{group.group_id} • {totalIncidents} {getPluralForm(totalIncidents, 'инцидент', 'инцидента', 'инцидентов')}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={onClose} style={{
                                    background: 'rgba(239,68,68,0.15)', border: 'none', color: '#f87171',
                                    borderRadius: 8, width: 36, height: 36, cursor: 'pointer', fontSize: 16,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <i className="fa-solid fa-xmark" />
                                </button>
                            </div>
                            {/* Рейтинг */}
                            <div style={{
                                padding: 20, background: 'rgba(0,0,0,0.3)', borderRadius: 14,
                                display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap'
                            }}>
                                <div>
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>
                                        Рейтинг надёжности
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                        <span style={{ fontSize: 48, fontWeight: 800, color: getRiskColor(group.risk_level), lineHeight: 1 }}>
                                            {group.reliability_score}
                                        </span>
                                        <span style={{ fontSize: 16, color: '#94a3b8' }}>/ 100</span>
                                    </div>
                                </div>
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{ fontSize: 12, color: '#94a3b8' }}>0 (плохо)</span>
                                        <span style={{ fontSize: 12, color: '#94a3b8' }}>100 (хорошо)</span>
                                    </div>
                                    <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${group.reliability_score}%` }}
                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                            style={{ height: '100%', background: getRiskColor(group.risk_level) }}
                                        />
                                    </div>
                                    <div style={{ marginTop: 10 }}>
                                        <Badge variant={group.risk_level === 'low' ? 'success' : group.risk_level === 'medium' ? 'warning' : 'danger'}>
                                            Уровень риска: {getRiskLabel(group.risk_level)}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Навигация по секциям */}
                        <div style={{
                            display: 'flex', gap: 6, padding: '12px 28px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            overflowX: 'auto', flexWrap: 'wrap'
                        }}>
                            {sections.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setActiveSection(s.id)}
                                    style={{
                                        padding: '8px 14px',
                                        background: activeSection === s.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                                        border: activeSection === s.id ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                                        borderRadius: 8,
                                        color: activeSection === s.id ? '#e2e8f0' : '#64748b',
                                        cursor: 'pointer',
                                        fontSize: 12, fontWeight: 600,
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        transition: 'all 0.2s', whiteSpace: 'nowrap'
                                    }}
                                >
                                    <i className={`fa-solid ${s.icon}`} style={{ fontSize: 11 }} />
                                    {s.label}
                                    {s.badge > 0 && (
                                        <span style={{
                                            padding: '1px 6px', borderRadius: 10,
                                            background: activeSection === s.id ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)',
                                            color: '#f87171', fontSize: 10
                                        }}>{s.badge}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div style={{ padding: '24px 28px' }}>
                            {/* === СЕКЦИЯ: ОБЗОР === */}
                            {activeSection === 'overview' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    {/* Что это значит */}
                                    <div style={{
                                        padding: 18, background: 'rgba(99,102,241,0.06)',
                                        border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, marginBottom: 20
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                            <i className="fa-solid fa-circle-info" style={{ color: '#818cf8', fontSize: 18, marginTop: 2 }} />
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>
                                                    Что означает этот рейтинг?
                                                </div>
                                                <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.7 }}>
                                                    {getRiskExplanation(group.risk_level, group.reliability_score)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ключевые цифры */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                        gap: 10, marginBottom: 20
                                    }}>
                                        <div style={{ padding: 14, background: 'rgba(0,0,0,0.25)', borderRadius: 10, textAlign: 'center' }}>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: '#e2e8f0' }}>{totalIncidents}</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Инцидентов</div>
                                        </div>
                                        <div style={{ padding: 14, background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.15)', borderRadius: 10, textAlign: 'center' }}>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: '#fb923c' }}>{adminCount}</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Как администрация</div>
                                        </div>
                                        <div style={{ padding: 14, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, textAlign: 'center' }}>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: '#a78bfa' }}>{employeeCount}</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Как сотрудник</div>
                                        </div>
                                        <div style={{ padding: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, textAlign: 'center' }}>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: '#f87171' }}>-{totalBalls}</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Сумма штрафов</div>
                                        </div>
                                        <div style={{ padding: 14, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, textAlign: 'center' }}>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: '#a5b4fc' }}>{pvzHistory.length}</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>ПВЗ в истории</div>
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
                                                <div style={{
                                                    padding: 16,
                                                    background: getAssessmentBg('severity', assessmentSummary.max_severity),
                                                    border: `1px solid ${getAssessmentBorder('severity', assessmentSummary.max_severity)}`,
                                                    borderRadius: 12, textAlign: 'center'
                                                }}>
                                                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
                                                        <i className="fa-solid fa-fire" style={{ marginRight: 4 }} /> Макс. серьёзность
                                                    </div>
                                                    <div style={{
                                                        fontSize: 20, fontWeight: 800,
                                                        color: getAssessmentColor('severity', assessmentSummary.max_severity)
                                                    }}>
                                                        {assessmentSummary.max_severity || '—'}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>
                                                        Самая высокая из всех инцидентов
                                                    </div>
                                                </div>
                                                <div style={{
                                                    padding: 16,
                                                    background: getAssessmentBg('confidence', assessmentSummary.min_confidence),
                                                    border: `1px solid ${getAssessmentBorder('confidence', assessmentSummary.min_confidence)}`,
                                                    borderRadius: 12, textAlign: 'center'
                                                }}>
                                                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
                                                        <i className="fa-solid fa-shield-halved" style={{ marginRight: 4 }} /> Мин. уверенность
                                                    </div>
                                                    <div style={{
                                                        fontSize: 20, fontWeight: 800,
                                                        color: getAssessmentColor('confidence', assessmentSummary.min_confidence)
                                                    }}>
                                                        {assessmentSummary.min_confidence || '—'}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>
                                                        Самая низкая из всех инцидентов
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Известные данные */}
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <i className="fa-solid fa-address-card" style={{ color: '#818cf8' }} />
                                        Известные данные
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 20 }}>
                                        {allNames.length > 0 && (
                                            <div style={{ padding: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 8 }}>
                                                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
                                                    <i className="fa-solid fa-id-card" style={{ marginRight: 4 }} /> ФИО ({allNames.length})
                                                </div>
                                                {allNames.map((n, i) => (
                                                    <div key={i} style={{ padding: '4px 8px', background: 'rgba(99,102,241,0.1)', borderRadius: 4, fontSize: 13, color: '#e2e8f0', marginBottom: i < allNames.length - 1 ? 4 : 0 }}>{n}</div>
                                                ))}
                                            </div>
                                        )}
                                        {allPhones.length > 0 && (
                                            <div style={{ padding: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 8 }}>
                                                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
                                                    <i className="fa-solid fa-phone" style={{ marginRight: 4 }} /> Телефоны ({allPhones.length})
                                                </div>
                                                {allPhones.map((p, i) => (
                                                    <div key={i} style={{ padding: '4px 8px', background: 'rgba(16,185,129,0.1)', borderRadius: 4, fontSize: 13, color: '#6ee7b7', fontFamily: 'monospace', marginBottom: i < allPhones.length - 1 ? 4 : 0 }}>{p}</div>
                                                ))}
                                            </div>
                                        )}
                                        {allTg.length > 0 && (
                                            <div style={{ padding: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 8 }}>
                                                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
                                                    <i className="fa-solid fa-paper-plane" style={{ marginRight: 4 }} /> Telegram ({allTg.length})
                                                </div>
                                                {allTg.map((t, i) => (
                                                    <div key={i} style={{ padding: '4px 8px', background: 'rgba(99,102,241,0.1)', borderRadius: 4, fontSize: 13, color: '#a5b4fc', marginBottom: i < allTg.length - 1 ? 4 : 0 }}>@{t.username}</div>
                                                ))}
                                            </div>
                                        )}
                                        {birthDates.length > 0 && (
                                            <div style={{ padding: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 8 }}>
                                                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
                                                    <i className="fa-solid fa-cake-candles" style={{ marginRight: 4 }} /> Даты рождения ({birthDates.length})
                                                </div>
                                                {birthDates.map((d, i) => (
                                                    <div key={i} style={{ padding: '4px 8px', background: 'rgba(168,85,247,0.1)', borderRadius: 4, fontSize: 13, color: '#c4b5fd', marginBottom: i < birthDates.length - 1 ? 4 : 0 }}>{formatDate(d)}</div>
                                                ))}
                                            </div>
                                        )}
                                        {positions.length > 0 && (
                                            <div style={{ padding: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 8 }}>
                                                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
                                                    <i className="fa-solid fa-briefcase" style={{ marginRight: 4 }} /> Должности ({positions.length})
                                                </div>
                                                {positions.map((p, i) => (
                                                    <div key={i} style={{ padding: '4px 8px', background: p.onPvz ? 'rgba(251,146,60,0.1)' : 'rgba(139,92,246,0.1)', borderRadius: 4, fontSize: 13, color: p.onPvz ? '#fdba74' : '#c4b5fd', marginBottom: i < positions.length - 1 ? 4 : 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        {p.post_name}
                                                        <span style={{ fontSize: 10, opacity: 0.7 }}>({p.onPvz ? 'админ.' : 'сотр.'})</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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
                                            <div style={{ fontSize: 13, color: '#94a3b8' }}>Система не обнаружила тревожных сигналов в истории этого человека.</div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 }}>
                                                Система автоматически выявляет тревожные сигналы в истории. Вот на что стоит обратить внимание:
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {redFlags.map((flag, i) => (
                                                    <div key={i} style={{
                                                        padding: 18, background: `${flag.color}10`,
                                                        border: `1px solid ${flag.color}30`,
                                                        borderLeft: `4px solid ${flag.color}`,
                                                        borderRadius: 10
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                                            <div style={{
                                                                width: 36, height: 36, borderRadius: '50%',
                                                                background: `${flag.color}25`,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                            }}>
                                                                <i className={`fa-solid ${flag.icon}`} style={{ color: flag.color, fontSize: 16 }} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: 15, fontWeight: 700, color: flag.color }}>{flag.title}</div>
                                                                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                                                                    Серьёзность: {flag.severity === 'critical' ? 'Критическая' : flag.severity === 'high' ? 'Высокая' : 'Средняя'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, paddingLeft: 48 }}>
                                                            {flag.description}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}

                            {/* === СЕКЦИЯ: НАРУШЕНИЯ ПО РОЛЯМ === */}
                            {activeSection === 'roles' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 }}>
                                        Важно понимать, в какой роли человек совершал нарушения — как <strong style={{ color: '#fb923c' }}>руководитель ПВЗ</strong> или как <strong style={{ color: '#a78bfa' }}>обычный сотрудник</strong>. Нарушения руководителя — более серьёзный сигнал.
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                                        <div style={{ padding: 20, background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 12, textAlign: 'center' }}>
                                            <i className="fa-solid fa-crown" style={{ color: '#fb923c', fontSize: 28, marginBottom: 8 }} />
                                            <div style={{ fontSize: 36, fontWeight: 800, color: '#fb923c' }}>{adminCount}</div>
                                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Как руководитель ПВЗ</div>
                                            {adminCount > 0 && <div style={{ fontSize: 11, color: '#fb923c', marginTop: 6 }}>Штраф ×1.5</div>}
                                        </div>
                                        <div style={{ padding: 20, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, textAlign: 'center' }}>
                                            <i className="fa-solid fa-user" style={{ color: '#a78bfa', fontSize: 28, marginBottom: 8 }} />
                                            <div style={{ fontSize: 36, fontWeight: 800, color: '#a78bfa' }}>{employeeCount}</div>
                                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Как сотрудник</div>
                                            {employeeCount > 0 && <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 6 }}>Штраф ×1.0</div>}
                                        </div>
                                    </div>
                                    {roleAnalysis.as_administration.length > 0 && (
                                        <div style={{ marginBottom: 20 }}>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: '#fb923c', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <i className="fa-solid fa-crown" /> Нарушения в роли руководителя ПВЗ ({roleAnalysis.as_administration.length})
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {roleAnalysis.as_administration.map((inc, i) => (
                                                    <div key={i} style={{ padding: 14, background: 'rgba(0,0,0,0.25)', borderRadius: 8, borderLeft: '3px solid #fb923c' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                                                            <span style={{ color: '#94a3b8' }}>
                                                                <code style={{ color: '#64748b', marginRight: 8 }}>#{inc.incident_id}</code>{formatDate(inc.date)}
                                                            </span>
                                                            <span style={{ color: '#ef4444', fontWeight: 700 }}>
                                                                -{inc.final_ball} баллов <span style={{ color: '#64748b', fontWeight: 400 }}>(база {inc.base_ball} × {inc.role_multiplier})</span>
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 4, fontWeight: 600 }}>{inc.reason_name || 'Причина не указана'}</div>
                                                        <div style={{ fontSize: 12, color: '#94a3b8' }}><i className="fa-solid fa-briefcase" style={{ marginRight: 4 }} />Должность: {inc.post_name || '—'}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {roleAnalysis.as_employee.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <i className="fa-solid fa-user" /> Нарушения в роли сотрудника ({roleAnalysis.as_employee.length})
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {roleAnalysis.as_employee.map((inc, i) => (
                                                    <div key={i} style={{ padding: 14, background: 'rgba(0,0,0,0.25)', borderRadius: 8, borderLeft: '3px solid #a78bfa' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                                                            <span style={{ color: '#94a3b8' }}>
                                                                <code style={{ color: '#64748b', marginRight: 8 }}>#{inc.incident_id}</code>{formatDate(inc.date)}
                                                            </span>
                                                            <span style={{ color: '#ef4444', fontWeight: 700 }}>-{inc.final_ball} баллов</span>
                                                        </div>
                                                        <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 4, fontWeight: 600 }}>{inc.reason_name || 'Причина не указана'}</div>
                                                        <div style={{ fontSize: 12, color: '#94a3b8' }}><i className="fa-solid fa-briefcase" style={{ marginRight: 4 }} />Должность: {inc.post_name || '—'}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* === СЕКЦИЯ: ВСЕ ИНЦИДЕНТЫ === */}
                            {activeSection === 'history' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    {allIncidents.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: 40 }}>
                                            <i className="fa-solid fa-circle-check" style={{ fontSize: 48, color: '#10b981', marginBottom: 16 }} />
                                            <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Инцидентов не найдено</div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>Полный список всех подтверждённых инцидентов:</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {allIncidents.map((inc, i) => (
                                                    <div key={i} style={{ padding: 14, background: 'rgba(0,0,0,0.25)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <code style={{ fontSize: 11, color: '#64748b', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 4 }}>#{inc.incident_id}</code>
                                                                <span style={{ fontSize: 12, color: '#94a3b8' }}>{formatDate(inc.date_add)}</span>
                                                            </div>
                                                            <Badge variant={inc.role === 'administration' ? 'warning' : 'info'} size="sm">
                                                                {inc.role === 'administration' ? '🟠 Администрация' : '🟣 Сотрудник'}
                                                            </Badge>
                                                        </div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12 }}>
                                                            {inc.reason_name && <span style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.1)', borderRadius: 4, color: '#fca5a5' }}><i className="fa-solid fa-circle-exclamation" style={{ marginRight: 4 }} />{inc.reason_name}</span>}
                                                            {inc.post_name && <span style={{ padding: '4px 8px', background: 'rgba(251,146,60,0.1)', borderRadius: 4, color: '#fdba74' }}><i className="fa-solid fa-briefcase" style={{ marginRight: 4 }} />{inc.post_name}</span>}
                                                            {inc.total_ball > 0 && <span style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.15)', borderRadius: 4, color: '#f87171', fontWeight: 600 }}>-{inc.total_ball} баллов</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}

                            {/* === СЕКЦИЯ: МЕСТА РАБОТЫ === */}
                            {activeSection === 'pvz' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    {pvzHistory.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: 40 }}>
                                            <i className="fa-solid fa-building-circle-xmark" style={{ fontSize: 48, color: '#64748b', marginBottom: 16 }} />
                                            <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Связей с ПВЗ не обнаружено</div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>Список ПВЗ, на которых был зафиксирован этот человек.</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                {pvzHistory.map((pvz, i) => (
                                                    <div key={i} style={{ padding: 16, background: 'rgba(0,0,0,0.25)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>
                                                                    <i className="fa-solid fa-building" style={{ marginRight: 6, color: '#818cf8' }} />{pvz.address}
                                                                </div>
                                                                <div style={{ fontSize: 12, color: '#94a3b8' }}>Последний инцидент: {formatDate(pvz.last_incident_date)}</div>
                                                            </div>
                                                            <Badge variant="warning" size="sm">{pvz.incident_count} инц.</Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}

                            {/* === СЕКЦИЯ: ДИНАМИКА === */}
                            {activeSection === 'trends' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    {!trends || Object.keys(trends.by_month || {}).length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: 40 }}>
                                            <i className="fa-solid fa-chart-simple" style={{ fontSize: 48, color: '#64748b', marginBottom: 16 }} />
                                            <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Недостаточно данных для анализа динамики</div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 }}>Как менялось количество инцидентов со временем.</div>
                                            <div style={{ padding: 16, background: 'rgba(0,0,0,0.25)', borderRadius: 10, marginBottom: 16 }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
                                                    {Object.entries(trends.by_month).slice(-6).map(([month, data]) => (
                                                        <div key={month} style={{ padding: 10, background: 'rgba(99,102,241,0.05)', borderRadius: 6, textAlign: 'center' }}>
                                                            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>{month}</div>
                                                            <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>{data.count}</div>
                                                            <div style={{ fontSize: 10, marginTop: 4, display: 'flex', justifyContent: 'center', gap: 6 }}>
                                                                <span style={{ color: '#fb923c' }}>🟠 {data.admin}</span>
                                                                <span style={{ color: '#a78bfa' }}>🟣 {data.employee}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ marginTop: 12, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                                                    Общая тенденция:{' '}
                                                    <strong style={{ color: trends.trend === 'up' ? '#ef4444' : trends.trend === 'down' ? '#10b981' : '#94a3b8' }}>
                                                        {trends.trend === 'up' ? '↑ Растёт' : trends.trend === 'down' ? '↓ Снижается' : trends.trend === 'stable' ? '→ Стабильно' : '—'}
                                                    </strong>
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                                <div style={{ padding: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 8 }}>
                                                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Первый инцидент</div>
                                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{formatDate(trends.first_incident)}</div>
                                                </div>
                                                <div style={{ padding: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 8 }}>
                                                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Последний инцидент</div>
                                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{formatDate(trends.last_incident)}</div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}

                            {/* === СЕКЦИЯ: РАСЧЁТ РЕЙТИНГА === */}
                            {activeSection === 'calc' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 }}>
                                        Рейтинг рассчитывается автоматически: из начального балла <strong style={{ color: '#e2e8f0' }}>100</strong> вычитаются штрафы. Для нарушений в роли руководителя применяется коэффициент <strong style={{ color: '#fb923c' }}>×1.5</strong>.
                                    </div>
                                    <div style={{ padding: 16, background: 'rgba(0,0,0,0.25)', borderRadius: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12 }}>
                                            <span style={{ color: '#94a3b8' }}><i className="fa-solid fa-plus-circle" style={{ marginRight: 6, color: '#10b981' }} />Начальный балл</span>
                                            <span style={{ color: '#10b981', fontWeight: 700 }}>+{scoreCalc.base_score || 100}</span>
                                        </div>
                                        {(scoreCalc.deductions || []).map((ded, i) => (
                                            <div key={i} style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 12 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <span style={{ color: '#94a3b8' }}><i className="fa-solid fa-minus-circle" style={{ marginRight: 6, color: '#f87171' }} />Инцидент #{ded.incident_id}</span>
                                                    <span style={{ color: '#f87171', fontWeight: 700 }}>{ded.total_deduction}</span>
                                                </div>
                                                <div style={{ paddingLeft: 20, fontSize: 11, color: '#64748b' }}>
                                                    {ded.date && <span style={{ marginRight: 8 }}>{formatDate(ded.date)}</span>}
                                                    {ded.reason_name && <span style={{ marginRight: 8 }}>Причина: {ded.reason_name}</span>}
                                                    {ded.post_name && <span style={{ marginRight: 8 }}>Должность: {ded.post_name}</span>}
                                                    {ded.role_multiplier > 1 && <span style={{ color: '#fb923c' }}>×{ded.role_multiplier} (руководитель)</span>}
                                                </div>
                                            </div>
                                        ))}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, paddingTop: 12, borderTop: '2px solid rgba(255,255,255,0.1)', marginTop: 8 }}>
                                            <span style={{ color: '#e2e8f0', fontWeight: 700 }}>Итоговый рейтинг</span>
                                            <span style={{ color: getRiskColor(group.risk_level), fontWeight: 700 }}>{scoreCalc.final_score || group.reliability_score} / 100</span>
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
                                            Данные в этом отчёте основаны на обращениях участников и носят <strong style={{ color: '#fde68a' }}>справочный характер</strong>.
                                            Они <strong>не являются</strong> официальным обвинением. Наличие записей <strong style={{ color: '#fde68a' }}>не может быть основанием</strong> для отказа в приёме на работу или сотрудничестве.
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