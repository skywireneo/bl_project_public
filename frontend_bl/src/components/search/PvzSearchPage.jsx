import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Input, Button, Badge, Divider, FormField } from '../ui/UIComponents';
import { searchPVZ, generatePvzReportPDF } from '../../http/incidentsAPI';
import PvzReportModal from './PvzReportModal';

export default function PvzSearchPage() {
    const [email, setEmail] = useState('');
    const [city, setCity] = useState('');
    const [street, setStreet] = useState('');
    const [home, setHome] = useState('');
    const [results, setResults] = useState(null);
    const [selected, setSelected] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [reportModalData, setReportModalData] = useState(null);

    const handleSearch = async () => {
        if (!termsAccepted) { setError('Подтвердите согласие'); return; }
        if (!email.trim()) { setError('Введите email'); return; }
        if (!city.trim() || !street.trim() || !home.trim()) { setError('Заполните все поля'); return; }

        setIsLoading(true);
        setError(null);
        setResults(null);
        setSelected(null);
        setHasSearched(true);

        try {
            const r = await searchPVZ(email, city, street, home);
            if (r.success) {
                setResults(r.data);
                setTermsAccepted(false);
            } else {
                setError(r.message || 'Ошибка поиска');
            }
        } catch (err) {
            if (err?.response?.status === 429) setError('Превышен лимит запросов');
            else setError(err?.response?.data?.message || err?.message || 'Ошибка сервера');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenDetailedReport = (pvz) => {
        setReportModalData(pvz);
    };

    const handleExportPDF = async () => {
        if (!selected) return;
        setExporting(true);
        try {
            const blob = await generatePvzReportPDF(selected);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pvz_report_${selected.pvz_id?.substring(0, 8) || 'unknown'}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('PDF Export Error:', err);
            setError('Ошибка экспорта: ' + (err.message || 'Неизвестная ошибка'));
        } finally {
            setExporting(false);
        }
    };

    const getRiskColor = (l) => ({ critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981' }[l] || '#64748b');
    const getRiskBadge = (l) => ({ critical: 'danger', high: 'warning', medium: 'warning', low: 'success' }[l] || 'default');
    const getRiskLabel = (l) => ({ critical: 'Критический', high: 'Высокий', medium: 'Средний', low: 'Низкий' }[l] || '—');

    const getPluralForm = (n, o, t, f) => {
        const m = Math.abs(n) % 100, n1 = m % 10;
        if (m > 10 && m < 20) return f;
        if (n1 > 1 && n1 < 5) return t;
        if (n1 === 1) return o;
        return f;
    };

    const formatDate = (d) => {
        if (!d) return '—';
        try { return new Date(d).toLocaleDateString('ru-RU'); }
        catch { return d; }
    };

    const pvzList = results?.pvz_list || [];
    const foundCount = results?.found_count ?? 0;
    const hasResults = foundCount > 0;
    const hasDetailed = pvzList.length > 0;
    const isBasicMode = hasResults && !hasDetailed;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: 'clamp(16px, 3vw, 32px)', flex: 1, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
                <Card padding={24}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}>
                                <i className="fa-solid fa-store" style={{ fontSize: 20, color: '#fff' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>Проверка ПВЗ</div>
                                <div style={{ fontSize: 12, color: '#94a3b8' }}>Поиск в базе нарушителей по адресу</div>
                            </div>
                        </div>
                        <Divider />
                        <FormField label="Ваш Email">
                            <Input icon="fa-envelope" placeholder="user@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                        </FormField>
                        <div>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>
                                <i className="fa-solid fa-location-dot" style={{ marginRight: 6, color: '#f59e0b' }} />Адрес ПВЗ
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                                <FormField label="Город">
                                    <Input icon="fa-city" placeholder="Москва" value={city} onChange={e => setCity(e.target.value)} />
                                </FormField>
                                <FormField label="Улица">
                                    <Input icon="fa-road" placeholder="Ленина" value={street} onChange={e => setStreet(e.target.value)} />
                                </FormField>
                                <FormField label="Дом">
                                    <Input icon="fa-house" placeholder="42" value={home} onChange={e => setHome(e.target.value)} onKeyDown={e => e.key === 'Enter' && termsAccepted && handleSearch()} />
                                </FormField>
                            </div>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, background: termsAccepted ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${termsAccepted ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, cursor: 'pointer' }}>
                            <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, accentColor: '#10b981', flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: termsAccepted ? '#6ee7b7' : '#94a3b8' }}>
                                Соглашаюсь с <a href="/policies/user_agreement" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8' }}>Условиями</a> и использую данные в информационных целях.
                            </span>
                        </label>
                        <Button icon="fa-solid fa-search" onClick={handleSearch} loading={isLoading} disabled={!termsAccepted} size="lg">
                            {isLoading ? 'Поиск...' : 'Проверить ПВЗ'}
                        </Button>
                    </div>
                </Card>

                {results && !isLoading && (
                    <>
                        {!hasResults && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <Card padding={40}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                            <i className="fa-solid fa-circle-check" style={{ fontSize: 36, color: '#10b981' }} />
                                        </div>
                                        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>ПВЗ не найден в базе</h2>
                                        <p style={{ fontSize: 14, color: '#94a3b8', maxWidth: 500, margin: '0 auto' }}>По указанному адресу не найдено пунктов выдачи с зафиксированными нарушениями.</p>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {isBasicMode && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <Card padding={40}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                            <i className="fa-solid fa-building-circle-exclamation" style={{ fontSize: 36, color: '#fbbf24' }} />
                                        </div>
                                        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>ПВЗ найден в базе</h2>
                                        <p style={{ fontSize: 14, color: '#94a3b8', maxWidth: 500, margin: '0 auto' }}>Найдено {foundCount} пунктов выдачи. Для деталей нужен расширенный доступ.</p>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {hasDetailed && (
                            <>
                                <Card padding={20}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <i className="fa-solid fa-building-circle-exclamation" style={{ fontSize: 22, color: '#f87171' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Найдено в базе</h3>
                                            <div style={{ fontSize: 13, color: '#94a3b8' }}>{pvzList.length} {getPluralForm(pvzList.length, 'пункт', 'пункта', 'пунктов')}</div>
                                        </div>
                                    </div>
                                </Card>

                                <div style={{ display: 'grid', gridTemplateColumns: selected ? 'minmax(0,1fr) minmax(380px,1fr)' : '1fr', gap: 20, alignItems: 'start' }}>
                                    <div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(340px,100%),1fr))', gap: 12 }}>
                                            {pvzList.map((pvz, idx) => (
                                                <motion.div key={pvz.pvz_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                                                    <Card hoverable padding={20} style={{ cursor: 'pointer', borderColor: selected?.pvz_id === pvz.pvz_id ? '#6366f1' : undefined, borderWidth: selected?.pvz_id === pvz.pvz_id ? 2 : 1 }} onClick={() => setSelected(pvz)}>
                                                        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                                                            <div style={{ width: 48, height: 48, borderRadius: 12, background: pvz.stats?.total_incidents > 0 ? `${getRiskColor(pvz.risk_level)}20` : 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <i className="fa-solid fa-building" style={{ fontSize: 20, color: pvz.stats?.total_incidents > 0 ? getRiskColor(pvz.risk_level) : '#34d399' }} />
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{pvz.type}</div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                    <span style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        <i className="fa-solid fa-location-dot" style={{ marginRight: 4 }} />{pvz.address}
                                                                    </span>
                                                                    {pvz.is_verified ? (
                                                                        <span style={{ fontSize: 9, fontWeight: 600, color: '#22c55e', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 4, padding: '1px 5px', display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                                                                            <i className="fa-solid fa-circle-check" style={{ fontSize: 8 }} /> OK
                                                                        </span>
                                                                    ) : (
                                                                        <span style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 4, padding: '1px 5px', display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                                                                            <i className="fa-solid fa-clock" style={{ fontSize: 8 }} /> ?
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {pvz.fault_distribution && pvz.stats?.total_incidents > 0 && (
                                                            <div style={{ marginBottom: 12, padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
                                                                <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Распределение вины</div>
                                                                <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                                                                    <div style={{ flex: 1, padding: '4px 6px', background: 'rgba(251,146,60,0.1)', borderRadius: 4, textAlign: 'center' }}>
                                                                        <div style={{ color: '#fb923c', fontWeight: 700 }}>{pvz.fault_distribution.administration.percent}%</div>
                                                                        <div style={{ color: '#94a3b8', fontSize: 9 }}>Администрация</div>
                                                                    </div>
                                                                    <div style={{ flex: 1, padding: '4px 6px', background: 'rgba(139,92,246,0.1)', borderRadius: 4, textAlign: 'center' }}>
                                                                        <div style={{ color: '#a78bfa', fontWeight: 700 }}>{pvz.fault_distribution.employee.percent}%</div>
                                                                        <div style={{ color: '#94a3b8', fontSize: 9 }}>Сотрудники</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div style={{ marginBottom: 12 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Надёжность</span>
                                                                <span style={{ fontSize: 18, fontWeight: 800, color: getRiskColor(pvz.risk_level) }}>{pvz.reliability_score}</span>
                                                            </div>
                                                            <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                                                                <motion.div initial={{ width: 0 }} animate={{ width: `${pvz.reliability_score}%` }} style={{ height: '100%', background: getRiskColor(pvz.risk_level || 'low') }} />
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                                            <Badge variant={getRiskBadge(pvz.risk_level || 'low')} size="sm">{getRiskLabel(pvz.risk_level || 'low')}</Badge>
                                                            {pvz.red_flags?.length > 0 && <Badge variant="danger" size="sm" icon="fa-triangle-exclamation">{pvz.red_flags.length} 🚩</Badge>}
                                                            {pvz.stats?.total_incidents > 0 ? (
                                                                <Badge variant="danger" size="sm">{pvz.stats.total_incidents} инц.</Badge>
                                                            ) : <Badge variant="success" size="sm">Чисто</Badge>}
                                                        </div>
                                                    </Card>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {selected && (
                                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} style={{ position: 'sticky', top: 20 }}>
                                                <Card padding={24}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                                                        <div style={{ width: 56, height: 56, borderRadius: 14, background: `linear-gradient(135deg, ${getRiskColor(selected.risk_level || 'low')}, ${getRiskColor(selected.risk_level || 'low')}dd)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${getRiskColor(selected.risk_level || 'low')}40` }}>
                                                            <i className="fa-solid fa-building" style={{ fontSize: 24, color: '#fff' }} />
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>{selected.type}</div>
                                                            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>{selected.address}</div>
                                                            {selected.is_verified ? (
                                                                <span style={{ fontSize: 10, fontWeight: 600, color: '#22c55e', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                                    <i className="fa-solid fa-circle-check" style={{ fontSize: 9 }} /> Адрес подтверждён
                                                                </span>
                                                            ) : (
                                                                <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                                    <i className="fa-solid fa-clock" style={{ fontSize: 9 }} /> Адрес не проверен
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                                        <Button size="sm" variant="secondary" icon="fa-file-pdf" onClick={handleExportPDF} loading={exporting} fullWidth>Скачать отчёт PDF</Button>
                                                        <Button variant="primary" fullWidth icon="fa-solid fa-file-lines" onClick={() => handleOpenDetailedReport(selected)} style={{ marginBottom: 16 }}>
                                                            Подробный отчёт с пояснениями
                                                        </Button>
                                                        <Button size="sm" variant="secondary" icon="fa-xmark" onClick={() => setSelected(null)}>Закрыть</Button>
                                                    </div>

                                                    {selected.red_flags?.length > 0 && (
                                                        <div style={{ marginBottom: 16 }}>
                                                            <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 8, textTransform: 'uppercase', fontWeight: 700 }}>
                                                                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 4 }} />Предупреждения
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                {selected.red_flags.map((f, i) => (
                                                                    <div key={i} style={{ padding: 8, background: `${f.color}15`, borderLeft: `3px solid ${f.color}`, borderRadius: 4, fontSize: 12 }}>
                                                                        <div style={{ color: f.color, fontWeight: 700, marginBottom: 2 }}>
                                                                            <i className={`fa-solid ${f.icon}`} style={{ marginRight: 4 }} />{f.title}
                                                                        </div>
                                                                        <div style={{ color: '#e2e8f0', fontSize: 11 }}>{f.description}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div style={{ padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 12, marginBottom: 16 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                                            <div style={{ fontSize: 36, fontWeight: 800, color: getRiskColor(selected.risk_level || 'low') }}>{selected.reliability_score}</div>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                                                                    <motion.div initial={{ width: 0 }} animate={{ width: `${selected.reliability_score}%` }} style={{ height: '100%', background: getRiskColor(selected.risk_level || 'low') }} />
                                                                </div>
                                                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>из 100 баллов</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {selected.stats?.total_incidents > 0 && (
                                                        <div style={{ marginBottom: 16 }}>
                                                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
                                                                <i className="fa-solid fa-chart-pie" style={{ marginRight: 4 }} />Профиль риска
                                                            </div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                                <div style={{ padding: 10, background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 8, textAlign: 'center' }}>
                                                                    <i className="fa-solid fa-crown" style={{ color: '#fb923c', fontSize: 16, marginBottom: 4 }} />
                                                                    <div style={{ fontSize: 20, fontWeight: 800, color: '#fb923c' }}>{selected.stats.admin_fault_count}</div>
                                                                    <div style={{ fontSize: 10, color: '#94a3b8' }}>Администрация</div>
                                                                    <div style={{ fontSize: 11, color: '#fb923c', marginTop: 2 }}>{selected.stats.admin_fault_percent}%</div>
                                                                </div>
                                                                <div style={{ padding: 10, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8, textAlign: 'center' }}>
                                                                    <i className="fa-solid fa-user" style={{ color: '#a78bfa', fontSize: 16, marginBottom: 4 }} />
                                                                    <div style={{ fontSize: 20, fontWeight: 800, color: '#a78bfa' }}>{selected.stats.employee_fault_count}</div>
                                                                    <div style={{ fontSize: 10, color: '#94a3b8' }}>Сотрудники</div>
                                                                    <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 2 }}>{selected.stats.employee_fault_percent}%</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {selected.personnel?.length > 0 && (
                                                        <div style={{ marginBottom: 16 }}>
                                                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
                                                                <i className="fa-solid fa-users" style={{ marginRight: 4 }} />Персонал ({selected.personnel.length})
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                {selected.personnel.map((p, i) => (
                                                                    <div key={i} style={{ padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                                                        <div>
                                                                            <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>{p.post_name}</div>
                                                                            <div style={{ fontSize: 10, color: '#64748b' }}>{p.incident_count} инц. • {formatDate(p.last_incident_date)}</div>
                                                                        </div>
                                                                        <Badge variant={p.role === 'administration' ? 'warning' : 'info'} size="sm">
                                                                            {p.role === 'administration' ? 'Админ' : 'Сотр.'}
                                                                        </Badge>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {selected.violations?.length > 0 && (
                                                        <div>
                                                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
                                                                <i className="fa-solid fa-list" style={{ marginRight: 4 }} />Нарушения ({selected.violations.length})
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
                                                                {selected.violations.map((v, i) => (
                                                                    <div key={i} style={{ padding: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6 }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                            <span style={{ color: '#fca5a5', fontSize: 12, fontWeight: 700 }}>#{v.incident_id}</span>
                                                                            <span style={{ color: '#94a3b8', fontSize: 11 }}>{formatDate(v.date)}</span>
                                                                        </div>
                                                                        <div style={{ fontSize: 12, color: '#e2e8f0', marginBottom: 4 }}>{v.reason}</div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                            <Badge variant={v.is_admin_fault ? 'warning' : 'info'} size="sm">
                                                                                {v.is_admin_fault ? 'Админ' : 'Сотр.'}
                                                                            </Badge>
                                                                            <span style={{ color: '#f87171', fontSize: 12, fontWeight: 700 }}>-{v.total_ball}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </Card>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </>
                        )}
                    </>
                )}

                {!results && !isLoading && !hasSearched && !error && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card padding={40}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                    <i className="fa-solid fa-store" style={{ fontSize: 36, color: '#f59e0b' }} />
                                </div>
                                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Укажите адрес ПВЗ</h2>
                                <p style={{ fontSize: 14, color: '#94a3b8', maxWidth: 400, margin: '0 auto' }}>Введите город, улицу и дом для проверки</p>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </div>

            <PvzReportModal
                isOpen={!!reportModalData}
                onClose={() => setReportModalData(null)}
                pvz={reportModalData}
            />
        </div>
    );
}