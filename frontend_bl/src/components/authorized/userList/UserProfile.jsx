import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Badge, Avatar, Divider, StatCard, Input, Alert, Toggle, Select, Modal } from '../../ui/UIComponents';
import { getUser, changeUserStatus } from '../../../http/userAPI';
import { Context } from '../../..';
import SecurityDashboard from './security/SecurityDashboard';
import AccessDashboard from './access/AccessDashboard';
import UserNotificationSettings from './UserNotificationSettings';
import UserNotificationSettingsHistory from './UserNotificationSettingsHistory';

// === МОКОВЫЕ ДАННЫЕ ===
const mockUser = {
    name: 'Иван Иванов',
    email: 'ivan@example.com',
    phone: '+7 (999) 123-45-67',
    telegram: '@ivan_test',
    discord: 'ivan#1234',
    isOnline: true,
    lastLogin: '2024-05-20T14:30:00Z',
    lastLoginIp: '185.12.34.56',
    lastLoginCity: 'Москва',
    timezone: 'Europe/Moscow (UTC+3)',
    language: 'Русский',
    bio: 'Менеджер регионального отдела. Работаю с инцидентами с 2023 года.',
    stats: {
        daysActive: 142,
        incidentsCreated: 18,
        incidentsModerated: 156,
        contestations: 3,
        loginsCount: 847,
        spamScore: 12,
        storageUsed: 65,
        storageTotal: 500,
        avgResponseTime: '45 мин',
    },
    tags: ['Частый репортер', 'Проверен', 'VIP'],
    priorityModeration: true,
    adminNotes: 'Пользователь активно помогает модерации. Несколько раз указывал на неточности в адресах ПВЗ.',
    passwordHistory: [
        { date: '2024-04-10', initiator: 'Администратор (ID: 1)', ip: '185.12.34.56' },
        { date: '2023-11-05', initiator: 'Сам пользователь', ip: '91.203.11.22' },
    ],
    sessions: [
        { id: 1, device: 'Chrome 124', os: 'Windows 11', ip: '185.12.34.56', location: 'Москва, РФ', isCurrent: true, lastActive: 'Только что', type: 'desktop' },
        { id: 2, device: 'Safari Mobile', os: 'iOS 17.4', ip: '91.203.11.22', location: 'Санкт-Петербург, РФ', isCurrent: false, lastActive: '2 часа назад', type: 'mobile' },
    ],
    apiKeys: [
        { id: 1, name: 'Production Bot', key: 'pk_live_••••••••7a8b', createdAt: '2024-01-15', lastUsed: '1 час назад', status: 'active' },
    ],
    roleHistory: [
        { date: '2024-03-01', from: 'operator', to: 'manager', by: 'Администратор (ID: 1)' },
        { date: '2023-10-15', from: null, to: 'operator', by: 'Система (регистрация)' },
    ],
    permissions: [
        { name: 'Просмотр инцидентов', granted: true },
        { name: 'Создание инцидентов', granted: true },
        { name: 'Редактирование своих данных', granted: true },
        { name: 'Модерация инцидентов', granted: true },
        { name: 'Управление пользователями', granted: false },
        { name: 'Доступ к админ-панели', granted: false },
    ],
    metadata: {
        internal_id: 8492,
        created_at_ms: 1697364000000,
        app_version: 'v2.4.1-stable',
        redis_cache_status: 'active',
        email_verified: true,
        phone_verified: false,
    },
    linkedEntities: {
        incidents: 18,
        contestations: 3,
        pvzMentioned: 12,
        personsMentioned: 45,
    },
    activityLog: [
        { time: '20.05.2024 14:30', text: 'Успешный вход в систему', icon: 'fa-right-to-bracket', color: '#10b981', type: 'auth' },
        { time: '19.05.2024 16:40', text: 'Создан инцидент #4156', icon: 'fa-file-circle-plus', color: '#f59e0b', type: 'incident' },
        { time: '10.05.2024 15:30', text: 'Смена пароля', icon: 'fa-key', color: '#f59e0b', type: 'security' },
    ],
};

