import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, Badge, Button, Input, Select, Alert, EmptyState, Modal, FormField } from '../../ui/UIComponents';
import {
    getDonationRequests,
    approveDonationRequest,
    rejectDonationRequest,
    cancelDonationApproval,
    markDonationEmailSent,
    getDonationEmailPreview,
    getDonationPayments,
    getDonationUserInfo,
    getDonationStats,
    getDonationPackagesAdmin,
    getDonationPerksAdmin,
    createDonationPackage,
    updateDonationPackage,
    deleteDonationPackage,
    createDonationPerk,
    updateDonationPerk,
    deleteDonationPerk,
    regenerateDonationAccess,
    revokeDonationAccess
} from '../../../http/donationAPI';

const TABS = [
    { id: 'requests', label: 'Заявки', icon: 'fa-inbox' },
    { id: 'payments', label: 'История', icon: 'fa-clock-rotate-left' },
    { id: 'users', label: 'Пользователи', icon: 'fa-users' },
    { id: 'stats', label: 'Статистика', icon: 'fa-chart-line' },
    { id: 'packages', label: 'Пакеты', icon: 'fa-gift' },
    { id: 'perks', label: 'Плюшки', icon: 'fa-bolt' },
];

export default function DonationAdminPage() {
    const [activeTab, setActiveTab] = useState('requests');

    return (
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: 24 }}
            >
                <h1 style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: '#f1f5f9',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                }}>
                    <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 18
                    }}>
                        <i className="fa-solid fa-hand-holding-heart" />
                    </div>
                    Администрирование донатов
                </h1>
            </motion.div>

            {/* Табы */}
            <div style={{
                display: 'flex',
                gap: 8,
                marginBottom: 24,
                flexWrap: 'wrap',
                padding: 4,
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 12,
                width: 'fit-content'
            }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '10px 16px',
                            background: activeTab === tab.id
                                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                : 'transparent',
                            color: activeTab === tab.id ? '#fff' : '#94a3b8',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 0.2s'
                        }}
                    >
                        <i className={`fa-solid ${tab.icon}`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'requests' && <RequestsTab />}
            {activeTab === 'payments' && <PaymentsTab />}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'stats' && <StatsTab />}
            {activeTab === 'packages' && <PackagesTab />}
            {activeTab === 'perks' && <PerksTab />}
        </div>
    );
}

// ============================================================================
// ВКЛАДКА: ЗАЯВКИ
// ============================================================================

