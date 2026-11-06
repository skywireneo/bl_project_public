import React, { useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Input, Button, Badge, Divider, FormField } from '../ui/UIComponents';
import { searchPersone, generatePersonReportPDF } from '../../http/incidentsAPI';
import SearchHistoryModal from './SearchHistoryModal';
import { Context } from '../..';
import PersonReportModal from './PersonReportModal';

export default function CheckPersonPage() {
    const { user } = useContext(Context);
    const isAdminOrDev = user?.user?.status && ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"].includes(user.user.status);

    const [email, setEmail] = useState('');
    const [searchString, setSearchString] = useState('');
    const [results, setResults] = useState(null);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState(null);
    const [expandedPerson, setExpandedPerson] = useState(null);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [exportingId, setExportingId] = useState(null);
    const [reportModalData, setReportModalData] = useState(null);

    const handleSearch = async () => {
        if (!termsAccepted) { setError('Необходимо подтвердить согласие'); return; }
        if (!email.trim()) { setError('Введите email'); return; }
        if (!searchString.trim()) { setError('Введите параметры поиска'); return; }

        setSearching(true); setError(null); setResults(null); setExpandedPerson(null);
        try {
            const response = await searchPersone(email, searchString);
            if (response.success) { setResults(response.data); setTermsAccepted(false); }
            else setError(response.message || 'Ошибка поиска');
        } catch (err) {
            if (err?.response?.status === 429) setError('Превышен лимит запросов');
            else setError(err?.response?.data?.error?.message || err?.message || 'Ошибка');
        } finally { setSearching(false); }
    };

    const handleOpenDetailedReport = (group) => {
        setReportModalData(group);
    };

    const handleExportPDF = async (group) => {
        setExportingId(group.group_id);
        try {
            const blob = await generatePersonReportPDF(group);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `person_report_${group.group_id}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('PDF Export Error:', err);
            setError('Ошибка экспорта: ' + (err.message || 'неизвестная ошибка'));
        } finally {
            setExportingId(null);
        }
    };

    const getRiskColor = (l) => ({ critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981' }[l] || '#64748b');
    const getRiskBadge = (l) => ({ critical: 'danger', high: 'warning', medium: 'warning', low: 'success' }[l] || 'default');
    const getRiskLabel = (l) => ({ critical: 'Критический', high: 'Высокий', medium: 'Средний', low: 'Низкий' }[l] || 'Неизвестно');
    const getMatchMethodLabel = (m) => ({ exact: 'Точное', phonetic: 'По звучанию', last_six: 'Посл. цифры' }[m] || m);
    const getMatchMethodColor = (m) => ({ exact: '#10b981', phonetic: '#f59e0b', last_six: '#6366f1' }[m] || '#64748b');
    const getMatchMethodIcon = (m) => ({ exact: 'fa-circle-check', phonetic: 'fa-waveform', last_six: 'fa-hashtag' }[m] || 'fa-circle');
    const getParamTypeLabel = (t) => ({ fio: 'ФИО', phone: 'Телефон', tg_username: 'Telegram', tg_id: 'Telegram ID' }[t] || t);
    const getPluralForm = (n, o, t, f) => { const m = Math.abs(n) % 100, n1 = m % 10; if (m > 10 && m < 20) return f; if (n1 > 1 && n1 < 5) return t; if (n1 === 1) return o; return f; };
    const formatDate = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('ru-RU'); } catch { return d; } };

    const foundCount = results?.found_count ?? 0;
    const totalPeople = results?.total_groups ?? 0;
    const hasDetailedResults = results?.groups?.length > 0;
    const hasBasicResults = results?.exists && foundCount > 0 && !hasDetailedResults;
    const hasNoResults = !results?.exists && foundCount === 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: 'clamp(16px, 3vw, 32px)', flex: 1, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
                <Card padding={24}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                                    <i className="fa-solid fa-user-shield" style={{ fontSize: 20, color: '#fff' }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>Поиск в базе нарушителей</div>
                                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Проверка по ФИО, телефону, Telegram</div>
                                </div>
                            </div>
                            {isAdminOrDev && <Button variant="secondary" size="sm" icon="fa-solid fa-clock-rotate-left" onClick={() => setShowHistory(true)}>История</Button>}
                        </div>
                        <Divider />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                            <FormField label="Ваш Email"><Input icon="fa-envelope" placeholder="user@example.com" value={email} onChange={e => setEmail(e.target.value)} /></FormField>
                            <FormField label="Кого ищем" hint="ФИО, телефон, @telegram через запятую"><Input icon="fa-magnifying-glass" placeholder="Иванов Сергей, +79991234567" value={searchString} onChange={e => setSearchString(e.target.value)} onKeyDown={e => e.key === 'Enter' && termsAccepted && handleSearch()} /></FormField>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, background: termsAccepted ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${termsAccepted ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, cursor: 'pointer', accentColor: '#10b981', flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: termsAccepted ? '#6ee7b7' : '#94a3b8' }}>Я соглашаюсь с <a href="/policies/user_agreement" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Условиями использования</a> и подтверждаю, что использую данные исключительно в информационных целях.</span>
                        </label>
                        <Button icon="fa-solid fa-search" onClick={handleSearch} loading={searching} disabled={!termsAccepted} size="lg">
                            {searching ? 'Поиск...' : 'Проверить'}
                        </Button>
                    </div>
                </Card>

                {results && !searching && (
                    <>
                        {hasNoResults && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <Card padding={40}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                            <i className="fa-solid fa-circle-check" style={{ fontSize: 36, color: '#10b981' }} />
                                        </div>
                                        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Человек не найден в базе</h2>
                                        <p style={{ fontSize: 14, color: '#94a3b8', maxWidth: 500, margin: '0 auto' }}>По указанным параметрам не найдено людей с зафиксированными нарушениями.</p>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {hasBasicResults && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <Card padding={40}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                            <i className="fa-solid fa-user-clock" style={{ fontSize: 36, color: '#fbbf24' }} />
                                        </div>
                                        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Найдены записи в базе</h2>
                                        <p style={{ fontSize: 14, color: '#94a3b8', maxWidth: 500, margin: '0 auto' }}>Найдено {foundCount} {getPluralForm(foundCount, 'запись', 'записи', 'записей')}. Для подробностей нужен расширенный доступ.</p>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {hasDetailedResults && (
                            <>
                                <Card padding={20}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <i className="fa-solid fa-user-shield" style={{ fontSize: 22, color: '#f87171' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Найдено в базе нарушителей</h3>
                                            <div style={{ fontSize: 13, color: '#94a3b8' }}>{totalPeople} {getPluralForm(totalPeople, 'человек', 'человека', 'человек')}</div>
                                        </div>
                                    </div>
                                </Card>

                                {results.groups.map((group, idx) => {
                                    const risk = group.risk_level || 'low';
                                    const score = group.reliability_score ?? 100;
                                    const persons = group.persons || [];
                                    const roleAnalysis = group.role_analysis || { as_administration: [], as_employee: [], stats: {} };
                                    const redFlags = group.red_flags || [];
                                    const trends = group.trends;
                                    const pvzHistory = group.pvz_history || [];
                                    const isExpanded = expandedPerson === group.group_id;

                                    const allNames = [], allPhones = [], allTg = [];
                                    persons.forEach(p => {
                                        (p.data.names || []).forEach(n => { if (n.name && !allNames.includes(n.name)) allNames.push(n.name); });
                                        (p.data.phones || []).forEach(ph => { if (ph.phone && !allPhones.includes(ph.phone)) allPhones.push(ph.phone); });
                                        (p.data.tg_accounts || []).forEach(tg => { if (tg.username && !allTg.find(t => t.username === tg.username)) allTg.push(tg); });
                                    });

                                    const allMatches = [];
                                    persons.forEach(p => (p.matched_params || []).forEach(m => { if (!allMatches.find(am => am.type === m.type && am.value === m.value)) allMatches.push(m); }));

                                    return (
                                        <motion.div key={group.group_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                                            <Card padding={24} style={{ borderColor: isExpanded ? '#6366f1' : undefined, borderWidth: isExpanded ? 2 : 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                        <div style={{ width: 56, height: 56, borderRadius: 14, background: `linear-gradient(135deg, ${getRiskColor(risk)}, ${getRiskColor(risk)}dd)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${getRiskColor(risk)}40` }}>
                                                            <i className="fa-solid fa-user" style={{ fontSize: 24, color: '#fff' }} />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Человек #{group.group_id}</div>
                                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                                <Badge variant={getRiskBadge(risk)} icon="fa-shield-halved">{getRiskLabel(risk)} риск</Badge>
                                                                <span style={{ fontSize: 12, color: '#94a3b8' }}>{persons.length} {getPluralForm(persons.length, 'запись', 'записи', 'записей')}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* ИСПРАВЛЕННЫЙ БЛОК КНОПОК (без дубликатов) */}
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <Button size="sm" variant="secondary" icon="fa-file-pdf" onClick={() => handleExportPDF(group)} loading={exportingId === group.group_id} disabled={exportingId === group.group_id}>
                                                            PDF
                                                        </Button>
                                                        <Button size="sm" variant="primary" icon="fa-solid fa-file-lines" onClick={() => handleOpenDetailedReport(group)}>
                                                            Подробный отчёт
                                                        </Button>
                                                        <Button size="sm" variant={isExpanded ? 'primary' : 'secondary'} icon={isExpanded ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'} onClick={() => setExpandedPerson(isExpanded ? null : group.group_id)}>
                                                            {isExpanded ? 'Скрыть детали' : 'Все детали'}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {redFlags.length > 0 && (
                                                    <div style={{ marginBottom: 16 }}>
                                                        <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 8, textTransform: 'uppercase', fontWeight: 700 }}>
                                                            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 4 }} />
                                                            Критические предупреждения ({redFlags.length})
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                            {redFlags.map((flag, fIdx) => (
                                                                <div key={fIdx} style={{ padding: 10, background: `${flag.color}15`, border: `1px solid ${flag.color}40`, borderLeft: `3px solid ${flag.color}`, borderRadius: 6 }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                                        <i className={`fa-solid ${flag.icon}`} style={{ color: flag.color, fontSize: 14 }} />
                                                                        <span style={{ fontSize: 13, fontWeight: 700, color: flag.color }}>{flag.title}</span>
                                                                    </div>
                                                                    <div style={{ fontSize: 12, color: '#e2e8f0', paddingLeft: 22, lineHeight: 1.5 }}>{flag.description}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
                                                    <div style={{ padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
                                                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', fontWeight: 600 }}>
                                                            <i className="fa-solid fa-shield-halved" style={{ marginRight: 4 }} />Рейтинг надёжности
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                                            <div style={{ fontSize: 32, fontWeight: 800, color: getRiskColor(risk) }}>{score}</div>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                                                                    <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} style={{ height: '100%', background: getRiskColor(risk) }} />
                                                                </div>
                                                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>из 100 баллов</div>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                                                            <div style={{ padding: 6, background: 'rgba(251,146,60,0.1)', borderRadius: 4 }}>
                                                                <div style={{ color: '#94a3b8', fontSize: 10 }}>Администрация</div>
                                                                <div style={{ color: '#fb923c', fontWeight: 700, fontSize: 16 }}>{roleAnalysis.stats?.admin_count || 0}</div>
                                                            </div>
                                                            <div style={{ padding: 6, background: 'rgba(139,92,246,0.1)', borderRadius: 4 }}>
                                                                <div style={{ color: '#94a3b8', fontSize: 10 }}>Сотрудник</div>
                                                                <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: 16 }}>{roleAnalysis.stats?.employee_count || 0}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {allMatches.length > 0 && (
                                                        <div style={{ padding: 16, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12 }}>
                                                            <div style={{ fontSize: 11, color: '#fbbf24', marginBottom: 10, textTransform: 'uppercase', fontWeight: 600 }}>
                                                                <i className="fa-solid fa-magnifying-glass" style={{ marginRight: 4 }} />Почему нашли
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                {allMatches.map((m, i) => (
                                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                                                                        <i className={`fa-solid ${getMatchMethodIcon(m.method)}`} style={{ color: getMatchMethodColor(m.method), width: 14 }} />
                                                                        <span style={{ color: '#94a3b8' }}>{getParamTypeLabel(m.type)}:</span>
                                                                        <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{m.value}</span>
                                                                        <span style={{ padding: '1px 6px', borderRadius: 4, background: `${getMatchMethodColor(m.method)}20`, color: getMatchMethodColor(m.method), fontSize: 10 }}>{getMatchMethodLabel(m.method)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{ marginBottom: 20 }}>
                                                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', fontWeight: 600 }}>
                                                        <i className="fa-solid fa-address-card" style={{ marginRight: 6 }} />Известные данные
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                                                        {allNames.length > 0 && (
                                                            <div style={{ padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                                                                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}><i className="fa-solid fa-id-card" style={{ marginRight: 4 }} />ФИО</div>
                                                                {allNames.map((n, i) => <div key={i} style={{ padding: '4px 8px', background: 'rgba(99,102,241,0.1)', borderRadius: 4, fontSize: 13, color: '#e2e8f0', marginBottom: i < allNames.length - 1 ? 4 : 0 }}>{n}</div>)}
                                                            </div>
                                                        )}
                                                        {allPhones.length > 0 && (
                                                            <div style={{ padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                                                                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}><i className="fa-solid fa-phone" style={{ marginRight: 4 }} />Телефоны</div>
                                                                {allPhones.map((p, i) => <div key={i} style={{ padding: '4px 8px', background: 'rgba(16,185,129,0.1)', borderRadius: 4, fontSize: 13, color: '#6ee7b7', fontFamily: 'monospace', marginBottom: i < allPhones.length - 1 ? 4 : 0 }}>{p}</div>)}
                                                            </div>
                                                        )}
                                                        {allTg.length > 0 && (
                                                            <div style={{ padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                                                                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}><i className="fa-solid fa-paper-plane" style={{ marginRight: 4 }} />Telegram</div>
                                                                {allTg.map((t, i) => <div key={i} style={{ padding: '4px 8px', background: 'rgba(99,102,241,0.1)', borderRadius: 4, fontSize: 13, color: '#a5b4fc', marginBottom: i < allTg.length - 1 ? 4 : 0 }}>@{t.username}</div>)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                                                            <Divider />

                                                            {trends && Object.keys(trends.by_month || {}).length > 0 && (
                                                                <div style={{ marginTop: 16, marginBottom: 16 }}>
                                                                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', fontWeight: 600 }}>
                                                                        <i className="fa-solid fa-chart-line" style={{ marginRight: 6 }} />Динамика инцидентов
                                                                    </div>
                                                                    <div style={{ padding: 14, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                                                                            {Object.entries(trends.by_month).slice(-6).map(([month, data]) => (
                                                                                <div key={month} style={{ padding: 10, background: 'rgba(99,102,241,0.05)', borderRadius: 6, textAlign: 'center' }}>
                                                                                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>{month}</div>
                                                                                    <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>{data.count}</div>
                                                                                    <div style={{ fontSize: 10, marginTop: 4, display: 'flex', justifyContent: 'center', gap: 6 }}>
                                                                                        <span style={{ color: '#fb923c' }}>{data.admin}A</span>
                                                                                        <span style={{ color: '#a78bfa' }}>{data.employee}S</span>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                                                                            Тренд: <strong style={{ color: trends.trend === 'up' ? '#ef4444' : trends.trend === 'down' ? '#10b981' : '#94a3b8' }}>
                                                                                {trends.trend === 'up' ? '↑ Рост' : trends.trend === 'down' ? '↓ Снижение' : trends.trend === 'stable' ? '→ Стабильно' : '—'}
                                                                            </strong>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {pvzHistory.length > 0 && (
                                                                <div style={{ marginBottom: 16 }}>
                                                                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', fontWeight: 600 }}>
                                                                        <i className="fa-solid fa-location-dot" style={{ marginRight: 6 }} />Где работал ({pvzHistory.length} ПВЗ)
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                        {pvzHistory.map((pvz, i) => (
                                                                            <div key={i} style={{ padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                                                <div style={{ flex: 1, minWidth: 200 }}>
                                                                                    <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{pvz.address}</div>
                                                                                    <div style={{ fontSize: 11, color: '#64748b' }}>Последний инцидент: {formatDate(pvz.last_incident_date)}</div>
                                                                                </div>
                                                                                <Badge variant="warning" size="sm">{pvz.incident_count} инц.</Badge>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {(roleAnalysis.stats?.admin_count > 0 || roleAnalysis.stats?.employee_count > 0) && (
                                                                <div style={{ marginBottom: 16 }}>
                                                                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', fontWeight: 600 }}>
                                                                        <i className="fa-solid fa-users-gear" style={{ marginRight: 6 }} />Разделение по ролям
                                                                    </div>

                                                                    {roleAnalysis.as_administration.length > 0 && (
                                                                        <div style={{ marginBottom: 10 }}>
                                                                            <div style={{ fontSize: 12, color: '#fb923c', marginBottom: 6, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                                <i className="fa-solid fa-crown" />Как администрация ПВЗ ({roleAnalysis.as_administration.length})
                                                                            </div>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                                {roleAnalysis.as_administration.map((i, idx) => (
                                                                                    <div key={idx} style={{ padding: 8, background: 'rgba(251,146,60,0.08)', borderLeft: '3px solid #fb923c', borderRadius: 4, fontSize: 12 }}>
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                                                                                            <span style={{ color: '#e2e8f0' }}>#{i.incident_id} • {formatDate(i.date)}</span>
                                                                                            <span style={{ color: '#ef4444', fontWeight: 700 }}>-{i.final_ball} баллов (×{i.role_multiplier})</span>
                                                                                        </div>
                                                                                        <div style={{ color: '#94a3b8', marginTop: 2 }}>{i.reason_name} • {i.post_name}</div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {roleAnalysis.as_employee.length > 0 && (
                                                                        <div>
                                                                            <div style={{ fontSize: 12, color: '#a78bfa', marginBottom: 6, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                                <i className="fa-solid fa-user" />Как сотрудник ({roleAnalysis.as_employee.length})
                                                                            </div>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                                {roleAnalysis.as_employee.map((i, idx) => (
                                                                                    <div key={idx} style={{ padding: 8, background: 'rgba(139,92,246,0.08)', borderLeft: '3px solid #a78bfa', borderRadius: 4, fontSize: 12 }}>
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                                                                                            <span style={{ color: '#e2e8f0' }}>#{i.incident_id} • {formatDate(i.date)}</span>
                                                                                            <span style={{ color: '#ef4444', fontWeight: 700 }}>-{i.final_ball} баллов</span>
                                                                                        </div>
                                                                                        <div style={{ color: '#94a3b8', marginTop: 2 }}>{i.reason_name} • {i.post_name}</div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {group.score_description && (
                                                                <div style={{ padding: 16, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, marginTop: 16 }}>
                                                                    <div style={{ fontSize: 12, color: '#a5b4fc', marginBottom: 8, fontWeight: 600 }}><i className="fa-solid fa-lightbulb" style={{ marginRight: 6 }} />Анализ системы</div>
                                                                    <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 }}>{group.score_description}</div>
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </>
                        )}
                    </>
                )}
            </div>
            <SearchHistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} />
            <PersonReportModal isOpen={!!reportModalData} onClose={() => setReportModalData(null)} group={reportModalData} />
        </div>
    );
}