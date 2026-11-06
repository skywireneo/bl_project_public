import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input, Card, Badge, EmptyState } from '../../ui/UIComponents';
import { getCriticalActions, executeCriticalAction, getCriticalActionsLogs, toggleCriticalActionLock } from '../../../http/criticalActionsAPI';
import { CATEGORIES } from './constants';

// Импорты компонентов
import CriticalActionCard from './components/CriticalActionCard';
import ActionHistory from './components/ActionHistory';
import WhitelistSection from './components/WhitelistSection';
import MaintenanceSection from './components/MaintenanceSection';
import ConfirmActionModal from './modals/ConfirmActionModal';
import { NotificationModal, WhitelistInfoModal, WafSettingsInfoModal } from './modals/SystemModals';
import CacheManagementSection from './components/CacheManagementSection';

function CriticalActionsPage() {
    // === Стейты Критических Действий ===
    const [criticalActions, setCriticalActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lockedCards, setLockedCards] = useState({});
    const [executionState, setExecutionState] = useState({});

    // === Стейты Модалки Подтверждения ===
    const [modalState, setModalState] = useState({ isOpen: false, action: null, pendingValue: null });
    const [confirmInput, setConfirmInput] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [canConfirm, setCanConfirm] = useState(false);

    // === Стейты UI и Фильтров ===
    const [expandedCategories, setExpandedCategories] = useState(Object.keys(CATEGORIES).reduce((acc, key) => { acc[key] = true; return acc; }, {}));
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSeverity, setFilterSeverity] = useState('all');
    const [infoModalOpen, setInfoModalOpen] = useState(false);
    const [wafInfoModalOpen, setWafInfoModalOpen] = useState(false);
    const [notificationModal, setNotificationModal] = useState({ isOpen: false, type: 'success', message: '' });

    // === Стейты Логов ===
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(true);
    const [logsPagination, setLogsPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

    const executionTimersRef = useRef({});
    const isMountedRef = useRef(true);

    // === API Загрузки ===
    const loadCriticalActions = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getCriticalActions();
            if (!isMountedRef.current) return;
            let actions = Array.isArray(response) ? response : (response?.data || response?.items || response?.actions || []);
            setCriticalActions(actions);
            setLockedCards(actions.reduce((acc, action) => { acc[action.id_name] = true; return acc; }, {}));
            setError(null);
        } catch (err) {
            if (isMountedRef.current) { setError('Ошибка загрузки данных'); setCriticalActions([]); }
        } finally { if (isMountedRef.current) setLoading(false); }
    }, []);

    const loadLogs = useCallback(async (page = 1, limit = 10) => {
        try {
            setLogsLoading(true);
            const response = await getCriticalActionsLogs(page, limit);
            if (!isMountedRef.current) return;
            const meta = response.meta || {};
            setLogs(response.data || []);
            setLogsPagination({ page: meta.page || page, limit: meta.limit || limit, total: meta.total || 0, totalPages: meta.totalPages || Math.ceil((meta.total || 0) / (meta.limit || limit)) });
        } catch (err) { console.error('Error loading logs:', err); }
        finally { if (isMountedRef.current) setLogsLoading(false); }
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        loadCriticalActions();
        loadLogs(1, 10);
        return () => {
            isMountedRef.current = false;
            Object.values(executionTimersRef.current).forEach(timer => clearTimeout(timer));
        };
    }, [loadCriticalActions, loadLogs]);

    // === Логика Подтверждения ===
    useEffect(() => {
        if (countdown > 0 && modalState.isOpen) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0 && modalState.isOpen) {
            if (!modalState.action?.need_extra_confirmation || modalState.pendingValue === 'false') setCanConfirm(true);
            else checkConfirmText();
        }
    }, [countdown, modalState.isOpen, modalState.action, modalState.pendingValue]);

    useEffect(() => { checkConfirmText(); }, [confirmInput, modalState.action]);

    const checkConfirmText = () => {
        if (modalState.action && confirmInput.toLowerCase() === modalState.action.confirmText?.toLowerCase()) setCanConfirm(true);
        else setCanConfirm(false);
    };

    const handleExecute = (action, value = null) => {
        if (value === 'false') { setModalState({ isOpen: true, action, pendingValue: value }); setCanConfirm(true); return; }
        if (!action.need_extra_confirmation) { setModalState({ isOpen: true, action, pendingValue: value }); setCountdown(5); setCanConfirm(false); return; }
        setModalState({ isOpen: true, action, pendingValue: value }); setConfirmInput(''); setCountdown(5); setCanConfirm(false);
    };

    const handleCloseModal = () => { setModalState({ isOpen: false, action: null, pendingValue: null }); setConfirmInput(''); setCountdown(0); setCanConfirm(false); };

    const confirmExecute = async () => {
        const action = modalState.action;
        const value = modalState.pendingValue;
        setExecutionState(prev => ({ ...prev, [action.id_name]: 'loading' }));
        handleCloseModal();
        try {
            await executeCriticalAction(action.id_name, value);
            if (!isMountedRef.current) return;
            setExecutionState(prev => ({ ...prev, [action.id_name]: 'success' }));
            await loadCriticalActions();
            await loadLogs(logsPagination.page, logsPagination.limit);
            if (executionTimersRef.current[action.id_name]) clearTimeout(executionTimersRef.current[action.id_name]);
            executionTimersRef.current[action.id_name] = setTimeout(() => { if (isMountedRef.current) setExecutionState(prev => ({ ...prev, [action.id_name]: null })); delete executionTimersRef.current[action.id_name]; }, 1500);
        } catch (error) { if (isMountedRef.current) setExecutionState(prev => ({ ...prev, [action.id_name]: null })); }
    };

    // === Обработчики UI ===
    const toggleCategory = (categoryId) => setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
    const toggleLock = async (actionId) => {
        const isCurrentlyLocked = lockedCards[actionId];
        const newLockState = !isCurrentlyLocked;
        setLockedCards(prev => ({ ...prev, [actionId]: newLockState }));
        try { await toggleCriticalActionLock(actionId, newLockState); await loadLogs(logsPagination.page, logsPagination.limit); }
        catch (error) { setLockedCards(prev => ({ ...prev, [actionId]: isCurrentlyLocked })); }
    };

    const showNotification = (type, message) => setNotificationModal({ isOpen: true, type, message });

    // === Фильтрация и Группировка ===
    const filteredActions = Array.isArray(criticalActions) ? criticalActions.filter(action => {
        const matchesSearch = action.title?.toLowerCase().includes(searchTerm.toLowerCase()) || action.description?.toLowerCase().includes(searchTerm.toLowerCase());
        let matchesFilter = filterSeverity === 'all';
        if (filterSeverity === 'high') matchesFilter = action.severity === 2;
        if (filterSeverity === 'medium') matchesFilter = action.severity === 1;
        if (filterSeverity === 'low') matchesFilter = action.severity === 0;
        return matchesSearch && matchesFilter;
    }) : [];

    const groupedActions = Array.from(filteredActions || []).reduce((acc, action) => {
        const category = action.category || 'system';
        if (!acc[category]) acc[category] = [];
        acc[category].push(action);
        return acc;
    }, {});

    const lockedCount = Object.values(lockedCards || {}).filter(v => v === true).length;
    const totalCount = Array.isArray(criticalActions) ? criticalActions.length : 0;

    if (loading) return (<div style={{ padding: "clamp(16px, 3vw, 32px)" }}><div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 40, marginBottom: 16, color: '#6366f1' }} /><div style={{ fontSize: 16, fontWeight: 600 }}>Загрузка критических действий...</div></div></div>);
    if (error) return (<div style={{ padding: "clamp(16px, 3vw, 32px)" }}><Card padding={40}><EmptyState icon="fa-exclamation-triangle" title="Ошибка загрузки" description={error} action={<Button variant="primary" onClick={loadCriticalActions} icon="fa-rotate">Повторить</Button>} /></Card></div>);

    return (
        <div style={{ padding: "clamp(16px, 3vw, 32px)" }}>
            {/* Приветственный баннер */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(245,158,11,0.1) 100%)", borderRadius: 20, border: "1px solid rgba(239,68,68,0.2)", padding: "clamp(24px, 4vw, 36px)", marginBottom: 28, position: "relative", overflow: "hidden" }}>
                <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,68,68,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <h2 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 800, marginBottom: 12, color: "#f1f5f9", display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, boxShadow: '0 4px 20px rgba(239,68,68,0.3)' }}><i className="fa-solid fa-triangle-exclamation" /></div>
                    Критические действия системы
                </h2>
                <p style={{ fontSize: 14, color: "#cbd5e1", maxWidth: 720, lineHeight: 1.7, marginBottom: 0 }}><i className="fa-solid fa-circle-info" style={{ marginRight: 8, color: '#f59e0b' }} />Данные действия являются <strong style={{ color: '#fca5a5' }}>необратимыми</strong> и могут существенно повлиять на работу системы. Все операции логируются для аудита.</p>
            </motion.div>

            {/* Панель управления */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
                <Card padding={20} style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: 220 }}><Input icon="fa-search" placeholder="Поиск по названию или описанию..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <Button variant={filterSeverity === 'all' ? 'primary' : 'secondary'} size="sm" onClick={() => setFilterSeverity('all')} icon="fa-list">Все</Button>
                            <Button variant={filterSeverity === 'high' ? 'danger' : 'secondary'} size="sm" onClick={() => setFilterSeverity('high')} icon="fa-bolt">Высокий</Button>
                            <Button variant={filterSeverity === 'medium' ? 'warning' : 'secondary'} size="sm" onClick={() => setFilterSeverity('medium')} icon="fa-triangle-exclamation">Средний</Button>
                            <Button variant={filterSeverity === 'low' ? 'success' : 'secondary'} size="sm" onClick={() => setFilterSeverity('low')} icon="fa-check">Низкий</Button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))', borderRadius: 10, border: '1px solid rgba(245,158,11,0.2)' }}>
                            <i className="fa-solid fa-lock" style={{ color: '#f59e0b' }} />
                            <span style={{ fontSize: 13, color: '#fbbf24', fontWeight: 700 }}>{lockedCount} / {totalCount}</span>
                            <span style={{ fontSize: 12, color: '#94a3b8' }}>заблокировано</span>
                        </div>
                    </div>
                    {(searchTerm || filterSeverity !== 'all') && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: 14, padding: '12px 14px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), transparent)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <span style={{ fontSize: 13, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 8 }}><i className="fa-solid fa-filter" />Найдено: <strong style={{ color: '#f1f5f9' }}>{filteredActions.length}</strong> из {totalCount} действий</span>
                            <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setFilterSeverity('all'); }} icon="fa-times">Сбросить</Button>
                        </motion.div>
                    )}
                </Card>
            </motion.div>

            {/* Категории */}
            {Object.entries(CATEGORIES).map(([catId, category], catIdx) => {
                const actions = groupedActions[catId];
                const isExpanded = expandedCategories[catId];
                if (!actions || actions.length === 0) return null;
                return (
                    <motion.div key={catId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + catIdx * 0.08, duration: 0.4 }} style={{ marginBottom: 24 }}>
                        <div onClick={() => toggleCategory(catId)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: `linear-gradient(135deg, ${category.bgColor}, transparent)`, borderRadius: 14, borderLeft: `4px solid ${category.color}`, cursor: 'pointer', transition: 'all 0.2s', marginBottom: isExpanded ? 16 : 0, border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${category.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className={category.icon} style={{ color: category.color, fontSize: 18 }} /></div>
                            <h3 style={{ margin: 0, color: '#f1f5f9', fontWeight: 700, fontSize: 16, flex: 1 }}>{category.title}</h3>
                            <Badge variant="default">{actions.length} {actions.length === 1 ? 'действие' : actions.length < 5 ? 'действия' : 'действий'}</Badge>
                            <i className="fa-solid fa-chevron-up" style={{ color: '#94a3b8', transition: 'transform 0.3s', transform: isExpanded ? 'rotate(0deg)' : 'rotate(180deg)', fontSize: 12 }} />
                        </div>
                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(420px, 100%), 1fr))', gap: 16 }}>
                                        {actions.map((action, index) => (
                                            <CriticalActionCard key={action.id_name} action={action} isLocked={lockedCards[action.id_name]} onToggleLock={() => toggleLock(action.id_name)} onExecute={(value) => handleExecute(action, value)} executionState={executionState[action.id_name]} hasValue={action.need_value} delay={index * 0.05} />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                );
            })}

            {filteredActions.length === 0 && !loading && (<Card padding={40}><EmptyState icon="fa-inbox" title="Действия не найдены" description="Попробуйте изменить параметры поиска или фильтры" /></Card>)}

            {/* НОВЫЙ БЛОК: Управление кешем */}
            <CacheManagementSection onLogUpdate={() => loadLogs(logsPagination.page, logsPagination.limit)} />


            {/* История действий */}
            <ActionHistory logs={logs} logsLoading={logsLoading} logsPagination={logsPagination} onLoadLogs={loadLogs} onPageChange={(newPage) => loadLogs(newPage, logsPagination.limit)} />

            {/* Управление списками доступа (Забрали стейты внутрь) */}
            <WhitelistSection
                onLogUpdate={() => loadLogs(logsPagination.page, logsPagination.limit)}
                onOpenInfo={() => setInfoModalOpen(true)}          // <-- ДОБАВЛЕНО
                onOpenWafInfo={() => setWafInfoModalOpen(true)}    // <-- ДОБАВЛЕНО
            />

            {/* Техработы (Забрали стейты внутрь) */}
            <MaintenanceSection onShowNotification={showNotification} />

            {/* Кнопки вызова Info модалок (Перенесены в WhitelistSection в оригинале, но если они нужны здесь, оставьте. В оригинале они были внутри WhitelistSection. Я убрал их из главного файла, они теперь внутри WhitelistSection или их можно вернуть сюда. Для чистоты вернем их в главный файл) */}

            {/* Модалки */}
            <ConfirmActionModal isOpen={modalState.isOpen} action={modalState.action} countdown={countdown} canConfirm={canConfirm} confirmInput={confirmInput} onClose={handleCloseModal} onConfirm={confirmExecute} onInputChange={setConfirmInput} />
            <NotificationModal isOpen={notificationModal.isOpen} type={notificationModal.type} message={notificationModal.message} onClose={() => setNotificationModal({ isOpen: false, type: 'success', message: '' })} />

            {/* Info модалки вызываем из главного файла, если они нужны глобально. В оригинале они вызывались из WhitelistSection. Если вы оставили их в WhitelistSection, удалите эти строки. Если хотите глобально - добавьте стейты и кнопки выше. Для соответствия оригиналу, стейты infoModalOpen и wafInfoModalOpen оставлены здесь. */}
            <WhitelistInfoModal open={infoModalOpen} onClose={() => setInfoModalOpen(false)} />
            <WafSettingsInfoModal open={wafInfoModalOpen} onClose={() => setWafInfoModalOpen(false)} />

            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }`}</style>
        </div>
    );
}

export default CriticalActionsPage;