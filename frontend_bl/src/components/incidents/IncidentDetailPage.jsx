import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Card, Button, Badge, EmptyState, Divider, Alert, Input } from "../ui/UIComponents";
import { getIncident, getCreateIncidentData, deleteIncident, getIncidentHistory, softDeleteIncident, getTransitionInfo, transition, updateInterestScorePlusOne, verifyPvz, withdrawIncident, verifyCreatorEmail, updateAdminAssessment, getContestationsForIncident, updateShowAiResponse } from "../../http/incidentsAPI";
import UnifiedFileManager from "../authorized/unifiedFiles/UnifiedFileManager";
import ExportIncidentModal from "./ExportIncidentModal";
import ContestationModal from "./ContestationModal";
import { Context } from "../..";
import RecentCreatedIncidents from "../mainPage/RecentCreatedIncidents";
import StatsDisplay from "../authorized/stats/StatsDisplay";
import storageHandler from "../../http/utils/storageHandler";
import IncidentHistoryTimeline from "./IncidentHistoryTimeline";
import AiAnalysisModal from "./AiAnalysisModal";
import AdminAssessmentControls from "./AdminAssessmentControls";
import ConfirmModal from "./ConfirmModal";
import DetailSkeleton, { SKELETON_STYLES as IMPORTED_SKELETON_STYLES } from "./DetailSkeleton";
import ActiveBadge from "./ActiveBadge";
import InfoModal from "./InfoModal";
import AiReportModal from "./AiReportModal";
import RejectionModal from "./RejectionModal";
import { usePermission } from "../../utils/usePermission";

const ASSESSMENT_OPTIONS = {
    // --- Публичные оценки (видны всем) ---
    confidence: {
        label: 'Уверенность',
        hint: 'Насколько вы уверены, что инцидент произошёл именно так, как описано',
        options: ['Низкая', 'Средняя', 'Высокая'],
        adminOnly: false
    },
    severity: {
        label: 'Серьёзность',
        hint: 'Масштаб последствий и реальный ущерб от инцидента',
        options: ['Низкая', 'Средняя', 'Высокая', 'Критическая'],
        adminOnly: false
    },

    // --- Внутренние оценки (только для админов) ---
    verdict: {
        label: 'Финальный вердикт',
        hint: 'Ваше итоговое решение по фактам после проверки',
        options: ['Факт подтверждён', 'Ложь / Клевета', 'Недостаточно оснований', 'Техническая ошибка'],
        adminOnly: true
    },
    evidence: {
        label: 'Достоверность доказательств',
        hint: 'Качество и надёжность приложенных файлов или скриншотов',
        options: ['Неубедительно', 'Требует уточнения', 'Достаточно', 'Железобетонно'],
        adminOnly: true
    },
    investigation_depth: {
        label: 'Глубина проверки',
        hint: 'Насколько тщательно вы проработали и проверили этот инцидент',
        options: ['Поверхностная', 'Стандартная', 'Глубокая'],
        adminOnly: true
    }
};

// === CSS-анимации для оценки полезности (остались здесь, т.к. используются в основном файле) ===
const ANIMATION_STYLES = `
@keyframes interest-pulse {
    0% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
    70% { box-shadow: 0 0 0 12px rgba(99,102,241,0); }
    100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
}
@keyframes interest-thank {
    0% { transform: scale(0.8); opacity: 0; }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); opacity: 1; }
}
.interest-pulse { animation: interest-pulse 2s infinite; }
.interest-thank-anim { animation: interest-thank 0.5s ease-out forwards; }
`;

// Объединяем стили, чтобы они работали во всех return-блоках этого файла
const PAGE_STYLES = IMPORTED_SKELETON_STYLES + ANIMATION_STYLES;
// === УТИЛИТЫ ДЛЯ КУКИ ===
const COOKIE_PREFIX = 'incident_rated_';

function setRatingCookie(incidentId) {
    const expires = new Date(Date.now() + 5 * 60 * 1000).toUTCString();
    document.cookie = `${COOKIE_PREFIX}${incidentId}=true; expires=${expires}; path=/; SameSite=Lax`;
}

function hasRatingCookie(incidentId) {
    return document.cookie.split(';').some(cookie =>
        cookie.trim().startsWith(`${COOKIE_PREFIX}${incidentId}=`)
    );
}

// === КОНФИГУРАЦИЯ СТАТУСОВ ===
const getStatusConfig = (statusCode) => {
    const configs = {
        new: {
            color: '#3b82f6',
            bg: 'rgba(59,130,246,0.12)',
            border: 'rgba(59,130,246,0.3)',
            icon: 'fa-circle-plus',
            label: 'Новый'
        },
        in_progress: {
            color: '#f59e0b',
            bg: 'rgba(245,158,11,0.12)',
            border: 'rgba(245,158,11,0.3)',
            icon: 'fa-spinner',
            label: 'В работе'
        },
        resolved: {
            color: '#10b981',
            bg: 'rgba(16,185,129,0.12)',
            border: 'rgba(16,185,129,0.3)',
            icon: 'fa-circle-check',
            label: 'Завершён'
        },
        closed: {
            color: '#64748b',
            bg: 'rgba(100,116,139,0.12)',
            border: 'rgba(100,116,139,0.3)',
            icon: 'fa-lock',
            label: 'Закрыт'
        },
        rejected: {
            color: '#ef4444',
            bg: 'rgba(239,68,68,0.12)',
            border: 'rgba(239,68,68,0.3)',
            icon: 'fa-circle-xmark',
            label: 'Отклонён'
        },
        withdrawn: {
            color: '#f59e0b',
            bg: 'rgba(245,158,11,0.12)',
            border: 'rgba(245,158,11,0.3)',
            icon: 'fa-circle-stop',
            label: 'Отозван'
        }
    };
    return configs[statusCode] || {
        color: '#94a3b8',
        bg: 'rgba(148,163,184,0.08)',
        border: 'rgba(148,163,184,0.2)',
        icon: 'fa-circle-question',
        label: 'Неизвестно'
    };
};

