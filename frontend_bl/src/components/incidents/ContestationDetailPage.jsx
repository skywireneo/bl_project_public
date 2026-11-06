import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, Button, Badge, EmptyState, Divider, Alert, Textarea } from "../ui/UIComponents";
import UnifiedFileManager from "../authorized/unifiedFiles/UnifiedFileManager";
import {
    getContestation,
    getContestationTransitionInfo,
    transitionContestation,
    updateContestationDescription,
    getIncidentHistory, updateAdminAssessment
} from "../../http/incidentsAPI";
import { Context } from "../..";
import RecentCreatedIncidents from "../mainPage/RecentCreatedIncidents";
import IncidentHistoryTimeline from "./IncidentHistoryTimeline";
import AdminAssessmentControls from "./AdminAssessmentControls";
import ConfirmModal from "./ConfirmModal";
import DetailSkeleton, { SKELETON_STYLES } from "../incidents/DetailSkeleton";

const CONTESTATION_STATUS_CONFIG = {
    contestation_new: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', icon: 'fa-clock', label: 'Новое' },
    contestation_in_progress: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: 'fa-spinner', label: 'В обработке' },
    contestation_rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', icon: 'fa-circle-xmark', label: 'Отклонено' },
    contested_full: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', icon: 'fa-check-double', label: 'Оспорено полностью' },
    contested_partial: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', icon: 'fa-check', label: 'Оспорено частично' },
    contestation_withdrawn: { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)', icon: 'fa-arrow-rotate-left', label: 'Отозвано' }
};

