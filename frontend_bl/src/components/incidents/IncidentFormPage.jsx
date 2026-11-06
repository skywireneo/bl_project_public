import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, Button, Badge, FormField, Input, Select, Textarea, Alert, Divider } from "../ui/UIComponents";
import { getCreateIncidentData, createIncident, getIncident, updateIncident, getTransitionInfo, withdrawIncident, verifyCreatorEmail } from "../../http/incidentsAPI";
import storageHandler from "../../http/utils/storageHandler";
import RecentCreatedIncidents from "../mainPage/RecentCreatedIncidents";
import UserDataAutoFill from "../ui/UserDataAutoFill";
import UnifiedFileManager from "../authorized/unifiedFiles/UnifiedFileManager";
import { Context } from "../..";

// === CSS-анимация скелетона ===
const SKELETON_STYLES = `
@keyframes skeleton-shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
}
.skeleton-box {
    background: linear-gradient(90deg, 
        rgba(255,255,255,0.04) 25%, 
        rgba(255,255,255,0.08) 50%, 
        rgba(255,255,255,0.04) 75%);
    background-size: 800px 100%;
    animation: skeleton-shimmer 1.6s ease-in-out infinite;
    border-radius: 8px;
}
.skeleton-card {
    background: rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
}
.skeleton-line {
    height: 14px;
    margin-bottom: 12px;
    border-radius: 6px;
}
.skeleton-title {
    height: 20px;
    width: 40%;
    margin-bottom: 20px;
}
.skeleton-field {
    height: 42px;
    margin-bottom: 12px;
}
.skeleton-text-short { width: 60%; }
.skeleton-text-mid { width: 80%; }

@keyframes pulse-reason {
    0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.3); }
    50% { box-shadow: 0 0 0 6px rgba(99, 102, 241, 0); }
}

.pulse-reason {
    animation: pulse-reason 2s ease-in-out infinite;
}

.disabled-overlay {
    opacity: 0.35;
    pointer-events: none;
    user-select: none;
    filter: grayscale(0.3);
}
`;

const DRAFT_STORAGE_KEY = 'incident_form_draft';
const DRAFT_TTL_MS = 48 * 60 * 60 * 1000;

// === КОНФИГУРАЦИЯ СТАТУСОВ ДЛЯ ОТОБРАЖЕНИЯ ===
const getStatusConfig = (statusCode) => {
    const configs = {
        new: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', icon: 'fa-circle-plus', label: 'Новый' },
        in_progress: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: 'fa-spinner', label: 'В работе' },
        resolved: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', icon: 'fa-circle-check', label: 'Завершён' },
        closed: { color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)', icon: 'fa-lock', label: 'Закрыт' },
        rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', icon: 'fa-circle-xmark', label: 'Отклонён' },
        withdrawn: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: 'fa-circle-stop', label: 'Отозван' }
    };
    return configs[statusCode] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', icon: 'fa-circle-question', label: 'Неизвестно' };
};

function FormSkeleton() {
    return (
        <>
            <style>{SKELETON_STYLES}</style>
            <div className="skeleton-card">
                <div className="skeleton-box skeleton-line skeleton-title" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    <div className="skeleton-box skeleton-field" />
                    <div className="skeleton-box skeleton-field" />
                    <div className="skeleton-box skeleton-field" />
                    <div className="skeleton-box skeleton-field" style={{ gridColumn: '1 / -1', height: 160 }} />
                </div>
            </div>
            <div className="skeleton-card">
                <div className="skeleton-box skeleton-line skeleton-title" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="skeleton-card" style={{ marginBottom: 0 }}>
                        <div className="skeleton-box skeleton-line skeleton-text-mid" />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="skeleton-box skeleton-field" />
                            <div className="skeleton-box skeleton-field" />
                        </div>
                        <div className="skeleton-box skeleton-field" />
                        <div className="skeleton-box skeleton-field" />
                    </div>
                </div>
            </div>
            <div className="skeleton-card">
                <div className="skeleton-box skeleton-line skeleton-title" />
                <div className="skeleton-card" style={{ marginBottom: 0 }}>
                    <div className="skeleton-box skeleton-field" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div className="skeleton-box skeleton-field" />
                        <div className="skeleton-box skeleton-field" />
                        <div className="skeleton-box skeleton-field" />
                    </div>
                </div>
            </div>
        </>
    );
}