function RequestsTab() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('pending');
    const [processingId, setProcessingId] = useState(null);
    const [amountInput, setAmountInput] = useState('');
    const [reasonInput, setReasonInput] = useState('');
    const [actionType, setActionType] = useState(null);

    useEffect(() => {
        loadRequests();
    }, [status]);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const result = await getDonationRequests(status, 100, 0);
            setRequests(result.requests || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (requestId) => {
        const amount = parseFloat(amountInput);
        if (!amount || amount <= 0) {
            window.alert('Введите корректную сумму');
            return;
        }
        setProcessingId(requestId);
        try {
            await approveDonationRequest(requestId, amount);
            setActionType(null);
            setAmountInput('');
            loadRequests();
        } catch (e) {
            window.alert(e.response?.data?.message || 'Ошибка');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (requestId) => {
        if (!reasonInput.trim()) {
            window.alert('Укажите причину отклонения');
            return;
        }
        setProcessingId(requestId);
        try {
            await rejectDonationRequest(requestId, reasonInput);
            setActionType(null);
            setReasonInput('');
            loadRequests();
        } catch (e) {
            window.alert('Ошибка');
        } finally {
            setProcessingId(null);
        }
    };

    const handleMarkEmailSent = async (requestId) => {
        setProcessingId(requestId);
        try {
            await markDonationEmailSent(requestId);
            loadRequests();
        } catch (e) {
            window.alert('Ошибка');
        } finally {
            setProcessingId(null);
        }
    };

    const handleCopyEmail = async (requestId) => {
        try {
            const preview = await getDonationEmailPreview(requestId);
            await navigator.clipboard.writeText(preview.body);
            window.alert('Письмо скопировано в буфер обмена');
        } catch (e) {
            window.alert('Ошибка: ' + (e.response?.data?.message || e.message));
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
                {['pending', 'approved', 'rejected'].map(s => (
                    <Button
                        key={s}
                        variant={status === s ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setStatus(s)}
                    >
                        {s === 'pending' ? 'Ожидают' : s === 'approved' ? 'Одобрены' : 'Отклонены'}
                    </Button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: '#6366f1' }} />
                </div>
            ) : requests.length === 0 ? (
                <EmptyState icon="fa-inbox" title="Заявок нет" />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {requests.map(req => (
                        <Card key={req.request_id} padding={20}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: 12,
                                flexWrap: 'wrap',
                                gap: 12
                            }}>
                                <div>
                                    <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>
                                        #{req.request_id} • {req.email}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                        {new Date(req.requested_at).toLocaleString('ru-RU')} • IP: {req.ip_address || '-'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <Badge variant={req.status === 'pending' ? 'warning' : req.status === 'approved' ? 'success' : 'danger'}>
                                        {req.status === 'pending' ? 'Ожидает' : req.status === 'approved' ? 'Одобрена' : 'Отклонена'}
                                    </Badge>
                                    {req.package && (
                                        <Badge variant="info">{req.package.name}</Badge>
                                    )}
                                    {req.status === 'approved' && !req.email_sent && (
                                        <Badge variant="warning" icon="fa-envelope">Письмо не отправлено</Badge>
                                    )}
                                    {req.email_sent && (
                                        <Badge variant="success" icon="fa-check">Письмо отправлено</Badge>
                                    )}
                                </div>
                            </div>

                            {req.actual_amount && (
                                <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 12 }}>
                                    💰 Сумма: <strong style={{ color: '#f1f5f9' }}>{req.actual_amount}₽</strong>
                                    {req.processed_by && <span> • Обработал: {req.processed_by}</span>}
                                </div>
                            )}

                            {req.rejection_reason && (
                                <Alert variant="error" style={{ marginBottom: 12, padding: '8px 12px', fontSize: 12 }}>
                                    Причина: {req.rejection_reason}
                                </Alert>
                            )}

                            {req.status === 'pending' && (
                                <div style={{ marginTop: 12 }}>
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                        <Input
                                            type="number"
                                            placeholder="Сумма с платформы, ₽"
                                            value={amountInput}
                                            onChange={(e) => setAmountInput(e.target.value)}
                                            style={{ maxWidth: 200 }}
                                        />
                                        <Button
                                            variant="success"
                                            onClick={() => handleApprove(req.request_id)}
                                            loading={processingId === req.request_id}
                                            icon="fa-check"
                                        >
                                            Одобрить
                                        </Button>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <Input
                                            placeholder="Причина отклонения"
                                            value={reasonInput}
                                            onChange={(e) => setReasonInput(e.target.value)}
                                            style={{ flex: 1 }}
                                        />
                                        <Button
                                            variant="danger"
                                            onClick={() => handleReject(req.request_id)}
                                            loading={processingId === req.request_id}
                                            icon="fa-times"
                                        >
                                            Отклонить
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {req.status === 'approved' && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => handleCopyEmail(req.request_id)}
                                        icon="fa-copy"
                                    >
                                        Скопировать письмо
                                    </Button>
                                    {!req.email_sent && (
                                        <Button
                                            variant="success"
                                            size="sm"
                                            onClick={() => handleMarkEmailSent(req.request_id)}
                                            loading={processingId === req.request_id}
                                            icon="fa-envelope-circle-check"
                                        >
                                            Письмо отправлено
                                        </Button>
                                    )}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// ВКЛАДКА: ИСТОРИЯ ПЛАТЕЖЕЙ
// ============================================================================

function PaymentsTab() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPayments();
    }, []);

    const loadPayments = async () => {
        try {
            const result = await getDonationPayments(100, 0);
            setPayments(result.payments || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: '#6366f1' }} />
        </div>;
    }

    return (
        <Card padding={0}>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <tr>
                            {['ID', 'Email Hash', 'Сумма', 'Пакет', 'Дата', 'Обработал', 'Письмо'].map(h => (
                                <th key={h} style={{
                                    padding: 14,
                                    textAlign: 'left',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: '#94a3b8',
                                    textTransform: 'uppercase',
                                    borderBottom: '1px solid rgba(255,255,255,0.06)'
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {payments.map(p => (
                            <tr key={p.request_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <td style={{ padding: 12, color: '#e2e8f0' }}>#{p.request_id}</td>
                                <td style={{ padding: 12, color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>
                                    {p.email_hesh.slice(0, 12)}...
                                </td>
                                <td style={{ padding: 12, color: '#f1f5f9', fontWeight: 600 }}>{p.actual_amount}₽</td>
                                <td style={{ padding: 12 }}>
                                    <Badge variant="info">{p.package_name || '-'}</Badge>
                                </td>
                                <td style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>
                                    {new Date(p.processed_at).toLocaleString('ru-RU')}
                                </td>
                                <td style={{ padding: 12, color: '#cbd5e1' }}>{p.processed_by || '-'}</td>
                                <td style={{ padding: 12 }}>
                                    {p.email_sent ? (
                                        <Badge variant="success" icon="fa-check">✓</Badge>
                                    ) : (
                                        <Badge variant="warning">—</Badge>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

// ============================================================================
// ВКЛАДКА: ПОЛЬЗОВАТЕЛИ
// ============================================================================

function UsersTab() {
    const [emailHesh, setEmailHesh] = useState('');
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadUser = async () => {
        if (!emailHesh.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const result = await getDonationUserInfo(emailHesh.trim());
            setUserData(result);
        } catch (e) {
            setError(e.response?.data?.message || 'Пользователь не найден');
            setUserData(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <Card padding={20} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <FormField label="Email hash (hex)">
                            <Input
                                placeholder="Вставьте email_hesh из истории платежей"
                                value={emailHesh}
                                onChange={(e) => setEmailHesh(e.target.value)}
                            />
                        </FormField>
                    </div>
                    <Button
                        variant="primary"
                        onClick={loadUser}
                        loading={loading}
                        icon="fa-search"
                    >
                        Найти
                    </Button>
                </div>
            </Card>

            {error && <Alert variant="error" style={{ marginBottom: 16 }}>{error}</Alert>}

            {userData && (
                <div>
                    <Card padding={24} style={{ marginBottom: 16 }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: 17, color: '#f1f5f9' }}>
                            📧 {userData.email}
                        </h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: 16
                        }}>
                            <div>
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>Всего донатов</div>
                                <div style={{ fontSize: 20, fontWeight: 700, color: '#a5b4fc' }}>
                                    {userData.stats.total_donated.toLocaleString('ru-RU')}₽
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>Получено проверок</div>
                                <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>
                                    {userData.stats.total_granted}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>Использовано</div>
                                <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>
                                    {userData.stats.total_spent}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {userData.activations.length > 0 && (
                        <Card padding={20} style={{ marginBottom: 16 }}>
                            <h4 style={{ margin: '0 0 12px 0', color: '#f1f5f9' }}>Активации</h4>
                            {userData.activations.map(act => (
                                <div key={act.activation_id} style={{
                                    padding: 12,
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: 8,
                                    marginBottom: 8,
                                    fontSize: 13
                                }}>
                                    <div>
                                        <strong>{act.package_name || act.package_code}</strong>
                                        {' '}• {act.checks_remaining}/{act.checks_granted} проверок
                                        {' '}• до {new Date(act.expires_at).toLocaleDateString('ru-RU')}
                                    </div>
                                    <Badge variant={act.is_active ? 'success' : 'default'} style={{ marginTop: 6 }}>
                                        {act.is_active ? 'Активна' : 'Истекла'}
                                    </Badge>
                                </div>
                            ))}
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// ВКЛАДКА: СТАТИСТИКА
// ============================================================================

function StatsTab() {
    const [period, setPeriod] = useState('month');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, [period]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const result = await getDonationStats(period);
            setStats(result);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !stats) {
        return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: '#6366f1' }} />
        </div>;
    }

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
                {['day', 'week', 'month', 'year', 'all'].map(p => (
                    <Button
                        key={p}
                        variant={period === p ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setPeriod(p)}
                    >
                        {p === 'day' ? 'День' : p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : p === 'year' ? 'Год' : 'Всё время'}
                    </Button>
                ))}
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
                gap: 16,
                marginBottom: 24
            }}>
                <Card padding={20}>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Всего заявок</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9' }}>
                        {stats.totals.total_requests}
                    </div>
                </Card>
                <Card padding={20}>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Одобрено</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>
                        {stats.totals.approved}
                    </div>
                </Card>
                <Card padding={20}>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Сумма</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#a5b4fc' }}>
                        {stats.totals.total_amount.toLocaleString('ru-RU')}₽
                    </div>
                </Card>
                <Card padding={20}>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Конверсия</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>
                        {stats.conversion?.conversion_rate || 0}%
                    </div>
                </Card>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))', gap: 16 }}>
                <Card padding={20}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#f1f5f9' }}>По пакетам</h4>
                    {stats.by_package.map(p => (
                        <div key={p.code_name} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 0',
                            borderBottom: '1px solid rgba(255,255,255,0.04)'
                        }}>
                            <span style={{ color: '#cbd5e1' }}>{p.display_name}</span>
                            <span style={{ color: '#f1f5f9', fontWeight: 600 }}>
                                {p.count} шт. • {parseFloat(p.total_amount).toLocaleString('ru-RU')}₽
                            </span>
                        </div>
                    ))}
                </Card>

                <Card padding={20}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#f1f5f9' }}>Топ донатеров</h4>
                    {stats.top_donors.map((d, idx) => (
                        <div key={d.email_hesh} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 0',
                            borderBottom: '1px solid rgba(255,255,255,0.04)'
                        }}>
                            <span style={{ color: '#cbd5e1', fontFamily: 'monospace', fontSize: 12 }}>
                                #{idx + 1} {d.email_hesh.slice(0, 10)}...
                            </span>
                            <span style={{ color: '#f1f5f9', fontWeight: 600 }}>
                                {parseFloat(d.total_amount).toLocaleString('ru-RU')}₽
                            </span>
                        </div>
                    ))}
                </Card>
            </div>
        </div>
    );
}

// ============================================================================
// ВКЛАДКА: ПАКЕТЫ
// ============================================================================

function PackagesTab() {
    const [packages, setPackages] = useState([]);
    const [perks, setPerks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [p, pk] = await Promise.all([getDonationPackagesAdmin(), getDonationPerksAdmin()]);
            setPackages(p.packages || []);
            setPerks(pk.perks || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (editing.package_id) {
                await updateDonationPackage(editing.package_id, editing);
            } else {
                await createDonationPackage(editing);
            }
            setEditing(null);
            loadData();
        } catch (e) {
            window.alert('Ошибка: ' + (e.response?.data?.message || e.message));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Удалить пакет?')) return;
        try {
            await deleteDonationPackage(id);
            loadData();
        } catch (e) {
            window.alert('Ошибка: ' + (e.response?.data?.message || e.message));
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            <i className="fa-solid fa-spinner fa-spin" />
        </div>;
    }

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Button
                    variant="primary"
                    onClick={() => setEditing({
                        code_name: '',
                        display_name: '',
                        description: '',
                        min_amount: 300,
                        max_amount: null,
                        checks_granted: 30,
                        duration_days: 30,
                        sort_order: 0,
                        icon: 'fa-gift',
                        color: '#6366f1',
                        is_active: true,
                        perk_ids: []
                    })}
                    icon="fa-plus"
                >
                    Новый пакет
                </Button>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
                gap: 16
            }}>
                {packages.map(pkg => (
                    <Card key={pkg.package_id} padding={20} style={{ borderLeft: `4px solid ${pkg.color || '#6366f1'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                            <h4 style={{ margin: 0, color: '#f1f5f9' }}>{pkg.display_name}</h4>
                            <Badge variant={pkg.is_active ? 'success' : 'default'}>
                                {pkg.is_active ? 'Активен' : 'Выкл'}
                            </Badge>
                        </div>
                        <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 8 }}>
                            {pkg.min_amount}–{pkg.max_amount || '∞'}₽
                        </div>
                        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>
                            {pkg.checks_granted} проверок • {pkg.duration_days} дней
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <Button variant="secondary" size="sm" onClick={() => setEditing(pkg)} icon="fa-pen">
                                Изменить
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleDelete(pkg.package_id)} icon="fa-trash" />
                        </div>
                    </Card>
                ))}
            </div>

            {editing && (
                <Modal
                    open={true}
                    onClose={() => setEditing(null)}
                    title={editing.package_id ? 'Изменить пакет' : 'Новый пакет'}
                    size="lg"
                >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <FormField label="Код">
                            <Input value={editing.code_name} onChange={(e) => setEditing({ ...editing, code_name: e.target.value })} />
                        </FormField>
                        <FormField label="Название">
                            <Input value={editing.display_name} onChange={(e) => setEditing({ ...editing, display_name: e.target.value })} />
                        </FormField>
                        <FormField label="Мин. сумма, ₽">
                            <Input type="number" value={editing.min_amount} onChange={(e) => setEditing({ ...editing, min_amount: parseFloat(e.target.value) })} />
                        </FormField>
                        <FormField label="Макс. сумма, ₽ (пусто = без лимита)">
                            <Input type="number" value={editing.max_amount || ''} onChange={(e) => setEditing({ ...editing, max_amount: e.target.value ? parseFloat(e.target.value) : null })} />
                        </FormField>
                        <FormField label="Проверок">
                            <Input type="number" value={editing.checks_granted} onChange={(e) => setEditing({ ...editing, checks_granted: parseInt(e.target.value) })} />
                        </FormField>
                        <FormField label="Срок (дней)">
                            <Input type="number" value={editing.duration_days} onChange={(e) => setEditing({ ...editing, duration_days: parseInt(e.target.value) })} />
                        </FormField>
                        <FormField label="Иконка (FontAwesome)">
                            <Input value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} />
                        </FormField>
                        <FormField label="Цвет (hex)">
                            <Input value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} />
                        </FormField>
                    </div>
                    <FormField label="Описание" style={{ marginTop: 16 }}>
                        <Input value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                    </FormField>

                    <FormField label="Плюшки пакета" style={{ marginTop: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {perks.map(perk => (
                                <label key={perk.perk_id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: 10,
                                    background: editing.perk_ids?.includes(perk.perk_id) ? 'rgba(99,102,241,0.1)' : 'rgba(0,0,0,0.2)',
                                    borderRadius: 8,
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={editing.perk_ids?.includes(perk.perk_id) || false}
                                        onChange={(e) => {
                                            const ids = editing.perk_ids || [];
                                            setEditing({
                                                ...editing,
                                                perk_ids: e.target.checked
                                                    ? [...ids, perk.perk_id]
                                                    : ids.filter(id => id !== perk.perk_id)
                                            });
                                        }}
                                    />
                                    <i className={`fa-solid ${perk.icon}`} style={{ color: perk.color, width: 20, textAlign: 'center' }} />
                                    <span style={{ color: '#e2e8f0', fontSize: 13 }}>{perk.display_name}</span>
                                </label>
                            ))}
                        </div>
                    </FormField>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <Button variant="secondary" onClick={() => setEditing(null)}>Отмена</Button>
                        <Button variant="primary" onClick={handleSave} icon="fa-check">Сохранить</Button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ============================================================================
// ВКЛАДКА: ПЛЮШКИ
// ============================================================================

function PerksTab() {
    const [perks, setPerks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const result = await getDonationPerksAdmin();
            setPerks(result.perks || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (editing.perk_id) {
                await updateDonationPerk(editing.perk_id, editing);
            } else {
                await createDonationPerk(editing);
            }
            setEditing(null);
            loadData();
        } catch (e) {
            window.alert('Ошибка: ' + (e.response?.data?.message || e.message));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Удалить плюшку?')) return;
        try {
            await deleteDonationPerk(id);
            loadData();
        } catch (e) {
            window.alert('Ошибка: ' + (e.response?.data?.message || e.message));
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            <i className="fa-solid fa-spinner fa-spin" />
        </div>;
    }

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Button
                    variant="primary"
                    onClick={() => setEditing({
                        code_name: '',
                        display_name: '',
                        description: '',
                        icon: 'fa-star',
                        color: '#6366f1',
                        sort_order: 0,
                        is_active: true
                    })}
                    icon="fa-plus"
                >
                    Новая плюшка
                </Button>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
                gap: 16
            }}>
                {perks.map(perk => (
                    <Card key={perk.perk_id} padding={20} style={{ borderLeft: `4px solid ${perk.color || '#6366f1'}` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: `${perk.color}20`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: perk.color,
                                fontSize: 18
                            }}>
                                <i className={`fa-solid ${perk.icon}`} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ margin: '0 0 4px 0', color: '#f1f5f9', fontSize: 15 }}>
                                    {perk.display_name}
                                </h4>
                                <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                                    {perk.code_name}
                                </div>
                            </div>
                            <Badge variant={perk.is_active ? 'success' : 'default'}>
                                {perk.is_active ? '✓' : '—'}
                            </Badge>
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12, lineHeight: 1.5 }}>
                            {perk.description}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <Button variant="secondary" size="sm" onClick={() => setEditing(perk)} icon="fa-pen">
                                Изменить
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleDelete(perk.perk_id)} icon="fa-trash" />
                        </div>
                    </Card>
                ))}
            </div>

            {editing && (
                <Modal
                    open={true}
                    onClose={() => setEditing(null)}
                    title={editing.perk_id ? 'Изменить плюшку' : 'Новая плюшка'}
                    size="md"
                >
                    <FormField label="Код (уникальный)">
                        <Input value={editing.code_name} onChange={(e) => setEditing({ ...editing, code_name: e.target.value })} />
                    </FormField>
                    <FormField label="Название" style={{ marginTop: 16 }}>
                        <Input value={editing.display_name} onChange={(e) => setEditing({ ...editing, display_name: e.target.value })} />
                    </FormField>
                    <FormField label="Описание" style={{ marginTop: 16 }}>
                        <Input value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                    </FormField>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                        <FormField label="Иконка">
                            <Input value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} />
                        </FormField>
                        <FormField label="Цвет">
                            <Input value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} />
                        </FormField>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <Button variant="secondary" onClick={() => setEditing(null)}>Отмена</Button>
                        <Button variant="primary" onClick={handleSave} icon="fa-check">Сохранить</Button>
                    </div>
                </Modal>
            )}
        </div>
    );
}