const generateHeatmapData = () => Array.from({ length: 52 * 7 }, () => Math.random());

const StatusSelect = ({ value, onChange, allStatuses, isLeftColumn = false }) => {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <select
                value={value}
                onChange={onChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={{
                    width: '100%',
                    padding: isLeftColumn ? '10px 36px 10px 14px' : '11px 40px 11px 14px',
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    background: 'rgba(15, 17, 23, 0.8)',
                    border: `1px solid ${isFocused ? 'rgba(99, 102, 241, 0.6)' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: 10,
                    color: '#e2e8f0',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isFocused ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none',
                }}
            >
                <optgroup label="👤 Пользователи (Non-Staff)" style={{ color: '#94a3b8', fontWeight: 600, background: '#0f1117' }}>
                    {allStatuses.filter(s => !s.is_staff).map(st => (
                        <option key={st.status_id} value={st.code_name} style={{ background: '#1a1d2e', color: '#e2e8f0', padding: '8px 12px' }}>
                            {st.name} ({st.code_name})
                        </option>
                    ))}
                </optgroup>
                <optgroup label="🛡️ Сотрудники (Staff)" style={{ color: '#fbbf24', fontWeight: 600, background: '#0f1117' }}>
                    {allStatuses.filter(s => s.is_staff).map(st => (
                        <option key={st.status_id} value={st.code_name} style={{ background: '#1a1d2e', color: '#e2e8f0', padding: '8px 12px' }}>
                            {st.name} ({st.code_name})
                        </option>
                    ))}
                </optgroup>
            </select>
            <div style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: `translateY(-50%) ${isFocused ? 'rotate(180deg)' : 'rotate(0deg)'}`,
                color: isFocused ? '#818cf8' : '#64748b',
                fontSize: 11,
                pointerEvents: 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
                <i className="fa-solid fa-chevron-down" />
            </div>
        </div>
    );
};

function UserProfile() {
    const { login } = useParams();
    const { user } = useContext(Context);
    const navigate = useNavigate();

    const isMyProfile = !login || login === user.user?.login;
    const targetLogin = login || user.user?.login;

    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [tabDirection, setTabDirection] = useState(0);
    const [copiedField, setCopiedField] = useState(null);

    const [selectedStatusCode, setSelectedStatusCode] = useState('');
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [pendingStatusCode, setPendingStatusCode] = useState('');
    const [modalMessage, setModalMessage] = useState('');
    const [isExecutingChange, setIsExecutingChange] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            if (!targetLogin) return;
            try {
                setIsLoading(true);
                const response = await getUser(targetLogin);
                const data = Array.isArray(response) ? response[0] : response;
                if (!data) {
                    setNotFound(true);
                } else {
                    setUserData(data);
                    setSelectedStatusCode(data.status?.code_name || '');
                }
            } catch (err) {
                console.error('Ошибка загрузки пользователя:', err);
                if (err?.response?.status === 404) setNotFound(true);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUser();
    }, [targetLogin]);

    const displayUser = useMemo(() => {
        if (!userData) return mockUser;
        return {
            ...mockUser,
            id: userData.user_id,
            login: userData.login,
            createdAt: userData.reg_date,
            role: userData.status?.code_name || 'UNKNOWN',
            roleName: userData.status?.name || 'Неизвестно',
            descr: userData.status?.descr || 'Неизвестно',
            isStaff: userData.status?.is_staff || false,
            canEditStatus: userData.can_edit_status || false,
            adminData: userData.admin_data || null,
            allStatuses: userData.status?.allStatuses || [],
            ...(userData.name && { name: userData.name }),
            ...(userData.email && { email: userData.email }),
        };
    }, [userData]);

    const handleCopy = (text, fieldName) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleTabChange = (newTab) => {
        if (newTab === activeTab) return;
        const currentIdx = tabs.findIndex(t => t.key === activeTab);
        const newIdx = tabs.findIndex(t => t.key === newTab);
        setTabDirection(newIdx > currentIdx ? 1 : -1);
        setActiveTab(newTab);
    };

    const handleStatusSelectChange = (newCode) => {
        if (newCode === displayUser.role) return;
        const currentStatus = displayUser.allStatuses.find(s => s.code_name === displayUser.role);
        const targetStatus = displayUser.allStatuses.find(s => s.code_name === newCode);
        if (!currentStatus || !targetStatus) return;

        let message = "Вы уверены, что хотите изменить роль пользователя?";
        if (!currentStatus.is_staff && targetStatus.is_staff) {
            message = " ВНИМАНИЕ: Назначение статуса сотрудника!\n\nПользователь получит рабочие доступы в системе.\nНеобходимо обязательно проверить его настройки доступа и сформировать код админа для передачи сотруднику.";
        } else if (currentStatus.is_staff && !targetStatus.is_staff) {
            message = " ВНИМАНИЕ: Снятие статуса сотрудника!\n\nПользователь потеряет все рабочие доступы, код сотрудника и связанные привилегии. Действие может потребовать ручного восстановления.";
        }

        setPendingStatusCode(newCode);
        setModalMessage(message);
        setConfirmModalOpen(true);
    };

    const executeStatusChange = async () => {
        if (!pendingStatusCode || !displayUser.login) return;
        setIsExecutingChange(true);
        try {
            await changeUserStatus(displayUser.login, pendingStatusCode);
            window.location.reload();
        } catch (err) {
            console.error('Ошибка смены статуса:', err);
            alert(err?.response?.data?.message || 'Не удалось изменить статус пользователя');
            setIsExecutingChange(false);
            setConfirmModalOpen(false);
        }
    };

    if (notFound) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117', padding: 20 }}>
                <Card style={{ maxWidth: 500, width: '100%', textAlign: 'center', padding: 40 }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <i className="fa-solid fa-user-slash" style={{ color: '#ef4444', fontSize: 32 }} />
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>Пользователь не найден</h2>
                    <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 32, lineHeight: 1.6 }}>
                        Пользователь с логином <strong style={{ color: '#e2e8f0' }}>{login}</strong> не существует в системе, был удален или у вас нет прав для его просмотра.
                    </p>
                    <Button variant="primary" icon="fa-solid fa-house" size="lg" onClick={() => navigate('/')}>
                        На главную страницу
                    </Button>
                </Card>
            </motion.div>
        );
    }

    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117' }}>
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                    <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 32, marginBottom: 16, color: '#6366f1' }} />
                    <div style={{ fontSize: 14 }}>Загрузка профиля пользователя...</div>
                </div>
            </div>
        );
    }

    const tabs = [
        { key: 'dashboard', label: 'Дашборд', icon: 'fa-solid fa-chart-pie', count: null },
        { key: 'info', label: 'Информация', icon: 'fa-solid fa-user', count: null },
        { key: 'security', label: 'Безопасность', icon: 'fa-solid fa-shield-halved', count: displayUser.sessions.length },
        { key: 'access', label: 'Доступы', icon: 'fa-solid fa-key', count: displayUser.permissions.filter(p => p.granted).length },
        { key: 'notifications', label: 'Уведомления', icon: 'fa-solid fa-bell', count: null },
        { key: 'notes', label: 'Заметки', icon: 'fa-solid fa-note-sticky', count: displayUser.tags.length },
        { key: 'analytics', label: 'Аналитика', icon: 'fa-solid fa-chart-line', count: null },
        { key: 'activity', label: 'Активность', icon: 'fa-solid fa-clock-rotate-left', count: displayUser.activityLog.length },
        { key: 'admin', label: 'Админ', icon: 'fa-solid fa-gears', count: null },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <motion.div key="dashboard" initial={{ opacity: 0, x: 30 * tabDirection }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 * tabDirection }} transition={{ duration: 0.25 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
                            <StatCard icon="fa-solid fa-calendar-check" number={displayUser.stats.daysActive} label="Дней в системе" color="#6366f1" />
                            <StatCard icon="fa-solid fa-file-circle-exclamation" number={displayUser.stats.incidentsCreated} label="Инцидентов создано" color="#f59e0b" />
                            <StatCard icon="fa-solid fa-clipboard-check" number={displayUser.stats.incidentsModerated} label="Инцидентов проверено" color="#10b981" />
                            <StatCard icon="fa-solid fa-scale-balanced" number={displayUser.stats.contestations} label="Оспариваний" color="#a78bfa" />
                            <StatCard icon="fa-solid fa-right-to-bracket" number={displayUser.stats.loginsCount} label="Входов в систему" color="#3b82f6" />
                            <StatCard icon="fa-solid fa-ban" number={`${displayUser.stats.spamScore}%`} label="Spam Score" color={displayUser.stats.spamScore > 20 ? '#ef4444' : '#10b981'} />
                        </div>
                        <Card style={{ marginBottom: 16 }}>
                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="fa-solid fa-link" style={{ color: '#6366f1' }} /> Связанные сущности
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                                {[
                                    { label: 'Инциденты', value: displayUser.linkedEntities.incidents, icon: 'fa-file-circle-exclamation', color: '#f59e0b', link: `/incidents?creator=${displayUser.login}` },
                                    { label: 'Оспаривания', value: displayUser.linkedEntities.contestations, icon: 'fa-scale-balanced', color: '#a78bfa', link: `/contestations?user=${displayUser.login}` },
                                    { label: 'Упомянутые ПВЗ', value: displayUser.linkedEntities.pvzMentioned, icon: 'fa-location-dot', color: '#3b82f6', link: null },
                                    { label: 'Упомянутые персоны', value: displayUser.linkedEntities.personsMentioned, icon: 'fa-users', color: '#10b981', link: null },
                                ].map((entity, idx) => (
                                    <div key={idx} style={{
                                        padding: 14, background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)',
                                        display: 'flex', alignItems: 'center', gap: 12, cursor: entity.link ? 'pointer' : 'default', transition: 'all 0.2s'
                                    }}
                                        onClick={() => entity.link && navigate(entity.link)}
                                        onMouseEnter={(e) => entity.link && (e.currentTarget.style.background = 'rgba(0,0,0,0.3)')}
                                        onMouseLeave={(e) => entity.link && (e.currentTarget.style.background = 'rgba(0,0,0,0.2)')}
                                    >
                                        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${entity.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <i className={`fa-solid ${entity.icon}`} style={{ color: entity.color, fontSize: 14 }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{entity.label}</div>
                                            <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>{entity.value}</div>
                                        </div>
                                        {entity.link && <i className="fa-solid fa-arrow-up-right-from-square" style={{ color: '#64748b', fontSize: 11 }} />}
                                    </div>
                                ))}
                            </div>
                        </Card>
                        <Card>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <i className="fa-solid fa-clock-rotate-left" style={{ color: '#6366f1' }} /> Недавняя активность
                                </h4>
                                <Button variant="ghost" size="sm" onClick={() => handleTabChange('activity')}>
                                    Вся история <i className="fa-solid fa-arrow-right" style={{ fontSize: 10, marginLeft: 4 }} />
                                </Button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {displayUser.activityLog.slice(0, 5).map((log, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: 8 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: 6, background: `${log.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <i className={`fa-solid ${log.icon}`} style={{ color: log.color, fontSize: 11 }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.text}</div>
                                            <div style={{ fontSize: 11, color: '#64748b' }}>{log.time}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                );
            case 'info':
                return (
                    <motion.div key="info" initial={{ opacity: 0, x: 30 * tabDirection }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 * tabDirection }} transition={{ duration: 0.25 }}>
                        <Card style={{ marginBottom: 16 }}>
                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="fa-solid fa-id-card" style={{ color: '#6366f1' }} /> Личные данные
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                                {[
                                    { label: 'Полное имя', value: displayUser.name, icon: 'fa-user' },
                                    { label: 'Логин', value: displayUser.login, icon: 'fa-at' },
                                    { label: 'Email', value: displayUser.email, icon: 'fa-envelope' },
                                    { label: 'Телефон', value: displayUser.phone, icon: 'fa-phone' },
                                    { label: 'Telegram', value: displayUser.telegram, icon: 'fa-brands fa-telegram' },
                                    { label: 'Discord', value: displayUser.discord, icon: 'fa-brands fa-discord' },
                                ].map((field, idx) => (
                                    <div key={idx}>
                                        <label style={{ fontSize: 11, color: '#64748b', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <i className={`fa-solid ${field.icon}`} style={{ fontSize: 10 }} /> {field.label}
                                            </span>
                                            <button onClick={() => handleCopy(field.value, field.label)} style={{ background: 'none', border: 'none', color: copiedField === field.label ? '#10b981' : '#64748b', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3, transition: 'color 0.2s' }}>
                                                <i className={`fa-solid ${copiedField === field.label ? 'fa-check' : 'fa-copy'}`} />
                                                {copiedField === field.label ? 'OK' : ''}
                                            </button>
                                        </label>
                                        <Input value={field.value} disabled style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => handleCopy(field.value, field.label)} />
                                    </div>
                                ))}
                            </div>
                        </Card>
                        <Card style={{ marginBottom: 16 }}>
                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="fa-solid fa-align-left" style={{ color: '#6366f1' }} /> О пользователе
                            </h4>
                            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>{displayUser.bio || 'Не указано'}</p>
                        </Card>
                        <Card>
                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="fa-solid fa-circle-info" style={{ color: '#6366f1' }} /> Системная информация
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                                {[
                                    { label: 'Дата регистрации', value: new Date(displayUser.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) },
                                    { label: 'Последний вход', value: new Date(displayUser.lastLogin).toLocaleString('ru-RU') },
                                    { label: 'Часовой пояс', value: displayUser.timezone },
                                    { label: 'Язык интерфейса', value: displayUser.language },
                                    { label: 'Email подтверждён', value: displayUser.metadata.email_verified ? ' Да' : '❌ Нет' },
                                    { label: 'Телефон подтверждён', value: displayUser.metadata.phone_verified ? ' Да' : '❌ Нет' },
                                ].map((item, idx) => (
                                    <div key={idx} style={{ padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>{item.label}</div>
                                        <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{item.value}</div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                );
            case 'security':
                return (
                    <motion.div key="security" initial={{ opacity: 0, x: 30 * tabDirection }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 * tabDirection }} transition={{ duration: 0.25 }}>
                        <SecurityDashboard userData={userData} displayUser={displayUser} currentUserId={user.user?.id} currentUserStatus={user.user?.status} />
                    </motion.div>
                );
            case 'access':
                return (
                    <motion.div key="access" initial={{ opacity: 0, x: 30 * tabDirection }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 * tabDirection }} transition={{ duration: 0.25 }}>
                        <AccessDashboard displayUser={displayUser} userData={userData} currentUserStatus={user.user?.status} onRequestRoleChange={handleStatusSelectChange} />
                    </motion.div>
                );

            // ИСПРАВЛЕННАЯ ВКЛАДКА УВЕДОМЛЕНИЙ
            case 'notifications':
                return (
                    <motion.div key="notifications" initial={{ opacity: 0, x: 30 * tabDirection }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 * tabDirection }} transition={{ duration: 0.25 }}>
                        <UserNotificationSettings />
                        <div style={{ marginTop: 32 }}>
                            <UserNotificationSettingsHistory userId={displayUser.id} />
                        </div>
                    </motion.div>
                );

            case 'notes':
                return (
                    <motion.div key="notes" initial={{ opacity: 0, x: 30 * tabDirection }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 * tabDirection }} transition={{ duration: 0.25 }}>
                        <Card style={{ marginBottom: 16 }}>
                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="fa-solid fa-lock" style={{ color: '#ef4444' }} /> Приватные заметки администратора
                            </h4>
                            <Alert variant="warning" icon="fa-solid fa-eye-slash" style={{ marginBottom: 16, fontSize: 12 }}>
                                Эти заметки видны <strong>только</strong> администраторам и модераторам.
                            </Alert>
                            <textarea defaultValue={displayUser.adminNotes} rows={6} placeholder="Добавьте заметку о пользователе..." style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 14, color: '#e2e8f0', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6, fontFamily: 'inherit' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                                <span style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                                    <i className="fa-solid fa-cloud-arrow-up" style={{ marginRight: 4 }} /> Автосохранение включено
                                </span>
                                <Button variant="primary" size="sm" icon="fa-solid fa-save">Сохранить</Button>
                            </div>
                        </Card>
                        <Card style={{ marginBottom: 16 }}>
                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="fa-solid fa-tags" style={{ color: '#a78bfa' }} /> Теги пользователя
                            </h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                {displayUser.tags.map((tag, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#a5b4fc' }}>
                                        {tag}
                                        <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, fontSize: 10 }}>
                                            <i className="fa-solid fa-xmark" />
                                        </button>
                                    </div>
                                ))}
                                <button style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8, fontSize: 12, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <i className="fa-solid fa-plus" style={{ fontSize: 10 }} /> Добавить тег
                                </button>
                            </div>
                        </Card>
                        <Card>
                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="fa-solid fa-flag" style={{ color: '#f59e0b' }} /> Приоритет модерации
                            </h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, background: 'rgba(0,0,0,0.2)', borderRadius: 10 }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Повышенный приоритет</div>
                                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Все новые инциденты будут помечены как "Высокий приоритет"</div>
                                </div>
                                <Toggle checked={displayUser.priorityModeration} onChange={() => { }} />
                            </div>
                        </Card>
                    </motion.div>
                );
            case 'analytics':
                return (
                    <motion.div key="analytics" initial={{ opacity: 0, x: 30 * tabDirection }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 * tabDirection }} transition={{ duration: 0.25 }}>
                        <Card style={{ marginBottom: 16 }}>
                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="fa-solid fa-fire" style={{ color: '#f59e0b' }} /> Активность за последний год
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(52, 1fr)', gap: 2 }}>
                                {generateHeatmapData().map((val, idx) => (
                                    <div key={idx} style={{ aspectRatio: '1', borderRadius: 2, background: val > 0.8 ? '#10b981' : val > 0.5 ? 'rgba(16,185,129,0.5)' : val > 0.2 ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', transition: 'transform 0.1s' }} title={`Активность: ${Math.round(val * 100)}%`} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.5)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'} />
                                ))}
                            </div>
                        </Card>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                            <Card>
                                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <i className="fa-solid fa-clock" style={{ color: '#6366f1' }} /> Пиковые часы
                                </h4>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80, padding: '0 4px' }}>
                                    {[20, 40, 80, 100, 60, 30, 10, 5, 15, 50, 90, 70, 45, 25, 60, 85, 95, 70, 40, 20, 15, 30, 50, 35].map((h, i) => (
                                        <div key={i} style={{ flex: 1, background: `linear-gradient(to top, rgba(99,102,241,0.3), rgba(99,102,241,0.8))`, borderRadius: 2, height: `${h}%`, transition: 'height 0.3s' }} />
                                    ))}
                                </div>
                            </Card>
                            <Card>
                                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <i className="fa-solid fa-hard-drive" style={{ color: '#10b981' }} /> Хранилище
                                </h4>
                                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>{displayUser.stats.storageUsed}%</div>
                                    <div style={{ fontSize: 11, color: '#64748b' }}>из {displayUser.stats.storageTotal} МБ</div>
                                </div>
                                <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${displayUser.stats.storageUsed}%` }} transition={{ duration: 1 }} style={{ height: '100%', background: 'linear-gradient(90deg, #10b981, #059669)' }} />
                                </div>
                            </Card>
                        </div>
                    </motion.div>
                );
            case 'activity':
                return (
                    <motion.div key="activity" initial={{ opacity: 0, x: 30 * tabDirection }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 * tabDirection }} transition={{ duration: 0.25 }}>
                        <Card>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <i className="fa-solid fa-clock-rotate-left" style={{ color: '#6366f1' }} /> Полная лента активности
                                </h4>
                                <Badge variant="info">{displayUser.activityLog.length} записей</Badge>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', paddingLeft: 24 }}>
                                <div style={{ position: 'absolute', left: 8, top: 12, bottom: 12, width: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }} />
                                {displayUser.activityLog.map((log, idx) => (
                                    <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '12px 0', position: 'relative' }}>
                                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#0f1117', border: `2px solid ${log.color}`, flexShrink: 0, zIndex: 1, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <i className={`fa-solid ${log.icon}`} style={{ color: log.color, fontSize: 7 }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 2 }}>{log.text}</div>
                                            <div style={{ fontSize: 11, color: '#64748b' }}>{log.time}</div>
                                        </div>
                                        <Badge variant="neutral" style={{ fontSize: 9, padding: '2px 6px' }}>{log.type}</Badge>
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                );
            case 'admin':
                return (
                    <motion.div key="admin" initial={{ opacity: 0, x: 30 * tabDirection }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 * tabDirection }} transition={{ duration: 0.25 }}>
                        <Card style={{ marginBottom: 16, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.03)' }}>
                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f87171', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="fa-solid fa-triangle-exclamation" /> Опасная зона
                            </h4>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <Button variant="warning" icon="fa-solid fa-ban">Заблокировать</Button>
                                <Button variant="danger" icon="fa-solid fa-trash">Удалить аккаунт</Button>
                            </div>
                        </Card>
                        {displayUser.adminData && (
                            <Card style={{ marginBottom: 16, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.03)' }}>
                                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#a5b4fc', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <i className="fa-solid fa-id-badge" /> Данные администратора
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div style={{ padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Статус записи</div>
                                        <Badge variant={displayUser.adminData.is_active ? 'success' : 'danger'}>
                                            {displayUser.adminData.is_active ? 'Активен' : 'Деактивирован'}
                                        </Badge>
                                    </div>
                                    <div style={{ padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Дата назначения</div>
                                        <div style={{ fontSize: 13, color: '#e2e8f0' }}>{new Date(displayUser.adminData.created_at).toLocaleDateString('ru-RU')}</div>
                                    </div>
                                </div>
                            </Card>
                        )}
                        <Card>
                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="fa-solid fa-code" style={{ color: '#94a3b8' }} /> Сырые метаданные (Dev)
                            </h4>
                            <div style={{ background: '#0a0c10', borderRadius: 10, padding: 16, fontFamily: 'monospace', fontSize: 12, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                                {Object.entries(displayUser.metadata).map(([key, value]) => (
                                    <div key={key} style={{ display: 'flex', gap: 8 }}>
                                        <span style={{ color: '#818cf8' }}>{key}:</span>
                                        <span style={{ color: typeof value === 'boolean' ? (value ? '#22c55e' : '#ef4444') : '#e2e8f0' }}>
                                            {typeof value === 'string' ? `"${value}"` : String(value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                );
            default:
                return null;
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0f1117' }}>
            <div style={{ padding: 'clamp(16px, 3vw, 32px)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,17,23,0.8)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 50 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                        <Avatar name={displayUser.login} size={72} variant={displayUser.isStaff ? 'danger' : 'default'} />
                        <div style={{ position: 'absolute', bottom: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: displayUser.isOnline ? '#22c55e' : '#64748b', border: '3px solid #0f1117' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                                {isMyProfile ? 'Мой профиль' : (displayUser.name || displayUser.login)}
                            </h1>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                            <Badge variant="info" icon="fa-solid fa-at">@{displayUser.login}</Badge>
                            <Badge variant={displayUser.isStaff ? 'danger' : 'warning'}>{displayUser.roleName}</Badge>
                            {displayUser.adminData?.is_active && <Badge variant="success" icon="fa-solid fa-shield-halved">Staff</Badge>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {displayUser.tags.map((tag, idx) => (
                                <span key={idx} style={{ fontSize: 11, fontWeight: 600, color: '#a5b4fc', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, padding: '3px 8px' }}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ padding: 'clamp(16px, 3vw, 32px)', flex: 1, maxWidth: 1400, margin: '0 auto', width: '100%' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr', gap: 24, alignItems: 'start' }}>
                    <div style={{ position: 'sticky', top: 140, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <Card padding={16}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <StatCard icon="fa-solid fa-calendar-check" number={displayUser.stats.daysActive} label="Дней в системе" color="#6366f1" />
                                <StatCard icon="fa-solid fa-file-circle-exclamation" number={displayUser.stats.incidentsCreated} label="Инцидентов" color="#f59e0b" />
                                <StatCard icon="fa-solid fa-ban" number={`${displayUser.stats.spamScore}%`} label="Spam Score" color={displayUser.stats.spamScore > 20 ? '#ef4444' : '#10b981'} />
                            </div>
                        </Card>
                        <Card padding={16}>
                            <h4 style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 12, textTransform: 'uppercase' }}>Действия</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {!isMyProfile && displayUser.canEditStatus && displayUser.allStatuses.length > 0 && (
                                    <div style={{ marginBottom: 8, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        <label style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            <i className="fa-solid fa-shield-halved" style={{ color: '#6366f1', fontSize: 10 }} />
                                            Быстрая смена роли
                                        </label>
                                        <StatusSelect value={selectedStatusCode} onChange={(e) => handleStatusSelectChange(e.target.value)} allStatuses={displayUser.allStatuses} isLeftColumn={true} />
                                    </div>
                                )}
                                <Button variant="secondary" icon="fa-solid fa-mask" fullWidth>Войти как пользователь</Button>
                                <Button variant="secondary" icon="fa-solid fa-key" fullWidth>Сбросить пароль</Button>
                                <Button variant="secondary" icon="fa-solid fa-envelope" fullWidth>Написать сообщение</Button>
                            </div>
                        </Card>
                        {!isMyProfile && (
                            <Card padding={16} style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
                                <h4 style={{ fontSize: 11, fontWeight: 600, color: '#f87171', marginBottom: 12, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <i className="fa-solid fa-triangle-exclamation" /> Опасная зона
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <Button variant="warning" icon="fa-solid fa-ban" fullWidth>Заблокировать</Button>
                                    <Button variant="danger" icon="fa-solid fa-trash" fullWidth>Удалить навсегда</Button>
                                </div>
                            </Card>
                        )}
                    </div>

                    <div>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 4, background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                            {tabs.map(tab => (
                                <button key={tab.key} onClick={() => handleTabChange(tab.key)} style={{
                                    padding: '10px 14px', borderRadius: 8, border: 'none',
                                    background: activeTab === tab.key ? 'rgba(99,102,241,0.15)' : 'transparent',
                                    color: activeTab === tab.key ? '#e2e8f0' : '#94a3b8', fontSize: 12, fontWeight: 600,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', whiteSpace: 'nowrap'
                                }}>
                                    <i className={tab.icon} style={{ fontSize: 12 }} />
                                    {tab.label}
                                    {tab.count !== null && (
                                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: activeTab === tab.key ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)', color: activeTab === tab.key ? '#a5b4fc' : '#64748b' }}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <AnimatePresence mode="wait">
                            {renderTabContent()}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <Modal open={confirmModalOpen} onClose={() => !isExecutingChange && setConfirmModalOpen(false)} title="Подтверждение изменения роли" size="sm" footer={
                <>
                    <Button variant="secondary" onClick={() => setConfirmModalOpen(false)} disabled={isExecutingChange}>Отмена</Button>
                    <Button variant="warning" icon="fa-solid fa-check" onClick={executeStatusChange} loading={isExecutingChange}>Подтвердить изменение</Button>
                </>
            }>
                <Alert variant="warning" icon="fa-solid fa-triangle-exclamation" style={{ marginBottom: 16, whiteSpace: 'pre-line' }}>
                    {modalMessage}
                </Alert>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Пользователь:</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>{displayUser.login}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Новая роль:</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fbbf24' }}>
                        {displayUser.allStatuses.find(s => s.code_name === pendingStatusCode)?.name}
                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, marginLeft: 6 }}>
                            ({pendingStatusCode})
                        </span>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default UserProfile;