export default function ContestationDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(Context);

    const [contestation, setContestation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [activeTab, setActiveTab] = useState('details');
    const [history, setHistory] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [editDescription, setEditDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [transitionInfo, setTransitionInfo] = useState(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [canEdit, setCanEdit] = useState(false);

    const [adminAssessment, setAdminAssessment] = useState({});
    const saveTimerRef = useRef(null);
    const originalAssessmentRef = useRef(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isChecklistCollapsed, setIsChecklistCollapsed] = useState(false);
    const [assessmentSaved, setAssessmentSaved] = useState(false);

    // Состояние для аккордеона родительского инцидента
    const [showParentInfo, setShowParentInfo] = useState(false);

    // Состояние для модалки подтверждения частичного оспаривания
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, targetStatus: null });

    const isAdmin = user?.user?.status && ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"].includes(user.user.status);

    useEffect(() => { loadContestation(); }, [id]);

    useEffect(() => {
        if (activeTab === 'timeline' && !contestation?.access_restricted) loadHistory();
    }, [activeTab, contestation?.access_restricted]);

    useEffect(() => {
        if (isAdmin && contestation && !contestation.access_restricted) loadTransitionInfo();
    }, [isAdmin, contestation?.id, contestation?.access_restricted]);

    // === ФУНКЦИЯ РАСЧЁТА ЧЕК-ЛИСТА МОДЕРАТОРА (для оспариваний) ===
    const getContestationChecklist = (cont, assessment) => {
        const localChecks = [
            {
                id: 'check_contest_pii',
                label: 'В описании оспаривания нет персональных данных (паспорта, полные телефоны)',
                isDone: assessment?.check_contest_pii === true,
                required: true
            },
            {
                id: 'check_contest_toxic',
                label: 'Текст оспаривания не содержит нецензурной лексики или прямых угроз',
                isDone: assessment?.check_contest_toxic === true,
                required: true
            },
            {
                id: 'check_contest_files_valid',
                label: 'Приложенные файлы читаемы и напрямую относятся к оспариванию',
                isDone: assessment?.check_contest_files_valid === true,
                required: true
            },
            {
                id: 'check_parent_updated',
                label: 'Данные в основном инциденте скорректированы (если оспаривание удовлетворено)',
                isDone: assessment?.check_parent_updated === true,
                required: true,
                isNA: !['contested_full', 'contested_partial'].includes(cont?.status?.code) // Не применимо, если не оспорено
            }
        ];

        const advisoryItems = [
            // {
            //     id: 'expertise',
            //     label: 'Внутренняя экспертиза заполнена',
            //     isDone: !!assessment?.verdict && !!assessment?.evidence,
            //     required: false
            // },
            // {
            //     id: 'status',
            //     label: 'Статус переведен в финальный',
            //     isDone: ['contested_full', 'contested_partial', 'contestation_rejected', 'contestation_withdrawn'].includes(cont?.status?.code),
            //     required: false
            // },
            // {
            //     id: 'tg_updated',
            //     label: 'Пост в Telegram обновлен или удален (если инцидент был опубликован)',
            //     isDone: assessment?.tg_updated === true || !cont?.parentIncident?.hasTgPost,
            //     required: false,
            //     isNA: !cont?.parentIncident?.hasTgPost
            // }
        ];

        const allItems = [...localChecks, ...advisoryItems];
        const requiredItems = allItems.filter(i => i.required && !i.isNA);
        const completedRequired = requiredItems.filter(i => i.isDone).length;
        const totalRequired = requiredItems.length;
        const percentage = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 100;

        return { items: allItems, completed: completedRequired, total: totalRequired, percentage };
    };

    const checklist = isAdmin && contestation ? getContestationChecklist(contestation, adminAssessment) : null;

    // Инициализация оценки при загрузке
    useEffect(() => {
        if (contestation?.admin_assessment && !isInitialized) {
            const initialData = contestation.admin_assessment || {};
            setAdminAssessment(initialData);
            originalAssessmentRef.current = JSON.stringify(initialData);
            setIsInitialized(true);
        }
    }, [contestation?.admin_assessment, isInitialized]);

    // Автоматически сворачиваем чек-лист, когда он выполнен на 100%
    useEffect(() => {
        if (checklist?.percentage === 100) {
            setIsChecklistCollapsed(true);
        }
    }, [checklist?.percentage]);

    // Тихое сохранение в БД
    const saveAssessmentSilently = async (data) => {
        try {
            await updateAdminAssessment(id, data); // id здесь - это contestationId, который совпадает с incident_id в БД
            setAssessmentSaved(true);
            setTimeout(() => setAssessmentSaved(false), 2000);
        } catch (err) {
            console.error('Assessment auto-save error:', err);
        }
    };

    // Debounced auto-save
    useEffect(() => {
        if (!isInitialized) return;
        const currentString = JSON.stringify(adminAssessment);
        if (currentString === originalAssessmentRef.current) return; // Нет изменений

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        setAssessmentSaved(false);

        saveTimerRef.current = setTimeout(() => {
            saveAssessmentSilently(adminAssessment);
            originalAssessmentRef.current = currentString;
        }, 500);

        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [adminAssessment, isInitialized]);

    // Хелпер для обновления полей
    const updateAssessmentField = (field, value) => {
        setAdminAssessment(prev => ({ ...prev, [field]: value }));
    };

    const loadContestation = async () => {
        try {
            setLoading(true);
            const storedToken = localStorage.getItem(`contestation_owner_${id}`);
            const response = await getContestation(id, storedToken);
            if (response.success) {
                setContestation(response.data);
                if (!storedToken && response.data.ownerToken) localStorage.setItem(`contestation_owner_${id}`, response.data.ownerToken);
                setEditDescription(response.data.description || '');
                setCanEdit(response.data.status.code == 'contestation_new')
            }
        } catch (err) {
            setError(err.message || 'Ошибка загрузки оспаривания');
        } finally {
            setLoading(false);
        }
    };

    const loadHistory = async () => {
        setIsHistoryLoading(true);
        try {
            const data = await getIncidentHistory(id);
            setHistory(Array.isArray(data) ? data : (data?.records || []));
        } catch (err) {
            console.error('History load error:', err);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const loadTransitionInfo = async () => {
        try {
            const response = await getContestationTransitionInfo(id);
            if (response.success) setTransitionInfo(response.data);
        } catch (err) {
            console.error('Failed to load transition info:', err);
        }
    };

    const handleSaveDescription = async () => {
        setIsSaving(true);
        try {
            const storedToken = localStorage.getItem(`contestation_owner_${id}`);
            await updateContestationDescription(id, editDescription, storedToken);
            setContestation(prev => ({ ...prev, description: editDescription }));
            setIsEditing(false);
            loadHistory();
        } catch (err) {
            alert(err.message || 'Ошибка сохранения');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTransitionClick = (statusCode) => {
        if (statusCode === 'contested_partial') {
            setConfirmModal({ isOpen: true, targetStatus: statusCode });
        } else {
            executeTransition(statusCode);
        }
    };

    const executeTransition = async (statusCode) => {
        setConfirmModal({ isOpen: false, targetStatus: null });
        setIsTransitioning(true);
        try {
            await transitionContestation(id, statusCode);
            loadContestation();
            loadTransitionInfo();
            loadHistory();
        } catch (err) {
            alert(err.message || 'Ошибка обновления статуса');
        } finally {
            setIsTransitioning(false);
        }
    };

    // Обработчик сохранения перекрёстной проверки для оспаривания
    const handleSaveContestationAssessment = async (id, updatedAssessment) => {
        await updateAdminAssessment(id, updatedAssessment);
        setContestation(prev => ({
            ...prev,
            admin_assessment: updatedAssessment,
            admin_assessment_history: updatedAssessment.history || [],
            has_user_checked: true
        }));
    };

    const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleString('ru-RU') : '—';

    if (loading) return <div style={{ padding: 24 }}><DetailSkeleton /></div>;
    if (error) return (
        <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
            <Alert variant="danger" message={error} />
            <Button variant="secondary" onClick={() => navigate('/incidents')} style={{ marginTop: 16 }}>Вернуться к инцидентам</Button>
        </div>
    );

    if (contestation?.access_restricted) {
        const statusCfg = CONTESTATION_STATUS_CONFIG[contestation.status?.code] || CONTESTATION_STATUS_CONFIG.contestation_new;
        return (
            <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
                <Button variant="ghost" onClick={() => navigate(`/incidents/${contestation.parentIncident.id}`)} style={{ marginBottom: 16 }}>← К основному инциденту</Button>
                <Card style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <i className={`fa-solid ${statusCfg.icon}`} style={{ color: statusCfg.color, fontSize: 32 }} />
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>Доступ к деталям ограничен</h2>
                    <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24, lineHeight: 1.7 }}>Это оспаривание находится в статусе, который не предполагает публичного просмотра деталей.</p>
                    <Button variant="primary" icon="fa-solid fa-arrow-left" onClick={() => navigate(`/incidents/${contestation.parentIncident.id}`)}>Перейти к основному инциденту</Button>
                </Card>
            </div>
        );
    }

    const statusCfg = CONTESTATION_STATUS_CONFIG[contestation.status?.code] || CONTESTATION_STATUS_CONFIG.contestation_new;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <style>{SKELETON_STYLES}</style>
            <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
                <RecentCreatedIncidents />

                {/* Заголовок */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                    <div>
                        <Button variant="ghost" onClick={() => navigate(`/incidents/${contestation.parentIncident.id}`)} style={{ marginBottom: 12 }}>← К основному инциденту</Button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Оспаривание {contestation.id}</h1>
                            <Badge style={{ fontSize: 13, padding: '6px 14px', fontWeight: 600, background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}`, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <i className={`fa-solid ${statusCfg.icon}`} style={{ fontSize: 11 }} /> {statusCfg.label}
                            </Badge>
                        </div>
                        <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>Создано: {formatDate(contestation.createdAt)}</p>
                    </div>
                </div>

                {/* Дисклеймер */}
                <Card style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.05) 0%, rgba(245,158,11,0.03) 100%)', border: '1px solid rgba(234,179,8,0.2)', marginBottom: 20 }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(234,179,8,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#eab308', fontSize: 18 }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>Правовой дисклеймер <Badge variant="warning" style={{ fontSize: 10, padding: '2px 8px' }}>Важно</Badge></div>
                            <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
                                Информация об оспаривании публикуется «как есть». Она <strong style={{ color: '#e2e8f0' }}>не является</strong> официальным решением до момента рассмотрения модерацией.
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Основная сетка */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', gap: 20 }}>

                    {/* ЛЕВАЯ КОЛОНКА */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <Card padding={0} style={{ overflow: 'hidden' }}>
                            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                {[{ key: 'details', label: 'Детали', icon: 'fa-file-lines' }, { key: 'timeline', label: 'История', icon: 'fa-clock-rotate-left' }].map(t => (
                                    <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ flex: 1, padding: '14px 16px', background: activeTab === t.key ? 'rgba(99,102,241,0.1)' : 'transparent', border: 'none', borderBottom: activeTab === t.key ? '2px solid #6366f1' : '2px solid transparent', color: activeTab === t.key ? '#e2e8f0' : '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        <i className={`fa-solid ${t.icon}`} style={{ fontSize: 12 }} /> {t.label}
                                    </button>
                                ))}
                            </div>

                            <div style={{ padding: 24 }}>
                                <AnimatePresence mode="wait">
                                    {activeTab === 'details' && (
                                        <motion.div key="details" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
                                            {/* Описание оспаривания */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                                <h2 style={{ fontSize: 18, fontWeight: 600, color: '#f1f5f9', margin: 0 }}>Текст оспаривания</h2>
                                                {(isAdmin || canEdit) && !isEditing && <Button variant="secondary" size="sm" icon="fa-solid fa-pen" onClick={() => setIsEditing(true)}>Редактировать</Button>}
                                            </div>
                                            {isEditing ? (
                                                <div style={{ marginBottom: 20 }}>
                                                    <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={8} style={{ marginBottom: 16 }} />
                                                    <div style={{ display: 'flex', gap: 12 }}>
                                                        <Button variant="primary" onClick={handleSaveDescription} loading={isSaving}>Сохранить</Button>
                                                        <Button variant="secondary" onClick={() => { setIsEditing(false); setEditDescription(contestation.description); }}>Отмена</Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 16, lineHeight: 1.6, color: '#e2e8f0', whiteSpace: 'pre-wrap', marginBottom: 24 }}>
                                                    {contestation.description || 'Нет описания'}
                                                </div>
                                            )}

                                            <Divider style={{ margin: '24px 0' }} />

                                            {/* АККОРДЕОН: Информация об основном инциденте */}
                                            <div style={{ marginBottom: 24 }}>
                                                <button onClick={() => setShowParentInfo(!showParentInfo)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: 18, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 16 }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <i className="fa-solid fa-link" style={{ color: '#6366f1' }} /> Основной инцидент
                                                    </span>
                                                    <i className={`fa-solid fa-chevron-${showParentInfo ? 'up' : 'down'}`} style={{ fontSize: 14, color: '#64748b' }} />
                                                </button>

                                                <AnimatePresence>
                                                    {showParentInfo && (
                                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden' }}>
                                                            <Card style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', padding: 20, marginBottom: 16 }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#a5b4fc', fontFamily: 'monospace' }}>ID: {contestation.parentIncident.id}</span>
                                                                    <Button variant="secondary" size="sm" icon="fa-solid fa-arrow-up-right-from-square" iconPosition="right" onClick={() => navigate(`/incidents/${contestation.parentIncident.id}`)}>Открыть в новой вкладке</Button>
                                                                </div>
                                                                <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                                                                    {contestation.parentIncident.description || 'Нет описания'}
                                                                </div>
                                                                <Divider style={{ margin: '16px 0' }} />
                                                                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <i className="fa-solid fa-paperclip" style={{ color: '#6366f1' }} /> Доказательства инцидента
                                                                </h4>
                                                                <UnifiedFileManager moduleName="incident_evidence" recordId={contestation.parentIncident.id} canEdit={false} enableViewer={true} />
                                                            </Card>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {/* Доказательства оспаривания */}
                                            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <i className="fa-solid fa-paperclip" style={{ color: '#6366f1' }} /> Доказательства оспаривания
                                            </h3>
                                            <UnifiedFileManager moduleName="incident_evidence" recordId={id} canEdit={isAdmin || canEdit} enableViewer={true} />
                                        </motion.div>
                                    )}

                                    {activeTab === 'timeline' && (
                                        <motion.div
                                            key="timeline"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.25 }}
                                        >
                                            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>История изменений</h2>
                                            <IncidentHistoryTimeline
                                                history={history}
                                                isLoading={isHistoryLoading}
                                                error={null}
                                                emptyMessage="Пока нет записей об изменениях этого оспаривания."
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </Card>
                    </div>

                    {/* ПРАВАЯ КОЛОНКА */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Карточка информации */}
                        <Card>
                            <h4 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 16, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="fa-solid fa-circle-info" style={{ color: '#6366f1' }} /> Информация
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{ width: 42, height: 42, borderRadius: 10, background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <i className={`fa-solid ${statusCfg.icon}`} style={{ color: statusCfg.color, fontSize: 18 }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Текущий статус</div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: statusCfg.color, lineHeight: 1.2 }}>{statusCfg.label}</div>
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><i className="fa-solid fa-user-tag" style={{ width: 12 }} /> Кем представлен создатель</div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{contestation.creatorInfo || 'Не указано'}</div>
                                </div>

                                {isAdmin && contestation.creatorEmail && (
                                    <div>
                                        <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><i className="fa-solid fa-envelope" style={{ width: 12 }} /> Email создателя</div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#818cf8', wordBreak: 'break-all' }}>{contestation.creatorEmail}</div>
                                    </div>
                                )}

                                {/* ОБНОВЛЕННЫЙ БЛОК: Информация о публикации при успехе */}
                                {contestation.publishOnSuccess && (
                                    <Alert variant="info" style={{ fontSize: 12, padding: '10px 12px', lineHeight: 1.4 }}>
                                        <i className="fa-solid fa-eye" style={{ marginRight: 6 }} />
                                        При полном данном оспаривании оно и инцидент будут доступны. Если закрыто через другое оспаривание, доступность инцидента управляется другим оспариванием.
                                    </Alert>
                                )}
                            </div>
                        </Card>

                        {/* ЧЕК-ЛИСТ МОДЕРАТОРА (СВЁРТЫВАЕМЫЙ) */}
                        {isAdmin && checklist && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                                {isChecklistCollapsed ? (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        onClick={() => setIsChecklistCollapsed(false)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '12px 16px',
                                            background: checklist.percentage === 100 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                            border: `1px solid ${checklist.percentage === 100 ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                            borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = checklist.percentage === 100 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = checklist.percentage === 100 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <i className={`fa-solid ${checklist.percentage === 100 ? 'fa-circle-check' : 'fa-list-check'}`} style={{ color: checklist.percentage === 100 ? '#10b981' : '#f59e0b', fontSize: 16 }} />
                                            <span style={{ fontSize: 13, fontWeight: 600, color: checklist.percentage === 100 ? '#10b981' : '#f59e0b' }}>
                                                {checklist.percentage === 100 ? 'Все проверки пройдены' : 'Чек-лист модератора'}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: 11, color: checklist.percentage === 100 ? '#6ee7b7' : '#fcd34d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {checklist.completed}/{checklist.total}
                                            <i className="fa-solid fa-chevron-down" style={{ fontSize: 10 }} />
                                        </span>
                                    </motion.div>
                                ) : (
                                    <Card style={{
                                        background: checklist.percentage === 100 ? 'rgba(16,185,129,0.05)' : 'rgba(245,158,11,0.05)',
                                        border: `1px solid ${checklist.percentage === 100 ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: checklist.percentage === 100 ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <i className={`fa-solid ${checklist.percentage === 100 ? 'fa-circle-check' : 'fa-list-check'}`} />
                                                Чек-лист модератора
                                            </h4>
                                            {checklist.percentage === 100 && (
                                                <button
                                                    onClick={() => setIsChecklistCollapsed(true)}
                                                    style={{
                                                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                                                        color: '#10b981', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                                                        padding: '4px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16,185,129,0.2)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
                                                >
                                                    Свернуть <i className="fa-solid fa-chevron-up" style={{ fontSize: 9 }} />
                                                </button>
                                            )}
                                        </div>

                                        <div style={{ height: 6, background: 'rgba(0,0,0,0.2)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${checklist.percentage}%` }}
                                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                                style={{ height: '100%', background: checklist.percentage === 100 ? '#10b981' : '#f59e0b' }}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {checklist.items.map((item) => (
                                                <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                                    <div style={{ marginTop: 2, flexShrink: 0, width: 16 }}>
                                                        {item.isNA ? (
                                                            <i className="fa-solid fa-minus" style={{ color: '#64748b', fontSize: 12 }} title="Не применимо" />
                                                        ) : item.isDone ? (
                                                            <i className="fa-solid fa-circle-check" style={{ color: '#10b981', fontSize: 14 }} />
                                                        ) : (
                                                            <i className="fa-regular fa-circle" style={{ color: checklist.percentage === 100 ? '#10b981' : '#94a3b8', fontSize: 14 }} />
                                                        )}
                                                    </div>
                                                    <label style={{ flex: 1, cursor: item.isNA ? 'default' : 'pointer', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                                        <input
                                                            type="checkbox"
                                                            disabled={item.isNA}
                                                            checked={item.isDone || false}
                                                            onChange={(e) => updateAssessmentField(item.id, e.target.checked)}
                                                            style={{ width: 16, height: 16, marginTop: 2, accentColor: '#22c55e', cursor: 'pointer', flexShrink: 0 }}
                                                        />
                                                        <div>
                                                            <div style={{
                                                                fontSize: 12, fontWeight: 600,
                                                                color: item.isDone || item.isNA ? '#e2e8f0' : '#94a3b8',
                                                                textDecoration: item.isDone ? 'line-through' : 'none',
                                                                opacity: item.isDone ? 0.7 : 1, transition: 'all 0.2s'
                                                            }}>
                                                                {item.label}
                                                            </div>
                                                            {!item.isDone && !item.isNA && (
                                                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>
                                                                    💡 {item.hint || 'Отметьте, когда выполнено'}
                                                                </div>
                                                            )}
                                                            {item.isNA && (
                                                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                                                    Не применимо для текущего статуса
                                                                </div>
                                                            )}
                                                        </div>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, minHeight: 24 }}>
                                            {assessmentSaved ? (
                                                <motion.span
                                                    initial={{ opacity: 0, y: -5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    style={{ color: '#22c55e', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                                                >
                                                    <i className="fa-solid fa-circle-check" /> Сохранено автоматически
                                                </motion.span>
                                            ) : (
                                                <span style={{ color: '#64748b', fontSize: 11, fontStyle: 'italic' }}>
                                                    <i className="fa-solid fa-cloud-arrow-up" style={{ marginRight: 4 }} /> Изменения сохраняются автоматически
                                                </span>
                                            )}
                                        </div>
                                    </Card>
                                )}
                            </motion.div>
                        )}

                        {/* НОВЫЙ КОМПОНЕНТ УПРАВЛЕНИЯ ПРОВЕРКАМИ */}
                        {isAdmin && contestation && !contestation.access_restricted && (
                            // Аналогично обновите пропсы:
                            <AdminAssessmentControls
                                entityId={id}
                                assessmentHistory={contestation.admin_assessment_history || contestation.admin_assessment?.history || []}
                                hasUserChecked={contestation.has_user_checked || false}
                                canUserCheck={contestation.can_user_check !== false}
                                currentUserId={user?.user?.id}
                                onSuccess={() => loadContestation()} // Просто перезагружаем данные оспаривания
                            />
                        )}

                        {/* Карточка действий с кнопками статусов НАПРЯМУЮ */}
                        {isAdmin && (
                            <Card>
                                <h4 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 16, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <i className="fa-solid fa-bolt" style={{ color: '#6366f1' }} /> Действия
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {transitionInfo?.available_transitions?.map((trans) => {
                                        const cfg = CONTESTATION_STATUS_CONFIG[trans.code] || CONTESTATION_STATUS_CONFIG.contestation_new;
                                        const isPartial = trans.code === 'contested_partial';

                                        return (
                                            <Button
                                                key={trans.code}
                                                variant={isPartial ? 'warning' : 'secondary'}
                                                icon={`fa-solid ${cfg.icon}`}
                                                onClick={() => handleTransitionClick(trans.code)}
                                                fullWidth
                                                disabled={isTransitioning}
                                                loading={isTransitioning && confirmModal.targetStatus === trans.code}
                                                style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                                            >
                                                {cfg.label}
                                            </Button>
                                        );
                                    })}
                                    {(!transitionInfo?.available_transitions || transitionInfo.available_transitions.length === 0) && (
                                        <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: 12 }}>Нет доступных переходов из текущего статуса.</div>
                                    )}
                                </div>
                            </Card>
                        )}
                        {/* === БЛОК ИНФОРМАЦИИ ОБ ОТЗЫВЕ оспаривания === */}
                        {!isAdmin && contestation.status?.code !== 'contested_partial'
                            && contestation.status?.code !== 'contested_full' && contestation.status?.code !== 'contestation_rejected'
                            && contestation.status?.code !== 'contestation_withdrawn' && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3, duration: 0.35 }}
                                >
                                    <Card style={{
                                        background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(139,92,246,0.02) 100%)',
                                        border: '1px solid rgba(99,102,241,0.2)'
                                    }}>
                                        <h4 style={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: '#6366f1',
                                            marginBottom: 12,
                                            textTransform: 'uppercase',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8
                                        }}>
                                            <i className="fa-solid fa-circle-info" style={{ color: '#6366f1' }} />
                                            Отзыв оспаривания
                                        </h4>
                                        <div style={{
                                            fontSize: 13,
                                            color: '#94a3b8',
                                            lineHeight: 1.6,
                                            marginBottom: 16
                                        }}>
                                            Если вы хотите отозвать это оспаривание, пожалуйста, свяжитесь с нашей службой поддержки.
                                            Укажите номер оспаривания, почту автора и причину отзыва.
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <Button
                                                variant="secondary"
                                                icon="fa-solid fa-envelope"
                                                onClick={() => window.location.href = `mailto:support@incident-service.com?subject=Отзыв оспаривания #${contestation.id}`}
                                                fullWidth
                                                style={{ justifyContent: 'flex-start', fontSize: 12 }}
                                            >
                                                support@incident-service.com
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                icon="fa-solid fa-brands fa-telegram"
                                                onClick={() => window.open('https://t.me/incident_support_bot', '_blank')}
                                                fullWidth
                                                style={{ justifyContent: 'flex-start', fontSize: 12 }}
                                            >
                                                @incident_support_bot
                                            </Button>
                                        </div>

                                        <div style={{
                                            marginTop: 12,
                                            padding: '10px 12px',
                                            background: 'rgba(99,102,241,0.08)',
                                            border: '1px solid rgba(99,102,241,0.15)',
                                            borderRadius: 8,
                                            fontSize: 11,
                                            color: '#94a3b8',
                                            lineHeight: 1.5
                                        }}>
                                            <i className="fa-solid fa-circle-info" style={{ color: '#6366f1', marginRight: 6 }} />
                                            В обращении обязательно укажите номер оспаривания: <strong style={{ color: '#e2e8f0' }}>#{contestation.id}</strong>
                                        </div>
                                    </Card>
                                </motion.div>
                            )}
                    </div>
                </div>
            </div>

            {/* МОДАЛКА ПОДТВЕРЖДЕНИЯ ДЛЯ "ОСПОРЕНО ЧАСТИЧНО" */}
            <AnimatePresence>
                {confirmModal.isOpen && confirmModal.targetStatus === 'contested_partial' && (
                    <ConfirmModal
                        isOpen={confirmModal.isOpen}
                        onClose={() => setConfirmModal({ isOpen: false, targetStatus: null })}
                        onConfirm={() => executeTransition('contested_partial')}
                        title="Подтверждение: Оспорено частично"
                        variant="danger"
                        confirmText="Да, данные изменены. Применить статус"
                        isLoading={isTransitioning}
                        description={
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <Alert variant="danger" style={{ fontSize: 13, padding: '12px', margin: 0 }}>
                                    <strong> ВНИМАНИЕ, ОБЯЗАТЕЛЬНО К ПРОЧТЕНИЮ:</strong><br /><br />
                                    Перед выставлением этого статуса вы <strong>ОБЯЗАНЫ</strong>:<br />
                                    1. Перейти в основной инцидент и <strong>изменить/удалить</strong> те данные, которые были оспорены и признаны некорректными.<br />
                                    2. Если по этому инциденту <strong>был создан пост в Telegram</strong> {contestation?.parentIncident?.hasTgPost && <span style={{ color: '#fca5a5' }}>(пост существует)</span>}, вы <strong>обязаны обновить или удалить</strong> этот пост, чтобы не вводить пользователей в заблуждение.<br /><br />
                                    <em>Невыполнение этих действий приведет к распространению недостоверной информации.</em>
                                </Alert>
                            </div>
                        }
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}