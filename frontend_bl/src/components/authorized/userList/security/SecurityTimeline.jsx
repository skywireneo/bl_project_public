import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Badge, EmptyState } from '../../../ui/UIComponents';
import { getLoginHistory, getPasswordHistory } from '../../../../http/userAPI';

const FilterPill = ({ active, onClick, children, color }) => (
    <button
        onClick={onClick}
        style={{
            padding: '6px 12px', borderRadius: 20, border: 'none',
            background: active ? `${color}20` : 'rgba(255,255,255,0.05)',
            color: active ? color : '#94a3b8',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.2s',
            border: `1px solid ${active ? `${color}40` : 'rgba(255,255,255,0.08)'}`
        }}
    >
        {children}
    </button>
);

const getTypeConfig = (type) => {
    switch (type) {
        case 'SELF_CHANGE': return { icon: 'fa-user-pen', color: '#6366f1', bg: 'rgba(99,102,241,0.1)', label: 'Смена пароля (самостоятельно)' };
        case 'ADMIN_RESET': return { icon: 'fa-user-shield', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Сброс пароля администратором' };
        case 'AUTO_GENERATED': return { icon: 'fa-wand-magic-sparkles', color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Автогенерация пароля' };
        case 'SECONDARY_REGEN': return { icon: 'fa-shield-halved', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', label: 'Регенерация доп. пароля' };
        case 'SEED_GENERATED': return { icon: 'fa-seedling', color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Генерация сид-фразы' };
        case 'SEED_DISABLED': return { icon: 'fa-trash', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'Отключение сид-фразы' };
        case 'TOTP_ENABLED': return { icon: 'fa-mobile-screen', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'Включение TOTP (2FA)' };
        case 'TOTP_DISABLED': return { icon: 'fa-mobile-screen-button', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'Отключение TOTP (2FA)' };
        case 'BACKUP_CODES_GENERATED': return { icon: 'fa-key', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Генерация аварийных кодов' };
        default: return { icon: 'fa-circle-question', color: '#64748b', bg: 'rgba(100,116,139,0.1)', label: type || 'Неизвестное действие' };
    }
};

const getStatusInfo = (status) => {
    switch (status) {
        case 'success': return { variant: 'success', label: 'Успешно', borderColor: 'rgba(34,197,94,0.15)', color: '#22c55e' };
        case 'secondary_required': return { variant: 'warning', label: 'Требуется 2FA', borderColor: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' };
        case 'fail': return { variant: 'danger', label: 'Ошибка', borderColor: 'rgba(239,68,68,0.15)', color: '#ef4444' };
        default: return { variant: 'secondary', label: status || 'Неизвестно', borderColor: 'rgba(100,116,139,0.15)', color: '#64748b' };
    }
};

const getMethodLabel = (method) => {
    const map = {
        password: 'Пароль', telegram: 'Telegram', oauth: 'OAuth',
        seed_phrase: 'Сид-фраза', device_code: 'Код с доверенного устройства',
        totp: 'Код из приложения (TOTP)', TOTP: 'Код из приложения (TOTP)',
        backup_code: 'Аварийный код', secondary_password: 'Доп. пароль безопасности'
    };
    return map[method] || (method ? method.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Неизвестно');
};

const getPlatformLabel = (platform) => {
    const map = { web: 'Веб-браузер', mobile: 'Мобильное приложение', desktop: 'Десктоп' };
    return map[platform] || (platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Неизвестно');
};

export default function SecurityTimeline({ userId }) {
    const [logins, setLogins] = useState([]);
    const [history, setHistory] = useState([]);
    const [isLoadingLogins, setIsLoadingLogins] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [filter, setFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [expandedIds, setExpandedIds] = useState(new Set());

    //  Разные лимиты для разных вкладок
    // На вкладке "Все" показываем больше записей (последние события), пагинация не нужна
    // На вкладке "Входы" — стандартная пагинация по 20 записей
    const LIMIT_OVERVIEW = 30; // для вкладки "Все" и "Изменения"
    const LIMIT_PAGINATED = 20; // для вкладки "Входы"

    const currentLimit = filter === 'login' ? LIMIT_PAGINATED : LIMIT_OVERVIEW;

    const fetchLogins = async () => {
        if (!userId) return;
        setIsLoadingLogins(true);
        try {
            //  На вкладке "Все" и "Изменения" всегда грузим первую страницу с большим лимитом
            const pageToLoad = filter === 'login' ? page : 1;
            const limitToLoad = filter === 'login' ? LIMIT_PAGINATED : LIMIT_OVERVIEW;
            const res = await getLoginHistory(userId, limitToLoad, pageToLoad);
            const data = Array.isArray(res) ? res : (res?.records || []);
            setLogins(data);
        } catch (err) { console.error(err); setLogins([]); }
        finally { setIsLoadingLogins(false); }
    };

    const fetchHistory = async () => {
        if (!userId) return;
        setIsLoadingHistory(true);
        try {
            const data = await getPasswordHistory(userId);
            setHistory(Array.isArray(data) ? data : []);
        } catch (err) { console.error(err); setHistory([]); }
        finally { setIsLoadingHistory(false); }
    };

    useEffect(() => { fetchLogins(); fetchHistory(); }, [userId, filter === 'login' ? page : 'all']); // eslint-disable-line

    //  При смене фильтра сбрасываем страницу
    useEffect(() => { setPage(1); }, [filter]);

    const toggleExpand = (id) => {
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setExpandedIds(next);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    // Объединяем и сортируем записи
    const allRecords = useMemo(() => {
        const loginRecords = logins.map(r => ({
            id: `login_${r.user_auth_login_id}`,
            type: 'login',
            date: r.attempt_time,
            data: r
        }));
        const historyRecords = history.map(r => ({
            id: `history_${r.id}`,
            type: 'security',
            date: r.created_at,
            data: r
        }));
        return [...loginRecords, ...historyRecords].sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [logins, history]);

    const filteredRecords = useMemo(() => {
        if (filter === 'all') return allRecords;
        return allRecords.filter(r => r.type === filter);
    }, [allRecords, filter]);

    const isLoading = isLoadingLogins || isLoadingHistory;

    return (
        <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fa-solid fa-clock-rotate-left" style={{ color: '#6366f1' }} />
                    Журнал событий
                    <Badge variant="info">{filteredRecords.length}</Badge>
                </h4>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" size="sm" icon="fa-solid fa-rotate"
                        onClick={() => { fetchLogins(); fetchHistory(); }} loading={isLoading}>
                        Обновить
                    </Button>
                </div>
            </div>

            {/* Фильтры */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                <FilterPill active={filter === 'all'} onClick={() => setFilter('all')} color="#6366f1">
                    <i className="fa-solid fa-layer-group" style={{ fontSize: 10 }} /> Все
                </FilterPill>
                <FilterPill active={filter === 'login'} onClick={() => setFilter('login')} color="#3b82f6">
                    <i className="fa-solid fa-right-to-bracket" style={{ fontSize: 10 }} /> Входы
                </FilterPill>
                <FilterPill active={filter === 'security'} onClick={() => setFilter('security')} color="#10b981">
                    <i className="fa-solid fa-shield-halved" style={{ fontSize: 10 }} /> Изменения безопасности
                </FilterPill>
            </div>

            {/*  Подсказка для вкладки "Все" */}
            {filter === 'all' && filteredRecords.length > 0 && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', marginBottom: 16,
                    background: 'rgba(99,102,241,0.05)',
                    border: '1px solid rgba(99,102,241,0.15)',
                    borderRadius: 8, fontSize: 11, color: '#94a3b8'
                }}>
                    <i className="fa-solid fa-circle-info" style={{ color: '#6366f1', fontSize: 10 }} />
                    Показаны последние {LIMIT_OVERVIEW} событий. Для просмотра полной истории входов переключитесь на вкладку «Входы».
                </div>
            )}

            {isLoading && allRecords.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                    <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24, marginBottom: 12, display: 'block' }} />
                    <div style={{ fontSize: 13 }}>Загрузка событий...</div>
                </div>
            ) : filteredRecords.length === 0 ? (
                <EmptyState icon="fa-solid fa-inbox" title="События не найдены" description="Записей для отображения пока нет" />
            ) : (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', paddingLeft: 24 }}>
                        <div style={{ position: 'absolute', left: 8, top: 12, bottom: 12, width: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }} />

                        {filteredRecords.map((record, idx) => {
                            if (record.type === 'login') {
                                const rec = record.data;
                                const isExpanded = expandedIds.has(record.id);
                                const deviceLabel = rec.device_name || 'Неизвестное устройство';
                                const osInfo = (rec.os && rec.os !== 'Unknown') ? ` / ${rec.browser || 'Unknown'}` : '';
                                const statusInfo = getStatusInfo(rec.status);

                                return (
                                    <motion.div key={record.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                                        style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '12px 0', position: 'relative' }}>
                                        <div style={{
                                            width: 18, height: 18, borderRadius: '50%', background: '#0f1117',
                                            border: `2px solid ${statusInfo.color}`, flexShrink: 0, zIndex: 1, marginTop: 2,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <i className="fa-solid fa-right-to-bracket" style={{ color: statusInfo.color, fontSize: 7 }} />
                                        </div>
                                        <div style={{
                                            flex: 1, borderRadius: 10,
                                            border: `1px solid ${statusInfo.borderColor}`,
                                            background: isExpanded ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.2)',
                                            transition: 'background 0.2s', cursor: 'pointer', overflow: 'hidden'
                                        }} onClick={() => toggleExpand(record.id)}>
                                            <div style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                                                        <Badge variant={statusInfo.variant} style={{ fontSize: 10, padding: '2px 8px' }}>{statusInfo.label}</Badge>
                                                        <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500 }}>
                                                            {getMethodLabel(rec.method)} • {getPlatformLabel(rec.platform)}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 11, color: '#94a3b8' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <i className="fa-solid fa-laptop" style={{ width: 12, textAlign: 'center' }} />
                                                            {deviceLabel}{osInfo && <span style={{ color: '#64748b' }}>{osInfo}</span>}
                                                        </span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <i className="fa-solid fa-network-wired" style={{ width: 12, textAlign: 'center' }} />
                                                            IP: {rec.ip_address || 'Не указан'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                                                    <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <i className="fa-solid fa-clock" />{formatDate(rec.attempt_time)}
                                                    </span>
                                                    <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`}
                                                        style={{ color: '#475569', fontSize: 10, transition: 'transform 0.2s' }} />
                                                </div>
                                            </div>
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                                                        <div style={{ padding: '0 14px 14px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 4, paddingTop: 14 }}>
                                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                                Технические детали
                                                            </div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                                                                <div style={{ gridColumn: '1 / -1' }}>
                                                                    <div style={{ fontSize: 10, color: '#475569', marginBottom: 2 }}>User Agent</div>
                                                                    <div style={{
                                                                        fontSize: 11, color: '#cbd5e1', fontFamily: 'monospace',
                                                                        wordBreak: 'break-all', background: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 6
                                                                    }}>
                                                                        {rec.user_agent || 'Не указан'}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: 10, color: '#475569', marginBottom: 2 }}>Система</div>
                                                                    <div style={{ fontSize: 12, color: '#e2e8f0' }}>{rec.system || 'Не указана'}</div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: 10, color: '#475569', marginBottom: 2 }}>Часовой пояс</div>
                                                                    <div style={{ fontSize: 12, color: '#e2e8f0' }}>{rec.timezone || 'Не указан'}</div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: 10, color: '#475569', marginBottom: 2 }}>ID записи в БД</div>
                                                                    <div style={{ fontSize: 12, color: '#a5b4fc', fontFamily: 'monospace' }}>{rec.user_auth_login_id}</div>
                                                                </div>
                                                                {rec.status === 'fail' && rec.fail_reason && (
                                                                    <div style={{ gridColumn: '1 / -1' }}>
                                                                        <div style={{ fontSize: 10, color: '#f87171', marginBottom: 2, fontWeight: 600 }}>Причина неудачи</div>
                                                                        <div style={{
                                                                            fontSize: 12, color: '#fca5a5', background: 'rgba(239,68,68,0.1)',
                                                                            padding: 8, borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)'
                                                                        }}>
                                                                            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />{rec.fail_reason}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </motion.div>
                                );
                            } else {
                                const item = record.data;
                                const config = getTypeConfig(item.change_type);
                                return (
                                    <motion.div key={record.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                                        style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '12px 0', position: 'relative' }}>
                                        <div style={{
                                            width: 18, height: 18, borderRadius: '50%', background: '#0f1117',
                                            border: `2px solid ${config.color}`, flexShrink: 0, zIndex: 1, marginTop: 2,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <i className={`fa-solid ${config.icon}`} style={{ color: config.color, fontSize: 7 }} />
                                        </div>
                                        <div style={{
                                            flex: 1, padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 10,
                                            border: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s'
                                        }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.3)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{config.label}</span>
                                                <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(item.created_at)}</span>
                                            </div>
                                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                                                {item.actor_login ? (
                                                    <>Инициатор: <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{item.actor_login}</span></>
                                                ) : 'Инициатор: Система'}
                                            </div>
                                            {item.reason && (
                                                <div style={{
                                                    marginTop: 8, padding: '8px 10px', background: 'rgba(245,158,11,0.05)',
                                                    borderLeft: '3px solid #f59e0b', borderRadius: 4, fontSize: 12, color: '#cbd5e1', fontStyle: 'italic'
                                                }}>
                                                    <strong style={{ color: '#fbbf24', fontStyle: 'normal' }}>Причина:</strong> {item.reason}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            }
                        })}
                    </div>

                    {/*  Пагинация ТОЛЬКО на вкладке "Входы" */}
                    {filter === 'login' && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                            <Button size="sm" variant="secondary" icon="fa-solid fa-chevron-left" disabled={page === 1} onClick={() => setPage(p => p - 1)} />
                            <span style={{ fontSize: 12, color: '#94a3b8' }}>Стр. {page}</span>
                            <Button size="sm" variant="secondary" icon="fa-solid fa-chevron-right" disabled={logins.length < LIMIT_PAGINATED} onClick={() => setPage(p => p + 1)} />
                        </div>
                    )}
                </>
            )}
        </Card>
    );
}