import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Modal, Alert, Input } from '../../../ui/UIComponents';
import {
    generateSeedPhrase, setupTOTP, verifyTOTP, getSecuritySettings,
    disableSeedPhrase, disableTOTP, generateBackupCodes
} from '../../../../http/userAPI';
import { QRCodeSVG } from 'qrcode.react';

const WidgetCard = ({ icon, color, title, description, enabled, actions }) => (
    <div style={{
        padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 12,
        border: `1px solid ${enabled ? `${color}30` : 'rgba(255,255,255,0.05)'}`,
        display: 'flex', flexDirection: 'column', gap: 12,
        transition: 'all 0.2s'
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <i className={`fa-solid ${icon}`} style={{ color, fontSize: 16 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{title}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{description}</div>
            </div>
            <Badge variant={enabled ? 'success' : 'neutral'} style={{ fontSize: 9, padding: '2px 6px' }}>
                {enabled ? 'Вкл' : 'Выкл'}
            </Badge>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {actions}
        </div>
    </div>
);

export default function SecuritySettings() {
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const [seedModalOpen, setSeedModalOpen] = useState(false);
    const [seedData, setSeedData] = useState(null);
    const [totpModalOpen, setTotpModalOpen] = useState(false);
    const [totpUri, setTotpUri] = useState('');
    const [totpVerifyCode, setTotpVerifyCode] = useState('');
    const [confirmDisableSeed, setConfirmDisableSeed] = useState(false);
    const [confirmDisableTotp, setConfirmDisableTotp] = useState(false);
    const [backupModalOpen, setBackupModalOpen] = useState(false);
    const [generatedBackupCodes, setGeneratedBackupCodes] = useState([]);
    const [confirmRegenerate, setConfirmRegenerate] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => { loadSettings(); }, []);

    const loadSettings = async () => {
        try { const data = await getSecuritySettings(); setSettings(data); }
        catch (err) { console.error(err); }
    };

    const requestAction = (action) => { setConfirmAction(action); setConfirmPassword(''); };

    const executeConfirmedAction = async () => {
        if (!confirmPassword) { alert('Введите пароль для подтверждения'); return; }
        setIsLoading(true);
        try {
            if (confirmAction === 'generateSeed') {
                const data = await generateSeedPhrase(confirmPassword);
                setSeedData(data); setSeedModalOpen(true);
            } else if (confirmAction === 'disableSeed') {
                await disableSeedPhrase(confirmPassword); setConfirmDisableSeed(false);
            } else if (confirmAction === 'verifyTOTP') {
                await verifyTOTP(totpVerifyCode, confirmPassword);
                setTotpModalOpen(false); setTotpVerifyCode('');
            } else if (confirmAction === 'disableTOTP') {
                await disableTOTP(confirmPassword); setConfirmDisableTotp(false);
            }
            setConfirmAction(null); setConfirmPassword(''); loadSettings();
        } catch (err) {
            alert(err?.response?.data?.message || 'Ошибка выполнения действия. Проверьте пароль.');
        } finally { setIsLoading(false); }
    };

    const handleSetupTOTP = async () => {
        setIsLoading(true);
        try { const data = await setupTOTP(); setTotpUri(data.otpUri); setTotpModalOpen(true); }
        catch (err) { alert(err?.response?.data?.message || 'Ошибка настройки TOTP'); }
        finally { setIsLoading(false); }
    };

    const handleGenerateBackupCodes = async () => {
        if (!confirmPassword) { alert('Введите пароль для подтверждения'); return; }
        setIsLoading(true);
        try {
            const data = await generateBackupCodes(confirmPassword);
            setGeneratedBackupCodes(data.codes); setBackupModalOpen(true);
            setConfirmPassword(''); loadSettings();
        } catch (err) { alert(err?.response?.data?.message || 'Ошибка генерации'); }
        finally { setIsLoading(false); }
    };

    const handleCopyAllBackupCodes = async () => {
        const text = generatedBackupCodes.join('\n');
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
        catch (e) {
            const textarea = document.createElement('textarea');
            textarea.value = text; document.body.appendChild(textarea);
            textarea.select(); document.execCommand('copy');
            document.body.removeChild(textarea); setCopied(true); setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleCopy = async () => {
        if (!seedData?.mnemonic) return;
        try { await navigator.clipboard.writeText(seedData.mnemonic); setCopied(true); setTimeout(() => setCopied(false), 2000); }
        catch (err) {
            const textarea = document.createElement('textarea');
            textarea.value = seedData.mnemonic; textarea.style.position = 'fixed'; textarea.style.opacity = '0';
            document.body.appendChild(textarea); textarea.select(); document.execCommand('copy');
            document.body.removeChild(textarea); setCopied(true); setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!settings) return <div style={{ padding: 24, color: '#94a3b8' }}>Загрузка настроек...</div>;

    return (
        <>
            <Card>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fa-solid fa-shield-halved" style={{ color: '#10b981' }} />
                    Настройки безопасности
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    <WidgetCard
                        icon="fa-seedling" color="#10b981"
                        title="Сид-фраза (12 слов)"
                        description={settings.has_seed ? 'Активна' : 'Не активна'}
                        enabled={settings.has_seed}
                        actions={settings.has_seed ? (
                            <>
                                <Button variant="secondary" size="sm" onClick={() => requestAction('generateSeed')} loading={isLoading}>
                                    <i className="fa-solid fa-arrows-rotate" style={{ marginRight: 6 }} /> Обновить
                                </Button>
                                <Button variant="danger" size="sm" onClick={() => setConfirmDisableSeed(true)}>
                                    <i className="fa-solid fa-trash" style={{ marginRight: 6 }} /> Отключить
                                </Button>
                            </>
                        ) : (
                            <Button variant="primary" size="sm" onClick={() => requestAction('generateSeed')} loading={isLoading}>
                                Сгенерировать
                            </Button>
                        )}
                    />

                    <WidgetCard
                        icon="fa-mobile-screen" color="#3b82f6"
                        title="2FA Аутентификатор (TOTP)"
                        description={settings.totp_enabled ? 'Включен' : 'Выключен'}
                        enabled={settings.totp_enabled}
                        actions={settings.totp_enabled ? (
                            <>
                                <Button variant="secondary" size="sm" onClick={handleSetupTOTP} loading={isLoading}>
                                    <i className="fa-solid fa-arrows-rotate" style={{ marginRight: 6 }} /> Обновить
                                </Button>
                                <Button variant="danger" size="sm" onClick={() => setConfirmDisableTotp(true)}>
                                    <i className="fa-solid fa-trash" style={{ marginRight: 6 }} /> Отключить
                                </Button>
                            </>
                        ) : (
                            <Button variant="secondary" size="sm" onClick={handleSetupTOTP} loading={isLoading}>
                                Настроить
                            </Button>
                        )}
                    />

                    {settings.totp_enabled && (
                        <WidgetCard
                            icon="fa-key" color="#f59e0b"
                            title="Аварийные коды"
                            description={settings.backup_codes_total > 0
                                ? `Осталось: ${settings.backup_codes_remaining} из ${settings.backup_codes_total}`
                                : 'Не сгенерированы'}
                            enabled={settings.backup_codes_remaining > 0}
                            actions={settings.backup_codes_total > 0 ? (
                                <Button variant="secondary" size="sm" onClick={() => setConfirmRegenerate(true)} loading={isLoading}>
                                    <i className="fa-solid fa-arrows-rotate" style={{ marginRight: 6 }} /> Регенерировать
                                </Button>
                            ) : (
                                <Button variant="primary" size="sm" onClick={() => setBackupModalOpen(true)} loading={isLoading}>
                                    <i className="fa-solid fa-key" style={{ marginRight: 6 }} /> Сгенерировать
                                </Button>
                            )}
                        />
                    )}
                </div>
            </Card>

            {/* Модалка показа сид-фразы */}
            {seedModalOpen && seedData && (
                <Modal open={true} onClose={() => setSeedModalOpen(false)} title="Ваша новая сид-фраза" size="md">
                    <Alert variant="danger" icon="fa-solid fa-triangle-exclamation" style={{ marginBottom: 16 }}>
                        <strong>ВНИМАНИЕ!</strong> Старая сид-фраза больше не действительна. Запишите эти 12 слов на бумагу.
                    </Alert>
                    <div style={{
                        background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.1)', fontSize: 16, fontWeight: 600,
                        color: '#fbbf24', textAlign: 'center', letterSpacing: 1, wordBreak: 'break-word'
                    }}>
                        {seedData.mnemonic}
                    </div>
                    <Button variant={copied ? "success" : "secondary"} onClick={handleCopy} fullWidth
                        style={{ marginTop: 12, justifyContent: 'center', transition: 'all 0.3s ease' }}>
                        <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} style={{ marginRight: 6 }} />
                        {copied ? 'Скопировано!' : 'Скопировать фразу'}
                    </Button>
                    <Button variant="primary" onClick={() => setSeedModalOpen(false)} fullWidth style={{ marginTop: 12, justifyContent: 'center' }}>
                        Я сохранил фразу
                    </Button>
                </Modal>
            )}

            {/* Модалка настройки TOTP */}
            {totpModalOpen && totpUri && (
                <Modal open={true} onClose={() => { setTotpModalOpen(false); setTotpVerifyCode(''); }} title="Обновление аутентификатора" size="sm">
                    <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
                        Отсканируйте QR-код в приложении-аутентификаторе.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, background: '#fff', padding: 16, borderRadius: 8 }}>
                        <QRCodeSVG value={totpUri} size={180} />
                    </div>
                    <Input label="Код из приложения" value={totpVerifyCode} onChange={e => setTotpVerifyCode(e.target.value)} placeholder="123456" maxLength={6} />
                    <Button variant="success" onClick={() => requestAction('verifyTOTP')} fullWidth style={{ marginTop: 16, justifyContent: 'center' }}>
                        Подтвердить и сохранить
                    </Button>
                </Modal>
            )}

            {/* Модалка предупреждения: отключение Сид-фразы */}
            {confirmDisableSeed && (
                <Modal open={true} onClose={() => setConfirmDisableSeed(false)} title="Отключить сид-фразу?" size="sm">
                    <Alert variant="danger" icon="fa-solid fa-triangle-exclamation" style={{ marginBottom: 16 }}>
                        <strong>КРИТИЧЕСКИ ВАЖНО!</strong> Сид-фраза будет <u>безвозвратно удалена</u> с сервера.
                    </Alert>
                    <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                        <Button variant="secondary" onClick={() => setConfirmDisableSeed(false)} fullWidth>Отмена</Button>
                        <Button variant="danger" onClick={() => requestAction('disableSeed')} fullWidth style={{ background: '#ef4444' }}>
                            Да, удалить навсегда
                        </Button>
                    </div>
                </Modal>
            )}

            {/* Модалка предупреждения: отключение TOTP */}
            {confirmDisableTotp && (
                <Modal open={true} onClose={() => setConfirmDisableTotp(false)} title="Отключить аутентификатор?" size="sm">
                    <p style={{ fontSize: 14, color: '#e2e8f0', marginBottom: 16 }}>
                        Секретный ключ TOTP будет удален. При следующем входе система не будет запрашивать код.
                    </p>
                    <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                        <Button variant="secondary" onClick={() => setConfirmDisableTotp(false)} fullWidth>Отмена</Button>
                        <Button variant="danger" onClick={() => requestAction('disableTOTP')} fullWidth style={{ background: '#ef4444' }}>
                            Отключить
                        </Button>
                    </div>
                </Modal>
            )}

            {/* Модалка: Генерация аварийных кодов */}
            {(backupModalOpen || confirmRegenerate) && generatedBackupCodes.length === 0 && (
                <Modal open={true} onClose={() => { setBackupModalOpen(false); setConfirmRegenerate(false); setConfirmPassword(''); }}
                    title="Генерация аварийных кодов" size="sm">
                    <Alert variant="warning" icon="fa-solid fa-triangle-exclamation" style={{ marginBottom: 16 }}>
                        {confirmRegenerate ? 'Все неиспользованные коды будут удалены!' : 'Для генерации кодов введите ваш пароль'}
                    </Alert>
                    <Input label="Пароль" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Ваш пароль" />
                    <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                        <Button variant="secondary" onClick={() => { setConfirmRegenerate(false); setConfirmPassword(''); }} fullWidth>Отмена</Button>
                        <Button variant="primary" onClick={handleGenerateBackupCodes} loading={isLoading} fullWidth style={{ background: '#6366f1' }}>
                            {confirmRegenerate ? 'Регенерировать' : 'Сгенерировать коды'}
                        </Button>
                    </div>
                </Modal>
            )}

            {/* Модалка: Показ сгенерированных аварийных кодов */}
            {backupModalOpen && generatedBackupCodes.length > 0 && (
                <Modal open={true} onClose={() => { setBackupModalOpen(false); setGeneratedBackupCodes([]); }}
                    title="Ваши аварийные коды" size="md">
                    <Alert variant="danger" icon="fa-solid fa-triangle-exclamation" style={{ marginBottom: 16 }}>
                        <strong>ВНИМАНИЕ!</strong> Сохраните эти коды в надёжном месте. Они показываются <u>только один раз</u>.
                    </Alert>
                    <div style={{
                        background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.1)',
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8
                    }}>
                        {generatedBackupCodes.map((code, idx) => (
                            <div key={idx} style={{
                                fontSize: 16, fontWeight: 600, color: '#fbbf24',
                                textAlign: 'center', padding: 8,
                                background: 'rgba(251, 191, 36, 0.08)',
                                borderRadius: 6, letterSpacing: 2, fontFamily: 'monospace'
                            }}>
                                {code}
                            </div>
                        ))}
                    </div>
                    <Button variant={copied ? "success" : "secondary"} onClick={handleCopyAllBackupCodes} fullWidth
                        style={{ marginTop: 12, justifyContent: 'center' }}>
                        <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} style={{ marginRight: 6 }} />
                        {copied ? 'Скопировано!' : 'Скопировать все коды'}
                    </Button>
                    <Button variant="primary" onClick={() => { setBackupModalOpen(false); setGeneratedBackupCodes([]); }}
                        fullWidth style={{ marginTop: 12, justifyContent: 'center' }}>
                        Я сохранил коды
                    </Button>
                </Modal>
            )}

            {/* Универсальная модалка подтверждения паролем */}
            {confirmAction && (
                <Modal open={true} onClose={() => { setConfirmAction(null); setConfirmPassword(''); }}
                    title="Подтверждение действия" size="sm">
                    <Alert variant="warning" icon="fa-solid fa-shield-halved" style={{ marginBottom: 16 }}>
                        Для {confirmAction === 'generateSeed' ? 'генерации новой сид-фразы' :
                            confirmAction === 'disableSeed' ? 'безвозвратного удаления сид-фразы' :
                                confirmAction === 'verifyTOTP' ? 'включения двухфакторной аутентификации' :
                                    'отключения двухфакторной аутентификации'}
                        введите ваш текущий пароль.
                    </Alert>
                    <Input label="Ваш пароль" type="password" value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)} placeholder="Введите пароль" autoFocus />
                    <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                        <Button variant="secondary" onClick={() => { setConfirmAction(null); setConfirmPassword(''); }} fullWidth>Отмена</Button>
                        <Button variant="primary" onClick={executeConfirmedAction} loading={isLoading} fullWidth style={{ background: '#6366f1' }}>
                            Подтвердить
                        </Button>
                    </div>
                </Modal>
            )}
        </>
    );
}