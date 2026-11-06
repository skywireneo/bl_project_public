import React, { useContext, useEffect } from "react";
import { Context } from "../..";
import { useAuthLogin } from "../../hooks/useAuthLogin";
import { Card, Button, Modal, Alert, Input } from '../ui/UIComponents';

function LoginModal({ isOpen, onClose, onOpenChangePassword }) {
    const { user } = useContext(Context);

    const {
        login, setLogin,
        pass, setPass,
        secondaryPassword, setSecondaryPassword,
        seedPhrase, setSeedPhrase,
        loginMethod, setLoginMethod,
        generatedDeviceCode, codeExpiresIn,
        error, setError,
        isLoading,
        step,
        handleLogin,
        handleSecondaryLogin,
        handleSeedLogin,
        handleRequestDeviceCode,
        resetFlow,
        requiresTOTP,
        totpOrBackupCode,
        setTotpOrBackupCode
    } = useAuthLogin();

    useEffect(() => {
        if (!isOpen) {
            resetFlow();
        }
    }, [isOpen, resetFlow]);

    if (!isOpen) return null;

    // ==========================================
    // ШАГ: Показ кода для ввода на ДРУГОМ устройстве
    // ==========================================
    if (step === 'device_code_sent') {
        return (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(8px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
                <div onClick={e => e.stopPropagation()} style={{ background: "#1a1d2e", borderRadius: 16, border: "1px solid rgba(139, 92, 246, 0.3)", width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", overflow: "hidden", animation: "fadeInScale 0.2s ease-out" }}>
                    <div style={{ padding: 32, textAlign: "center" }}>
                        <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 20px", background: "rgba(139, 92, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <i className="fa-solid fa-mobile-screen-button" style={{ fontSize: 28, color: "#8b5cf6" }} />
                        </div>
                        <h3 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>Код для входа</h3>
                        <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5, marginBottom: 24 }}>
                            Введите этот код на авторизованном устройстве в разделе <strong style={{ color: '#e2e8f0' }}>Профиль → Безопасность → Устройства → "Подтвердить вход"</strong>.
                        </p>

                        <div style={{ fontSize: 36, fontWeight: 800, color: "#8b5cf6", letterSpacing: 6, marginBottom: 16, fontFamily: "monospace", background: "rgba(0,0,0,0.3)", padding: "16px 0", borderRadius: 12, border: "1px solid rgba(139, 92, 246, 0.2)" }}>
                            {generatedDeviceCode}
                        </div>

                        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
                            Действует: <span style={{ color: "#f59e0b", fontWeight: 700 }}>{codeExpiresIn} сек</span>
                        </p>

                        {/* Индикатор ожидания */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 10, marginBottom: 16 }}>
                            <i className="fa-solid fa-circle-notch fa-spin" style={{ color: "#10b981" }} />
                            <span style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>Ожидание подтверждения...</span>
                        </div>

                        <button
                            onClick={() => { resetFlow(); setError(''); }}
                            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#94a3b8", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "10px 24px", width: "100%" }}
                        >
                            ← Назад к выбору метода
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // ШАГ 1: Выбор метода и ввод данных
    // ==========================================
    if (step === "login") {
        return (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(8px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
                <div onClick={e => e.stopPropagation()} style={{ background: "#1a1d2e", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", overflow: "hidden", animation: "fadeInScale 0.2s ease-out" }}>

                    {/* Заголовок */}
                    <div style={{ padding: "24px 24px 0", textAlign: "center" }}>
                        <div style={{ width: 56, height: 56, borderRadius: 14, margin: "0 auto 16px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <i className="fa-solid fa-shield-halved" style={{ fontSize: 24, color: "#fff" }} />
                        </div>
                        <h3 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>Вход в систему</h3>
                        <p style={{ fontSize: 13, color: "#64748b" }}>Выберите удобный способ входа</p>
                    </div>

                    {/* Табы выбора метода */}
                    <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.1)", marginTop: 20 }}>
                        {[
                            { id: 'password', label: 'Пароль', icon: 'fa-key' },
                            { id: 'seed', label: 'Сид-фраза', icon: 'fa-seedling' },
                            { id: 'device_code', label: 'Код с устр.', icon: 'fa-mobile-screen' }
                        ].map(method => (
                            <button
                                key={method.id}
                                onClick={() => { setLoginMethod(method.id); setError(''); }}
                                style={{
                                    flex: 1, padding: "14px 8px", background: "transparent", border: "none",
                                    color: loginMethod === method.id ? "#8b5cf6" : "#64748b",
                                    borderBottom: loginMethod === method.id ? "2px solid #8b5cf6" : "2px solid transparent",
                                    fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                                    transition: "all 0.2s"
                                }}
                            >
                                <i className={`fa-solid ${method.icon}`} style={{ fontSize: 16 }} />
                                {method.label}
                            </button>
                        ))}
                    </div>

                    {/* Формы ввода */}
                    <div style={{ padding: 24 }}>
                        {error && typeof error === 'string' && (
                            <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                                <i className="fa-solid fa-circle-exclamation" /> {error}
                            </div>
                        )}

                        {/* 1. Форма: Пароль */}
                        {loginMethod === 'password' && (
                            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6, display: "block" }}>Логин</label>
                                    <input type="text" value={login} onChange={e => setLogin(e.target.value)} required autoComplete="username" style={{ width: "100%", padding: "10px 14px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6, display: "block" }}>Пароль</label>
                                    <input type="password" value={pass} onChange={e => setPass(e.target.value)} required autoComplete="current-password" style={{ width: "100%", padding: "10px 14px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                                </div>
                                <button type="submit" disabled={isLoading} style={{ width: "100%", padding: "12px", borderRadius: 10, marginTop: 8, background: isLoading ? "#4f46e5" : "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: isLoading ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                    {isLoading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-right-to-bracket" />}
                                    {isLoading ? "Проверка..." : "Войти"}
                                </button>
                            </form>
                        )}

                        {/* 2. Форма: Сид-фраза */}
                        {loginMethod === 'seed' && (
                            <form onSubmit={handleSeedLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6, display: "block" }}>Сид-фраза (12 слов через пробел)</label>
                                    <textarea
                                        value={seedPhrase}
                                        onChange={e => setSeedPhrase(e.target.value)}
                                        required
                                        rows={3}
                                        placeholder="арбуз барон волна город дерево ель журавль замок икра котёл луна метро"
                                        style={{ width: "100%", padding: "10px 14px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "none", fontFamily: "monospace", lineHeight: 1.5 }}
                                    />
                                </div>
                                <button type="submit" disabled={isLoading} style={{ width: "100%", padding: "12px", borderRadius: 10, marginTop: 8, background: isLoading ? "#4f46e5" : "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: isLoading ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                    {isLoading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-fingerprint" />}
                                    {isLoading ? "Проверка..." : "Войти по сид-фразе"}
                                </button>
                            </form>
                        )}

                        {/* 3. Форма: Код с устройства */}
                        {loginMethod === 'device_code' && (
                            <form onSubmit={handleRequestDeviceCode} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6, display: "block" }}>Ваш логин</label>
                                    <input type="text" value={login} onChange={e => setLogin(e.target.value)} required autoComplete="username" style={{ width: "100%", padding: "10px 14px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                                </div>
                                <button type="submit" disabled={isLoading} style={{ width: "100%", padding: "12px", borderRadius: 10, marginTop: 8, background: isLoading ? "#d97706" : "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: isLoading ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                    {isLoading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-paper-plane" />}
                                    {isLoading ? "Запрос..." : "Получить код"}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Футер */}
                    <div style={{ padding: "0 24px 24px", textAlign: "center" }}>
                        <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>Отмена</button>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // ШАГ 2: Запрос доп. пароля (2FA)
    // ==========================================
    if (step === 'secondary') {
        return (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(8px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
                <div onClick={e => e.stopPropagation()} style={{ background: "#1a1d2e", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", overflow: "hidden", animation: "fadeInScale 0.2s ease-out" }}>
                    <div style={{ padding: 32 }}>
                        {requiresTOTP ? (
                            <>
                                <h3 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 8, textAlign: "center" }}>Двухфакторная аутентификация</h3>
                                <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16, textAlign: "center" }}>
                                    Введите код из приложения или аварийный код
                                </p>
                                {error && (
                                    <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                                        <i className="fa-solid fa-circle-exclamation" /> {error}
                                    </div>
                                )}
                                <Input
                                    label="Код TOTP или аварийный код"
                                    value={totpOrBackupCode}
                                    onChange={e => setTotpOrBackupCode(e.target.value)}
                                    placeholder="123456"
                                    maxLength={6}
                                />
                                <Button onClick={handleSecondaryLogin} loading={isLoading} fullWidth style={{ marginTop: 16 }}>
                                    Подтвердить
                                </Button>
                            </>
                        ) : (
                            <>
                                <h3 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 8, textAlign: "center" }}>Админский код</h3>
                                <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16, textAlign: "center" }}>
                                    Введите дополнительный пароль
                                </p>
                                {error && (
                                    <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                                        <i className="fa-solid fa-circle-exclamation" /> {error}
                                    </div>
                                )}
                                <Input
                                    label="Дополнительный пароль"
                                    value={secondaryPassword}
                                    onChange={e => setSecondaryPassword(e.target.value)}
                                    type="password"
                                />
                                <Button onClick={handleSecondaryLogin} loading={isLoading} fullWidth style={{ marginTop: 16 }}>
                                    Подтвердить
                                </Button>
                            </>
                        )}
                        <button
                            onClick={() => { resetFlow(); }}
                            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#94a3b8", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "10px 24px", width: "100%", marginTop: 16 }}
                        >
                            ← Назад
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // ШАГ 3: Требуется смена пароля
    // ==========================================
    if (step === "mustChange") {
        return (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(8px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                <div style={{ background: "#1a1d2e", borderRadius: 16, border: "1px solid rgba(239, 68, 68, 0.3)", width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", overflow: "hidden", animation: "fadeInScale 0.2s ease-out", textAlign: "center", padding: 32 }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 20px", background: "rgba(239, 68, 68, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 28, color: "#ef4444" }} />
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>Требуется смена пароля</h3>
                    <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6, marginBottom: 24 }}>
                        Ваш пароль был изменен администратором или истек срок его действия. Для продолжения работы необходимо установить новый пароль.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <button onClick={() => { onClose(); if (onOpenChangePassword) onOpenChangePassword(); }} style={{ width: "100%", padding: "12px", borderRadius: 10, background: "linear-gradient(135deg, #ef4444, #dc2626)", border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <i className="fa-solid fa-key" /> Перейти к смене пароля
                        </button>
                        <button onClick={onClose} style={{ width: "100%", padding: "12px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                            Закрыть
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

export default LoginModal;