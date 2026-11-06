import React, { useState, useEffect, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, Button, Badge, Alert, Input, Textarea } from "../ui/UIComponents";
import UnifiedFileManager from "../authorized/unifiedFiles/UnifiedFileManager";
import { createContestation, getIncident } from "../../http/incidentsAPI";
import { Context } from "../..";
import storageHandler from "../../http/utils/storageHandler";

const CONTESTATION_CREATOR_OPTIONS = [
    { value: 'person', label: 'Указать персону из списка' },
    { value: 'witness', label: 'Сторонний свидетель' },
    { value: 'anonymous', label: 'Не указывать' }
];

function ContestationModal({ isOpen, onClose, incidentId, onSuccess }) {
    const { user } = useContext(Context);

    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [description, setDescription] = useState('');
    const [email, setEmail] = useState('');
    const [creatorType, setCreatorType] = useState('person');
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [publishOnSuccess, setPublishOnSuccess] = useState(false);
    const [ownerToken, setOwnerToken] = useState(null);
    const [error, setError] = useState(null);
    const [successData, setSuccessData] = useState(null);
    const [persons, setPersons] = useState([]);
    const [loadingPersons, setLoadingPersons] = useState(false);

    useEffect(() => {
        if (isOpen && incidentId) {
            loadPersons();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, incidentId]);

    const loadPersons = async () => {
        setLoadingPersons(true);
        setError(null);
        try {
            const data = await getIncident(incidentId);
            if (data && data.personesList) {
                setPersons(data.personesList);
            }
        } catch (e) {
            console.error("Не удалось загрузить список персон", e);
            setError("Не удалось загрузить список персон. Попробуйте позже.");
        } finally {
            setLoadingPersons(false);
        }
    };

    const handleNextStep1 = () => {
        if (!email.trim()) {
            setError('Необходимо указать email для связи');
            return;
        }
        if (!creatorType) {
            setError('Необходимо выбрать, кто создает оспаривание');
            return;
        }
        if (creatorType === 'person' && !selectedPerson) {
            setError('Необходимо выбрать персону из списка');
            return;
        }
        setError(null);
        setStep(2);
    };

    const handleCreateAndProceed = async () => {
        if (!description.trim()) {
            setError('Необходимо подробно описать причину оспаривания');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const creatorPersonId = creatorType === 'person' && selectedPerson
                ? (selectedPerson.person_id || selectedPerson.id)
                : (creatorType === 'anonymous' ? '-1' : null);

            const response = await createContestation({
                parentIncidentId: incidentId,
                description,
                creatorPersonId,
                publishOnSuccess,
                email
            }, ownerToken);

            if (response.success) {
                setOwnerToken(response.ownerToken);
                localStorage.setItem(`contestation_owner_${response.contestationId}`, response.ownerToken);
                try {
                    const COOKIE_KEY = 'recent_created_items';
                    const existing = storageHandler.get(COOKIE_KEY, 'cookies') || [];
                    const now = Date.now();
                    const newItem = {
                        id: response.contestationId,
                        type: 'contestation', // Метка типа
                        createdAt: now,
                        expiresAt: now + 15 * 60 * 1000 // 15 минут
                    };

                    // Фильтруем протухшие и добавляем новый в начало
                    const updated = [newItem, ...existing.filter(i => i.expiresAt > now)];
                    const maxExpiresAt = Math.max(...updated.map(i => i.expiresAt));
                    const ttlSeconds = Math.max(1, Math.ceil((maxExpiresAt - now) / 1000));

                    storageHandler.add(COOKIE_KEY, updated, {
                        method: 'cookies',
                        expireTime: ttlSeconds,
                        path: '/',
                        sameSite: 'Lax'
                    });
                } catch (e) {
                    console.warn('Ошибка записи куки недавних оспариваний:', e);
                }
                setSuccessData({
                    contestationId: response.contestationId,
                    message: response.message
                });
                setStep(3);
            } else {
                setError(response.message || 'Ошибка создания оспаривания');
            }
        } catch (err) {
            setError(err.message || 'Ошибка создания оспаривания');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setDescription('');
        setEmail('');
        setCreatorType('person');
        setSelectedPerson(null);
        setPublishOnSuccess(false);
        setOwnerToken(null);
        setError(null);
        setSuccessData(null);
        onClose();
    };

    const isPersonSelected = (p) => {
        if (!selectedPerson) return false;
        return (selectedPerson.person_id && selectedPerson.person_id === p.person_id) ||
            (selectedPerson.id && selectedPerson.id === p.id);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {/* ПОЛНОЭКРАННЫЙ ОВЕРЛЕЙ (как в UnifiedImageEditor) */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: '#0f172a',
                    // backdropFilter: 'blur(12px)',
                    zIndex: 2000,
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* === ШАПКА === */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(15,23,42,0.8)',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <i className="fa-solid fa-scale-balanced" style={{ color: '#fff', fontSize: 16 }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Создание оспаривания</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>Инцидент: {incidentId}</div>
                        </div>
                    </div>
                    <Button variant="secondary" size="sm" icon="fa-solid fa-xmark" onClick={handleClose}>
                        Закрыть
                    </Button>
                </div>

                {/* === ИНДИКАТОР ШАГОВ === */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(15,23,42,0.5)',
                    flexShrink: 0
                }}>
                    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', gap: 12, alignItems: 'center' }}>
                        {[1, 2, 3].map((s) => (
                            <React.Fragment key={s}>
                                <motion.div
                                    initial={false}
                                    animate={{
                                        scale: s === step ? 1.05 : 1,
                                        background: s <= step ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.05)'
                                    }}
                                    style={{
                                        width: 32, height: 32, borderRadius: '50%',
                                        border: s <= step ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                        color: s <= step ? '#fff' : '#64748b',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 13, fontWeight: 700, flexShrink: 0
                                    }}
                                >
                                    {s < step ? <i className="fa-solid fa-check" style={{ fontSize: 12 }} /> : s}
                                </motion.div>
                                {s < 3 && (
                                    <div style={{
                                        flex: 1, height: 2,
                                        background: s < step ? 'linear-gradient(90deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.1)',
                                        borderRadius: 2, transition: 'all 0.4s ease'
                                    }} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* === ОСНОВНАЯ ПРОКРУЧИВАЕМАЯ ОБЛАСТЬ === */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '32px 24px',
                    display: 'flex',
                    justifyContent: 'center'
                }}>
                    <div style={{ maxWidth: 800, width: '100%' }}>
                        <AnimatePresence mode="wait">

                            {/* ШАГ 1: Основная информация */}
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <i className="fa-solid fa-user-shield" style={{ color: '#6366f1' }} />
                                        Основная информация
                                    </h3>

                                    <div style={{ marginBottom: 24 }}>
                                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#cbd5e1', fontSize: 14 }}>
                                            Email для связи <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <Input
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="example@mail.ru"
                                            type="email"
                                            icon="fa-envelope"
                                        />
                                        <p style={{ fontSize: 12, color: '#64748b', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <i className="fa-solid fa-circle-info" />
                                            Email необходим для возможности редактирования в течение 15 минут после создания.
                                        </p>
                                    </div>

                                    <div style={{ marginBottom: 24 }}>
                                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#cbd5e1', fontSize: 14 }}>
                                            Кто создает оспаривание? <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {CONTESTATION_CREATOR_OPTIONS.map((opt) => (
                                                <label
                                                    key={opt.value}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: 12,
                                                        padding: '12px 16px',
                                                        background: creatorType === opt.value ? 'rgba(99,102,241,0.1)' : 'rgba(0,0,0,0.2)',
                                                        border: `1px solid ${creatorType === opt.value ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.05)'}`,
                                                        borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="creatorType"
                                                        value={opt.value}
                                                        checked={creatorType === opt.value}
                                                        onChange={(e) => {
                                                            setCreatorType(e.target.value);
                                                            if (e.target.value !== 'person') setSelectedPerson(null);
                                                        }}
                                                        style={{ width: 18, height: 18, accentColor: '#6366f1', cursor: 'pointer', flexShrink: 0 }}
                                                    />
                                                    <span style={{ fontSize: 14, color: creatorType === opt.value ? '#e2e8f0' : '#94a3b8', fontWeight: 500 }}>
                                                        {opt.label}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {creatorType === 'person' && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                style={{ marginBottom: 24, overflow: 'hidden' }}
                                            >
                                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#cbd5e1', fontSize: 14 }}>
                                                    Выберите персону из инцидента <span style={{ color: '#ef4444' }}>*</span>
                                                </label>
                                                <div style={{
                                                    maxHeight: 240, overflowY: 'auto',
                                                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: 12, padding: 8
                                                }}>
                                                    {loadingPersons ? (
                                                        <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 }}>
                                                            <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 8 }} /> Загрузка...
                                                        </div>
                                                    ) : persons.length === 0 ? (
                                                        <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 }}>
                                                            <i className="fa-solid fa-user-slash" style={{ display: 'block', fontSize: 24, marginBottom: 8, opacity: 0.5 }} />
                                                            Персоны не найдены
                                                        </div>
                                                    ) : (
                                                        persons.map(p => {
                                                            const isSelected = isPersonSelected(p);
                                                            return (
                                                                <div
                                                                    key={p.person_id || p.id}
                                                                    onClick={() => setSelectedPerson(p)}
                                                                    style={{
                                                                        padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                                                                        background: isSelected ? 'rgba(99,102,241,0.15)' : 'transparent',
                                                                        border: `1px solid ${isSelected ? 'rgba(99,102,241,0.4)' : 'transparent'}`,
                                                                        color: '#e2e8f0', fontSize: 14, marginBottom: 6,
                                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                        <span style={{ fontWeight: 600, color: isSelected ? '#e2e8f0' : '#cbd5e1' }}>
                                                                            {p.fios?.[0] || 'Без ФИО'}
                                                                        </span>
                                                                        <span style={{ color: '#64748b', fontSize: 12 }}>
                                                                            {p.position || 'Должность не указана'}
                                                                        </span>
                                                                    </div>
                                                                    {isSelected && (
                                                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ width: 24, height: 24, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                            <i className="fa-solid fa-check" style={{ color: '#fff', fontSize: 12 }} />
                                                                        </motion.div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div style={{ marginBottom: 24 }}>
                                        <label style={{
                                            display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
                                            padding: '12px 16px',
                                            background: publishOnSuccess ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.2)',
                                            border: `1px solid ${publishOnSuccess ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)'}`,
                                            borderRadius: 10, transition: 'all 0.2s'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={publishOnSuccess}
                                                onChange={(e) => setPublishOnSuccess(e.target.checked)}
                                                style={{ width: 18, height: 18, marginTop: 2, accentColor: '#22c55e', cursor: 'pointer', flexShrink: 0 }}
                                            />
                                            <span style={{ fontSize: 13, color: publishOnSuccess ? '#86efac' : '#cbd5e1', lineHeight: 1.5 }}>
                                                Я хочу, чтобы при успешном оспаривании оно и инцидент остались доступны всем
                                                <br />
                                                <span style={{ fontSize: 12, color: '#64748b' }}>(с обязательным скрытием всех персональных данных, даже замаскированных)</span>
                                            </span>
                                        </label>

                                        {/* ИНФОРМАЦИОННЫЙ БЛОК (появляется при включении галочки) */}
                                        <AnimatePresence>
                                            {publishOnSuccess && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    style={{ overflow: 'hidden' }}
                                                >
                                                    <div style={{
                                                        background: 'rgba(99,102,241,0.06)',
                                                        border: '1px solid rgba(99,102,241,0.15)',
                                                        borderRadius: 10,
                                                        padding: '14px 16px'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                                            <i className="fa-solid fa-circle-info" style={{ color: '#818cf8', fontSize: 14 }} />
                                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Как это работает и зачем это нужно:</span>
                                                        </div>
                                                        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                            <li style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
                                                                <strong style={{ color: '#86efac' }}>Публичное оправдание:</strong> Прозрачный доступ к успешно оспоренному инциденту позволяет вам продемонстрировать третьим лицам, что претензия была снята, что является эффективным способом восстановления деловой репутации.
                                                            </li>
                                                            <li style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
                                                                <strong style={{ color: '#fca5a5' }}>Абсолютная конфиденциальность:</strong> Даже при публичном статусе <strong>все</strong> персональные данные (включая ранее замаскированные) будут полностью и безвозвратно скрыты от просмотра.
                                                            </li>
                                                            <li style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
                                                                <strong style={{ color: '#fbbf24' }}>Гарантия очистки:</strong> В любом случае (полное или частичное оспаривание) оспоренные данные будут навсегда исключены из систем поиска.
                                                            </li>
                                                            <li style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }}>
                                                                <i className="fa-solid fa-lock" style={{ marginRight: 4 }} />
                                                                Если эта опция <strong>не выбрана</strong>, инцидент и оспаривание останутся полностью скрытыми от посторонних глаз после принятия решения модерацией.
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {error && (
                                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                                            <Alert variant="danger" icon="fa-solid fa-circle-exclamation" style={{ marginBottom: 16 }}>{error}</Alert>
                                        </motion.div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
                                        <Button variant="secondary" onClick={handleClose}>Отмена</Button>
                                        <Button variant="primary" onClick={handleNextStep1} icon="fa-solid fa-arrow-right" iconPosition="right">
                                            Далее
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ШАГ 2: Текст оспаривания */}
                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >

                                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <i className="fa-solid fa-pen-to-square" style={{ color: '#6366f1' }} />
                                        Текст оспаривания
                                    </h3>

                                    <div style={{ marginBottom: 24 }}>
                                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#cbd5e1', fontSize: 14 }}>
                                            Опишите подробно, почему вы не согласны <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <Textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Введите аргументы, факты и детали ситуации..."
                                            rows={10}
                                            style={{ fontSize: 14, lineHeight: 1.6 }}
                                        />
                                        <p style={{ fontSize: 12, color: '#64748b', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <i className="fa-solid fa-circle-info" />
                                            Это поле обязательно. Чем подробнее вы опишите ситуацию, тем быстрее модераторы смогут её проверить.
                                        </p>
                                    </div>

                                    {error && (
                                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                                            <Alert variant="danger" icon="fa-solid fa-circle-exclamation" style={{ marginBottom: 16 }}>{error}</Alert>
                                        </motion.div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 32 }}>
                                        <Button variant="secondary" onClick={() => { setError(null); setStep(1); }} icon="fa-solid fa-arrow-left">
                                            Назад
                                        </Button>
                                        <Button variant="primary" onClick={handleCreateAndProceed} loading={loading} icon="fa-solid fa-arrow-right" iconPosition="right">
                                            Перейти к добавлению доказательств
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ШАГ 3: Успешное создание и загрузка файлов */}
                            {step === 3 && successData && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, type: 'spring' }}
                                >
                                    <Alert variant="warning" icon="fa-solid fa-triangle-exclamation" style={{ marginBottom: 24, fontSize: 13, padding: '14px 16px', borderRadius: 12 }}>
                                        <strong>Внимание:</strong> Вы можете отредактировать оспаривание в течение 15 минут с этого момента перейдя на страницу по кнопку внизу.
                                    </Alert>

                                    <div style={{ textAlign: 'center', padding: '10px 0 24px' }}>
                                        <motion.div
                                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                                            transition={{ type: 'spring', delay: 0.1 }}
                                            style={{
                                                width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.15)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                                                border: '1px solid rgba(16,185,129,0.3)'
                                            }}
                                        >
                                            <i className="fa-solid fa-circle-check" style={{ fontSize: 36, color: '#10b981' }} />
                                        </motion.div>
                                        <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#f1f5f9' }}>
                                            Оспаривание успешно создано!
                                        </h3>
                                        <p style={{ color: '#94a3b8', marginBottom: 4, fontSize: 14 }}>
                                            ID оспаривания: <span style={{ color: '#a5b4fc', fontFamily: 'monospace', fontWeight: 600, background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: 4 }}>{successData.contestationId}</span>
                                        </p>
                                        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 0 }}>
                                            Теперь вы можете прикрепить доказательства к вашему обращению.
                                        </p>
                                    </div>

                                    <div style={{ marginBottom: 32 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 600, color: '#cbd5e1', fontSize: 14 }}>
                                            <i className="fa-solid fa-paperclip" style={{ color: '#6366f1' }} />
                                            Доказательства (необязательно)
                                        </label>
                                        <UnifiedFileManager
                                            moduleName="incident_evidence"
                                            recordId={successData.contestationId}
                                            canEdit={true}
                                            uploadConfig={{
                                                maxFiles: 50,
                                                showUploadZone: true,
                                                showFileList: true
                                            }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
                                        <Button
                                            variant="secondary"
                                            size="lg"
                                            onClick={() => {
                                                if (onSuccess) onSuccess(successData.contestationId);
                                                window.location.reload(); // Перезагрузка страницы
                                            }}
                                            icon="fa-solid fa-check"
                                            iconPosition="right"
                                            style={{ padding: '12px 32px', fontSize: 16 }}
                                        >
                                            Завершить создание
                                        </Button>
                                        <Button
                                            variant="primary"
                                            size="lg"
                                            onClick={() => {
                                                onClose();
                                                if (onSuccess) onSuccess(successData.contestationId);
                                                // Переход на страницу оспаривания
                                                navigate(`/contestation/${successData.contestationId}`);
                                            }}
                                            icon="fa-solid fa-arrow-up-right-from-square"
                                            iconPosition="right"
                                            style={{ padding: '12px 24px', fontSize: 15 }}
                                        >
                                            Перейти к оспариванию
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

export default ContestationModal;