export default function IncidentFormPage() {
    const { id } = useParams();
    const { user } = useContext(Context);
    const navigate = useNavigate();
    const location = useLocation();
    const isEdit = !!id;

    const isAdminOrDev =
        user?.user?.status && ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"].includes(user.user.status);

    const [autoFillEnabled, setAutoFillEnabled] = useState(true);

    const OWNER_TOKEN_COOKIE = id ? `incident_owner_token_${id}` : null;

    const [ownerToken, setOwnerToken] = useState(null);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [modalEmail, setModalEmail] = useState('');
    const [modalError, setModalError] = useState('');
    const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        emailId: '',
        tg: '',
        tgId: '',
        reason: '',
        reasonId: '',
        text: '',
        persons: [{
            person_id: null,
            position: '',
            fios: [''],
            birthdate: '',
            phones: [''],
            tgNicks: [{ username: '', id: '' }]
        }],
        pvzList: []
    });

    const [fieldErrors, setFieldErrors] = useState({});
    const [emailError, setEmailError] = useState('');
    const [tgError, setTgError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPageLoading, setIsPageLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [showSubmitError, setShowSubmitError] = useState(false);
    const [loadError, setLoadError] = useState('');

    const [personErrors, setPersonErrors] = useState([]);
    const [pvzErrors, setPvzErrors] = useState([]);

    const [apiData, setApiData] = useState({
        reasonsList: [],
        postsList: [],
        pvzTypeList: [],
        trustEmailProviders: []
    });
    const [canCreate, setCanCreate] = useState(true);
    const [canEdit, setCanEdit] = useState(true);
    const [incidentMeta, setIncidentMeta] = useState(null);

    const [transitionInfo, setTransitionInfo] = useState(null);

    const [showReasonModal, setShowReasonModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [createdId, setCreatedId] = useState('');
    const [countdown, setCountdown] = useState(10);
    const [reasonSearch, setReasonSearch] = useState('');

    // Фильтр по типу причины в модальном окне
    const [reasonFilter, setReasonFilter] = useState('all'); // 'all' | 'pvz' | 'employee'

    const [showUpdateToast, setShowUpdateToast] = useState(false);

    const [showRestoreNotification, setShowRestoreNotification] = useState(false);
    const [draftRestored, setDraftRestored] = useState(false);

    const [selectedReasonOnPvz, setSelectedReasonOnPvz] = useState(null);
    const [originalReasonOnPvz, setOriginalReasonOnPvz] = useState(null);

    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawError, setWithdrawError] = useState('');

    const formDataRef = useRef(formData);
    useEffect(() => {
        formDataRef.current = formData;
    }, [formData]);

    const hasFormData = useCallback((data) => {
        if (!data) return false;
        if (data.email?.trim()) return true;
        if (data.tg?.trim()) return true;
        if (data.reason?.trim()) return true;
        if (data.text?.trim()) return true;
        if (data.persons?.some(p => p.position?.trim() || p.fios?.some(f => f?.trim()))) return true;
        if (data.pvzList?.some(pvz => pvz.type?.trim() || pvz.city?.trim() || pvz.street?.trim() || pvz.house?.trim())) return true;
        return false;
    }, []);

    useEffect(() => {
        if (isEdit) return;
        const interval = setInterval(() => {
            try {
                const currentData = formDataRef.current;
                if (hasFormData(currentData)) {
                    const draft = {
                        data: currentData,
                        savedAt: Date.now(),
                        expiresAt: Date.now() + DRAFT_TTL_MS
                    };
                    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
                }
            } catch (err) {
                console.warn('Не удалось сохранить черновик:', err);
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [isEdit, hasFormData]);

    useEffect(() => {
        if (isEdit) return;
        try {
            const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (savedDraft) {
                const draft = JSON.parse(savedDraft);
                if (draft?.expiresAt && draft.expiresAt > Date.now() && hasFormData(draft.data)) {
                    setFormData(draft.data);
                    setDraftRestored(true);
                    setShowRestoreNotification(true);
                    setTimeout(() => setShowRestoreNotification(false), 5000);
                } else {
                    localStorage.removeItem(DRAFT_STORAGE_KEY);
                }
            }
        } catch (err) {
            console.warn('Не удалось восстановить черновик:', err);
            localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
    }, [isEdit, hasFormData]);

    const handleWithdraw = async () => {
        if (!window.confirm('Вы уверены, что хотите отозвать этот инцидент? Это действие нельзя отменить, и инцидент будет скрыт из публичного доступа.')) {
            return;
        }

        setIsWithdrawing(true);
        setWithdrawError('');

        try {
            // Берем email из куки (если он там есть), иначе из текущей формы
            const emailForWithdraw = storageHandler.get('incident_creator_email', 'cookies') || formData.email;

            await withdrawIncident(id, emailForWithdraw, formData.tg);
            navigate('/incidents');
        } catch (err) {
            console.error('Withdraw error:', err);
            setWithdrawError(err?.response?.data?.message || err.message || 'Не удалось отозвать инцидент');
            setIsWithdrawing(false);
        }
    };

    const clearForm = useCallback(() => {
        setFormData({
            email: '',
            emailId: '',
            tg: '',
            tgId: '',
            reason: '',
            reasonId: '',
            text: '',
            persons: [{
                person_id: null,
                position: '',
                fios: [''],
                birthdate: '',
                phones: [''],
                tgNicks: [{ username: '', id: '' }]
            }],
            pvzList: []
        });
        setFieldErrors({});
        setEmailError('');
        setTgError('');
        setPersonErrors([]);
        setPvzErrors([]);
        setShowRestoreNotification(false);
        setDraftRestored(false);
        setSelectedReasonOnPvz(null);
        setOriginalReasonOnPvz(null);
        try {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch (err) {
            console.warn('Не удалось удалить черновик:', err);
        }
    }, []);

    // === ВСТАВИТЬ ЭТО ПЕРЕД useEffect с loadData ===

    const formatPhone = (value) => {
        if (!value) return '';
        const d = String(value).replace(/\D/g, '');
        if (!d) return '';
        if (d.length <= 11 && (d[0] === '7' || d[0] === '8')) {
            let f = '+7';
            if (d.length > 1) f += ' (' + d.slice(1, 4);
            if (d.length >= 5) f += ') ' + d.slice(4, 7);
            if (d.length >= 8) f += '-' + d.slice(7, 9);
            if (d.length >= 10) f += '-' + d.slice(9, 11);
            return f;
        }
        return value;
    };

    const cleanPhone = (v) => v.replace(/\D/g, '');

    const populateFormDataFromIncident = useCallback((incident, currentApiData) => {
        const reasonId = (currentApiData.reasonsList || []).find(r => r.name === incident.add_reason_name)?.id || '';
        const reasonObj = (currentApiData.reasonsList || []).find(r => r.id === reasonId);
        const reasonOnPvz = reasonObj?.addonData?.onPvz ?? incident.add_reason_onPvz ?? null;

        setFormData({
            email: incident.user_add_email || '',
            emailId: incident.user_add_email_id || '',
            tg: incident.user_add_tg?.replace(/^@/, '') || '',
            tgId: incident.user_add_tg_id || '',
            reason: incident.add_reason_name || '',
            reasonId: reasonId,
            text: incident.user_description || '',
            persons: (incident.personesList || []).length > 0
                ? incident.personesList.map(p => ({
                    person_id: p.person_id || null,
                    connector_id: p.connector_id || null,
                    position: p.position || '',
                    fios: p.fios?.length > 0 ? [...p.fios] : [''],
                    birthdate: p.birthdate ? String(p.birthdate).substring(0, 10) : '',
                    phones: p.phones?.length > 0 ? p.phones.map(formatPhone) : [''],
                    tgNicks: p.tgNicks?.length > 0
                        ? p.tgNicks.map(t => ({ username: t.username || '', id: t.id != null ? String(t.id) : '' }))
                        : [{ username: '', id: '' }]
                }))
                : [{ person_id: null, position: '', fios: [''], birthdate: '', phones: [''], tgNicks: [{ username: '', id: '' }] }],
            pvzList: (incident.pvzList || []).length > 0
                ? incident.pvzList.map(pvz => ({
                    pvz_id: pvz.id || null,
                    connector_id: pvz.connector_id || null,
                    type: pvz.type || '',
                    city: pvz.address_parts?.city || '',
                    street: pvz.address_parts?.street || '',
                    house: pvz.address_parts?.home || ''
                }))
                : []
        });
        setSelectedReasonOnPvz(reasonOnPvz);
        setOriginalReasonOnPvz(reasonOnPvz);
        setIncidentMeta(incident);
    }, []); // formatPhone стабилен, так как не зависит от стейта

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            try {
                setIsPageLoading(true);

                const isDisabled = storageHandler.get('incident_dont_save_user_data', 'cookies');
                if (isMounted) setAutoFillEnabled(!isDisabled);

                const data = await getCreateIncidentData();
                if (!isMounted) return;

                setApiData({
                    reasonsList: data.reasonsList || [],
                    postsList: data.postsList || [],
                    pvzTypeList: data.pvzTypeList || [],
                    trustEmailProviders: data.trustEmailProviders || []
                });
                setCanCreate(data.cenCreate !== false);
                setCanEdit(data.cenEdit !== false);

                if (isEdit) {
                    if (data.cenEdit === false) {
                        setPageError('Редактирование инцидентов временно недоступно для вашего уровня доступа.');
                        setIsPageLoading(false);
                        return;
                    }

                    let token = OWNER_TOKEN_COOKIE ? storageHandler.get(OWNER_TOKEN_COOKIE, 'cookies') : null;

                    try {
                        const incident = await getIncident(id, token);
                        if (!isMounted) return;

                        // ГЛАВНОЕ ИСПРАВЛЕНИЕ: обрабатываем access_restricted здесь, а не в catch
                        if (incident.access_restricted) {
                            const cookieEmail = storageHandler.get('incident_creator_email', 'cookies') ||
                                storageHandler.get('incident_user_email', 'cookies');

                            if (cookieEmail) {
                                try {
                                    const verifyRes = await verifyCreatorEmail(id, cookieEmail);
                                    if (verifyRes.token && isMounted) {
                                        setOwnerToken(verifyRes.token);
                                        storageHandler.add(OWNER_TOKEN_COOKIE, verifyRes.token, {
                                            method: 'cookies', expireTime: 960, path: '/', sameSite: 'Lax'
                                        });

                                        // Повторный запрос с новым токеном
                                        const retryIncident = await getIncident(id, verifyRes.token);
                                        if (!isMounted) return;

                                        if (!retryIncident.access_restricted) {
                                            setOwnerToken(verifyRes.token);
                                            populateFormDataFromIncident(retryIncident, data);
                                            return; // Успешно загрузили, выходим из функции
                                        }
                                    }
                                } catch (e) {
                                    // Тихая проверка не удалась (например, email в куке неверный), идем к модалке
                                }
                            }

                            // Если тихая проверка не удалась или email в куки не было, показываем модалку
                            if (isMounted) {
                                setOwnerToken(null);
                                setModalEmail(cookieEmail || ''); // Предзаполняем поле email из куки
                                setShowEmailModal(true);
                            }
                            return; // ВАЖНО: прерываем выполнение, чтобы не заполнять форму урезанными данными
                        }

                        // Если access_restricted === false, значит доступ есть (токен подошел или это админ)
                        setOwnerToken(token);
                        populateFormDataFromIncident(incident, data);

                    } catch (err) {
                        if (!isMounted) return;
                        console.error(err);
                        setLoadError(err?.response?.data?.message || err.message || 'Не удалось загрузить данные инцидента');
                    }
                } else {
                    if (!isDisabled && !draftRestored) {
                        const savedEmail = storageHandler.get('incident_user_email', 'cookies');
                        const savedTg = storageHandler.get('incident_user_tg', 'cookies');
                        if (savedEmail || savedTg) {
                            setFormData(prev => ({ ...prev, email: savedEmail || '', tg: savedTg || '' }));
                        }
                    }
                }
            } catch (err) {
                if (!isMounted) return;
                console.error(err);
                setPageError('Не удалось загрузить данные для создания инцидента');
            } finally {
                if (isMounted) setIsPageLoading(false);
            }
        };

        loadData();
        return () => { isMounted = false; };
    }, [id, isEdit, draftRestored, populateFormDataFromIncident, OWNER_TOKEN_COOKIE]);

    useEffect(() => {
        let isMounted = true;
        if (!isEdit || !canEdit || !isAdminOrDev || !user?.user?.status) return;

        const loadTransitionInfo = async () => {
            try {
                const transitionData = await getTransitionInfo(id);
                if (!isMounted) return;
                setTransitionInfo(transitionData);
            } catch (err) {
                if (!isMounted) return;
                setTransitionInfo(null);
            }
        };

        loadTransitionInfo();
        return () => { isMounted = false; };
    }, [id, isEdit, canEdit, isAdminOrDev, user?.user?.status]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.email && apiData.trustEmailProviders.length > 0) {
                setEmailError(validateEmail(formData.email, apiData.trustEmailProviders));
            } else {
                setEmailError('');
            }
        }, 600);
        return () => clearTimeout(timer);
    }, [formData.email, apiData.trustEmailProviders]);

    useEffect(() => {
        setShowSuccessModal(false);
        setCreatedId('');
    }, [id]);

    useEffect(() => {
        if (location.state?.scrollToEvidence && !isPageLoading && isEdit && !loadError) {
            const timer = setTimeout(() => {
                const evidenceSection = document.getElementById('evidence-section');
                if (evidenceSection) evidenceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                window.history.replaceState({}, document.title);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [location.state, isPageLoading, isEdit, loadError]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.tg) setTgError(validateTg(formData.tg));
            else setTgError('');
        }, 600);
        return () => clearTimeout(timer);
    }, [formData.tg]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const newPvzErrors = formData.pvzList.map(pvz => {
                const err = {};
                if (pvz.city?.trim()) { const e = validateCity(pvz.city); if (e) err.city = e; }
                if (pvz.street?.trim()) { const e = validateStreet(pvz.street); if (e) err.street = e; }
                if (pvz.house?.trim()) { const e = validateHouse(pvz.house); if (e) err.house = e; }
                return err;
            });
            setPvzErrors(prev => newPvzErrors.map((e, i) => ({ ...e, type: prev[i]?.type || '' })));
        }, 600);
        return () => clearTimeout(timer);
    }, [formData.pvzList]);

    useEffect(() => {
        if (!showSuccessModal) return;
        if (countdown <= 0) {
            navigate(isEdit ? `/incidents/${id}` : `/incidents/${createdId}/edit`, { state: { scrollToEvidence: true } });
            return;
        }
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [showSuccessModal, countdown, createdId, navigate, isEdit, id]);

    // === НАЙТИ И ЗАМЕНИТЬ ФУНКЦИЮ handleVerifyEmail ===

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

                // Используем нашу вынесенную функцию для обновления формы
                // (предполагается, что apiData уже загружена к этому моменту)
                const incident = await getIncident(id, res.token);
                populateFormDataFromIncident(incident, apiData);
            }
        } catch (err) {
            setModalError(err?.response?.data?.message || 'Неверный email создателя');
        } finally {
            setIsVerifyingEmail(false);
        }
    };

    const validateEmail = (email, providers) => {
        if (!email) return 'Укажите email заявителя';
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) return 'Неверный формат email';
        const domain = email.split('@')[1].toLowerCase();
        if (providers.length > 0 && !providers.includes(domain)) return `Провайдер "${domain}" не входит в список доверенных`;
        return '';
    };

    const validateTg = (tg) => {
        if (!tg) return '';
        const clean = tg.replace(/^@/, '').trim();
        if (!clean) return '';
        if (!/^[a-zA-Z][a-zA-Z0-9_]{3,31}$/.test(clean)) return 'Неверный формат: 4-32 символа, латиница/цифры/_';
        return '';
    };

    const validateCity = (city) => {
        if (!city?.trim()) return 'Укажите город';
        const c = city.replace(/^(г\.?|город|гор\.)\s*/i, "").trim();
        if (!c) return 'Некорректный город';
        if (c.length > 30) return 'Город: максимум 30 символов';
        if (!/^[а-яА-ЯёЁa-zA-Z\s\-\.]+$/.test(c)) return 'Город: только буквы, пробелы, дефис';
        return '';
    };

    const validateStreet = (street) => {
        if (!street?.trim()) return 'Укажите улицу';
        const c = street.replace(/^(ул\.?|улица)\s*/i, "").trim();
        if (!c) return 'Некорректная улица';
        if (c.length > 70) return 'Улица: максимум 70 символов';
        if (!/^[а-яА-ЯёЁa-zA-Z0-9\s\-\.]+$/.test(c)) return 'Улица: буквы, цифры, пробелы';
        return '';
    };

    const validateHouse = (house) => {
        if (!house?.trim()) return 'Укажите номер дома';
        const c = house.replace(/^(д\.?|дом|корпус|к\.?)\s*/i, "").replace(/\s+/g, "").trim();
        if (!/^[0-9]+[А-Яа-яA-Za-z0-9]*$/.test(c)) return 'Дом: начните с цифры (12, 45А, 7к1)';
        if (c.length > 10) return 'Дом: максимум 10 символов';
        return '';
    };

    const handleAutoFillToggle = () => {
        const newState = !autoFillEnabled;
        setAutoFillEnabled(newState);
        try {
            if (newState) {
                storageHandler.remove('incident_dont_save_user_data', { method: 'cookies', path: '/' });
            } else {
                storageHandler.add('incident_dont_save_user_data', true, { method: 'cookies', path: '/', sameSite: 'Lax' });
                storageHandler.remove('incident_user_email', { method: 'cookies', path: '/' });
                storageHandler.remove('incident_user_tg', { method: 'cookies', path: '/' });
            }
        } catch (err) {
            console.warn('Ошибка при переключении автозаполнения:', err);
        }
    };

    const buildAddressString = (pvz) => {
        const city = pvz.city?.trim() || '';
        const street = pvz.street?.trim() || '';
        const house = pvz.house?.trim() || '';
        if (!city && !street && !house) return '';
        return `г. ${city}, ул. ${street}, д. ${house}`;
    };

    const validate = () => {
        const e = {};
        const emailErr = validateEmail(formData.email, apiData.trustEmailProviders);
        if (emailErr) e.email = emailErr;
        const tgErr = validateTg(formData.tg);
        if (tgErr) e.tg = tgErr;
        if (!formData.reason) e.reason = 'Выберите причину инцидента';
        if (!formData.text.trim()) e.text = 'Укажите описание инцидента';

        const newPersonErrors = [];
        let hasPersonError = false;
        formData.persons.forEach((p) => {
            const err = {};
            if (!p.position?.trim()) { err.position = 'Укажите должность'; hasPersonError = true; }
            if (p.fios.filter(f => f?.trim()).length === 0) { err.fios = 'Укажите хотя бы одно ФИО'; hasPersonError = true; }
            newPersonErrors.push(err);
        });

        const newPvzErrors = [];
        let hasPvzError = false;
        formData.pvzList.forEach((pvz) => {
            const err = {};
            const hasType = pvz.type?.trim();
            const hasAddr = pvz.city?.trim() || pvz.street?.trim() || pvz.house?.trim();
            if (hasType || hasAddr) {
                if (!hasType) { err.type = 'Укажите тип объекта'; hasPvzError = true; }
                const ce = validateCity(pvz.city); if (ce) { err.city = ce; hasPvzError = true; }
                const se = validateStreet(pvz.street); if (se) { err.street = se; hasPvzError = true; }
                const he = validateHouse(pvz.house); if (he) { err.house = he; hasPvzError = true; }
            }
            newPvzErrors.push(err);
        });

        setPersonErrors(newPersonErrors);
        setPvzErrors(newPvzErrors);
        setFieldErrors(e);
        setEmailError(emailErr);
        setTgError(tgErr);
        return Object.keys(e).length === 0 && !hasPersonError && !hasPvzError;
    };

    const handleTgChange = (e) => {
        setFormData({ ...formData, tg: e.target.value.replace(/^@/, '').replace(/[^a-zA-Z0-9_]/g, '') });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) {
            setTimeout(() => {
                const el = document.querySelector('[data-error="true"]');
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.querySelector('input, textarea, select')?.focus();
                }
            }, 100);
            setShowSubmitError(true);
            setTimeout(() => setShowSubmitError(false), 5000);
            return;
        }

        if (isEdit && (!formData.emailId || !formData.tgId)) {
            setPageError('Невозможно сохранить: отсутствуют ID контактов.');
            return;
        }

        setIsSubmitting(true);
        try {
            const cleanData = {
                id,
                email: formData.email.trim(),
                emailId: formData.emailId,
                tg: formData.tg.replace(/^@/, '').trim() || undefined,
                tgId: formData.tgId,
                reason: formData.reason,
                text: formData.text.trim(),
                persons: formData.persons.map(p => {
                    const c = {
                        position: p.position?.trim() || '',
                        fios: p.fios.filter(f => f?.trim()).map(f => f.trim()),
                        birthdate: p.birthdate || '',
                        phones: p.phones.filter(ph => ph && cleanPhone(ph)).map(ph => cleanPhone(ph)),
                        tgNicks: p.tgNicks
                            .filter(t => t.username?.trim() || t.id?.toString().trim())
                            .map(t => ({ username: t.username?.trim() || '', id: t.id ? String(t.id).trim() : '' }))
                    };
                    if (p.person_id) c.person_id = p.person_id;
                    return c;
                }).filter(p => p.position && p.fios.length > 0),
                pvzList: formData.pvzList.map(pvz => {
                    const c = pvz.city?.trim() || '', s = pvz.street?.trim() || '', h = pvz.house?.trim() || '';
                    return { type: pvz.type?.trim() || '', address: (c || s || h) ? `г. ${c}, ул. ${s}, д. ${h}` : '' };
                }).filter(p => p.type && p.address)
            };

            if (isEdit) {
                await updateIncident(cleanData, ownerToken);
                setShowUpdateToast(true);
                setTimeout(() => setShowUpdateToast(false), 3500);

                if (cleanData.email) {
                    storageHandler.add('incident_creator_email', cleanData.email, {
                        method: 'cookies',
                        expireTime: 960, // 16 минут (сбрасываем таймер заново)
                        path: '/',
                        sameSite: 'Lax'
                    });
                }

                try {
                    // ИСПРАВЛЕНИЕ: передаем ownerToken, чтобы бэкенд не вернул access_restricted
                    const upd = await getIncident(id, ownerToken);
                    const rId = (apiData.reasonsList || []).find(r => r.name === upd.add_reason_name)?.id || '';

                    setFormData({
                        email: upd.user_add_email || '', emailId: upd.user_add_email_id || '',
                        tg: upd.user_add_tg?.replace(/^@/, '') || '', tgId: upd.user_add_tg_id || '',
                        reason: upd.add_reason_name || '', reasonId: rId, text: upd.user_description || '',
                        persons: (upd.personesList || []).map(p => ({
                            person_id: p.person_id || null, connector_id: p.connector_id || null,
                            position: p.position || '', fios: p.fios?.length ? [...p.fios] : [''],
                            birthdate: p.birthdate ? String(p.birthdate).substring(0, 10) : '',
                            phones: p.phones?.length ? p.phones.map(formatPhone) : [''],
                            tgNicks: p.tgNicks?.length ? p.tgNicks.map(t => ({ username: t.username || '', id: t.id != null ? String(t.id) : '' })) : [{ username: '', id: '' }]
                        })),
                        pvzList: (upd.pvzList || []).map(pvz => ({
                            pvz_id: pvz.id || null, connector_id: pvz.connector_id || null,
                            type: pvz.type || '', city: pvz.address_parts?.city || '',
                            street: pvz.address_parts?.street || '', house: pvz.address_parts?.home || ''
                        }))
                    });
                    setIncidentMeta(upd);
                } catch (e2) {
                    console.warn('Не удалось обновить форму после сохранения:', e2);
                }
            } else {
                const newId = await createIncident(cleanData);
                setCreatedId(newId);
                setShowSuccessModal(true);
                setCountdown(60);

                // Сохраняем email создателя в куки на 16 минут (960 секунд) для последующего отзыва
                if (cleanData.email) {
                    storageHandler.add('incident_creator_email', cleanData.email, {
                        method: 'cookies',
                        expireTime: 960, // 16 * 60 секунд
                        path: '/',
                        sameSite: 'Lax'
                    });
                }

                try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { }
                try {
                    // ИЗМЕНЕНО: используем общий ключ и добавляем тип 'incident'
                    const KEY = 'recent_created_items', TTL = 15 * 60 * 1000, now = Date.now();
                    const existing = storageHandler.get(KEY, 'cookies') || [];
                    const alive = (Array.isArray(existing) ? existing : []).filter(i => i?.expiresAt > now);

                    alive.push({
                        id: newId,
                        type: 'incident', // Метка типа для компонента RecentCreatedIncidents
                        createdAt: now,
                        expiresAt: now + TTL
                    });

                    const maxExp = Math.max(...alive.map(i => i.expiresAt));
                    storageHandler.add(KEY, alive, {
                        method: 'cookies',
                        expireTime: Math.max(1, Math.ceil((maxExp - now) / 1000)),
                        path: '/',
                        sameSite: 'Lax'
                    });
                } catch { }
                if (autoFillEnabled) {
                    try {
                        const tenDays = Math.ceil((10 * 86400000) / 1000);
                        if (cleanData.email) storageHandler.add('incident_user_email', cleanData.email, { method: 'cookies', expireTime: tenDays, path: '/', sameSite: 'Lax' });
                        if (cleanData.tg) storageHandler.add('incident_user_tg', cleanData.tg, { method: 'cookies', expireTime: tenDays, path: '/', sameSite: 'Lax' });
                    } catch { }
                }
            }
        } catch (err) {
            console.error(err);
            setPageError(err?.response?.data?.message || err.message || 'Ошибка при сохранении');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const updatePerson = (idx, field, value) => {
        const np = [...formData.persons];
        np[idx] = { ...np[idx], [field]: value };
        setFormData({ ...formData, persons: np });
    };
    const addPerson = () => setFormData({ ...formData, persons: [...formData.persons, { person_id: null, position: '', fios: [''], birthdate: '', phones: [''], tgNicks: [{ username: '', id: '' }] }] });
    const removePerson = (idx) => { if (formData.persons.length <= 1) return; setFormData({ ...formData, persons: formData.persons.filter((_, i) => i !== idx) }); };

    const updateListField = (pi, field, ii, value) => {
        const np = [...formData.persons];
        const list = [...np[pi][field]];
        list[ii] = field === 'phones' ? formatPhone(value) : value;
        np[pi] = { ...np[pi], [field]: list };
        setFormData({ ...formData, persons: np });
    };
    const addListField = (pi, field, empty) => {
        const np = [...formData.persons];
        np[pi] = { ...np[pi], [field]: [...np[pi][field], empty] };
        setFormData({ ...formData, persons: np });
    };
    const removeListField = (pi, field, ii) => {
        const np = [...formData.persons];
        np[pi] = { ...np[pi], [field]: np[pi][field].filter((_, i) => i !== ii) };
        setFormData({ ...formData, persons: np });
    };
    const updateTgField = (pi, ii, field, value) => {
        const np = [...formData.persons];
        const list = [...np[pi].tgNicks];
        list[ii] = { ...list[ii], [field]: value };
        np[pi] = { ...np[pi], tgNicks: list };
        setFormData({ ...formData, persons: np });
    };

    const updatePvz = (idx, field, value) => {
        const np = [...formData.pvzList];
        np[idx] = { ...np[idx], [field]: value };
        setFormData({ ...formData, pvzList: np });
    };
    const addPvz = () => setFormData({ ...formData, pvzList: [...formData.pvzList, { type: '', city: '', street: '', house: '' }] });
    const removePvz = (idx) => setFormData({ ...formData, pvzList: formData.pvzList.filter((_, i) => i !== idx) });

    const selectReason = (reason) => {
        const onPvz = reason.addonData?.onPvz ?? false;
        const newPersons = formData.persons.map(p => {
            const postObj = apiData.postsList.find(post => post.name === p.position);
            if (postObj && (postObj.addonData?.onPvz ?? false) !== onPvz) return { ...p, position: '' };
            return p;
        });
        setFormData(prev => ({ ...prev, reason: reason.name, reasonId: reason.id, persons: newPersons }));
        setSelectedReasonOnPvz(onPvz);
        setShowReasonModal(false);
        setReasonSearch('');
        setReasonFilter('all');
    };

    // Фильтрация причин
    const filteredReasons = apiData.reasonsList.filter(r => {
        const matchSearch = r.name.toLowerCase().includes(reasonSearch.toLowerCase());
        if (!matchSearch) return false;
        if (isEdit && originalReasonOnPvz !== null) return (r.addonData?.onPvz ?? false) === originalReasonOnPvz;
        if (reasonFilter === 'pvz') return (r.addonData?.onPvz ?? false) === true;
        if (reasonFilter === 'employee') return (r.addonData?.onPvz ?? false) === false;
        return true;
    });

    // Фильтрация должностей
    const filteredPostsList = apiData.postsList.filter(post => {
        if (selectedReasonOnPvz === null) return true;
        return (post.addonData?.onPvz ?? false) === selectedReasonOnPvz;
    });

    // Сброс фильтра при открытии модалки
    useEffect(() => {
        if (showReasonModal && !isEdit) setReasonFilter('all');
    }, [showReasonModal, isEdit]);

    const copyId = () => navigator.clipboard.writeText(createdId);

    const errors = { ...fieldErrors, email: emailError || fieldErrors.email, tg: tgError || fieldErrors.tg };
    const isEditBlockedByMissingIds = isEdit && (!formData.emailId || !formData.tgId);
    const currentStatus = transitionInfo?.current_status;

    // Блокируем только персоны и ПВЗ, пока не выбрана причина (при создании)
    const isPersonsPvzBlocked = !isEdit && !formData.reason;

    if (loadError) {
        return (
            <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
                <Alert variant="danger" icon="fa-solid fa-circle-exclamation"><strong>Инцидент не найден</strong></Alert>
                <div style={{ marginTop: 20 }}><Button variant="secondary" icon="fa-solid fa-arrow-left" onClick={() => navigate('/incidents')}>К списку</Button></div>
            </div>
        );
    }
    if (isEdit && !canEdit && !isPageLoading) {
        return (
            <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
                <Alert variant="warning" icon="fa-solid fa-triangle-exclamation"><strong>Редактирование недоступно.</strong></Alert>
                <div style={{ marginTop: 20 }}><Button variant="secondary" icon="fa-solid fa-arrow-left" onClick={() => navigate(`/incidents/${id}`)}>Вернуться</Button></div>
            </div>
        );
    }
    if (!canCreate && !isEdit) {
        return (
            <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
                <Alert variant="warning" icon="fa-solid fa-triangle-exclamation"><strong>Создание инцидентов временно недоступно.</strong></Alert>
                <div style={{ marginTop: 20 }}><Button variant="secondary" icon="fa-solid fa-arrow-left" onClick={() => navigate('/incidents')}>Вернуться</Button></div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
                <Alert variant="danger" icon="fa-solid fa-circle-exclamation"><strong>Инцидент не найден</strong></Alert>
                <div style={{ marginTop: 20 }}><Button variant="secondary" icon="fa-solid fa-arrow-left" onClick={() => navigate('/incidents')}>К списку</Button></div>
            </div>
        );
    }
    if (isEdit && !canEdit && !isPageLoading) {
        return (
            <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
                <Alert variant="warning" icon="fa-solid fa-triangle-exclamation"><strong>Редактирование недоступно.</strong></Alert>
                <div style={{ marginTop: 20 }}><Button variant="secondary" icon="fa-solid fa-arrow-left" onClick={() => navigate(`/incidents/${id}`)}>Вернуться</Button></div>
            </div>
        );
    }
    if (!canCreate && !isEdit) {
        return (
            <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
                <Alert variant="warning" icon="fa-solid fa-triangle-exclamation"><strong>Создание инцидентов временно недоступно.</strong></Alert>
                <div style={{ marginTop: 20 }}><Button variant="secondary" icon="fa-solid fa-arrow-left" onClick={() => navigate('/incidents')}>Вернуться</Button></div>
            </div>
        );
    }

    // === ЭКРАН ОГРАНИЧЕННОГО ДОСТУПА К РЕДАКТИРОВАНИЮ ===
    if (isEdit && incidentMeta?.access_restricted && !isPageLoading) {
        const restrictedStatusCfg = getStatusConfig(incidentMeta.status);
        return (
            <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                            Инцидент #{incidentMeta.id}
                        </h1>
                        <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
                            {incidentMeta.status_name || 'Статус неизвестен'}
                        </p>
                    </div>
                    <Button variant="secondary" icon="fa-solid fa-arrow-left" onClick={() => navigate(`/incidents/${id}`)}>
                        К инциденту
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
                            Редактирование недоступно
                        </h2>
                        <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24, lineHeight: 1.7, maxWidth: 500, margin: '0 auto 24px' }}>
                            Вы можете редактировать этот инцидент только в течение 15 минут после создания
                            и пока он находится в статусе «Новый».
                            Для внесения изменений в другие статусы обратитесь к администратору или создайте новый инцидент.
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
                                {incidentMeta.status_name || restrictedStatusCfg.label}
                            </span>
                        </div>
                        <br />
                        <Button variant="primary" icon="fa-solid fa-arrow-left" size="lg" onClick={() => navigate(`/incidents/${id}`)}>
                            Вернуться к просмотру
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // === ЭКРАН ЗАПРЕТА РЕДАКТИРОВАНИЯ ЗАВЕРШЁННОГО ИНЦИДЕНТА ===
    if (isEdit && incidentMeta?.status === 'resolved' && !isAdminOrDev && !isPageLoading) {
        return (
            <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                            Инцидент #{incidentMeta.id}
                        </h1>
                        <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
                            {incidentMeta.status_name || 'Завершён'}
                        </p>
                    </div>
                    <Button variant="secondary" icon="fa-solid fa-arrow-left" onClick={() => navigate(`/incidents/${id}`)}>
                        К инциденту
                    </Button>
                </div>
                <Card style={{ maxWidth: 800, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: '50%',
                            background: 'rgba(16,185,129,0.12)',
                            border: '1px solid rgba(16,185,129,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 24px'
                        }}>
                            <i className="fa-solid fa-lock" style={{ color: '#10b981', fontSize: 32 }} />
                        </div>
                        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>
                            Редактирование обработанного инцидента недоступно
                        </h2>
                        <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24, lineHeight: 1.7, maxWidth: 500, margin: '0 auto 24px' }}>
                            Этот инцидент уже обработан. Изменение данных обработанных инцидентов недоступно.
                        </p>
                        <Button variant="primary" icon="fa-solid fa-arrow-left" size="lg" onClick={() => navigate(`/incidents/${id}`)}>
                            Вернуться к просмотру
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    const buildServiceInfo = () => {
        if (!incidentMeta) return null;
        const items = [];
        if (incidentMeta.id) items.push({ label: 'ID инцидента', value: incidentMeta.id, mono: true });
        if (incidentMeta.date_create) items.push({ label: 'Создан', value: new Date(incidentMeta.date_create).toLocaleString('ru-RU') });
        if (incidentMeta.user_add_email_id) items.push({ label: 'EmailId', value: incidentMeta.user_add_email_id });
        if (incidentMeta.user_add_tg_id) items.push({ label: 'TgId', value: incidentMeta.user_add_tg_id });
        (incidentMeta.personesList || []).forEach((p, idx) => {
            if (p.person_id) items.push({ label: `Персона #${idx + 1} ID`, value: p.person_id, mono: true });
            if (p.post_id) items.push({ label: `Персона #${idx + 1} post_id`, value: p.post_id });
            if (p.created_at) items.push({ label: `Персона #${idx + 1} создана`, value: new Date(p.created_at).toLocaleString('ru-RU') });
        });
        (incidentMeta.pvzList || []).forEach((pvz, idx) => {
            if (pvz.id) items.push({ label: `ПВЗ #${idx + 1} ID`, value: pvz.id, mono: true });
            if (pvz.type_id) items.push({ label: `ПВЗ #${idx + 1} type_id`, value: pvz.type_id });
        });
        if (!items.length) return null;
        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                {isAdminOrDev ? <Card style={{ marginBottom: 24, background: 'rgba(99,102,241,0.04)', border: '1px dashed rgba(99,102,241,0.2)' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <i className="fa-solid fa-gear" style={{ color: '#818cf8' }} /> Служебная информация <Badge variant="info" style={{ marginLeft: 8, fontSize: 11 }}>админ</Badge>
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                        {items.map((item, idx) => (
                            <div key={idx} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.25)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</div>
                                <div style={{ fontSize: 13, color: '#e2e8f0', fontFamily: item.mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{item.value}</div>
                            </div>
                        ))}
                    </div>
                </Card> : null}
            </motion.div>
        );
    };

    // Стили для модалки — приглушённые цвета
    const reasonCardPvzBg = 'rgba(251, 146, 60, 0.06)';
    const reasonCardPvzBorder = 'rgba(251, 146, 60, 0.12)';
    const reasonCardPvzIconBg = 'rgba(251, 146, 60, 0.08)';
    const reasonCardPvzIconBorder = '1.5px solid rgba(251, 146, 60, 0.18)';
    const reasonCardPvzIconColor = 'rgba(251, 146, 60, 0.7)';
    const reasonCardPvzBadgeBg = 'rgba(251, 146, 60, 0.07)';
    const reasonCardPvzBadgeColor = 'rgba(251, 146, 60, 0.75)';

    const reasonCardEmpBg = 'rgba(139, 92, 246, 0.06)';
    const reasonCardEmpBorder = 'rgba(139, 92, 246, 0.12)';
    const reasonCardEmpIconBg = 'rgba(139, 92, 246, 0.08)';
    const reasonCardEmpIconBorder = '1.5px solid rgba(139, 92, 246, 0.18)';
    const reasonCardEmpIconColor = 'rgba(139, 92, 246, 0.7)';
    const reasonCardEmpBadgeBg = 'rgba(139, 92, 246, 0.07)';
    const reasonCardEmpBadgeColor = 'rgba(139, 92, 246, 0.75)';

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
            <style>{SKELETON_STYLES}</style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                            {isEdit ? `Редактирование #${id}` : 'Запись о новом нарушении'}
                        </h1>
                        {isEdit && currentStatus && <Badge variant={currentStatus.button_color || 'info'} style={{ fontSize: 13, padding: '6px 14px', fontWeight: 600 }}>{currentStatus.name}</Badge>}
                    </div>
                    <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
                        {isEdit ? 'Измените данные существующего инцидента' : 'Обязательная информация помечена красной звёздочкой'}
                    </p>
                </div>
                <Button variant="secondary" icon="fa-solid fa-arrow-left" onClick={() => navigate(isEdit ? `/incidents/${id}` : '/incidents')}>
                    {isEdit ? 'К инциденту' : 'К списку'}
                </Button>
            </div>

            <RecentCreatedIncidents />

            {pageError && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 16 }}>
                    <Alert variant="danger" icon="fa-solid fa-circle-exclamation" onClose={() => setPageError('')}>{pageError}</Alert>
                </motion.div>
            )}

            <AnimatePresence>
                {showRestoreNotification && (
                    <motion.div initial={{ opacity: 0, y: -40, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -40, x: '-50%' }}
                        style={{ position: 'fixed', top: 24, left: '50%', zIndex: 2000, display: 'flex', flexDirection: 'column', gap: 12, padding: '18px 24px', background: 'linear-gradient(135deg, rgba(99,102,241,0.95), rgba(79,70,229,0.95))', backdropFilter: 'blur(12px)', borderRadius: 14, boxShadow: '0 10px 40px rgba(99,102,241,0.4)', color: '#fff', fontSize: 14, maxWidth: '90vw', minWidth: 320 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <i className="fa-solid fa-rotate-left" style={{ fontSize: 14 }} />
                            </div>
                            <div style={{ flex: 1, lineHeight: 1.5 }}>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>Восстановлена незавершённая форма</div>
                                <div style={{ fontSize: 13, opacity: 0.9 }}>Если хотите начать заново, можете очистить все поля</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={clearForm} style={{ background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <i className="fa-solid fa-trash" style={{ fontSize: 11 }} /> Очистить форму
                            </button>
                            <button onClick={() => setShowRestoreNotification(false)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
                                Продолжить
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <form onSubmit={handleSubmit}>
                {isPageLoading ? <FormSkeleton /> : (
                    <>
                        {/* === БЛОК 1: ОСНОВНАЯ ИНФОРМАЦИЯ (всегда доступна) === */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <Card style={{ marginBottom: 24 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <i className="fa-solid fa-file-lines" style={{ color: '#6366f1' }} />
                                    Основная информация
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                                    <FormField label="Ваш Email" hint="В будущем по Email можно будет управлять инцидентом" required error={errors.email}>
                                        <div data-error={errors.email ? "true" : "false"}>
                                            <Input icon="fa-envelope" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} error={errors.email} placeholder="security@company.ru" />
                                        </div>
                                    </FormField>

                                    <FormField label="Telegram для связи" hint="Если нам что-то понадобится уточнить">
                                        <div data-error={errors.tg ? "true" : "false"}>
                                            <Input icon="fa-brands fa-telegram" value={formData.tg} onChange={handleTgChange} error={errors.tg} placeholder="username" />
                                        </div>
                                    </FormField>

                                    <FormField label="Причина инцидента" required error={errors.reason}>
                                        <div data-error={errors.reason ? "true" : "false"}>
                                            <div
                                                onClick={() => setShowReasonModal(true)}
                                                style={{
                                                    padding: '10px 14px',
                                                    borderRadius: 8,
                                                    border: `1px solid ${errors.reason ? '#ef4444' : formData.reason ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                                                    background: formData.reason ? 'rgba(99,102,241,0.08)' : 'rgba(0,0,0,0.2)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: 10,
                                                    transition: 'all 0.2s',
                                                    minHeight: 42
                                                }}
                                            >
                                                {formData.reason ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        {selectedReasonOnPvz ? (
                                                            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(251,146,60,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <i className="fa-solid fa-house" style={{ color: '#fb923c', fontSize: 13 }} />
                                                            </div>
                                                        ) : (
                                                            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <i className="fa-solid fa-user" style={{ color: '#a78bfa', fontSize: 13 }} />
                                                            </div>
                                                        )}
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{formData.reason}</span>
                                                            <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                                                {selectedReasonOnPvz ? 'На администрацию ПВЗ' : 'На сотрудника ПВЗ'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#64748b' }}>Выберите причину...</span>
                                                )}
                                                <i className="fa-solid fa-chevron-right" style={{ color: '#64748b', fontSize: 12 }} />
                                            </div>
                                        </div>
                                    </FormField>

                                    <FormField label="Подробное описание" required error={errors.text} style={{ gridColumn: '1 / -1' }}>
                                        <div data-error={errors.text ? "true" : "false"}>
                                            <Textarea value={formData.text} onChange={e => setFormData({ ...formData, text: e.target.value })} error={errors.text} style={{ minHeight: 160 }} placeholder="Опишите детали инцидента, обстоятельства, доказательства..." />
                                        </div>
                                    </FormField>
                                </div>
                            </Card>
                        </motion.div>

                        {/* === БЛОК 2: ПЕРСОНЫ (блокируется до выбора причины) === */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <Card style={{ marginBottom: 24 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <i className="fa-solid fa-user-shield" style={{ color: '#6366f1' }} />
                                        Персоны ({formData.persons.length})
                                    </h3>
                                    <Button type="button" variant="secondary" size="sm" icon="fa-plus" onClick={addPerson} disabled={isPersonsPvzBlocked}>
                                        Добавить персону
                                    </Button>
                                </div>

                                {isPersonsPvzBlocked && (
                                    <div style={{
                                        padding: '14px 18px',
                                        marginBottom: 16,
                                        background: 'rgba(99,102,241,0.06)',
                                        border: '1px solid rgba(99,102,241,0.15)',
                                        borderRadius: 10,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12
                                    }}>
                                        <i className="fa-solid fa-hand-pointer" style={{ color: '#818cf8', fontSize: 16, flexShrink: 0 }} />
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>Сначала выберите причину инцидента</div>
                                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Доступные должности зависят от типа нарушения</div>
                                        </div>
                                    </div>
                                )}

                                <div className={isPersonsPvzBlocked ? 'disabled-overlay' : ''}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <AnimatePresence>
                                            {formData.persons.map((p, idx) => (
                                                <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }}
                                                    style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <Badge variant="info">Персона #{idx + 1}</Badge>
                                                            {p.person_id && <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', background: 'rgba(99,102,241,0.08)', padding: '2px 8px', borderRadius: 4 }}>{p.person_id.substring(0, 8)}…</span>}
                                                        </div>
                                                        {formData.persons.length > 1 && !isPersonsPvzBlocked && (
                                                            <button type="button" onClick={() => removePerson(idx)} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#f87171', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <i className="fa-solid fa-trash" style={{ fontSize: 12 }} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                                                        <FormField label="Должность / Роль" required error={personErrors[idx]?.position}>
                                                            <div data-error={personErrors[idx]?.position ? "true" : "false"}>
                                                                {filteredPostsList.length > 0 ? (
                                                                    <Select value={p.position} onChange={e => updatePerson(idx, 'position', e.target.value)} error={personErrors[idx]?.position} disabled={isPersonsPvzBlocked}>
                                                                        <option value="">— Не указано —</option>
                                                                        {filteredPostsList.map(post => <option key={post.id} value={post.name}>{post.name}</option>)}
                                                                    </Select>
                                                                ) : (
                                                                    <Input value={p.position} onChange={e => updatePerson(idx, 'position', e.target.value)} placeholder="Должность" error={personErrors[idx]?.position} disabled={isPersonsPvzBlocked} />
                                                                )}
                                                            </div>
                                                        </FormField>

                                                        <FormField label="Дата рождения">
                                                            <Input icon="fa-cake-candles" type="date" value={p.birthdate} onChange={e => updatePerson(idx, 'birthdate', e.target.value)} disabled={isPersonsPvzBlocked} />
                                                        </FormField>
                                                    </div>

                                                    <div style={{ marginTop: 16 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                            <label style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <i className="fa-solid fa-id-card" style={{ color: '#6366f1' }} /> ФИО / Псевдонимы <span style={{ color: '#ef4444' }}>*</span>
                                                            </label>
                                                            <button type="button" onClick={() => addListField(idx, 'fios', '')} style={{ background: 'rgba(99,102,241,0.15)', border: 'none', color: '#818cf8', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }} disabled={isPersonsPvzBlocked}>
                                                                <i className="fa-solid fa-plus" style={{ marginRight: 4 }} /> Добавить
                                                            </button>
                                                        </div>
                                                        {personErrors[idx]?.fios && <div data-error="true" style={{ color: '#f87171', fontSize: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}><i className="fa-solid fa-circle-exclamation" />{personErrors[idx].fios}</div>}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                            <AnimatePresence>
                                                                {p.fios.map((fio, fIdx) => (
                                                                    <motion.div key={fIdx} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ display: 'flex', gap: 8 }}>
                                                                        <Input icon="fa-user" value={fio} onChange={e => updateListField(idx, 'fios', fIdx, e.target.value)} placeholder="Иванов Иван Иванович" style={{ flex: 1 }} disabled={isPersonsPvzBlocked} />
                                                                        {p.fios.length > 1 && !isPersonsPvzBlocked && (
                                                                            <button type="button" onClick={() => removeListField(idx, 'fios', fIdx)} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#f87171', borderRadius: 6, width: 40, cursor: 'pointer' }}><i className="fa-solid fa-xmark" /></button>
                                                                        )}
                                                                    </motion.div>
                                                                ))}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>

                                                    <div style={{ marginTop: 16 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                            <label style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <i className="fa-solid fa-phone" style={{ color: '#6366f1' }} /> Телефоны
                                                            </label>
                                                            <button type="button" onClick={() => addListField(idx, 'phones', '')} style={{ background: 'rgba(99,102,241,0.15)', border: 'none', color: '#818cf8', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }} disabled={isPersonsPvzBlocked}>
                                                                <i className="fa-solid fa-plus" style={{ marginRight: 4 }} /> Добавить
                                                            </button>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                            <AnimatePresence>
                                                                {p.phones.map((ph, phIdx) => (
                                                                    <motion.div key={phIdx} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ display: 'flex', gap: 8 }}>
                                                                        <Input icon="fa-phone" value={ph} onChange={e => updateListField(idx, 'phones', phIdx, e.target.value)} placeholder="+7 (999) 123-45-67" style={{ flex: 1 }} disabled={isPersonsPvzBlocked} />
                                                                        {p.phones.length > 1 && !isPersonsPvzBlocked && (
                                                                            <button type="button" onClick={() => removeListField(idx, 'phones', phIdx)} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#f87171', borderRadius: 6, width: 40, cursor: 'pointer' }}><i className="fa-solid fa-xmark" /></button>
                                                                        )}
                                                                    </motion.div>
                                                                ))}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>

                                                    <div style={{ marginTop: 16 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                            <label style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <i className="fa-brands fa-telegram" style={{ color: '#6366f1' }} /> Telegram
                                                            </label>
                                                            <button type="button" onClick={() => addListField(idx, 'tgNicks', { username: '', id: '' })} style={{ background: 'rgba(99,102,241,0.15)', border: 'none', color: '#818cf8', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }} disabled={isPersonsPvzBlocked}>
                                                                <i className="fa-solid fa-plus" style={{ marginRight: 4 }} /> Добавить
                                                            </button>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                            <AnimatePresence>
                                                                {p.tgNicks.map((tg, tgIdx) => (
                                                                    <motion.div key={tgIdx} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                                        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, padding: 10, background: 'rgba(0,0,0,0.15)', borderRadius: 8 }}>
                                                                        <Input icon="fa-at" value={tg.username} onChange={e => updateTgField(idx, tgIdx, 'username', e.target.value)} placeholder="@username" disabled={isPersonsPvzBlocked} />
                                                                        <Input icon="fa-hashtag" value={tg.id} onChange={e => updateTgField(idx, tgIdx, 'id', e.target.value)} placeholder="Telegram ID" disabled={isPersonsPvzBlocked} />
                                                                        {p.tgNicks.length > 1 && !isPersonsPvzBlocked && (
                                                                            <button type="button" onClick={() => removeListField(idx, 'tgNicks', tgIdx)} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#f87171', borderRadius: 6, width: 40, cursor: 'pointer' }}><i className="fa-solid fa-xmark" /></button>
                                                                        )}
                                                                    </motion.div>
                                                                ))}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>

                        {/* === БЛОК 3: ПВЗ (блокируется до выбора причины) === */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                            <Card style={{ marginBottom: 24 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <i className="fa-solid fa-location-dot" style={{ color: '#6366f1' }} />
                                        Места инцидентов (ПВЗ) ({formData.pvzList.length})
                                    </h3>
                                    <Button type="button" variant="secondary" size="sm" icon="fa-plus" onClick={addPvz} disabled={isPersonsPvzBlocked}>
                                        Добавить ПВЗ
                                    </Button>
                                </div>

                                {isPersonsPvzBlocked && (
                                    <div style={{
                                        padding: '14px 18px',
                                        marginBottom: 16,
                                        background: 'rgba(99,102,241,0.06)',
                                        border: '1px solid rgba(99,102,241,0.15)',
                                        borderRadius: 10,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12
                                    }}>
                                        <i className="fa-solid fa-hand-pointer" style={{ color: '#818cf8', fontSize: 16, flexShrink: 0 }} />
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>Сначала выберите причину инцидента</div>
                                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Места инцидентов можно указать после выбора причины</div>
                                        </div>
                                    </div>
                                )}

                                <div className={isPersonsPvzBlocked ? 'disabled-overlay' : ''}>
                                    {formData.pvzList.length === 0 ? (
                                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: 14, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12 }}>
                                            <i className="fa-solid fa-info-circle" style={{ marginRight: 8 }} />
                                            Вы можете не указывать места инцидента. Просто пропустите этот блок.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                            <AnimatePresence>
                                                {formData.pvzList.map((pvz, idx) => (
                                                    <motion.div key={idx} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                                        style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 20, position: 'relative', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                        {!isPersonsPvzBlocked && (
                                                            <button type="button" onClick={() => removePvz(idx)} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(239,68,68,0.15)', border: 'none', color: '#f87171', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <i className="fa-solid fa-xmark" style={{ fontSize: 12 }} />
                                                            </button>
                                                        )}

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                                            <Badge variant="info">ПВЗ #{idx + 1}</Badge>
                                                            {pvz.pvz_id && <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', background: 'rgba(99,102,241,0.08)', padding: '2px 8px', borderRadius: 4 }}>{pvz.pvz_id.substring(0, 8)}…</span>}
                                                        </div>

                                                        <FormField label="Тип объекта" required error={pvzErrors[idx]?.type}>
                                                            <div data-error={pvzErrors[idx]?.type ? "true" : "false"}>
                                                                {apiData.pvzTypeList.length > 0 ? (
                                                                    <Select value={pvz.type} onChange={e => updatePvz(idx, 'type', e.target.value)} error={pvzErrors[idx]?.type} disabled={isPersonsPvzBlocked}>
                                                                        <option value="">— Не выбран —</option>
                                                                        {apiData.pvzTypeList.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                                                    </Select>
                                                                ) : (
                                                                    <div style={{ padding: '10px 14px', background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 8, color: '#fbbf24', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        <i className="fa-solid fa-triangle-exclamation" /> Типы ПВЗ не настроены
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </FormField>

                                                        <div style={{ marginTop: 16 }}>
                                                            <label style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                                                <i className="fa-solid fa-map-location-dot" style={{ color: '#6366f1' }} /> Адрес <span style={{ color: '#ef4444' }}>*</span>
                                                            </label>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                                                                <FormField label="Город" required error={pvzErrors[idx]?.city}>
                                                                    <div data-error={pvzErrors[idx]?.city ? "true" : "false"}><Input icon="fa-city" value={pvz.city} onChange={e => updatePvz(idx, 'city', e.target.value)} placeholder="Москва" error={pvzErrors[idx]?.city} disabled={isPersonsPvzBlocked} /></div>
                                                                </FormField>
                                                                <FormField label="Улица" required error={pvzErrors[idx]?.street}>
                                                                    <div data-error={pvzErrors[idx]?.street ? "true" : "false"}><Input icon="fa-road" value={pvz.street} onChange={e => updatePvz(idx, 'street', e.target.value)} placeholder="Ленина" error={pvzErrors[idx]?.street} disabled={isPersonsPvzBlocked} /></div>
                                                                </FormField>
                                                                <FormField label="Дом" required error={pvzErrors[idx]?.house}>
                                                                    <div data-error={pvzErrors[idx]?.house ? "true" : "false"}><Input icon="fa-house" value={pvz.house} onChange={e => updatePvz(idx, 'house', e.target.value)} placeholder="42А" error={pvzErrors[idx]?.house} disabled={isPersonsPvzBlocked} /></div>
                                                                </FormField>
                                                            </div>
                                                        </div>

                                                        {(pvz.city || pvz.street || pvz.house) && (
                                                            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                                <i className="fa-solid fa-paper-plane" style={{ color: '#818cf8' }} />
                                                                <span style={{ color: '#94a3b8', fontWeight: 500 }}>Будет отправлено:</span>
                                                                <code style={{ fontFamily: 'monospace', color: '#e2e8f0', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: 4, fontSize: 12, flex: 1 }}>{buildAddressString(pvz)}</code>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </motion.div>

                        {isEdit && (
                            <motion.div id="evidence-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                    <i className="fa-solid fa-paperclip" style={{ color: '#6366f1' }} /> Доказательства и файлы
                                </h3>
                                <UnifiedFileManager moduleName="incident_evidence" recordId={id} canEdit={canEdit} onFilesChange={() => { }} />
                            </motion.div>
                        )}

                        {isEdit && buildServiceInfo()}
                    </>
                )}

                {/* === STICKY FOOTER === */}
                {!isPageLoading && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        padding: '20px 0',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        position: 'sticky',
                        bottom: 0,
                        background: 'rgba(15,17,23,0.95)',
                        backdropFilter: 'blur(10px)',
                        zIndex: 10
                    }}>
                        {!isEdit && <UserDataAutoFill isEnabled={autoFillEnabled} onToggle={handleAutoFillToggle} />}

                        {/* Ошибка отзыва */}
                        {withdrawError && (
                            <Alert variant="danger" icon="fa-solid fa-circle-exclamation">
                                {withdrawError}
                            </Alert>
                        )}

                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                {/* Кнопка отзыва (только при редактировании и только для не-админов) */}
                                {isEdit && !isAdminOrDev && canEdit && (
                                    <Button
                                        type="button"
                                        variant="warning"
                                        icon="fa-solid fa-circle-stop"
                                        onClick={handleWithdraw}
                                        loading={isWithdrawing}
                                        disabled={isWithdrawing}
                                    >
                                        Отозвать инцидент
                                    </Button>
                                )}

                                <Button type="button" variant="secondary" icon="fa-solid fa-xmark" onClick={() => navigate(isEdit ? `/incidents/${id}` : '/incidents')}>
                                    Отмена
                                </Button>

                                {!isEdit && (
                                    <Button type="button" variant="danger" icon="fa-solid fa-trash" onClick={clearForm}>
                                        Очистить форму
                                    </Button>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <AnimatePresence>
                                    {showSubmitError && (
                                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                                            style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                            <i className="fa-solid fa-circle-exclamation" /> Исправьте ошибки в форме
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <Button type="submit" variant="success" icon="fa-solid fa-floppy-disk" loading={isSubmitting} size="lg" disabled={isPageLoading || !canEdit || !!loadError || isEditBlockedByMissingIds}>
                                    {isEdit ? 'Сохранить изменения' : 'Сообщить о нарушении'}
                                </Button>
                                {isEditBlockedByMissingIds && <span style={{ fontSize: 11, color: '#f87171', marginTop: 6, textAlign: 'right' }}>Нет ID контактов</span>}
                            </div>
                        </div>
                    </div>
                )}
            </form>

            {/* === МОДАЛКА ВЫБОРА ПРИЧИНЫ === */}
            <AnimatePresence>
                {showReasonModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowReasonModal(false)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', damping: 25 }} onClick={e => e.stopPropagation()}
                            style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', borderRadius: 16, padding: 28, maxWidth: 720, width: '100%', maxHeight: '80vh', overflow: 'auto', border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h2 style={{ margin: 0, fontSize: 20, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <i className="fa-solid fa-filter" style={{ color: '#6366f1' }} /> Выберите причину
                                </h2>
                                <button onClick={() => setShowReasonModal(false)} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#f87171', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', fontSize: 16 }}>
                                    <i className="fa-solid fa-xmark" />
                                </button>
                            </div>

                            {isEdit && originalReasonOnPvz !== null && (
                                <Alert variant="info" icon="fa-solid fa-circle-info" style={{ marginBottom: 16 }}>
                                    При редактировании можно выбрать только причину того же типа
                                </Alert>
                            )}

                            {/* Поиск */}
                            {apiData.reasonsList.length > 4 && (
                                <Input icon="fa-search" value={reasonSearch} onChange={e => setReasonSearch(e.target.value)} placeholder="Поиск причины..." style={{ marginBottom: 14 }} />
                            )}

                            {/* Фильтр по типу (только при создании) */}
                            {!isEdit && (
                                <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 4 }}>
                                    {[
                                        { key: 'all', label: 'Все', icon: 'fa-list' },
                                        { key: 'pvz', label: 'На администрацию', icon: 'fa-house' },
                                        { key: 'employee', label: 'На сотрудника', icon: 'fa-user' }
                                    ].map(f => (
                                        <button
                                            key={f.key}
                                            onClick={() => setReasonFilter(f.key)}
                                            style={{
                                                flex: 1,
                                                padding: '8px 12px',
                                                background: reasonFilter === f.key ? 'rgba(99,102,241,0.15)' : 'transparent',
                                                border: reasonFilter === f.key ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                                                borderRadius: 8,
                                                color: reasonFilter === f.key ? '#e2e8f0' : '#64748b',
                                                cursor: 'pointer',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 6,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <i className={`fa-solid ${f.icon}`} style={{ fontSize: 10 }} />
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Список причин */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                                {filteredReasons.length === 0 ? (
                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#64748b' }}>
                                        <i className="fa-solid fa-circle-xmark" style={{ fontSize: 32, marginBottom: 12 }} />
                                        <p>Причины не найдены</p>
                                    </div>
                                ) : (
                                    filteredReasons.map(reason => {
                                        const isOnPvz = reason.addonData?.onPvz ?? false;
                                        const description = reason.addonData?.description || '';
                                        const isSelected = formData.reasonId === reason.id;

                                        return (
                                            <motion.button
                                                key={reason.id}
                                                type="button"
                                                whileHover={{ scale: 1.02, y: -1 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => selectReason(reason)}
                                                style={{
                                                    padding: '16px 14px',
                                                    background: isSelected
                                                        ? 'rgba(99,102,241,0.12)'
                                                        : (isOnPvz ? reasonCardPvzBg : reasonCardEmpBg),
                                                    border: isSelected
                                                        ? '1.5px solid rgba(99,102,241,0.4)'
                                                        : `1.5px solid ${isOnPvz ? reasonCardPvzBorder : reasonCardEmpBorder}`,
                                                    borderRadius: 12,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    transition: 'all 0.2s',
                                                    color: '#f1f5f9',
                                                    position: 'relative'
                                                }}
                                            >
                                                {/* Индикатор выбранной */}
                                                {isSelected && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: 8,
                                                        right: 8,
                                                        width: 20,
                                                        height: 20,
                                                        borderRadius: '50%',
                                                        background: '#6366f1',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <i className="fa-solid fa-check" style={{ color: '#fff', fontSize: 10 }} />
                                                    </div>
                                                )}

                                                {/* Иконка */}
                                                <div style={{
                                                    width: 48, height: 48,
                                                    borderRadius: 12,
                                                    background: isOnPvz ? reasonCardPvzIconBg : reasonCardEmpIconBg,
                                                    border: isOnPvz ? reasonCardPvzIconBorder : reasonCardEmpIconBorder,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 20
                                                }}>
                                                    {isOnPvz ? (
                                                        <i className="fa-solid fa-house" style={{ color: reasonCardPvzIconColor }} />
                                                    ) : (
                                                        <i className="fa-solid fa-user" style={{ color: reasonCardEmpIconColor }} />
                                                    )}
                                                </div>

                                                {/* Название */}
                                                <div style={{ fontWeight: 600, fontSize: 13, textAlign: 'center', lineHeight: 1.3 }}>
                                                    {reason.name}
                                                </div>

                                                {/* Бейдж типа */}
                                                <div style={{
                                                    fontSize: 10,
                                                    fontWeight: 500,
                                                    color: isOnPvz ? reasonCardPvzBadgeColor : reasonCardEmpBadgeColor,
                                                    background: isOnPvz ? reasonCardPvzBadgeBg : reasonCardEmpBadgeBg,
                                                    padding: '2px 8px',
                                                    borderRadius: 20,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 3
                                                }}>
                                                    {isOnPvz ? (
                                                        <><i className="fa-solid fa-house" style={{ fontSize: 8 }} /> На администрацию</>
                                                    ) : (
                                                        <><i className="fa-solid fa-user" style={{ fontSize: 8 }} /> На сотрудника</>
                                                    )}
                                                </div>

                                                {/* Описание */}
                                                {description && (
                                                    <div style={{
                                                        fontSize: 10,
                                                        color: '#64748b',
                                                        textAlign: 'center',
                                                        lineHeight: 1.4,
                                                        padding: '0 4px',
                                                        maxHeight: 32,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical'
                                                    }}>
                                                        {description}
                                                    </div>
                                                )}
                                            </motion.button>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* === МОДАЛКА УСПЕХА === */}
            <AnimatePresence>
                {showSuccessModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0,
                            background: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(10px)',
                            zIndex: 1000,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 20
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', damping: 20 }}
                            style={{
                                background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                                borderRadius: 20,
                                padding: 40,
                                maxWidth: 520,
                                width: '100%',
                                textAlign: 'center',
                                border: '1px solid rgba(34,197,94,0.3)',
                                boxShadow: '0 20px 60px rgba(34,197,94,0.15)'
                            }}
                        >
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.2, type: 'spring', damping: 12 }}
                                style={{
                                    width: 80, height: 80,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                    margin: '0 auto 20px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 10px 30px rgba(34,197,94,0.4)'
                                }}
                            >
                                <i className="fa-solid fa-check" style={{ color: '#fff', fontSize: 36 }} />
                            </motion.div>

                            <h2 style={{ margin: '0 0 8px', fontSize: 24, color: '#f1f5f9' }}>
                                Инцидент создан!
                            </h2>
                            <p style={{ color: '#94a3b8', margin: '0 0 20px', fontSize: 14 }}>
                                Присвоен уникальный идентификатор
                            </p>

                            {/* ID с копированием */}
                            <div style={{
                                background: 'rgba(99,102,241,0.1)',
                                border: '1px solid rgba(99,102,241,0.3)',
                                borderRadius: 12,
                                padding: '16px',
                                marginBottom: 20,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 12
                            }}>
                                <span style={{
                                    fontFamily: 'monospace',
                                    fontSize: 20,
                                    fontWeight: 700,
                                    color: '#a5b4fc',
                                    letterSpacing: 1
                                }}>
                                    {createdId}
                                </span>
                                <button onClick={copyId} style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    color: '#cbd5e1',
                                    borderRadius: 6,
                                    padding: '6px 10px',
                                    cursor: 'pointer',
                                    fontSize: 12
                                }} title="Скопировать">
                                    <i className="fa-regular fa-copy" />
                                </button>
                            </div>

                            {/* Блок: Следующий шаг — доказательства */}
                            <Alert variant="info" icon="fa-paperclip" style={{ textAlign: 'left' }}>
                                <strong>Следующий шаг — добавьте доказательства!</strong><br />
                                <span style={{ fontSize: 13 }}>
                                    Сейчас вы будете перенаправлены на страницу редактирования, чтобы прикрепить фото, видео и другие файлы к инциденту.
                                </span>
                            </Alert>

                            {/* Блок: Как проверить статус */}
                            <div style={{
                                marginTop: 16,
                                padding: '14px 16px',
                                background: 'rgba(99,102,241,0.08)',
                                border: '1px solid rgba(99,102,241,0.25)',
                                borderRadius: 10,
                                textAlign: 'left'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 10,
                                    marginBottom: 8
                                }}>
                                    <i className="fa-solid fa-circle-info" style={{
                                        color: '#818cf8',
                                        fontSize: 16,
                                        marginTop: 2,
                                        flexShrink: 0
                                    }} />
                                    <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>
                                        Проверить статус обработки инцидента вы сможете на странице{' '}
                                        <Link
                                            to="/incidents"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setShowSuccessModal(false)}
                                            style={{
                                                color: '#818cf8',
                                                textDecoration: 'underline',
                                                textUnderlineOffset: 2,
                                                fontWeight: 600
                                            }}
                                        >
                                            /incidents
                                        </Link>
                                        {' '}по идентификатору:
                                    </div>
                                </div>
                                <div style={{
                                    marginTop: 8,
                                    padding: '8px 12px',
                                    background: 'rgba(0,0,0,0.3)',
                                    borderRadius: 6,
                                    fontFamily: 'monospace',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: '#a5b4fc',
                                    letterSpacing: 0.5,
                                    wordBreak: 'break-all',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 8
                                }}>
                                    <span>{createdId}</span>
                                    <button
                                        onClick={copyId}
                                        style={{
                                            background: 'rgba(255,255,255,0.1)',
                                            border: 'none',
                                            color: '#94a3b8',
                                            borderRadius: 4,
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            fontSize: 11,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            flexShrink: 0
                                        }}
                                        title="Скопировать ID"
                                    >
                                        <i className="fa-regular fa-copy" />
                                    </button>
                                </div>
                            </div>

                            {/* Таймер с прогресс-баром */}
                            <div style={{
                                marginTop: 20,
                                padding: '14px',
                                background: 'rgba(0,0,0,0.3)',
                                borderRadius: 10,
                                marginBottom: 20
                            }}>
                                <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>
                                    Автопереход к добавлению доказательств через:
                                </div>
                                <div style={{
                                    fontSize: 28,
                                    fontWeight: 700,
                                    color: countdown <= 10 ? '#f87171' : '#6366f1',
                                    fontFamily: 'monospace'
                                }}>
                                    {countdown} сек.
                                </div>
                                <div style={{
                                    height: 4,
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: 2,
                                    marginTop: 10,
                                    overflow: 'hidden'
                                }}>
                                    <motion.div
                                        animate={{ width: `${(countdown / 60) * 100}%` }}
                                        style={{
                                            height: '100%',
                                            background: countdown <= 10 ? '#f87171' : '#6366f1',
                                            borderRadius: 2
                                        }}
                                    />
                                </div>
                            </div>

                            <Button
                                variant="primary"
                                icon="fa-solid fa-arrow-right"
                                size="lg"
                                onClick={() => navigate(`/incidents/${createdId}/edit`, { state: { scrollToEvidence: true } })}
                                style={{ width: '100%' }}
                            >
                                Перейти к добавлению доказательств
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* === TOAST === */}
            <AnimatePresence>
                {showUpdateToast && (
                    <motion.div initial={{ opacity: 0, y: -40, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -40, x: '-50%' }}
                        style={{ position: 'fixed', top: 24, left: '50%', zIndex: 2000, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px', background: 'linear-gradient(135deg, rgba(34,197,94,0.95), rgba(22,163,74,0.95))', backdropFilter: 'blur(12px)', borderRadius: 14, boxShadow: '0 10px 40px rgba(34,197,94,0.4)', color: '#fff', fontSize: 14, fontWeight: 600 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-check" style={{ fontSize: 14 }} />
                        </div>
                        <div><span>Изменения сохранены</span><br /><span style={{ fontSize: 11, opacity: 0.85 }}>Инцидент #{id} обновлён</span></div>
                        <button onClick={() => setShowUpdateToast(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 6, width: 24, height: 24, cursor: 'pointer', marginLeft: 4 }}>
                            <i className="fa-solid fa-xmark" style={{ fontSize: 11 }} />
                        </button>
                    </motion.div>
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
                                    Для редактирования инцидента введите email, который вы указывали при его создании.
                                </p>
                            </div>

                            <FormField label="Email создателя" error={modalError}>
                                <Input
                                    type="email"
                                    value={modalEmail}
                                    onChange={e => setModalEmail(e.target.value)}
                                    placeholder="example@mail.ru"
                                    error={modalError}
                                    icon="fa-envelope"
                                />
                            </FormField>

                            <Button
                                variant="primary"
                                onClick={handleVerifyEmail}
                                loading={isVerifyingEmail}
                                disabled={!modalEmail.trim()}
                                style={{ width: '100%', marginTop: 16 }}
                            >
                                Подтвердить и продолжить
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}