export default function IncidentDetailPage() {
    const { id } = useParams();
    const { user } = useContext(Context)
    const navigate = useNavigate();
    const [incident, setIncident] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [canEdit, setCanEdit] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [tabDirection, setTabDirection] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSoftDeleting, setIsSoftDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    // Состояние для информационного окна верификации ПВЗ
    const [isPvzInfoModalOpen, setIsPvzInfoModalOpen] = useState(false);
    const [verifyingPvzId, setVerifyingPvzId] = useState(null);

    const OWNER_TOKEN_COOKIE = id ? `incident_owner_token_${id}` : null;
    const [ownerToken, setOwnerToken] = useState(null);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [modalEmail, setModalEmail] = useState('');
    const [modalError, setModalError] = useState('');
    const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawError, setWithdrawError] = useState('');

    const isAdminOrDev =
        user?.user?.status && ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"].includes(user.user.status);

    // === СОСТОЯНИЕ ПЕРЕХОДОВ ===
    const [transitionInfo, setTransitionInfo] = useState(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [transitionError, setTransitionError] = useState('');

    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

    const [isAiReportModalOpen, setIsAiReportModalOpen] = useState(false);
    const [isUpdatingAiVisibility, setIsUpdatingAiVisibility] = useState(false);

    // === СОСТОЯНИЕ МОДАЛЬНОГО ОКНА ===
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        description: '',
        variant: 'warning',
        confirmText: 'Подтвердить',
        onConfirm: null
    });

    // === СОСТОЯНИЕ ИСТОРИИ ===
    const [history, setHistory] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState('');

    // === СОСТОЯНИЕ ОЦЕНКИ ПОЛЕЗНОСТИ ===
    const [interestScore, setInterestScore] = useState(0);
    const [hasRated, setHasRated] = useState(false);
    const [isRating, setIsRating] = useState(false);
    const [ratingError, setRatingError] = useState('');

    const historyLoadTrigger = useRef(0);
    const contestationsBlockRef = useRef(null);

    // === PARALLAX ===
    const { scrollY } = useScroll();
    const parallaxY1 = useTransform(scrollY, [0, 1000], [0, -40]);
    const parallaxY2 = useTransform(scrollY, [0, 1000], [0, -25]);

    // Для модалки отклонения
    const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
    const [pendingTransition, setPendingTransition] = useState(null);

    // Для оценки админа
    const [adminAssessment, setAdminAssessment] = useState({});
    const saveTimerRef = useRef(null);
    const originalAssessmentRef = useRef(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const [isChecklistCollapsed, setIsChecklistCollapsed] = useState(false);

    // Состояния для оспариваний
    const [contestationModalOpen, setContestationModalOpen] = useState(false);
    const [contestations, setContestations] = useState([]);
    const [isLoadingContestations, setIsLoadingContestations] = useState(false);

    const canDelete = usePermission('incident:delete');

    // ФУНКЦИЯ РАСЧЁТА ЧЕК-ЛИСТА МОДЕРАТОРА
    // ФУНКЦИЯ РАСЧЁТА ЧЕК-ЛИСТА МОДЕРАТОРА
    const getModerationChecklist = (inc, assessment) => {
        // 5 обязательных локальных проверок
        const localChecks = [
            {
                id: 'check_pii',
                label: 'В описании нет персональных данных',
                isDone: assessment?.checklist_pii === true,
                hint: 'Убедитесь, что в тексте нет паспортов, полных номеров телефонов и адресов проживания',
                required: true
            },
            {
                id: 'check_toxic',
                label: 'Описание без нецензурной лексики и угроз',
                isDone: assessment?.checklist_toxic === true,
                hint: 'Текст не содержит мата, прямых угроз или разжигания розни',
                required: true
            },
            {
                id: 'check_pvz_maps',
                label: 'Адреса ПВЗ проверены на картах',
                isDone: assessment?.checklist_pvz_maps === true,
                hint: 'Адреса сверены с Яндекс/Google картами и исправлены при необходимости',
                required: true,
                isNA: !inc?.pvzList?.length // Если ПВЗ нет, пункт не применим
            },
            {
                id: 'check_files_valid',
                label: 'Файлы читаемы и относятся к инциденту',
                isDone: assessment?.checklist_files_valid === true,
                hint: 'Скриншоты/документы чёткие и напрямую связаны с описанной ситуацией',
                required: true
            },
            {
                id: 'check_files_privacy',
                label: 'В файлах скрыты данные третьих лиц',
                isDone: assessment?.checklist_files_privacy === true,
                hint: 'На скриншотах заблюрены номера телефонов и документы посторонних людей',
                required: true
            },
            {
                id: 'check_ai_analysis',
                label: 'Ознакомлен с ИИ-анализом',
                isDone: assessment?.check_ai_analysis === true,
                hint: 'Модератор изучил выводы ИИ и учёл их при формировании вердикта',
                required: true,
                isNA: !inc?.ai_response_flag // Не применимо, если ИИ-анализ не проводился
            }
        ];

        // Старые пункты (рекомендательные, не обязательные)
        const advisoryItems = [
            {
                id: 'expertise',
                label: 'Внутренняя экспертиза заполнена',
                isDone: !!assessment?.verdict && !!assessment?.evidence,
                hint: 'Заполните "Финальный вердикт" и "Достоверность доказательств"',
                required: false
            },
            {
                id: 'status',
                label: 'Статус: Завершён / Закрыт / Отклонён',
                isDone: ['resolved', 'closed', 'rejected'].includes(inc?.status),
                hint: 'Переведите инцидент в финальный статус',
                required: false
            },
            {
                id: 'pvz',
                label: 'Адреса ПВЗ подтверждены',
                isDone: !inc?.pvzList?.length || inc.pvzList.every(p => p.is_verified === true),
                hint: inc?.pvzList?.length ? 'Нажмите "Подтвердить адрес" в карточках ПВЗ' : 'ПВЗ не указаны (не требуется)',
                required: false,
                isNA: !inc?.pvzList?.length
            },
            {
                id: 'tg',
                label: 'Опубликовано в Telegram',
                isDone: inc?.tg_post === true,
                hint: 'Используйте кнопку "Экспорт для соцсетей"',
                required: false
            }
        ];

        const allItems = [...localChecks, ...advisoryItems];

        // Прогресс считается только по обязательным пунктам
        const requiredItems = allItems.filter(i => i.required && !i.isNA);
        const completedRequired = requiredItems.filter(i => i.isDone).length;
        const totalRequired = requiredItems.length;
        const percentage = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 100;

        return {
            items: allItems,
            completed: completedRequired,
            total: totalRequired,
            percentage
        };
    };

    // Получаем данные чек-листа (только для админов)
    const checklist = isAdminOrDev && incident ? getModerationChecklist(incident, adminAssessment) : null;

    const [assessmentSaved, setAssessmentSaved] = useState(false);

    // Инициализация оценки при загрузке инцидента
    useEffect(() => {
        if (incident?.admin_assessment && !isInitialized) {
            const initialData = incident.admin_assessment || {};
            setAdminAssessment(initialData);
            originalAssessmentRef.current = JSON.stringify(initialData); // Сохраняем оригинал
            setIsInitialized(true);
        }
    }, [incident?.admin_assessment, isInitialized]);

    // Автоматически сворачиваем чек-лист, когда он выполнен на 100%
    useEffect(() => {
        if (checklist?.percentage === 100) {
            setIsChecklistCollapsed(true);
        }
    }, [checklist?.percentage]);

    const saveAssessmentSilently = async (data) => {
        try {
            await updateAdminAssessment(id, data);
            setAssessmentSaved(true);
            setTimeout(() => setAssessmentSaved(false), 2000);
        } catch (err) {
            console.error('Assessment auto-save error:', err);
        }
    };

    useEffect(() => {
        // Если ещё не инициализированы — не сохраняем
        if (!isInitialized) return;

        // Проверяем, есть ли реальные изменения
        const currentString = JSON.stringify(adminAssessment);
        if (currentString === originalAssessmentRef.current) {
            return; // Нет изменений — не сохраняем
        }

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        setAssessmentSaved(false);

        saveTimerRef.current = setTimeout(() => {
            saveAssessmentSilently(adminAssessment);
            originalAssessmentRef.current = currentString; // Обновляем оригинал после сохранения
        }, 500);

        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [adminAssessment, isInitialized]);

    // === ЗАГРУЗКА ДАННЫХ ИНЦИДЕНТА ===
    const loadIncidentData = useCallback(async (token = null) => {
        try {
            setIsLoading(true);
            setLoadError('');
            setTransitionError('');

            const incidentData = await getIncident(id, token);

            if (incidentData && typeof incidentData === 'object' && 'success' in incidentData && incidentData.success === false) {
                setIncident(null);
                setLoadError(incidentData.message || 'Инцидент не найден');
                setCanEdit(false);
            } else {
                // ГЛАВНОЕ ИСПРАВЛЕНИЕ: обрабатываем access_restricted здесь
                if (incidentData.access_restricted) {
                    // 1. ПРОВЕРКА ВРЕМЕНИ: Прошло ли менее 15 минут и статус ли это 'new'
                    const isWithin15Minutes = incidentData.date_create
                        ? (new Date() - new Date(incidentData.date_create)) / (1000 * 60) <= 15
                        : false;

                    // 2. Если прошло более 15 минут ИЛИ статус уже не 'new', модалку НЕ показываем.
                    // Просто сохраняем данные и выходим, чтобы отрисовался экран "Доступ ограничен"
                    if (!isWithin15Minutes || incidentData.status !== 'new') {
                        setIncident(incidentData);
                        setIsLoading(false);
                        return;
                    }

                    // 3. Если мы всё ещё в пределах 15 минут и статус 'new', пробуем тихую верификацию
                    const cookieEmail = storageHandler.get('incident_creator_email', 'cookies') ||
                        storageHandler.get('incident_user_email', 'cookies');

                    if (cookieEmail) {
                        try {
                            const verifyRes = await verifyCreatorEmail(id, cookieEmail);
                            if (verifyRes.token) {
                                setOwnerToken(verifyRes.token);
                                storageHandler.add(OWNER_TOKEN_COOKIE, verifyRes.token, {
                                    method: 'cookies', expireTime: 960, path: '/', sameSite: 'Lax'
                                });
                                await loadIncidentData(verifyRes.token); // Рекурсивный вызов с токеном
                                return; // Успешно загрузили, выходим
                            }
                        } catch (e) {
                            // Тихая проверка не удалась, идем дальше к модалке
                        }
                    }

                    // 4. Если тихая проверка не удалась или email в куки не было, показываем модалку
                    setOwnerToken(null);
                    setModalEmail(cookieEmail || '');
                    setShowEmailModal(true);
                    setIncident(incidentData);
                    setIsLoading(false);
                    return;
                }

                setIncident(incidentData);
                const createData = await getCreateIncidentData();
                setCanEdit(createData.cenEdit !== false);
                const score = parseInt(incidentData.interest_score || '0', 10);
                setInterestScore(isNaN(score) ? 0 : score);
                setHasRated(hasRatingCookie(id));
            }
        } catch (err) {
            console.error(err);
            const message = err?.response?.data?.message || err.message || 'Не удалось загрузить инцидент';
            if (err?.response?.status === 404 || message.toLowerCase().includes('не найден')) {
                setLoadError('Инцидент не найден');
            } else {
                setLoadError(message);
            }
            setIncident(null);
            setCanEdit(false);
        } finally {
            setIsLoading(false);
        }
    }, [id, OWNER_TOKEN_COOKIE]);

    useEffect(() => {
        loadIncidentData();
    }, [loadIncidentData]);

    const getAssessmentVariant = (value) => {
        if (!value) return 'neutral';
        const v = value.toLowerCase();
        if (v.includes('высокая') || v.includes('железобетонно') || v.includes('достаточно')) return 'success';
        if (v.includes('средняя') || v.includes('требует уточнения')) return 'warning';
        if (v.includes('низкая') || v.includes('неубедительно') || v.includes('критическая')) return 'danger';
        return 'neutral';
    };

    // === ЗАГРУЗКА TRANSITION INFO ===
    useEffect(() => {
        let isMounted = true;

        if (!id) return;
        if (!canEdit) return;
        if (!isAdminOrDev) return;
        if (!user?.user?.status) return;

        const loadTransitionInfo = async () => {
            try {
                const transitionData = await getTransitionInfo(id);
                if (!isMounted) return;

                setTransitionInfo(transitionData);
            } catch (err) {
                if (!isMounted) return;
                console.error('Failed to load transition info:', err);
                setTransitionInfo(null);
            }
        };

        loadTransitionInfo();

        return () => { isMounted = false; };
    }, [id, canEdit, isAdminOrDev, user?.user?.status]);

    useEffect(() => {
        if (activeTab !== 'timeline') return;

        let isMounted = true;

        const loadHistory = async () => {
            setIsHistoryLoading(true);
            setHistoryError('');

            try {
                const data = await getIncidentHistory(id);
                if (!isMounted) return;

                const historyArray = Array.isArray(data)
                    ? data
                    : (data && Array.isArray(data.records) ? data.records : []);

                setHistory(historyArray);
            } catch (err) {
                if (!isMounted) return;
                console.error('History load error:', err);
                setHistoryError(err?.response?.data?.message || err.message || 'Не удалось загрузить историю');
                setHistory([]);
            } finally {
                if (isMounted) setIsHistoryLoading(false);
            }
        };

        loadHistory();

        return () => { isMounted = false; };
    }, [activeTab, id, historyLoadTrigger.current]);

    // Загрузка оспариваний для инцидента
    useEffect(() => {
        const loadContestations = async () => {
            // Показываем блок оспариваний только для финальных статусов
            // condition_id: 3=resolved, 4=closed, 5=rejected, 6=withdrawn
            if (!incident?.status || !['resolved', 'closed', 'rejected', 'withdrawn'].includes(incident.status)) {
                setContestations([]);
                return;
            }

            setIsLoadingContestations(true);
            try {
                const data = await getContestationsForIncident(id);
                setContestations(data && Array.isArray(data?.data) ? data?.data : []);
            } catch (err) {
                console.error('Failed to load contestations:', err);
                setContestations([]);
            } finally {
                setIsLoadingContestations(false);
            }
        };

        loadContestations();
    }, [id, incident?.status]);

    // === ПЕРЕКЛЮЧЕНИЕ ТАБА С ОПРЕДЕЛЕНИЕМ НАПРАВЛЕНИЯ ===
    const handleTabChange = (newTab) => {
        if (newTab === activeTab) return;
        const currentIdx = tabs.findIndex(t => t.key === activeTab);
        const newIdx = tabs.findIndex(t => t.key === newTab);
        setTabDirection(newIdx > currentIdx ? 1 : -1);
        setActiveTab(newTab);
    };

    const handleToggleAiVisibility = async (newValue) => {
        setIsUpdatingAiVisibility(true);
        try {
            await updateShowAiResponse(id, newValue);
            // Локально обновляем состояние, чтобы не перезагружать страницу
            setIncident(prev => ({
                ...prev,
                show_ai_response: newValue
            }));
        } catch (err) {
            console.error('Ошибка обновления видимости ИИ:', err);
            alert(err?.response?.data?.message || 'Не удалось обновить настройку');
        } finally {
            setIsUpdatingAiVisibility(false);
        }
    };

    // Обработчик сохранения перекрёстной проверки
    const handleSaveAssessment = async (id, updatedAssessment) => {
        await updateAdminAssessment(id, updatedAssessment);
        // Обновляем локальное состояние, чтобы история и флаги обновились мгновенно
        setIncident(prev => ({
            ...prev,
            admin_assessment: updatedAssessment,
            admin_assessment_history: updatedAssessment.history || [],
            has_user_checked: true // Пользователь только что оставил проверку
        }));
    };

    const handleVerifyEmail = async () => {
        setModalError('');
        setIsVerifyingEmail(true);
        try {
            const res = await verifyCreatorEmail(id, modalEmail);
            if (res.token) {
                setOwnerToken(res.token);
                storageHandler.add(OWNER_TOKEN_COOKIE, res.token, {
                    method: 'cookies', expireTime: 960, path: '/', sameSite: 'Lax'
                });
                setShowEmailModal(false);
                await loadIncidentData(res.token); // Перезагружаем данные с полным доступом
            }
        } catch (err) {
            setModalError(err?.response?.data?.message || 'Неверный email создателя');
        } finally {
            setIsVerifyingEmail(false);
        }
    };

    const handleWithdraw = async () => {
        setWithdrawError('');
        if (isAdminOrDev) {
            const withdrawnStatus = availableTransitions.find(t => t.code === 'withdrawn');
            if (withdrawnStatus) {
                await handleTransition(withdrawnStatus);
                return;
            }
        }
        setConfirmModal({
            isOpen: true,
            title: 'Отозвать инцидент?',
            description: 'Вы уверены, что хотите отозвать этот инцидент? После отзыва восстановление невозможно. Инцидент будет скрыт из публичного доступа.',
            variant: 'warning',
            confirmText: 'Отозвать',
            onConfirm: async () => {
                setIsWithdrawing(true);
                try {
                    // Используем email из инцидента (доступен после верификации) или из куки/модалки
                    const emailToUse = incident.user_add_email || modalEmail || storageHandler.get('incident_creator_email', 'cookies');
                    await withdrawIncident(id, emailToUse, incident.user_add_tg || null);
                    setConfirmModal({ isOpen: false });
                    window.location.reload();
                } catch (err) {
                    console.error(err);
                    setWithdrawError(err?.response?.data?.message || err.message || 'Не удалось отозвать инцидент');
                    setIsWithdrawing(false);
                    setConfirmModal({ isOpen: false });
                }
            }
        });
    };

    const handleVerifyPvz = async (pvzId, currentStatus) => {
        setVerifyingPvzId(pvzId);
        try {
            await verifyPvz(pvzId, !currentStatus);
            // Локально обновляем состояние, чтобы не перезагружать всю страницу
            setIncident(prev => ({
                ...prev,
                pvzList: prev.pvzList.map(p =>
                    p.id === pvzId ? { ...p, is_verified: !currentStatus } : p
                )
            }));
        } catch (err) {
            console.error('Pvz verify error:', err);
            // Можно добавить Alert, если нужно
        } finally {
            setVerifyingPvzId(null);
        }
    };

    // === ФУНКЦИЯ ОЦЕНКИ ПОЛЕЗНОСТИ ===
    const handleRateUseful = async () => {
        setIsRating(true);
        setRatingError('');

        try {
            await updateInterestScorePlusOne(id);
            setInterestScore(prev => prev + 1);
            setHasRated(true);
            setRatingCookie(id);
        } catch (err) {
            console.error('Rating error:', err);
            setRatingError(err?.response?.data?.message || err.message || 'Не удалось отправить отзыв');
        } finally {
            setIsRating(false);
        }
    };

    const handleRateNotUseful = async () => {
        setIsRating(true);
        setRatingError('');

        try {
            // await updateInterestScoreMinusOne(id);
            setHasRated(true);
            setRatingCookie(id);
        } catch (err) {
            console.error('Rating error:', err);
            setRatingError(err?.response?.data?.message || err.message || 'Не удалось отправить отзыв');
        } finally {
            setIsRating(false);
        }
    };

    const handleDelete = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Удалить инцидент?',
            description: 'Вы уверены, что хотите удалить этот инцидент? Это действие нельзя отменить. Все данные будут безвозвратно утеряны.',
            variant: 'danger',
            confirmText: 'Удалить',
            onConfirm: async () => {
                setIsDeleting(true);
                setDeleteError('');

                try {
                    await deleteIncident(id);
                    setConfirmModal({ isOpen: false });
                    navigate('/incidents');
                } catch (err) {
                    console.error(err);
                    setDeleteError(err?.response?.data?.message || err.message || 'Не удалось удалить инцидент');
                    setIsDeleting(false);
                    setConfirmModal({ isOpen: false });
                }
            }
        });
    };

    const handleSoftDelete = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Удалить по юридическим причинам?',
            description: 'Вы уверены, что хотите удалить этот инцидент по юридическим причинам? Инцидент будет скрыт из общего доступа.',
            variant: 'warning',
            confirmText: 'Удалить',
            onConfirm: async () => {
                setIsSoftDeleting(true);
                setDeleteError('');

                try {
                    await softDeleteIncident(id, 'legal');
                    setConfirmModal({ isOpen: false });
                    window.location.reload();
                } catch (err) {
                    console.error(err);
                    setDeleteError(err?.response?.data?.message || err.message || 'Не удалось удалить инцидент');
                    setIsSoftDeleting(false);
                    setConfirmModal({ isOpen: false });
                }
            }
        });
    };

    const handleTransition = async (targetStatus) => {
        // Если целевой статус - отклонен, открываем кастомную модалку
        if (targetStatus.code === 'rejected') {
            setPendingTransition(targetStatus);
            setIsRejectionModalOpen(true);
            return;
        }

        // Остальная логика для обычных переходов
        if (targetStatus.need_alert && targetStatus.descr) {
            setConfirmModal({
                isOpen: true,
                title: targetStatus.button_text || targetStatus.name,
                description: targetStatus.descr,
                variant: targetStatus.button_color || 'warning',
                confirmText: targetStatus.button_text || 'Подтвердить',
                onConfirm: async () => {
                    await executeTransition(targetStatus.code);
                }
            });
        } else {
            await executeTransition(targetStatus.code);
        }
    };

    const handleConfirmRejection = (finalReason) => {
        executeTransition(pendingTransition.code, finalReason);
        setIsRejectionModalOpen(false);
    };

    const executeTransition = async (targetStatusCode, rejReason = null) => {
        setIsTransitioning(true);
        setTransitionError('');
        try {
            await transition(id, targetStatusCode, rejReason); // Передаем причину
            setConfirmModal({ isOpen: false });
            window.location.reload();
        } catch (err) {
            console.error(err);
            setTransitionError(err?.response?.data?.message || err.message || 'Не удалось изменить состояние');
            setIsTransitioning(false);
            setConfirmModal({ isOpen: false });
        }
    };

    // Хелпер для обновления полей оценки
    const updateAssessmentField = (field, value) => {
        setAdminAssessment(prev => ({ ...prev, [field]: value }));
    };

    // Тихое сохранение чек-бокса в БД
    const saveChecklistSilently = async (field, value) => {
        try {
            const updatedAssessment = { ...adminAssessment, [field]: value };
            await updateAdminAssessment(id, updatedAssessment);
        } catch (err) {
            console.error('Checklist save error:', err);
        }
    };

    // === ПРОВЕРКА: прошло ли менее 15 минут с момента создания ===
    const isWithin15Minutes = React.useMemo(() => {
        if (!incident?.date_create) return false;
        const createDate = new Date(incident.date_create);
        const now = new Date();
        const diffMinutes = (now - createDate) / (1000 * 60);
        return diffMinutes <= 15;
    }, [incident?.date_create]);

    // === Рендеринг ошибок ===
    if (loadError) {
        const isNotFound = loadError === 'Инцидент не найден' || loadError.toLowerCase().includes('не найден');
        if (isNotFound) {
            return (
                <Card style={{ maxWidth: 600, margin: '40px auto' }}>
                    <EmptyState
                        icon="fa-solid fa-circle-question"
                        title="Инцидент не найден"
                        description={loadError}
                        action={
                            <Button variant="secondary" icon="fa-solid fa-arrow-left" onClick={() => navigate('/incidents')}>
                                К списку инцидентов
                            </Button>
                        }
                    />
                </Card>
            );
        }

        return (
            <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
                <Alert variant="danger" icon="fa-solid fa-circle-exclamation">
                    <strong>Инцидент не найден</strong>
                </Alert>
                <div style={{ marginTop: 20 }}>
                    <Button variant="secondary" icon="fa-solid fa-arrow-left" onClick={() => navigate('/incidents')}>
                        К списку инцидентов
                    </Button>
                </div>
            </div>
        );
    }

    if (!isLoading && !incident) {
        return (
            <Card>
                <EmptyState
                    icon="fa-solid fa-circle-question"
                    title="Инцидент не найден"
                    action={<Button variant="secondary" icon="fa-solid fa-arrow-left" onClick={() => navigate('/incidents')}>К списку</Button>}
                />
            </Card>
        );
    }

    if (isLoading) {
        return (
            <div>
                <style>{PAGE_STYLES}</style>
                <div style={{ marginBottom: 24 }}>
                    <div className="skeleton-box" style={{ height: 24, width: '40%', marginBottom: 8 }} />
                    <div className="skeleton-box" style={{ height: 16, width: '60%' }} />
                </div>
                <DetailSkeleton />
            </div>
        );
    }

    // === ЭКРАН ОГРАНИЧЕННОГО ДОСТУПА ===
    // Не показываем экран ограничения, если активна модалка ввода email
    if (!isLoading && incident?.access_restricted && !showEmailModal) {
        const restrictedStatusCfg = getStatusConfig(incident.status);
        return (
            <div>
                <style>{PAGE_STYLES}</style>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                            Инцидент #{incident.id}
                        </h1>
                        <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
                            {incident.status_name || 'Статус неизвестен'}
                        </p>
                    </div>
                    <Button variant="secondary" icon="fa-solid fa-arrow-left" onClick={() => navigate('/incidents')}>
                        Назад
                    </Button>
                </div>
                <Card style={{ maxWidth: 800, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: '50%',
                            background: restrictedStatusCfg.bg,
                            border: `1px solid ${restrictedStatusCfg.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 24px'
                        }}>
                            <i className={`fa-solid ${restrictedStatusCfg.icon}`} style={{ color: restrictedStatusCfg.color, fontSize: 32 }} />
                        </div>
                        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>
                            Доступ к деталям ограничен
                        </h2>
                        <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24, lineHeight: 1.7, maxWidth: 500, margin: '0 auto 24px' }}>
                            {incident.user_description}
                        </p>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 10,
                            padding: '12px 20px',
                            background: restrictedStatusCfg.bg,
                            border: `1px solid ${restrictedStatusCfg.border}`,
                            borderRadius: 12, marginBottom: 28
                        }}>
                            <i className={`fa-solid ${restrictedStatusCfg.icon}`} style={{ color: restrictedStatusCfg.color, fontSize: 14 }} />
                            <span style={{ fontSize: 14, fontWeight: 600, color: restrictedStatusCfg.color }}>
                                {incident.status_name || restrictedStatusCfg.label}
                            </span>
                        </div>
                        <br />
                        <Button variant="primary" icon="fa-solid fa-arrow-left" size="lg" onClick={() => navigate('/incidents')}>
                            К списку инцидентов
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // === ЭКРАН ОТОЗВАННОГО ИНЦИДЕНТА ===
    if (incident.status === 'withdrawn' && !isAdminOrDev) {
        return (
            <div>
                <style>{PAGE_STYLES}</style>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                            Инцидент #{incident.id}
                        </h1>
                        <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
                            Отозван
                        </p>
                    </div>
                    <Button variant="secondary" icon="fa-solid fa-arrow-left" onClick={() => navigate('/incidents')}>
                        Назад
                    </Button>
                </div>
                <Card style={{ maxWidth: 800, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: '50%',
                            background: 'rgba(245,158,11,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 24px'
                        }}>
                            <i className="fa-solid fa-circle-stop" style={{ color: '#f59e0b', fontSize: 32 }} />
                        </div>
                        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>
                            Инцидент отозван
                        </h2>
                        <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 32, lineHeight: 1.6 }}>
                            Этот инцидент был отозван заявителем или администратором и больше недоступен для просмотра.
                        </p>
                        <Button variant="primary" icon="fa-solid fa-arrow-left" size="lg" onClick={() => navigate('/incidents')}>
                            К списку инцидентов
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // === ЭКРАН УДАЛЕННОГО ИНЦИДЕНТА ===
    if (incident.deleted === true) {
        return (
            <div>
                <style>{PAGE_STYLES}</style>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                            Инцидент #{incident.id}
                        </h1>
                        <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
                            Удален
                        </p>
                    </div>
                    <Button variant="secondary" icon="fa-solid fa-arrow-left" onClick={() => navigate('/incidents')}>
                        Назад
                    </Button>
                </div>
                <Card style={{ maxWidth: 800, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: '50%',
                            background: 'rgba(239,68,68,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 24px'
                        }}>
                            <i className="fa-solid fa-trash" style={{ color: '#ef4444', fontSize: 32 }} />
                        </div>
                        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>
                            Инцидент удален
                        </h2>
                        <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 32, lineHeight: 1.6 }}>
                            Этот инцидент был удален и больше недоступен для просмотра.
                        </p>
                        {incident.deleted_reason && (
                            <div style={{
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 12, padding: '16px 20px',
                                marginBottom: 32, textAlign: 'left'
                            }}>
                                <div style={{
                                    fontSize: 12, fontWeight: 600, color: '#ef4444',
                                    textTransform: 'uppercase', marginBottom: 8,
                                    display: 'flex', alignItems: 'center', gap: 6
                                }}>
                                    <i className="fa-solid fa-circle-info" />
                                    Причина удаления
                                </div>
                                <div style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.6 }}>
                                    {incident.deleted_reason}
                                </div>
                            </div>
                        )}
                        <Button variant="primary" icon="fa-solid fa-arrow-left" size="lg" onClick={() => navigate('/incidents')}>
                            К списку инцидентов
                        </Button>
                        {canEdit && isAdminOrDev && (
                            <>
                                <Divider style={{ margin: '32px 0' }} />
                                <div style={{
                                    background: 'rgba(99,102,241,0.04)',
                                    border: '1px dashed rgba(99,102,241,0.2)',
                                    borderRadius: 12, padding: 20
                                }}>
                                    <h3 style={{
                                        fontSize: 14, fontWeight: 700, color: '#a5b4fc',
                                        marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8
                                    }}>
                                        <i className="fa-solid fa-shield-halved" style={{ color: '#818cf8' }} />
                                        Управление для администраторов
                                        <Badge variant="info" style={{ marginLeft: 8, fontSize: 11 }}>админ</Badge>
                                    </h3>
                                    <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 }}>
                                        Вы можете полностью удалить этот инцидент из базы данных. Это действие необратимо.
                                    </p>
                                    {deleteError && (
                                        <Alert variant="danger" icon="fa-solid fa-circle-exclamation" style={{ marginBottom: 16 }}>
                                            {deleteError}
                                        </Alert>
                                    )}
                                    <Button
                                        variant="danger" icon="fa-solid fa-trash"
                                        onClick={handleDelete} fullWidth
                                        disabled={isDeleting} loading={isDeleting}
                                    >
                                        {isDeleting ? 'Удаление...' : 'Удалить полностью'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </Card>
                <AnimatePresence>
                    {confirmModal.isOpen && (
                        <ConfirmModal
                            isOpen={confirmModal.isOpen}
                            onClose={() => setConfirmModal({ isOpen: false })}
                            onConfirm={confirmModal.onConfirm}
                            title={confirmModal.title}
                            description={confirmModal.description}
                            variant={confirmModal.variant}
                            confirmText={confirmModal.confirmText}
                            isLoading={isDeleting}
                        />
                    )}
                </AnimatePresence>
            </div>
        );
    }

    const tabs = [
        { key: 'details', label: 'Детали', icon: 'fa-file-lines' },
        { key: 'timeline', label: 'История', icon: 'fa-clock-rotate-left' }
    ];

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';

        if (typeof dateStr === 'string' && dateStr.includes('**')) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                return `${parts[2]}.${parts[1]}.${parts[0]}`;
            }
            return dateStr;
        }

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return dateStr;
        }

        return date.toLocaleString('ru-RU');
    };



    const formatDateOnly = (dateStr) => {
        if (!dateStr) return '—';

        if (typeof dateStr === 'string' && dateStr.includes('**')) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                return `${parts[2]}.${parts[1]}.${parts[0]}`;
            }
            return dateStr;
        }

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return dateStr;
        }

        return date.toLocaleDateString('ru-RU');
    };

    const buildServiceInfo = () => {
        if (!incident) return null;

        const items = [];

        if (incident.id) items.push({ label: 'ID инцидента', value: incident.id, mono: true });
        if (incident.date_create) {
            items.push({
                label: 'Дата создания',
                value: formatDate(incident.date_create)
            });
        }
        if (incident.add_reason_onPvz !== undefined) {
            items.push({
                label: 'Причина: на руководство ПВЗ',
                value: incident.add_reason_onPvz ? 'Да' : 'Нет'
            });
        }
        if (incident.user_add_email_id) {
            items.push({
                label: 'EmailId',
                value: incident.user_add_email_id
            });
        }
        if (incident.user_add_tg_id) {
            items.push({
                label: 'TgId',
                value: incident.user_add_tg_id
            });
        }

        (incident.personesList || []).forEach((p, idx) => {
            if (p.person_id) {
                items.push({
                    label: `Персона #${idx + 1} ID`,
                    value: p.person_id,
                    mono: true
                });
            }
            if (p.connector_id) {
                items.push({
                    label: `Персона #${idx + 1} connector_id`,
                    value: p.connector_id,
                    mono: true
                });
            }
            if (p.post_id) {
                items.push({ label: `Персона #${idx + 1} post_id`, value: p.post_id });
            }
            if (p.onPvz !== undefined) {
                items.push({
                    label: `Персона #${idx + 1} на руководство ПВЗ`,
                    value: p.onPvz ? 'Да' : 'Нет'
                });
            }
            if (p.created_at) {
                items.push({
                    label: `Персона #${idx + 1} создана`,
                    value: formatDate(p.created_at)
                });
            }

            (p.names_full || []).forEach((n, nIdx) => {
                if (n.id) {
                    items.push({
                        label: `ФИО #${nIdx + 1} ID`,
                        value: n.id,
                        mono: true
                    });
                }
                if (n.connector_id) {
                    items.push({
                        label: `ФИО #${nIdx + 1} connector_id`,
                        value: n.connector_id,
                        mono: true
                    });
                }
                if (n.phonetic_tokens?.length) {
                    items.push({
                        label: `ФИО #${nIdx + 1} фонетика`,
                        value: n.phonetic_tokens.join(' · ')
                    });
                }
                if (n.created_at) {
                    items.push({
                        label: `ФИО #${nIdx + 1} добавлено`,
                        value: formatDate(n.created_at)
                    });
                }
            });

            (p.phones_full || []).forEach((ph, phIdx) => {
                if (ph.id) {
                    items.push({
                        label: `Телефон #${phIdx + 1} ID`,
                        value: ph.id,
                        mono: true
                    });
                }
                if (ph.connector_id) {
                    items.push({
                        label: `Телефон #${phIdx + 1} connector_id`,
                        value: ph.connector_id,
                        mono: true
                    });
                }
                if (ph.phone_last_six) {
                    items.push({
                        label: `Телефон #${phIdx + 1} последние цифры`,
                        value: ph.phone_last_six,
                        mono: true
                    });
                }
                if (ph.created_at) {
                    items.push({
                        label: `Телефон #${phIdx + 1} добавлен`,
                        value: formatDate(ph.created_at)
                    });
                }
            });

            (p.tgNicks_full || []).forEach((tg, tgIdx) => {
                if (tg.id) {
                    items.push({
                        label: `TG #${tgIdx + 1} ID`,
                        value: tg.id,
                        mono: true
                    });
                }
                if (tg.connector_id) {
                    items.push({
                        label: `TG #${tgIdx + 1} connector_id`,
                        value: tg.connector_id,
                        mono: true
                    });
                }
                if (tg.created_at) {
                    items.push({
                        label: `TG #${tgIdx + 1} добавлен`,
                        value: formatDate(tg.created_at)
                    });
                }
            });
        });

        (incident.pvzList || []).forEach((pvz, idx) => {
            if (pvz.id) {
                items.push({ label: `ПВЗ #${idx + 1} ID`, value: pvz.id, mono: true });
            }
            if (pvz.connector_id) {
                items.push({
                    label: `ПВЗ #${idx + 1} connector_id`,
                    value: pvz.connector_id,
                    mono: true
                });
            }
            if (pvz.is_verified !== undefined) {
                items.push({
                    label: `ПВЗ #${idx + 1} адрес подтверждён`,
                    value: pvz.is_verified ? 'Да' : 'Нет'
                });
            }
            if (pvz.type_id) {
                items.push({ label: `ПВЗ #${idx + 1} type_id`, value: pvz.type_id });
            }
            if (pvz.created_at) {
                items.push({
                    label: `ПВЗ #${idx + 1} создан`,
                    value: formatDate(pvz.created_at)
                });
            }
            if (pvz.address_parts) {
                const parts = pvz.address_parts;
                const partsStr = [
                    parts.city && `город: ${parts.city}`,
                    parts.street && `улица: ${parts.street}`,
                    parts.home && `дом: ${parts.home}`
                ].filter(Boolean).join(', ');
                if (partsStr) {
                    items.push({
                        label: `ПВЗ #${idx + 1} адрес (разобранный)`,
                        value: partsStr
                    });
                }
            }
        });

        if (items.length === 0) return null;

        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                {isAdminOrDev ? <Card style={{ background: 'rgba(99,102,241,0.04)', border: '1px dashed rgba(99,102,241,0.2)' }}>
                    <h3 style={{
                        fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#a5b4fc',
                        display: 'flex', alignItems: 'center', gap: 10
                    }}>
                        <i className="fa-solid fa-gear" style={{ color: '#818cf8' }} />
                        Служебная информация
                        <Badge variant="info" style={{ marginLeft: 8, fontSize: 11 }}>админ</Badge>
                    </h3>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: 10
                    }}>
                        {items.map((item, idx) => (
                            <div key={idx} style={{
                                padding: '8px 12px',
                                background: 'rgba(0,0,0,0.25)',
                                borderRadius: 8,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2
                            }}>
                                <div style={{
                                    fontSize: 11, color: '#64748b', fontWeight: 600,
                                    textTransform: 'uppercase', letterSpacing: 0.5
                                }}>
                                    {item.label}
                                </div>
                                <div style={{
                                    fontSize: 13,
                                    color: '#e2e8f0',
                                    fontFamily: item.mono ? 'monospace' : 'inherit',
                                    wordBreak: 'break-all'
                                }}>
                                    {item.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card> : null}
            </motion.div>
        );
    };

    const currentStatus = transitionInfo?.current_status;
    const availableTransitions = transitionInfo?.available_transitions || [];
    const isPublishedInTg = incident?.tg_post === true;

    // === ФУНКЦИЯ ПРОКРУТКИ К БЛОКУ ОСПАРИВАНИЙ ===
    const scrollToContestations = () => {
        if (activeTab !== 'details') {
            setActiveTab('details');
            // Небольшая задержка, чтобы анимация переключения таба успела начаться
            setTimeout(() => {
                contestationsBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150);
        } else {
            contestationsBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // === КОНТЕНТ ТАБА "ДЕТАЛИ" ===
    const renderDetailsTab = () => (
        <motion.div
            key="details"
            initial={{ opacity: 0, x: 30 * tabDirection }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 * tabDirection }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
        >
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Badge variant="purple" icon="fa-solid fa-tag">
                        {incident.add_reason_name || 'Не указана'}
                    </Badge>
                    {incident.add_reason_onPvz ? (
                        <span
                            title="Руководство ПВЗ"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#a78bfa',
                                background: 'rgba(139,92,246,0.12)',
                                border: '1px solid rgba(139,92,246,0.3)',
                                borderRadius: 6,
                                padding: '3px 8px',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <i className="fa-solid fa-location-dot" style={{ fontSize: 10 }} />
                            На руководство ПВЗ
                        </span>
                    ) : <span
                        title="Инцидент создан на наёмного работника ПВЗ"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#a78bfa',
                            background: 'rgba(139,92,246,0.12)',
                            border: '1px solid rgba(139,92,246,0.3)',
                            borderRadius: 6,
                            padding: '3px 8px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <i className="fa-solid fa-location-dot" style={{ fontSize: 10 }} />
                        На наёмного работника
                    </span>}
                </div>

                {incident.user_add_email && (
                    <Badge variant="info" icon="fa-solid fa-envelope">
                        {incident.user_add_email}
                    </Badge>
                )}
                {incident.user_add_tg && (
                    <Badge variant="info" icon="fa-solid fa-brands fa-telegram">
                        @{incident.user_add_tg}
                    </Badge>
                )}
            </div>

            {incident.user_description && (
                <p style={{
                    fontSize: 14, color: '#94a3b8', lineHeight: 1.8,
                    whiteSpace: 'pre-wrap', marginBottom: 24
                }}>
                    {incident.user_description}
                </p>
            )}
            {/* ЧЕК-БОКСЫ ПРОВЕРКИ ОПИСАНИЯ (только для админов) */}
            {isAdminOrDev && incident.status !== 'new' && incident.user_description && (
                <div style={{
                    marginBottom: 24, padding: 14,
                    background: 'rgba(99,102,241,0.04)',
                    border: '1px solid rgba(99,102,241,0.15)',
                    borderRadius: 10
                }}>
                    <div style={{ fontSize: 11, color: '#818cf8', marginBottom: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="fa-solid fa-clipboard-check" style={{ fontSize: 12 }} />
                        Проверка текста модератором
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                            padding: '8px 12px', borderRadius: 8,
                            background: adminAssessment?.checklist_pii ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.2)',
                            border: `1px solid ${adminAssessment?.checklist_pii ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)'}`,
                            transition: 'all 0.2s'
                        }}>
                            <input
                                type="checkbox"
                                checked={adminAssessment?.checklist_pii || false}
                                onChange={(e) => updateAssessmentField('checklist_pii', e.target.checked)}
                                style={{ width: 16, height: 16, accentColor: '#22c55e', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: 12, color: adminAssessment?.checklist_pii ? '#86efac' : '#94a3b8', fontWeight: 500 }}>
                                В тексте отсутствуют персональные данные (паспорта, полные телефоны, адреса проживания)
                            </span>
                        </label>
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                            padding: '8px 12px', borderRadius: 8,
                            background: adminAssessment?.checklist_toxic ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.2)',
                            border: `1px solid ${adminAssessment?.checklist_toxic ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)'}`,
                            transition: 'all 0.2s'
                        }}>
                            <input
                                type="checkbox"
                                checked={adminAssessment?.checklist_toxic || false}
                                onChange={(e) => updateAssessmentField('checklist_toxic', e.target.checked)}
                                style={{ width: 16, height: 16, accentColor: '#22c55e', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: 12, color: adminAssessment?.checklist_toxic ? '#86efac' : '#94a3b8', fontWeight: 500 }}>
                                Описание не содержит нецензурной лексики, прямых угроз или разжигания розни
                            </span>
                        </label>
                    </div>
                </div>
            )}
            {/* ПУБЛИЧНЫЙ БЛОК: ВЫВОДЫ ИИ (если включена видимость) */}
            {incident.show_ai_response && incident.ai_response && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: 24 }}>
                    <Card style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(99,102,241,0.04) 100%)', border: '1px solid rgba(139,92,246,0.25)' }}>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#a78bfa', fontSize: 18 }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#c4b5fd', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    Анализ инцидента искусственным интеллектом
                                    <Badge variant="info" style={{ fontSize: 9, padding: '2px 6px', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: 'none' }}>AI</Badge>
                                </div>

                                {incident.ai_response.executive_summary && (
                                    <div style={{ marginBottom: 14 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>Краткая выжимка:</div>
                                        <p style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>{incident.ai_response.executive_summary}</p>
                                    </div>
                                )}

                                {incident.ai_response.objective_facts_only?.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>Установленные факты:</div>
                                        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {incident.ai_response.objective_facts_only.map((fact, idx) => (
                                                <li key={idx} style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: -14, color: '#22c55e' }}>•</span>
                                                    {fact}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </motion.div>
            )}

            {/* ЧЕК-БОКС: ОЗНАКОМЛЕНИЕ С ИИ (только для админов и если ИИ проводился) */}
            {isAdminOrDev && incident.ai_response_flag && (
                <div style={{ marginBottom: 24, padding: 14, background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, background: adminAssessment?.check_ai_analysis ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.2)', border: `1px solid ${adminAssessment?.check_ai_analysis ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)'}`, transition: 'all 0.2s' }}>
                        <input
                            type="checkbox"
                            checked={adminAssessment?.check_ai_analysis || false}
                            onChange={(e) => updateAssessmentField('check_ai_analysis', e.target.checked)}
                            style={{ width: 16, height: 16, accentColor: '#22c55e', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 12, color: adminAssessment?.check_ai_analysis ? '#86efac' : '#94a3b8', fontWeight: 500 }}>
                            <i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: 6, color: '#a78bfa' }} />
                            Я ознакомился с результатами ИИ-анализа и учёл их при вынесении вердикта
                        </span>
                    </label>
                </div>
            )}

            <Divider />
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fa-solid fa-users" style={{ color: '#6366f1' }} />
                Персоны ({(incident.personesList || []).length})
            </h3>

            {(incident.personesList || []).length === 0 ? (
                <div style={{
                    padding: 20, textAlign: 'center', color: '#64748b',
                    border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12
                }}>
                    <i className="fa-solid fa-user-slash" style={{ marginRight: 8 }} />
                    Персоны не указаны
                </div>
            ) : (
                incident.personesList.map((p, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08, duration: 0.3 }}
                        style={{
                            background: p.onPvz
                                ? 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(0,0,0,0.2) 100%)'
                                : 'rgba(0,0,0,0.2)',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 12,
                            border: p.onPvz
                                ? '1px solid rgba(139,92,246,0.25)'
                                : '1px solid rgba(255,255,255,0.04)'
                        }}>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <Badge variant="info" icon="fa-solid fa-briefcase">
                                    {p.position || 'Без должности'}
                                </Badge>

                                {p.onPvz ? (
                                    <span
                                        title="Руководство ПВЗ"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: '#a78bfa',
                                            background: 'rgba(139,92,246,0.15)',
                                            border: '1px solid rgba(139,92,246,0.35)',
                                            borderRadius: 6,
                                            padding: '3px 8px',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        <i className="fa-solid fa-location-dot" style={{ fontSize: 10 }} />
                                        Руководство ПВЗ
                                    </span>
                                ) : <span
                                    title="Наёмный работник ПВЗ"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: '#a78bfa',
                                        background: 'rgba(139,92,246,0.15)',
                                        border: '1px solid rgba(139,92,246,0.35)',
                                        borderRadius: 6,
                                        padding: '3px 8px',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <i className="fa-solid fa-location-dot" style={{ fontSize: 10 }} />
                                    Наёмный работник ПВЗ
                                </span>}

                                <ActiveBadge active={p.active} size="xs" />
                                {p.birthdate && (
                                    <span style={{ fontSize: 12, color: '#64748b' }}>
                                        <i className="fa-solid fa-cake-candles" style={{ marginRight: 4 }} />
                                        {formatDateOnly(p.birthdate)}
                                    </span>
                                )}
                            </div>
                            {p.person_id && (
                                <span style={{
                                    fontSize: 10, color: '#475569',
                                    fontFamily: 'monospace'
                                }}>
                                    {p.person_id.substring(0, 8)}…
                                </span>
                            )}
                        </div>

                        {p.fios && p.fios.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>
                                    <i className="fa-solid fa-id-card" style={{ marginRight: 4 }} />
                                    ФИО ({p.fios.length})
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {p.fios.map((fio, fIdx) => (
                                        <span key={fIdx} style={{
                                            fontSize: 13, color: '#e2e8f0',
                                            background: 'rgba(99,102,241,0.1)',
                                            padding: '4px 10px', borderRadius: 6
                                        }}>
                                            {fio}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {p.phones && p.phones.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>
                                    <i className="fa-solid fa-phone" style={{ marginRight: 4 }} />
                                    Телефоны ({p.phones.length})
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {p.phones.map((phone, phIdx) => (
                                        <span key={phIdx} style={{
                                            fontSize: 13, color: '#e2e8f0',
                                            fontFamily: 'monospace',
                                            background: 'rgba(34,197,94,0.1)',
                                            padding: '4px 10px', borderRadius: 6
                                        }}>
                                            {phone}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {p.tgNicks && p.tgNicks.length > 0 && (
                            <div>
                                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>
                                    <i className="fa-solid fa-brands fa-telegram" style={{ marginRight: 4 }} />
                                    Telegram ({p.tgNicks.length})
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {p.tgNicks.map((tg, tgIdx) => (
                                        <span key={tgIdx} style={{
                                            fontSize: 13, color: '#e2e8f0',
                                            background: 'rgba(59,130,246,0.1)',
                                            padding: '4px 10px', borderRadius: 6,
                                            display: 'inline-flex', alignItems: 'center', gap: 6
                                        }}>
                                            <i className="fa-solid fa-brands fa-telegram" style={{ color: '#3b82f6', fontSize: 11 }} />
                                            @{tg.username}
                                            {tg.id && (
                                                <span style={{ fontSize: 10, color: '#64748b' }}>
                                                    (ID: {tg.id})
                                                </span>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                ))
            )}

            <Divider style={{ margin: '24px 0' }} />

            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fa-solid fa-location-dot" style={{ color: '#6366f1' }} />
                Места инцидентов ({(incident.pvzList || []).length})
            </h3>
            {/* ЧЕК-БОКС ПРОВЕРКИ АДРЕСОВ (только для админов) */}
            {isAdminOrDev && (incident.pvzList || []).length > 0 && (
                <div style={{
                    marginBottom: 16, padding: 12,
                    background: 'rgba(99,102,241,0.04)',
                    border: '1px solid rgba(99,102,241,0.15)',
                    borderRadius: 10
                }}>
                    <label style={{
                        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                        padding: '6px 10px', borderRadius: 8,
                        background: adminAssessment?.checklist_pvz_maps ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.2)',
                        border: `1px solid ${adminAssessment?.checklist_pvz_maps ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)'}`,
                        transition: 'all 0.2s'
                    }}>
                        <input
                            type="checkbox"
                            checked={adminAssessment?.checklist_pvz_maps || false}
                            onChange={(e) => updateAssessmentField('checklist_pvz_maps', e.target.checked)}
                            style={{ width: 16, height: 16, accentColor: '#22c55e', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 12, color: adminAssessment?.checklist_pvz_maps ? '#86efac' : '#94a3b8', fontWeight: 500 }}>
                            <i className="fa-solid fa-map-location-dot" style={{ marginRight: 6, fontSize: 11 }} />
                            Адреса проверены на картах и исправлены в случае необходимости на корректные данные
                        </span>
                    </label>
                </div>
            )}

            {(incident.pvzList || []).length === 0 ? (
                <div style={{
                    padding: 20, textAlign: 'center', color: '#64748b',
                    border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12
                }}>
                    <i className="fa-solid fa-map-location-dot" style={{ marginRight: 8 }} />
                    Места не указаны
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
                    {incident.pvzList.map((pvz, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.08, duration: 0.3 }}
                            style={{
                                background: 'rgba(0,0,0,0.2)', borderRadius: 12,
                                padding: 16, border: '1px solid rgba(255,255,255,0.04)'
                            }}
                        >
                            {/* Шапка карточки ПВЗ с адресом и бейджем */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', flex: 1 }}>
                                    {pvz.address || 'Адрес не указан'}
                                </div>

                                {/* Бейдж статуса верификации */}
                                {pvz.is_verified ? (
                                    <span style={{
                                        fontSize: 10, fontWeight: 600, color: '#22c55e',
                                        background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                                        borderRadius: 6, padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap'
                                    }}>
                                        <i className="fa-solid fa-circle-check" style={{ fontSize: 9 }} /> Подтверждён
                                    </span>
                                ) : (
                                    <span style={{
                                        fontSize: 10, fontWeight: 600, color: '#94a3b8',
                                        background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.2)',
                                        borderRadius: 6, padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap'
                                    }}>
                                        <i className="fa-solid fa-clock" style={{ fontSize: 9 }} /> Не проверен
                                    </span>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <Badge variant="info" icon="fa-solid fa-tag">{pvz.type}</Badge>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <ActiveBadge active={pvz.active} size="xs" />
                                    {pvz.id && (
                                        <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>
                                            {pvz.id.substring(0, 8)}…
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Кнопка управления верификацией + Инфо-кнопка (только для админов/девов) */}
                            {isAdminOrDev && (
                                <div style={{
                                    marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12,
                                    display: 'flex', alignItems: 'center', gap: 8
                                }}>
                                    <Button
                                        variant={pvz.is_verified ? "secondary" : "success"}
                                        size="sm"
                                        icon={pvz.is_verified ? "fa-solid fa-eye-slash" : "fa-solid fa-circle-check"}
                                        onClick={() => handleVerifyPvz(pvz.id, pvz.is_verified)}
                                        loading={verifyingPvzId === pvz.id}
                                        disabled={verifyingPvzId === pvz.id}
                                        style={{ fontSize: 11, padding: '6px 12px', flex: 1 }}
                                    >
                                        {pvz.is_verified ? 'Снять подтверждение' : 'Подтвердить адрес'}
                                    </Button>

                                    {/* Кнопка вызова инструкции */}
                                    <button
                                        onClick={() => setIsPvzInfoModalOpen(true)}
                                        title="Что такое верификация?"
                                        style={{
                                            background: 'rgba(99,102,241,0.1)',
                                            border: '1px solid rgba(99,102,241,0.2)',
                                            borderRadius: 8, width: 32, height: 32,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', color: '#818cf8', transition: 'all 0.2s',
                                            flexShrink: 0
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                                    >
                                        <i className="fa-solid fa-circle-question" style={{ fontSize: 14 }} />
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );

    // === БЛОК ОСПАРИВАНИЙ (показывается в конце вкладки Details) ===
    const renderContestationsBlock = () => {
        if (!incident?.status || !['resolved', 'closed', 'rejected', 'withdrawn'].includes(incident.status)) {
            return null;
        }
        return (
            <div ref={contestationsBlockRef} style={{ marginTop: 32 }}>
                <Divider />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fa-solid fa-scale-balanced" style={{ color: '#a78bfa' }} />
                        Оспаривания ({contestations.length})
                    </h3>
                    {(incident?.status && ['resolved'].includes(incident.status)) ? (
                        <Button
                            variant="primary"
                            size="sm"
                            icon="fa-solid fa-plus"
                            onClick={() => setContestationModalOpen(true)}
                        >
                            Добавить оспаривание
                        </Button>
                    ) : null}
                </div>
                {isLoadingContestations ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
                        <i className="fa-solid fa-circle-notch fa-spin" /> Загрузка оспариваний...
                    </div>
                ) : contestations.length === 0 ? (
                    <div style={{
                        padding: 20, textAlign: 'center', color: '#64748b',
                        border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12
                    }}>
                        <i className="fa-solid fa-inbox" style={{ marginRight: 8 }} />
                        Оспариваний пока нет
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {contestations.map((cont) => {
                            // Извлекаем код статуса из объекта для безопасных сравнений
                            const statusCode = cont.status?.code || '';

                            // Определяем, доступно ли оспаривание для просмотра (ссылка, иконки)
                            // Для админов всегда доступно. Для остальных - только если статус финальный и стоит флаг публикации
                            const canViewContestation = isAdminOrDev ||
                                (['contested_full', 'contested_partial'].includes(statusCode) && cont.publishOnSuccess);

                            return (
                                <motion.div
                                    key={cont.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                        padding: 16,
                                        background: 'rgba(139,92,246,0.05)',
                                        border: `1px solid ${statusCode === 'contested_full' ? 'rgba(34,197,94,0.3)' : statusCode === 'contested_partial' ? 'rgba(234,179,8,0.3)' : 'rgba(139,92,246,0.15)'}`,
                                        borderRadius: 10,
                                        cursor: canViewContestation ? 'pointer' : 'default', // Курсор меняется только если доступно
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => canViewContestation && (e.currentTarget.style.background = 'rgba(139,92,246,0.1)')} // Ховер только если доступно
                                    onMouseLeave={(e) => canViewContestation && (e.currentTarget.style.background = 'rgba(139,92,246,0.05)')} // Ховер только если доступно
                                    onClick={() => canViewContestation && window.open(`/contestation/${cont.id}`, '_blank')} // Клик только если доступно
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Badge
                                                    variant={
                                                        statusCode === 'contested_full' ? 'success' :
                                                            statusCode === 'contested_partial' ? 'warning' :
                                                                statusCode === 'contestation_rejected' ? 'danger' :
                                                                    statusCode === 'contestation_withdrawn' ? 'secondary' : 'info'
                                                    }
                                                    size="sm"
                                                    icon={
                                                        statusCode === 'contested_full' ? 'fa-solid fa-check-double' :
                                                            statusCode === 'contested_partial' ? 'fa-solid fa-check' :
                                                                statusCode === 'contestation_rejected' ? 'fa-solid fa-xmark' :
                                                                    statusCode === 'contestation_withdrawn' ? 'fa-solid fa-arrow-rotate-left' :
                                                                        statusCode === 'contestation_in_progress' ? 'fa-solid fa-spinner' : 'fa-solid fa-clock'
                                                    }
                                                >
                                                    {cont.status?.name || statusCode || 'Неизвестно'}
                                                </Badge>
                                                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                                                    {cont.id}
                                                </span>

                                                {/* Иконка глаза показывается только если оспаривание доступно для просмотра */}
                                                {canViewContestation && cont.publishOnSuccess && (
                                                    <span title="Опубликовано после успешного оспаривания" style={{ color: '#a78bfa', fontSize: 12 }}>
                                                        <i className="fa-solid fa-eye" />
                                                    </span>
                                                )}

                                                <span style={{ fontSize: 11, color: '#64748b' }}><i className="fa-solid fa-calendar" /> Создано: {new Date(cont.createdAt).toLocaleDateString('ru-RU')}</span>
                                            </div>
                                        </div>

                                        {/* Стрелка показывается только если оспаривание доступно для перехода */}
                                        {canViewContestation && (
                                            <i className="fa-solid fa-chevron-right" style={{ color: '#64748b', alignSelf: 'center' }} />
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    // === КОНТЕНТ ТАБА "ИСТОРИЯ" ===
    const renderTimelineTab = () => (
        <motion.div
            key="timeline"
            initial={{ opacity: 0, x: 30 * tabDirection }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 * tabDirection }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
        >
            <IncidentHistoryTimeline
                history={history}
                isLoading={isHistoryLoading}
                error={historyError}
                emptyMessage="Пока нет записей об изменениях этого инцидента."
            />
        </motion.div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
        >
            <style>{PAGE_STYLES}</style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                            Инцидент #{incident.id}
                        </h1>
                        {(() => {
                            const statusConfig = currentStatus
                                ? { color: currentStatus.button_color || 'info', name: currentStatus.name }
                                : (incident.status ? getStatusConfig(incident.status) : null);

                            const statusName = currentStatus?.name || incident.status_name;

                            if (!statusConfig && !statusName) return null;

                            return (
                                <Badge
                                    variant={currentStatus ? (currentStatus.button_color || 'info') : 'info'}
                                    style={{
                                        fontSize: 13,
                                        padding: '6px 14px',
                                        fontWeight: 600,
                                        background: currentStatus ? undefined : statusConfig?.bg,
                                        color: currentStatus ? undefined : statusConfig?.color,
                                        border: currentStatus ? undefined : `1px solid ${statusConfig?.border}`,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6
                                    }}
                                >
                                    {!currentStatus && statusConfig?.icon && (
                                        <i className={`fa-solid ${statusConfig.icon}`} style={{ fontSize: 11 }} />
                                    )}
                                    {statusName}
                                </Badge>
                            );
                        })()}

                        {incident.views !== undefined && (
                            <Badge
                                variant="neutral"
                                icon="fa-solid fa-eye"
                                style={{
                                    background: 'rgba(99,102,241,0.1)',
                                    color: '#a5b4fc',
                                    border: '1px solid rgba(99,102,241,0.2)',
                                    fontSize: 12,
                                    padding: '5px 12px',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                {incident.views.toLocaleString('ru-RU')}
                            </Badge>
                        )}

                        {isPublishedInTg && (
                            <Badge
                                variant="success"
                                icon="fa-solid fa-brands fa-telegram"
                                style={{
                                    background: 'rgba(14,165,233,0.1)',
                                    color: '#38bdf8',
                                    border: '1px solid rgba(14,165,233,0.3)',
                                    fontSize: 12,
                                    padding: '5px 12px',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                Опубликовано в TG
                            </Badge>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                            {incident.add_reason_name || 'Без причины'}
                        </p>
                        {incident.add_reason_onPvz ? (
                            <span
                                title="Причина инцидента привязана к руководству ПВЗ"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: '#a78bfa',
                                    background: 'rgba(139,92,246,0.12)',
                                    border: '1px solid rgba(139,92,246,0.3)',
                                    borderRadius: 6,
                                    padding: '2px 8px',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <i className="fa-solid fa-location-dot" style={{ fontSize: 10 }} />
                                На руководство ПВЗ
                            </span>
                        ) : <span
                            title="Причина инцидента привязана к наёмному работнику ПВЗ"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#a78bfa',
                                background: 'rgba(139,92,246,0.12)',
                                border: '1px solid rgba(139,92,246,0.3)',
                                borderRadius: 6,
                                padding: '2px 8px',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <i className="fa-solid fa-location-dot" style={{ fontSize: 10 }} />
                            На наёмного работника ПВЗ
                        </span>}
                    </div>
                </div>
                <Button variant="secondary" icon="fa-solid fa-arrow-left" onClick={() => navigate('/incidents')}>
                    Назад
                </Button>
            </div>

            {/* === ДИСКЛЕЙМЕР === */}
            {!isAdminOrDev && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card style={{
                        background: 'linear-gradient(135deg, rgba(234,179,8,0.05) 0%, rgba(245,158,11,0.03) 100%)',
                        border: '1px solid rgba(234,179,8,0.2)',
                        marginBottom: 20
                    }}>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: 'rgba(234,179,8,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <i className="fa-solid fa-triangle-exclamation" style={{ color: '#eab308', fontSize: 18 }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: '#f1f5f9',
                                    marginBottom: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8
                                }}>
                                    Правовой дисклеймер
                                    <Badge variant="warning" style={{ fontSize: 10, padding: '2px 8px' }}>
                                        Важно
                                    </Badge>
                                </div>
                                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
                                    Информация на этой странице публикуется «как есть» на основании обращений участников.
                                    Она <strong style={{ color: '#e2e8f0' }}>не является</strong> официальным обвинением, судебным решением или установленным фактом нарушения.
                                    Администрация сервиса выступает исключительно площадкой для публикации обращений и не несёт ответственности
                                    за достоверность сведений, предоставленных заявителями. Все данные размещаются в соответствии с принципом
                                    открытости и прозрачности рассмотрения инцидентов.
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            )}

            {/* БАННЕР: КРАТКАЯ ВЫЖИМКА ОТ ИИ */}
            {incident.ai_response_flag && incident.ai_response?.executive_summary && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    <Card style={{
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(99,102,241,0.04) 100%)',
                        border: '1px solid rgba(139,92,246,0.25)',
                        marginBottom: 20
                    }}>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                                background: 'rgba(139,92,246,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#a78bfa', fontSize: 20 }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#c4b5fd', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    Краткая выжимка от ИИ-анализа
                                    <Badge variant="info" style={{ fontSize: 10, padding: '2px 8px' }}>
                                        {incident.ai_response._meta?.used_ai_agent || 'ИИ'}
                                    </Badge>
                                </div>
                                <p style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.6, margin: '0 0 12px' }}>
                                    {incident.ai_response.executive_summary}
                                </p>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon="fa-solid fa-file-lines"
                                    onClick={() => setIsAiReportModalOpen(true)}
                                >
                                    Открыть полный отчёт ИИ
                                </Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            )}

            {/* БЛОК ПРИЧИНЫ ОТКЛОНЕНИЯ */}
            {incident.status === 'rejected' && incident.rejection_reason && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginBottom: 20 }}
                >
                    <Alert variant="danger" icon="fa-solid fa-circle-xmark">
                        <strong>Инцидент отклонен</strong><br />
                        <span style={{ fontSize: 13, opacity: 0.9 }}>Причина: {incident.rejection_reason}</span>
                    </Alert>
                </motion.div>
            )}

            <RecentCreatedIncidents />

            {(deleteError || transitionError) && (
                <Alert variant="danger" icon="fa-solid fa-circle-exclamation" style={{ marginBottom: 20 }}>
                    <strong>Ошибка</strong><br />
                    {deleteError || transitionError}
                </Alert>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <Card padding={0} style={{ overflow: 'hidden' }}>
                        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            {tabs.map(t => (
                                <button key={t.key} onClick={() => handleTabChange(t.key)}
                                    style={{
                                        flex: 1, padding: '14px 16px',
                                        background: activeTab === t.key ? 'rgba(99,102,241,0.1)' : 'transparent',
                                        border: 'none',
                                        borderBottom: activeTab === t.key ? '2px solid #6366f1' : '2px solid transparent',
                                        color: activeTab === t.key ? '#e2e8f0' : '#94a3b8',
                                        cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                                    }}>
                                    <i className={`fa-solid fa-solid ${t.icon}`} style={{ fontSize: 12 }} />{t.label}
                                </button>
                            ))}
                        </div>

                        <div style={{ padding: 24 }}>
                            <AnimatePresence mode="wait" initial={false}>
                                {activeTab === 'details' && (
                                    <>
                                        {renderDetailsTab()}
                                        {renderContestationsBlock()}
                                    </>
                                )}
                                {activeTab === 'timeline' && renderTimelineTab()}
                            </AnimatePresence>
                        </div>
                    </Card>

                    {/* НОВЫЙ КОМПОНЕНТ УПРАВЛЕНИЯ ПРОВЕРКАМИ */}
                    {isAdminOrDev && incident.status !== 'new' && (
                        // Найдите место, где вы рендерили компонент, и обновите пропсы:
                        <AdminAssessmentControls
                            entityId={id}
                            assessmentHistory={incident.admin_assessment_history || incident.admin_assessment?.history || []}
                            hasUserChecked={incident.has_user_checked || false}
                            canUserCheck={incident.can_user_check !== false}
                            currentUserId={user?.user?.id}
                            onSuccess={() => loadIncidentData(ownerToken)} // Просто перезагружаем данные инцидента
                        />
                    )}

                    {/* ЧЕК-БОКСЫ ПРОВЕРКИ ФАЙЛОВ (только для админов) */}
                    {isAdminOrDev && incident.status !== 'new' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div style={{
                                padding: 14,
                                background: 'rgba(99,102,241,0.04)',
                                border: '1px solid rgba(99,102,241,0.15)',
                                borderRadius: 10
                            }}>
                                <div style={{ fontSize: 11, color: '#818cf8', marginBottom: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <i className="fa-solid fa-file-shield" style={{ fontSize: 12 }} />
                                    Проверка доказательств модератором
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <label style={{
                                        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                                        padding: '8px 12px', borderRadius: 8,
                                        background: adminAssessment?.checklist_files_valid ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.2)',
                                        border: `1px solid ${adminAssessment?.checklist_files_valid ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)'}`,
                                        transition: 'all 0.2s'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={adminAssessment?.checklist_files_valid || false}
                                            onChange={(e) => updateAssessmentField('checklist_files_valid', e.target.checked)}
                                            style={{ width: 16, height: 16, accentColor: '#22c55e', cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: 12, color: adminAssessment?.checklist_files_valid ? '#86efac' : '#94a3b8', fontWeight: 500 }}>
                                            Приложенные файлы читаемы, не повреждены и напрямую относятся к данному инциденту
                                        </span>
                                    </label>
                                    <label style={{
                                        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                                        padding: '8px 12px', borderRadius: 8,
                                        background: adminAssessment?.checklist_files_privacy ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.2)',
                                        border: `1px solid ${adminAssessment?.checklist_files_privacy ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)'}`,
                                        transition: 'all 0.2s'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={adminAssessment?.checklist_files_privacy || false}
                                            onChange={(e) => updateAssessmentField('checklist_files_privacy', e.target.checked)}
                                            style={{ width: 16, height: 16, accentColor: '#22c55e', cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: 12, color: adminAssessment?.checklist_files_privacy ? '#86efac' : '#94a3b8', fontWeight: 500 }}>
                                            На скриншотах/документах скрыты личные данные третьих лиц (не фигурирующих в инциденте) и замаскированы личные данные участников
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* === БЛОК ДОКАЗАТЕЛЬСТВ === */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                    >
                        <div style={{ marginBottom: 8 }}>
                            <h3 style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: '#f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                marginBottom: 16
                            }}>
                                <i className="fa-solid fa-paperclip" style={{ color: '#6366f1' }} />
                                Доказательства и файлы
                            </h3>
                        </div>
                        {/* ПОДСКАЗКА ИИ: КЛЮЧЕВОЕ ДОКАЗАТЕЛЬСТВО */}
                        {incident.ai_response_flag && incident.ai_response?.key_evidence_anchor && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                style={{ marginBottom: 12 }}
                            >
                                <div style={{
                                    padding: '12px 16px',
                                    background: 'rgba(34,197,94,0.06)',
                                    border: '1px solid rgba(34,197,94,0.2)',
                                    borderRadius: 10,
                                    display: 'flex',
                                    gap: 12,
                                    alignItems: 'flex-start'
                                }}>
                                    <i className="fa-solid fa-anchor" style={{ color: '#22c55e', fontSize: 16, marginTop: 2, flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', marginBottom: 4 }}>
                                            Ключевой факт от ИИ
                                        </div>
                                        <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
                                            {incident.ai_response.key_evidence_anchor}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        <UnifiedFileManager
                            moduleName="incident_evidence"
                            recordId={id}
                            canEdit={false}
                            enableViewer={true}
                        />
                    </motion.div>

                    {/* === БЛОК ОЦЕНКИ ПОЛЕЗНОСТИ === */}
                    {incident.status !== 'new' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <Card style={{
                                background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.04) 100%)',
                                border: '1px solid rgba(99,102,241,0.15)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {/* Декоративный фон с parallax */}
                                <motion.div
                                    style={{
                                        y: parallaxY1,
                                        position: 'absolute',
                                        top: -30,
                                        right: -30,
                                        width: 120,
                                        height: 120,
                                        borderRadius: '50%',
                                        background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
                                        pointerEvents: 'none'
                                    }}
                                />
                                <motion.div
                                    style={{
                                        y: parallaxY2,
                                        position: 'absolute',
                                        bottom: -20,
                                        left: -20,
                                        width: 80,
                                        height: 80,
                                        borderRadius: '50%',
                                        background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
                                        pointerEvents: 'none'
                                    }}
                                />

                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: 16
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 200 }}>
                                            <div style={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: 16,
                                                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                                                border: '1px solid rgba(99,102,241,0.3)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <i className="fa-solid fa-circle-question" style={{ color: '#818cf8', fontSize: 24 }} />
                                            </div>

                                            <div>
                                                <h3 style={{
                                                    fontSize: 16,
                                                    fontWeight: 700,
                                                    color: '#f1f5f9',
                                                    margin: '0 0 4px'
                                                }}>
                                                    Была ли информация полезной?
                                                </h3>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8
                                                }}>
                                                    <span style={{
                                                        fontSize: 24,
                                                        fontWeight: 800,
                                                        color: '#a5b4fc',
                                                        fontFamily: 'monospace',
                                                        lineHeight: 1
                                                    }}>
                                                        {interestScore}
                                                    </span>
                                                    <span style={{
                                                        fontSize: 12,
                                                        color: '#64748b',
                                                        lineHeight: 1.3
                                                    }}>
                                                        {interestScore === 0
                                                            ? 'человек нашли это полезным'
                                                            : interestScore === 1
                                                                ? 'человек нашел это полезным'
                                                                : 'человек нашли это полезным'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ flexShrink: 0 }}>
                                            <AnimatePresence mode="wait">
                                                {hasRated ? (
                                                    <motion.div
                                                        key="thanked"
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                                        className="interest-thank-anim"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 10,
                                                            padding: '12px 24px',
                                                            background: 'rgba(34,197,94,0.12)',
                                                            border: '1px solid rgba(34,197,94,0.3)',
                                                            borderRadius: 14,
                                                            color: '#22c55e',
                                                            fontSize: 14,
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        <i className="fa-solid fa-circle-check" style={{ fontSize: 20 }} />
                                                        <div>
                                                            <div>Спасибо за ваш отзыв!</div>
                                                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400, marginTop: 2 }}>
                                                                Ваш голос учтён
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ) : (
                                                    <motion.div key="buttons" style={{ display: 'flex', gap: 8 }}>
                                                        <Button
                                                            variant="success"
                                                            icon="fa-solid fa-thumbs-up"
                                                            onClick={handleRateUseful}
                                                            disabled={isRating}
                                                            loading={isRating}
                                                            style={{
                                                                padding: '10px 20px',
                                                                fontSize: 13,
                                                                fontWeight: 600,
                                                                borderRadius: 12
                                                            }}
                                                        >
                                                            Да, полезна
                                                        </Button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {ratingError && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            style={{ marginTop: 12 }}
                                        >
                                            <Alert variant="danger" icon="fa-solid fa-circle-exclamation">
                                                {ratingError}
                                            </Alert>
                                        </motion.div>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {buildServiceInfo()}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* ЧЕК-ЛИСТ МОДЕРАТОРА (СВЁРТЫВАЕМЫЙ) */}
                    {isAdminOrDev && incident.status !== 'new' && checklist && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                            {isChecklistCollapsed ? (
                                // СВЁРНУТЫЙ ВИД (1 СТРОКА)
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
                                        borderRadius: 12, cursor: 'pointer',
                                        transition: 'all 0.2s'
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
                                // РАЗВЁРНУТЫЙ ВИД (ПОЛНАЯ КАРТОЧКА)
                                <Card style={{
                                    background: checklist.percentage === 100 ? 'rgba(16,185,129,0.05)' : 'rgba(245,158,11,0.05)',
                                    border: `1px solid ${checklist.percentage === 100 ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: checklist.percentage === 100 ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <i className={`fa-solid ${checklist.percentage === 100 ? 'fa-circle-check' : 'fa-list-check'}`} />
                                            Чек-лист модератора
                                        </h4>

                                        {/* Кнопка сворачивания (появляется только когда выполнено на 100%) */}
                                        {checklist.percentage === 100 && (
                                            <button
                                                onClick={() => setIsChecklistCollapsed(true)}
                                                style={{
                                                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                                                    color: '#10b981', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                                                    padding: '4px 10px', borderRadius: 6,
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16,185,129,0.2)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
                                            >
                                                Свернуть <i className="fa-solid fa-chevron-up" style={{ fontSize: 9 }} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Прогресс-бар */}
                                    <div style={{ height: 6, background: 'rgba(0,0,0,0.2)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${checklist.percentage}%` }}
                                            transition={{ duration: 0.5, ease: 'easeOut' }}
                                            style={{ height: '100%', background: checklist.percentage === 100 ? '#10b981' : '#f59e0b' }}
                                        />
                                    </div>

                                    {/* Список пунктов */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {checklist.items.map((item) => (
                                            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                                <div style={{ marginTop: 2, flexShrink: 0 }}>
                                                    {item.isNA ? (
                                                        <i className="fa-solid fa-minus" style={{ color: '#64748b', fontSize: 12 }} title="Не применимо" />
                                                    ) : item.isDone ? (
                                                        <i className="fa-solid fa-circle-check" style={{ color: '#10b981', fontSize: 14 }} />
                                                    ) : (
                                                        <i className="fa-regular fa-circle" style={{ color: checklist.percentage === 100 ? '#10b981' : '#94a3b8', fontSize: 14 }} />
                                                    )}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        color: item.isDone || item.isNA ? '#e2e8f0' : '#94a3b8',
                                                        textDecoration: item.isDone ? 'line-through' : 'none',
                                                        opacity: item.isDone ? 0.7 : 1,
                                                        transition: 'all 0.2s'
                                                    }}>
                                                        {item.label}
                                                    </div>
                                                    {!item.isDone && !item.isNA && (
                                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>
                                                            💡 {item.hint}
                                                        </div>
                                                    )}
                                                    {item.isNA && (
                                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                                            {item.hint}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </motion.div>
                    )}
                    {/* === БЛОК ИНФОРМАЦИИ (с анимацией выезда справа) === */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15, duration: 0.35 }}
                    >
                        <Card>
                            <h4 style={{
                                fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 16,
                                textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8
                            }}>
                                <i className="fa-solid fa-circle-info" style={{ color: '#6366f1' }} /> Информация
                            </h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {/* --- Стандартные поля информации --- */}
                                {/* --- Стандартные поля информации --- */}
                                {incident.status && (() => {
                                    const cfg = getStatusConfig(incident.status);
                                    return (
                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{
                                            background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12,
                                            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14
                                        }}>
                                            <div style={{ width: 42, height: 42, borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <i className={`fa-solid ${cfg.icon}`} style={{ color: cfg.color, fontSize: 18 }} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Текущий статус</div>
                                                <div style={{ fontSize: 15, fontWeight: 700, color: cfg.color, lineHeight: 1.2 }}>{incident.status_name || cfg.label}</div>
                                                {isAdminOrDev ? <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', marginTop: 2 }}>{incident.status}</div> : null}
                                            </div>
                                        </motion.div>
                                    );
                                })()}

                                {/* ПЛАШКА: ИИ-АНАЛИЗ ПРОВЕДЁН */}
                                {incident.ai_response_flag && (
                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{
                                        background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 12,
                                        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12
                                    }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#a78bfa', fontSize: 16 }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>ИИ-Анализ</div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#c4b5fd', lineHeight: 1.2 }}>Проведён и сохранён</div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* БЛОК: Инцидент частично оспорен */}
                                {incident.partially_contested === true && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                        <Alert variant="warning" icon="fa-solid fa-scale-unbalanced">
                                            <strong>Инцидент частично оспорен</strong><br />
                                            <span style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.4 }}>
                                                По данному инциденту было вынесено решение о частичном оспаривании. Некоторые данные могли быть изменены или удалены модерацией.
                                            </span>
                                        </Alert>
                                    </motion.div>
                                )}

                                {/* БЛОК: Публикация при успешном оспаривании */}
                                {incident.publish_on_success === true && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                                        <Alert variant="info" icon="fa-solid fa-eye">
                                            <strong>Публикация при успехе</strong><br />
                                            <span style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.4 }}>
                                                При закрытии инцидент будет опубликован и станет доступен всем на основании решения по одному из оспариваний.
                                            </span>
                                        </Alert>
                                    </motion.div>
                                )}

                                <div style={{ marginTop: 4 }}>
                                    <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <i className="fa-solid fa-calendar-plus" style={{ width: 12 }} /> Создан
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{formatDate(incident.date_create)}</div>
                                </div>

                                {incident.user_add_email && (
                                    <div>
                                        <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <i className="fa-solid fa-envelope" style={{ width: 12 }} /> Email заявителя
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#818cf8', wordBreak: 'break-all' }}>{incident.user_add_email}</div>
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <i className="fa-solid fa-users" style={{ width: 12 }} /> Участников
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{(incident.personesList || []).length}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <i className="fa-solid fa-location-dot" style={{ width: 12 }} /> ПВЗ
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{(incident.pvzList || []).length}</div>
                                    </div>
                                </div>

                                {incident.views !== undefined && (
                                    <div>
                                        <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <i className="fa-solid fa-eye" style={{ width: 12 }} /> Просмотров
                                        </div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: '#a5b4fc', fontFamily: 'monospace' }}>
                                            {incident.views.toLocaleString('ru-RU')}
                                        </div>
                                    </div>
                                )}

                                {/* БЛОК ОЦЕНОК: ЧИТАЕМЫЙ ВИД ДЛЯ ПОЛЬЗОВАТЕЛЕЙ (только публичные) */}
                                {!isAdminOrDev && incident.admin_assessment && (() => {
                                    // Берем только те опции, которые не помечены как adminOnly
                                    const publicOptions = Object.entries(ASSESSMENT_OPTIONS).filter(([_, config]) => !config.adminOnly);
                                    const hasPublicData = publicOptions.some(([key]) => incident.admin_assessment[key]);

                                    if (!hasPublicData) return null;

                                    return (
                                        <>
                                            <Divider style={{ margin: '4px 0' }} />
                                            <div>
                                                <div style={{ fontSize: 11, color: '#475569', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                                    <i className="fa-solid fa-shield-halved" style={{ width: 12, color: '#6366f1' }} /> Оценка модерации
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    {publicOptions.map(([key, config]) => (
                                                        incident.admin_assessment[key] && (
                                                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: 12, color: '#94a3b8' }}>{config.label}:</span>
                                                                <Badge variant={getAssessmentVariant(incident.admin_assessment[key])} style={{ fontSize: 11, padding: '4px 10px' }}>
                                                                    {incident.admin_assessment[key]}
                                                                </Badge>
                                                            </div>
                                                        )
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}

                                {/* БЛОК ОЦЕНОК: ИНТЕРАКТИВНЫЙ ВИД ДЛЯ АДМИНОВ */}
                                {isAdminOrDev && incident.status !== 'new' && (
                                    <>
                                        <Divider style={{ margin: '4px 0' }} />
                                        <div>
                                            <div style={{ fontSize: 12, color: '#475569', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                                <i className="fa-solid fa-gauge-high" style={{ width: 14, color: '#6366f1' }} /> Инструменты модератора
                                            </div>

                                            {/* КНОПКА ВЫЗОВА ИИ-АССИСТЕНТА */}
                                            <Button
                                                variant="primary"
                                                icon="fa-solid fa-wand-magic-sparkles"
                                                onClick={() => setIsAiModalOpen(true)}
                                                fullWidth
                                                style={{
                                                    marginBottom: 16,
                                                    background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.2))',
                                                    border: '1px solid rgba(139,92,246,0.4)',
                                                    color: '#c4b5fd',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                Анализ с помощью ИИ
                                            </Button>

                                            {/* 1. Публичные оценки */}
                                            {Object.entries(ASSESSMENT_OPTIONS)
                                                .filter(([_, config]) => !config.adminOnly)
                                                .map(([key, config]) => (
                                                    <div key={key} style={{ marginBottom: 14 }}>
                                                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2, fontWeight: 600 }}>{config.label}</div>
                                                        {config.hint && (
                                                            <div style={{ fontSize: 11, color: '#475569', marginBottom: 8, fontStyle: 'italic', lineHeight: 1.3 }}>
                                                                {config.hint}
                                                            </div>
                                                        )}
                                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                            {config.options.map(opt => (
                                                                <button key={opt} onClick={() => updateAssessmentField(key, opt)} style={{
                                                                    padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6,
                                                                    border: adminAssessment[key] === opt ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                                                                    background: adminAssessment[key] === opt ? 'rgba(99,102,241,0.15)' : 'rgba(0,0,0,0.2)',
                                                                    color: adminAssessment[key] === opt ? '#a5b4fc' : '#94a3b8',
                                                                    cursor: 'pointer', transition: 'all 0.2s'
                                                                }}>{opt}</button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))
                                            }

                                            {/* 2. Внутренняя экспертиза (Только для админов) */}
                                            <div style={{ marginTop: 16, padding: 14, background: 'rgba(239,68,68,0.03)', border: '1px dashed rgba(239,68,68,0.2)', borderRadius: 10 }}>
                                                <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}>
                                                    <i className="fa-solid fa-lock" style={{ fontSize: 10 }} /> Внутренняя экспертиза (скрыто от пользователей)
                                                </div>

                                                {Object.entries(ASSESSMENT_OPTIONS)
                                                    .filter(([_, config]) => config.adminOnly)
                                                    .map(([key, config]) => (
                                                        <div key={key} style={{ marginBottom: 14 }}>
                                                            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2, fontWeight: 600 }}>{config.label}</div>
                                                            {config.hint && (
                                                                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, fontStyle: 'italic', lineHeight: 1.3 }}>
                                                                    {config.hint}
                                                                </div>
                                                            )}
                                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                                {config.options.map(opt => (
                                                                    <button key={opt} onClick={() => updateAssessmentField(key, opt)} style={{
                                                                        padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6,
                                                                        border: adminAssessment[key] === opt ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.05)',
                                                                        background: adminAssessment[key] === opt ? 'rgba(239,68,68,0.15)' : 'rgba(0,0,0,0.2)',
                                                                        color: adminAssessment[key] === opt ? '#fca5a5' : '#64748b',
                                                                        cursor: 'pointer', transition: 'all 0.2s'
                                                                    }}>{opt}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))
                                                }
                                            </div>

                                            {/* 3. Внутренняя заметка */}
                                            <div style={{ marginTop: 14 }}>
                                                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <i className="fa-solid fa-comment-dots" style={{ fontSize: 10 }} /> Внутренняя заметка
                                                </div>
                                                <div style={{ fontSize: 11, color: '#475569', marginBottom: 8, fontStyle: 'italic', lineHeight: 1.3 }}>
                                                    Конфиденциальные комментарии для других модераторов и службы безопасности
                                                </div>
                                                <textarea
                                                    value={adminAssessment.internal_note || ''}
                                                    onChange={(e) => updateAssessmentField('internal_note', e.target.value)}
                                                    placeholder="Заметки для коллег..."
                                                    rows={3}
                                                    style={{
                                                        width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: 8, padding: 10, color: '#e2e8f0', fontSize: 13, resize: 'vertical',
                                                        outline: 'none', boxSizing: 'border-box'
                                                    }}
                                                />
                                            </div>

                                            {/* 4. Индикатор автосохранения */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, minHeight: 24 }}>
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
                                        </div>
                                    </>
                                )}

                            </div>
                        </Card>
                    </motion.div>

                    {/* === БЛОК ИНФОРМАЦИИ ОБ ОТЗЫВЕ ИНЦИДЕНТА === */}
                    {!isAdminOrDev && incident.status !== 'withdrawn' && (
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
                                    Отзыв инцидента
                                </h4>
                                <div style={{
                                    fontSize: 13,
                                    color: '#94a3b8',
                                    lineHeight: 1.6,
                                    marginBottom: 16
                                }}>
                                    Если вы хотите отозвать этот инцидент, пожалуйста, свяжитесь с нашей службой поддержки.
                                    Укажите номер инцидента, почту автора и причину отзыва.
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <Button
                                        variant="secondary"
                                        icon="fa-solid fa-envelope"
                                        onClick={() => window.location.href = `mailto:support@incident-service.com?subject=Отзыв инцидента #${incident.id}`}
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
                                    В обращении обязательно укажите номер инцидента: <strong style={{ color: '#e2e8f0' }}>#{incident.id}</strong>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* === БЛОК ОСПАРИВАНИЯ ИНЦИДЕНТА === */}
                    {!isAdminOrDev && incident?.status === 'resolved' && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.25, duration: 0.35 }}
                        >
                            <Card style={{
                                background: 'linear-gradient(135deg, rgba(239,68,68,0.04) 0%, rgba(245,158,11,0.02) 100%)',
                                border: '1px solid rgba(239,68,68,0.2)'
                            }}>
                                <h4 style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#ef4444',
                                    marginBottom: 12,
                                    textTransform: 'uppercase',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8
                                }}>
                                    <i className="fa-solid fa-gavel" style={{ color: '#ef4444' }} />
                                    Оспорить инцидент
                                </h4>
                                <div style={{
                                    fontSize: 13,
                                    color: '#94a3b8',
                                    lineHeight: 1.6,
                                    marginBottom: 16
                                }}>
                                    Если вы считаете, что информация в этом инциденте не соответствует действительности, нарушает ваши права или требует удаления, вы можете подать официальное оспаривание.
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {/* Кнопка создания оспаривания (активна только для статуса resolved, как в вашем оригинальном коде) */}
                                    <Button
                                        variant="primary"
                                        icon="fa-solid fa-plus"
                                        onClick={() => setContestationModalOpen(true)}
                                        fullWidth
                                        disabled={incident?.status !== 'resolved'}
                                        title={incident?.status !== 'resolved' ? 'Оспаривание доступно только для статуса "Завершён"' : ''}
                                        style={{ justifyContent: 'center', fontSize: 13, fontWeight: 600 }}
                                    >
                                        Создать оспаривание
                                    </Button>

                                    {/* Кнопка прокрутки к списку оспариваний */}
                                    <Button
                                        variant="secondary"
                                        icon="fa-solid fa-arrow-down"
                                        onClick={scrollToContestations}
                                        fullWidth
                                        style={{ justifyContent: 'center', fontSize: 13 }}
                                    >
                                        Перейти к оспариваниям
                                    </Button>
                                </div>

                                {isAdminOrDev && (<div style={{
                                    marginTop: 16,
                                    padding: '10px 12px',
                                    background: 'rgba(99,102,241,0.08)',
                                    border: '1px solid rgba(99,102,241,0.15)',
                                    borderRadius: 8,
                                    fontSize: 11,
                                    color: '#94a3b8',
                                    lineHeight: 1.5
                                }}>
                                    <i className="fa-solid fa-circle-info" style={{ color: '#6366f1', marginRight: 6 }} />
                                    Для создания оспаривания инцидент должен быть в статусе <strong style={{ color: '#e2e8f0' }}>«Завершён»</strong>.
                                </div>)}
                            </Card>
                        </motion.div>
                    )}

                    {isAdminOrDev ? <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35, duration: 0.35 }}
                    >
                        <Card>
                            <h4 style={{
                                fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 16,
                                textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8
                            }}>
                                <i className="fa-solid fa-bolt" style={{ color: '#6366f1' }} /> Действия
                            </h4>
                            {/* ТУМБЛЕР: ПУБЛИЧНАЯ ВИДИМОСТЬ ОТЧЁТА ИИ */}
                            {/* {incident.ai_response_flag && (
                                <div style={{
                                    marginBottom: 20, padding: 14,
                                    background: 'rgba(99,102,241,0.04)',
                                    border: '1px solid rgba(99,102,241,0.15)',
                                    borderRadius: 12
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <i className="fa-solid fa-eye" style={{ fontSize: 11 }} />
                                            Публичный доступ к отчёту ИИ
                                        </div>
                                        <div
                                            onClick={() => !isUpdatingAiVisibility && handleToggleAiVisibility(!incident.show_ai_response)}
                                            style={{
                                                width: 44, height: 24, borderRadius: 12,
                                                background: incident.show_ai_response ? '#22c55e' : 'rgba(255,255,255,0.1)',
                                                border: `1px solid ${incident.show_ai_response ? '#22c55e' : 'rgba(255,255,255,0.2)'}`,
                                                cursor: isUpdatingAiVisibility ? 'not-allowed' : 'pointer',
                                                position: 'relative', transition: 'all 0.3s',
                                                opacity: isUpdatingAiVisibility ? 0.6 : 1
                                            }}
                                        >
                                            <div style={{
                                                width: 18, height: 18, borderRadius: '50%',
                                                background: '#fff',
                                                position: 'absolute', top: 2,
                                                left: incident.show_ai_response ? 22 : 2,
                                                transition: 'left 0.3s',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                            }} />
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
                                        {incident.show_ai_response
                                            ? 'Отчёт ИИ виден пользователям в поиске и деталях.'
                                            : 'Отчёт ИИ скрыт от пользователей и виден только модерации.'}
                                    </div>
                                </div>
                            )} */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {isAdminOrDev && incident.status !== 'new' && (
                                    <>
                                        {/* Плашка-предупреждение для админов, если прошло < 15 минут */}
                                        {isWithin15Minutes && (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 10,
                                                padding: '12px',
                                                background: 'rgba(234,179,8,0.08)',
                                                border: '1px solid rgba(234,179,8,0.25)',
                                                borderRadius: 10,
                                                marginBottom: 10,
                                                fontSize: 12,
                                                color: '#eab308',
                                                lineHeight: 1.5
                                            }}>
                                                <i className="fa-solid fa-clock" style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }} />
                                                <span>
                                                    Прошло менее 15 минут после создания инцидента.
                                                    Редактирование временно заблокировано до истечения таймаута даже для администраторов.
                                                </span>
                                            </div>
                                        )}

                                        {/* Кнопка с условием блокировки */}
                                        <Button
                                            variant="secondary"
                                            icon="fa-solid fa-pen"
                                            onClick={() => navigate(`/incidents/${incident.id}/edit`)}
                                            fullWidth
                                            disabled={!canEdit || isWithin15Minutes}
                                        >
                                            {isWithin15Minutes
                                                ? 'Редактирование заблокировано (15 мин)'
                                                : (canEdit ? 'Редактировать' : 'Нет доступа')}
                                        </Button>
                                    </>
                                )}

                                {isAdminOrDev && incident.status !== 'new' ? <Button
                                    variant="secondary"
                                    icon="fa-solid fa-share-nodes"
                                    onClick={() => setIsExportModalOpen(true)}
                                    fullWidth
                                >
                                    Экспорт для соцсетей
                                </Button> : null}
                                {isAdminOrDev ? <StatsDisplay
                                    metricName="incidents:view"
                                    entityId={id}
                                    mode="button"
                                    defaultFrom="2026-07-10T00:00:00Z"
                                    defaultTo="2029-08-11T00:00:00Z"
                                    defaultGranularity="hour"
                                    allowedGranularities={['minute', 'hour', 'day', 'month']}
                                    minDate="2025-01-01"
                                    maxRange={365}
                                    allowDateChange={true}
                                    allowGranularityChange={true}
                                    allowForceRefresh={true}
                                    chartType="line"
                                    showFields={['count']}
                                    chartColor="#10b981"
                                    chartHeight={300}
                                    buttonLabel="Открыть статистику просмотров инцидента"
                                    buttonIcon="fa-solid fa-chart-bar"
                                    buttonVariant="primary"
                                    modalTitle="Статистика просмотров инцидента"
                                    modalSize="xl"
                                    onOpen={() => console.log('Модалка открыта')}
                                    onClose={() => console.log('Модалка закрыта')}
                                    onError={(err) => console.error('Ошибка:', err)}
                                    onDataLoad={(data) => console.log('Данные загружены:', data)}
                                /> : null}

                                {availableTransitions.length > 0 && !isWithin15Minutes && isAdminOrDev ? (
                                    <>
                                        <Divider />
                                        {availableTransitions.map((trans, idx) => (
                                            <Button
                                                key={idx}
                                                variant={trans.button_color || 'secondary'}
                                                onClick={() => handleTransition(trans)}
                                                fullWidth
                                                disabled={isTransitioning}
                                                loading={isTransitioning}
                                            >
                                                {trans.button_text || trans.name}
                                            </Button>
                                        ))}
                                    </>
                                ) : <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 10,
                                    padding: '12px',
                                    background: 'rgba(234,179,8,0.08)',
                                    border: '1px solid rgba(234,179,8,0.25)',
                                    borderRadius: 10,
                                    marginBottom: 10,
                                    fontSize: 12,
                                    color: '#eab308',
                                    lineHeight: 1.5
                                }}>
                                    <i className="fa-solid fa-clock" style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }} />
                                    <span>
                                        Прошло менее 15 минут после создания инцидента.
                                        Изменение статусов временно заблокировано до истечения таймаута.
                                    </span>
                                </div>}

                                {(canEdit && canDelete && isAdminOrDev) && (
                                    <>
                                        <Divider />
                                        <Button
                                            variant="warning"
                                            icon="fa-solid fa-gavel"
                                            onClick={handleSoftDelete}
                                            fullWidth
                                            disabled={!canEdit || isSoftDeleting || isTransitioning}
                                            loading={isSoftDeleting}
                                        >
                                            {isSoftDeleting ? 'Удаление...' : 'Удалить по юридическим причинам'}
                                        </Button>
                                        <Button
                                            variant="danger"
                                            icon="fa-solid fa-trash"
                                            onClick={handleDelete}
                                            fullWidth
                                            disabled={!canEdit || isDeleting || isTransitioning}
                                            loading={isDeleting}
                                        >
                                            {isDeleting ? 'Удаление...' : 'Удалить'}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </Card>
                    </motion.div> : null}
                </div>
            </div>

            <ExportIncidentModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                incident={incident}
                onConfirmPublish={(incidentId) => {
                    setIncident(prev => ({
                        ...prev,
                        tg_post: true
                    }));
                }}
            />

            <AnimatePresence>
                {confirmModal.isOpen && (
                    <ConfirmModal
                        isOpen={confirmModal.isOpen}
                        onClose={() => setConfirmModal({ isOpen: false })}
                        onConfirm={confirmModal.onConfirm}
                        title={confirmModal.title}
                        description={confirmModal.description}
                        variant={confirmModal.variant}
                        confirmText={confirmModal.confirmText}
                        isLoading={isDeleting || isSoftDeleting || isTransitioning}
                    />
                )}
            </AnimatePresence>
            {/* === МОДАЛКА ПОДТВЕРЖДЕНИЯ EMAIL === */}
            <AnimatePresence>
                {showEmailModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
                            backdropFilter: 'blur(8px)', zIndex: 3000,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                            style={{
                                background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                                borderRadius: 16, padding: 32, maxWidth: 420, width: '100%',
                                border: '1px solid rgba(99,102,241,0.3)',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                            }}
                        >
                            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                    <i className="fa-solid fa-shield-halved" style={{ color: '#818cf8', fontSize: 24 }} />
                                </div>
                                <h3 style={{ color: '#f1f5f9', margin: 0, fontSize: 20 }}>Подтверждение автора</h3>
                                <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
                                    Для доступа к инциденту введите email, который вы указывали при его создании.
                                </p>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 6, display: 'block' }}>Email создателя</label>
                                <Input
                                    type="email"
                                    value={modalEmail}
                                    onChange={e => setModalEmail(e.target.value)}
                                    placeholder="example@mail.ru"
                                    icon="fa-envelope"
                                />
                                {modalError && <div style={{ color: '#f87171', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <i className="fa-solid fa-circle-exclamation" /> {modalError}
                                </div>}
                            </div>

                            <Button
                                variant="primary"
                                onClick={handleVerifyEmail}
                                loading={isVerifyingEmail}
                                disabled={!modalEmail.trim()}
                                style={{ width: '100%' }}
                            >
                                Подтвердить и продолжить
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* МОДАЛКА ВВОДА ПРИЧИНЫ ОТКЛОНЕНИЯ (ВЫНЕСЕННЫЙ КОМПОНЕНТ) */}
            <RejectionModal
                isOpen={isRejectionModalOpen}
                onClose={() => setIsRejectionModalOpen(false)}
                onConfirm={handleConfirmRejection}
                isLoading={isTransitioning}
            />
            {/* Информационное окно верификации ПВЗ */}
            <InfoModal
                isOpen={isPvzInfoModalOpen}
                onClose={() => setIsPvzInfoModalOpen(false)}
                title="Справка: Верификация адреса ПВЗ"
            >
                <p style={{ marginBottom: 14 }}>
                    <strong style={{ color: '#e2e8f0' }}>📌 Что это?</strong><br />
                    Это механизм подтверждения достоверности физического адреса ПВЗ, указанного заявителем.
                </p>
                <p style={{ marginBottom: 14 }}>
                    <strong style={{ color: '#22c55e' }}> Если адрес указан верно:</strong><br />
                    Нажмите кнопку «Подтвердить адрес». Это пометит ПВЗ как проверенный модератором.
                </p>
                <p style={{ marginBottom: 14 }}>
                    <strong style={{ color: '#ef4444' }}>❌ Если адрес неверный:</strong><br />
                    Не нажимайте эту кнопку. Используйте кнопку «Редактировать инцидент» в правой панели, чтобы исправить адрес или удалить связь с этим ПВЗ.
                </p>
                <p style={{ margin: 0 }}>
                    <strong style={{ color: '#a5b4fc' }}>📊 Как это используется?</strong><br />
                    Статус верификации отображается в карточках поиска. Кроме того, он <strong style={{ color: '#e2e8f0' }}>автоматически попадает в итоговые PDF-отчёты</strong>, помогая другим пользователям и органам оценивать достоверность предоставленных данных.
                </p>
            </InfoModal>

            {/* Модальное окно создания оспаривания */}
            <ContestationModal
                isOpen={contestationModalOpen}
                onClose={() => setContestationModalOpen(false)}
                incidentId={id}
            />
            {/* Модальное окно ИИ-анализа */}
            <AiAnalysisModal
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
                incident={incident}
            />

            {/* МОДАЛЬНОЕ ОКНО ПОЛНОГО ОТЧЁТА ИИ */}
            <AnimatePresence>
                {isAiReportModalOpen && incident.ai_response && (
                    <AiReportModal
                        isOpen={isAiReportModalOpen}
                        onClose={() => setIsAiReportModalOpen(false)}
                        aiResponse={incident.ai_response}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}