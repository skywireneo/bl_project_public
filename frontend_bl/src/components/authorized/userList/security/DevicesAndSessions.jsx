import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Badge, EmptyState, Modal, Alert, Input } from '../../../ui/UIComponents';
import {
    activeSessions, logoutSession, getUserDevices, deleteDevice,
    setDeviceTrusted, updateDeviceName, verifyDeviceCode
} from '../../../../http/userAPI';
import storageHandler from '../../../../http/utils/storageHandler';

export default function DevicesAndSessions({ userId, currentUserId, currentUserStatus, currentLogin }) {
    const [sessions, setSessions] = useState([]);
    const [devices, setDevices] = useState([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const [isLoadingDevices, setIsLoadingDevices] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const [showRevokeAllModal, setShowRevokeAllModal] = useState(false);
    const [showRevokeOthersModal, setShowRevokeOthersModal] = useState(false);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deviceToDelete, setDeviceToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [trustPasswordModalOpen, setTrustPasswordModalOpen] = useState(false);
    const [deviceToTrust, setDeviceToTrust] = useState(null);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSettingTrust, setIsSettingTrust] = useState(false);
    const [trustError, setTrustError] = useState('');

    const [revokeTrustModalOpen, setRevokeTrustModalOpen] = useState(false);
    const [deviceToRevoke, setDeviceToRevoke] = useState(null);
    const [isRevokingTrust, setIsRevokingTrust] = useState(false);

    const [renameModalOpen, setRenameModalOpen] = useState(false);
    const [deviceToRename, setDeviceToRename] = useState(null);
    const [customName, setCustomName] = useState('');
    const [appendDeviceInfo, setAppendDeviceInfo] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);

    const [verifyDeviceModalOpen, setVerifyDeviceModalOpen] = useState(false);
    const [verifyCode, setVerifyCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState('');

    const isOwnProfile = currentUserId === userId;
    const isAdmin = ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"].includes(currentUserStatus);
    const canManage = isOwnProfile || isAdmin;
    const currentSessionId = storageHandler.get('sessionId', 'localStorage');

    useEffect(() => {
        const handleSessionsUpdate = () => setRefreshKey(k => k + 1);
        window.addEventListener('sessions_updated', handleSessionsUpdate);
        return () => window.removeEventListener('sessions_updated', handleSessionsUpdate);
    }, []);

    const fetchSessions = async () => {
        if (!userId) return;
        setIsLoadingSessions(true);
        try { const data = await activeSessions(userId); setSessions(Array.isArray(data) ? data : []); }
        catch (err) { console.error(err); setSessions([]); }
        finally { setIsLoadingSessions(false); }
    };

    const fetchDevices = async () => {
        if (!userId) return;
        setIsLoadingDevices(true);
        try { const data = await getUserDevices(userId); setDevices(Array.isArray(data) ? data : []); }
        catch (err) { console.error(err); setDevices([]); }
        finally { setIsLoadingDevices(false); }
    };

    useEffect(() => { fetchSessions(); fetchDevices(); }, [userId, refreshKey]);

    const handleRevoke = async (type, sessionId = null) => {
        setIsRevoking(true);
        try {
            await logoutSession(sessionId, currentSessionId, userId, type);
            setRefreshKey(k => k + 1);
            setShowRevokeAllModal(false); setShowRevokeOthersModal(false);
        } catch (err) { alert(err?.response?.data?.message || 'Не удалось завершить сессию(и)'); }
        finally { setIsRevoking(false); }
    };

    const handleDeleteConfirm = async () => {
        if (!deviceToDelete) return;
        setIsDeleting(true);
        try {
            await deleteDevice(deviceToDelete.id, currentSessionId);
            setRefreshKey(k => k + 1); setDeleteModalOpen(false); setDeviceToDelete(null);
        } catch (err) { alert(err?.response?.data?.message || 'Не удалось удалить устройство'); }
        finally { setIsDeleting(false); }
    };

    const handleTrustConfirm = async () => {
        if (!deviceToTrust || !confirmPassword) return;
        setIsSettingTrust(true); setTrustError('');
        try {
            await setDeviceTrusted(deviceToTrust.id, true, confirmPassword);
            setRefreshKey(k => k + 1); setTrustPasswordModalOpen(false);
            setDeviceToTrust(null); setConfirmPassword('');
        } catch (err) { setTrustError(err?.response?.data?.message || 'Не удалось установить доверие'); }
        finally { setIsSettingTrust(false); }
    };

    const handleRevokeTrustConfirm = async () => {
        if (!deviceToRevoke) return;
        setIsRevokingTrust(true);
        try {
            await setDeviceTrusted(deviceToRevoke.id, false);
            setRefreshKey(k => k + 1); setRevokeTrustModalOpen(false); setDeviceToRevoke(null);
        } catch (err) { alert(err?.response?.data?.message || 'Не удалось отозвать доверие'); }
        finally { setIsRevokingTrust(false); }
    };

    const handleRenameConfirm = async () => {
        if (!deviceToRename) return;
        setIsRenaming(true);
        try {
            await updateDeviceName(deviceToRename.id, customName, appendDeviceInfo);
            setRefreshKey(k => k + 1); setRenameModalOpen(false); setDeviceToRename(null);
        } catch (err) { alert(err?.response?.data?.message || 'Не удалось переименовать устройство'); }
        finally { setIsRenaming(false); }
    };

    const handleVerifyDeviceCode = async (e) => {
        if (e) e.preventDefault();
        if (!verifyCode || verifyCode.length !== 6) { setVerifyError('Введите корректный 6-значный код'); return; }
        setIsVerifying(true); setVerifyError('');
        try {
            await verifyDeviceCode(currentLogin, verifyCode);
            alert('Устройство успешно авторизовано!');
            setVerifyDeviceModalOpen(false); setVerifyCode(''); setRefreshKey(k => k + 1);
        } catch (err) { setVerifyError(err?.response?.data?.message || 'Неверный или истекший код'); }
        finally { setIsVerifying(false); }
    };

    const formatDate = (dateStr, isFallbackActive = false) => {
        if (!dateStr) return isFallbackActive ? 'Активна сейчас' : 'Неактивна';
        const date = new Date(dateStr); const now = new Date();
        const diffMs = now - date; const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Только что';
        if (diffMins < 60) return `${diffMins} мин. назад`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ч. назад`;
        return date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const formatExpires = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatDeviceDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    //  Группировка устройств БЕЗ выделения текущего в отдельный блок
    const trustedDevices = devices.filter(d => d.is_trusted);
    const otherDevices = devices.filter(d => !d.is_trusted);

    if (!canManage) return null;

    const DeviceCard = ({ dev }) => {
        const isCurrent = dev.id === parseInt(currentSessionId);
        return (
            <motion.div key={dev.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                style={{
                    padding: 14, background: isCurrent ? 'rgba(16,185,129,0.05)' : 'rgba(0,0,0,0.2)',
                    borderRadius: 10, border: `1px solid ${isCurrent ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)'}`
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: dev.is_mobile ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <i className={`fa-solid ${dev.is_mobile ? 'fa-mobile-screen' : 'fa-display'}`}
                                style={{ color: dev.is_mobile ? '#f59e0b' : '#6366f1', fontSize: 16 }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                {dev.device_name}
                                {isCurrent && <Badge variant="success" size="sm">Текущее</Badge>}
                                {dev.is_trusted && !isCurrent && <Badge variant="success" size="sm" icon="fa-solid fa-shield-halved">Доверенное</Badge>}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                {dev.os} {dev.browser} {dev.model !== 'Unknown' ? `• ${dev.model}` : ''}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {!dev.is_trusted && !isCurrent && (
                            <Button variant="secondary" size="sm" icon="fa-solid fa-shield-halved"
                                onClick={() => { setDeviceToTrust(dev); setConfirmPassword(''); setTrustError(''); setTrustPasswordModalOpen(true); }}
                                style={{ fontSize: 11, padding: '4px 10px' }}>
                                Доверять
                            </Button>
                        )}
                        {dev.is_trusted && !isCurrent && (
                            <Button variant="warning" size="sm" icon="fa-solid fa-shield-slash"
                                onClick={() => { setDeviceToRevoke(dev); setRevokeTrustModalOpen(true); }}
                                style={{ fontSize: 11, padding: '4px 10px' }}>
                                Отозвать
                            </Button>
                        )}
                        <Button variant="secondary" size="sm" icon="fa-solid fa-pen"
                            onClick={() => { setDeviceToRename(dev); setCustomName(dev.custom_name || ''); setAppendDeviceInfo(false); setRenameModalOpen(true); }}
                            style={{ fontSize: 11, padding: '4px 10px' }}>
                            Имя
                        </Button>
                        <Button variant="danger" size="sm" icon="fa-solid fa-trash"
                            onClick={() => { setDeviceToDelete(dev); setDeleteModalOpen(true); }}
                            style={{ fontSize: 11, padding: '4px 10px' }}>
                            Удалить
                        </Button>
                    </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 11, color: '#94a3b8', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span><i className="fa-solid fa-network-wired" style={{ marginRight: 4, width: 12 }} /> IP: {dev.ip_last || 'Не указан'}</span>
                    <span><i className="fa-solid fa-clock" style={{ marginRight: 4, width: 12 }} /> Входов: {dev.login_count}</span>
                    <span><i className="fa-solid fa-calendar" style={{ marginRight: 4, width: 12 }} /> Активность: {formatDeviceDate(dev.last_login_at)}</span>
                </div>
            </motion.div>
        );
    };

    return (
        <>
            {/* Активные сессии */}
            <Card style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fa-solid fa-desktop" style={{ color: '#10b981' }} />
                        Активные сессии <Badge variant="info">{sessions.length}</Badge>
                    </h4>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {isOwnProfile && sessions.length > 1 && (
                            <Button variant="warning" size="sm" icon="fa-solid fa-right-from-bracket"
                                onClick={() => setShowRevokeOthersModal(true)} disabled={isRevoking}>
                                Кроме текущей
                            </Button>
                        )}
                        <Button variant="danger" size="sm" icon="fa-solid fa-ban"
                            onClick={() => setShowRevokeAllModal(true)} disabled={isRevoking || sessions.length === 0}>
                            Завершить все
                        </Button>
                    </div>
                </div>
                {isLoadingSessions && sessions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>
                        <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 20, marginBottom: 8 }} />
                        <div style={{ fontSize: 13 }}>Загрузка сессий...</div>
                    </div>
                ) : sessions.length === 0 ? (
                    <EmptyState icon="fa-solid fa-shield-halved" title="Нет активных сессий" description="Все сессии завершены или истекли" />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {sessions.map((session) => {
                            const isCurrent = session.token_id === currentSessionId;
                            const isMobile = session.is_mobile;
                            return (
                                <motion.div key={session.token_id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                    style={{
                                        padding: 14,
                                        background: isCurrent ? 'rgba(99,102,241,0.08)' : 'rgba(0,0,0,0.2)',
                                        borderRadius: 10,
                                        border: `1px solid ${isCurrent ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)'}`
                                    }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{
                                                width: 40, height: 40, borderRadius: 10,
                                                background: isMobile ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                            }}>
                                                <i className={`fa-solid ${isMobile ? 'fa-mobile-screen' : 'fa-display'}`}
                                                    style={{ color: isMobile ? '#f59e0b' : '#6366f1', fontSize: 16 }} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                    {session.device_name}
                                                    {isCurrent && <Badge variant="success" style={{ fontSize: 9, padding: '2px 6px' }}>Текущая</Badge>}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                                    {session.os} • {session.browser} {session.model !== 'Unknown' && `• ${session.model}`}
                                                </div>
                                            </div>
                                        </div>
                                        {!isCurrent && (
                                            <Button variant="secondary" size="sm" icon="fa-solid fa-xmark"
                                                onClick={() => handleRevoke('current', session.token_id)} loading={isRevoking}
                                                style={{ fontSize: 11, padding: '6px 12px' }}>
                                                Завершить
                                            </Button>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 11, color: '#94a3b8', marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span><i className="fa-solid fa-network-wired" style={{ marginRight: 4, width: 12 }} /> {session.ip_last || 'Не указан'}</span>
                                        <span><i className="fa-solid fa-clock" style={{ marginRight: 4, width: 12 }} /> {formatDate(session.last_used, session.is_active)}</span>
                                        <span><i className="fa-solid fa-hourglass-end" style={{ marginRight: 4, width: 12 }} /> Истекает: {formatExpires(session.expires_at)}</span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Устройства (без отдельного блока "Текущее") */}
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fa-solid fa-laptop" style={{ color: '#10b981' }} /> Устройства
                    </h4>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="primary" size="sm" icon="fa-solid fa-mobile-screen-button"
                            onClick={() => setVerifyDeviceModalOpen(true)}>
                            Подтвердить вход
                        </Button>
                        <Button variant="secondary" size="sm" icon="fa-solid fa-rotate"
                            onClick={() => setRefreshKey(k => k + 1)} loading={isLoadingDevices}>
                            Обновить
                        </Button>
                    </div>
                </div>

                {isLoadingDevices && devices.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>
                        <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 20, marginBottom: 8 }} />
                        <div style={{ fontSize: 13 }}>Загрузка устройств...</div>
                    </div>
                ) : devices.length === 0 ? (
                    <EmptyState icon="fa-solid fa-laptop" title="Устройства не найдены" description="История входов пуста" />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Доверенные устройства */}
                        {trustedDevices.length > 0 && (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <i className="fa-solid fa-shield-halved" style={{ fontSize: 10 }} /> Доверенные устройства ({trustedDevices.length})
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {trustedDevices.map(dev => <DeviceCard key={dev.id} dev={dev} />)}
                                </div>
                            </div>
                        )}

                        {/* Остальные устройства */}
                        {otherDevices.length > 0 && (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <i className="fa-solid fa-laptop" style={{ fontSize: 10 }} /> Остальные устройства ({otherDevices.length})
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {otherDevices.map(dev => <DeviceCard key={dev.id} dev={dev} />)}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Модалки */}
            <Modal open={showRevokeAllModal} onClose={() => !isRevoking && setShowRevokeAllModal(false)}
                title="Завершение всех сессий" size="sm"
                footer={<>
                    <Button variant="secondary" onClick={() => setShowRevokeAllModal(false)} disabled={isRevoking}>Отмена</Button>
                    <Button variant="danger" icon="fa-solid fa-ban" onClick={() => handleRevoke('all')} loading={isRevoking}>Завершить все</Button>
                </>}>
                <Alert variant="warning" icon="fa-solid fa-triangle-exclamation" style={{ marginBottom: 12 }}>
                    Вы собираетесь завершить <strong>все</strong> активные сессии пользователя на всех устройствах.
                </Alert>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Вы уверены, что хотите продолжить?</p>
            </Modal>

            <Modal open={showRevokeOthersModal} onClose={() => !isRevoking && setShowRevokeOthersModal(false)}
                title="Завершение других сессий" size="sm"
                footer={<>
                    <Button variant="secondary" onClick={() => setShowRevokeOthersModal(false)} disabled={isRevoking}>Отмена</Button>
                    <Button variant="warning" icon="fa-solid fa-right-from-bracket" onClick={() => handleRevoke('allExeptCurrent')} loading={isRevoking}>Завершить другие</Button>
                </>}>
                <Alert variant="info" icon="fa-solid fa-circle-info" style={{ marginBottom: 12 }}>
                    Будут завершены все сессии, <strong>кроме той, в которой вы находитесь сейчас</strong>.
                </Alert>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Это хороший способ обезопасить аккаунт, если вы забыли выйти на другом устройстве.</p>
            </Modal>

            <Modal open={deleteModalOpen} onClose={() => !isDeleting && setDeleteModalOpen(false)}
                title="Удаление устройства" size="sm"
                footer={<>
                    <Button variant="secondary" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>Отмена</Button>
                    <Button variant="danger" icon="fa-solid fa-trash" onClick={handleDeleteConfirm} loading={isDeleting}>Удалить и завершить сессии</Button>
                </>}>
                <Alert variant="warning" icon="fa-solid fa-triangle-exclamation" style={{ marginBottom: 12 }}>
                    <strong>Внимание!</strong> При удалении устройства все активные сессии будут немедленно завершены.
                </Alert>
                {deviceToDelete?.is_trusted && (
                    <Alert variant="danger" icon="fa-solid fa-shield-slash" style={{ marginBottom: 12 }}>
                        <strong>Это доверенное устройство!</strong> После удаления потребуется админский код или сид-фраза для следующего входа.
                    </Alert>
                )}
                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    Вы действительно хотите удалить устройство <strong style={{ color: '#e2e8f0' }}>{deviceToDelete?.device_name}</strong>?
                </p>
            </Modal>

            <Modal open={trustPasswordModalOpen} onClose={() => !isSettingTrust && setTrustPasswordModalOpen(false)}
                title="Сделать устройство доверенным" size="sm"
                footer={<>
                    <Button variant="secondary" onClick={() => setTrustPasswordModalOpen(false)} disabled={isSettingTrust}>Отмена</Button>
                    <Button variant="success" icon="fa-solid fa-shield-halved" onClick={handleTrustConfirm} loading={isSettingTrust} disabled={!confirmPassword}>Подтвердить</Button>
                </>}>
                <Alert variant="info" icon="fa-solid fa-info-circle" style={{ marginBottom: 12 }}>
                    <strong>Зачем это нужно?</strong> Доверенные устройства позволяют входить без повторного ввода админского кода.
                </Alert>
                <Alert variant="warning" icon="fa-solid fa-shield-halved" style={{ marginBottom: 12 }}>
                    <strong>Важно:</strong> Убедитесь, что это ваше личное устройство.
                </Alert>
                {trustError && <Alert variant="danger" icon="fa-solid fa-circle-exclamation" style={{ marginBottom: 12 }}>{trustError}</Alert>}
                <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px 0', lineHeight: 1.5 }}>Для подтверждения введите ваш текущий пароль:</p>
                <Input type="password" label="Текущий пароль" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Введите пароль" autoFocus />
            </Modal>

            <Modal open={revokeTrustModalOpen} onClose={() => !isRevokingTrust && setRevokeTrustModalOpen(false)}
                title="Отзыв доверия устройства" size="sm"
                footer={<>
                    <Button variant="secondary" onClick={() => setRevokeTrustModalOpen(false)} disabled={isRevokingTrust}>Отмена</Button>
                    <Button variant="warning" icon="fa-solid fa-shield-slash" onClick={handleRevokeTrustConfirm} loading={isRevokingTrust}>Отозвать доверие</Button>
                </>}>
                <Alert variant="warning" icon="fa-solid fa-triangle-exclamation" style={{ marginBottom: 12 }}>
                    <strong>Внимание!</strong> После отзыва доверия при следующем входе потребуется ввести админский код.
                </Alert>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                    Вы уверены, что хотите отозвать доверие у устройства <strong style={{ color: '#e2e8f0' }}>{deviceToRevoke?.device_name}</strong>?
                </p>
            </Modal>

            <Modal open={renameModalOpen} onClose={() => !isRenaming && setRenameModalOpen(false)}
                title="Переименование устройства" size="sm"
                footer={<>
                    <Button variant="secondary" onClick={() => setRenameModalOpen(false)} disabled={isRenaming}>Отмена</Button>
                    <Button variant="primary" icon="fa-solid fa-check" onClick={handleRenameConfirm} loading={isRenaming} disabled={!customName.trim()}>Сохранить</Button>
                </>}>
                <Input type="text" label="Название устройства" value={customName}
                    onChange={(e) => setCustomName(e.target.value)} placeholder="Например: Основной ноутбук" autoFocus />
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" id="appendDeviceInfo" checked={appendDeviceInfo}
                        onChange={(e) => setAppendDeviceInfo(e.target.checked)} style={{ cursor: 'pointer' }} />
                    <label htmlFor="appendDeviceInfo" style={{ fontSize: 12, color: '#94a3b8', cursor: 'pointer' }}>
                        Добавить информацию о браузере и модели
                    </label>
                </div>
                {appendDeviceInfo && customName && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                        Итоговое название: {customName} ({deviceToRename?.browser || 'Unknown'}{deviceToRename?.model && deviceToRename.model !== 'Unknown' ? `, ${deviceToRename.model}` : ''})
                    </div>
                )}
            </Modal>

            <Modal open={verifyDeviceModalOpen} onClose={() => !isVerifying && setVerifyDeviceModalOpen(false)}
                title="Подтверждение входа" size="sm"
                footer={<>
                    <Button variant="secondary" onClick={() => setVerifyDeviceModalOpen(false)} disabled={isVerifying}>Отмена</Button>
                    <Button variant="success" icon="fa-solid fa-check" onClick={handleVerifyDeviceCode} loading={isVerifying} disabled={verifyCode.length !== 6}>Подтвердить</Button>
                </>}>
                <Alert variant="info" icon="fa-solid fa-info-circle" style={{ marginBottom: 16 }}>
                    На новом устройстве отображен 6-значный код. Введите его ниже, чтобы авторизовать это устройство.
                </Alert>
                {verifyError && <Alert variant="danger" icon="fa-solid fa-circle-exclamation" style={{ marginBottom: 16 }}>{verifyError}</Alert>}
                <form onSubmit={handleVerifyDeviceCode}>
                    <Input type="text" label="Код подтверждения" value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000" autoFocus
                        style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center', fontFamily: 'monospace' }} />
                </form>
            </Modal>
        </>
    );
}