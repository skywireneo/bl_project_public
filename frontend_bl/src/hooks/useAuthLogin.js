import { useState, useEffect, useContext, useRef } from 'react';
import {
    loginServ,
    verifySecondaryPassword,
    loginSeedServ,        // Новый метод для сид-фразы
    requestDeviceCode,    // Запрос кода для нового устройства
    verifyDeviceCode, // Подтверждение входа по коду
    checkDeviceCodeStatus
} from '../http/userAPI';
import storageHandler from '../http/utils/storageHandler';
import { Context } from '..';

export const useAuthLogin = () => {
    // --- Существующие состояния ---
    const [login, setLogin] = useState('');
    const [pass, setPass] = useState('');
    const [secondaryPassword, setSecondaryPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState('login'); // 'login' | 'secondary' | 'mustChange' | 'device_code_sent'
    const [tempSessionToken, setTempSessionToken] = useState(null);

    // --- Новые состояния для расширенных методов ---
    const [loginMethod, setLoginMethod] = useState('password'); // 'password' | 'seed' | 'device_code'
    const [seedPhrase, setSeedPhrase] = useState('');
    const [generatedDeviceCode, setGeneratedDeviceCode] = useState('');
    const [codeExpiresIn, setCodeExpiresIn] = useState(120);

    // --- Новые состояния для TOTP и Backup кодов ---
    const [requiresTOTP, setRequiresTOTP] = useState(false);
    const [totpOrBackupCode, setTotpOrBackupCode] = useState('');
    const [backupCodesRemaining, setBackupCodesRemaining] = useState(null);


    const timerRef = useRef(null);
    const pollingRef = useRef(null);
    const { user } = useContext(Context);

    // Очистка таймера при размонтировании
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (pollingRef.current) clearInterval(pollingRef.current); // 🆕
        };
    }, []);

    // Запуск таймера, когда показан код устройства
    useEffect(() => {
        if (step === 'device_code_sent' && codeExpiresIn > 0) {
            timerRef.current = setInterval(() => {
                setCodeExpiresIn((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        clearInterval(pollingRef.current); // 🆕
                        setError('Время действия кода истекло. Запросите новый.');
                        setStep('login');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [step, codeExpiresIn]);

    useEffect(() => {
        if (step === 'device_code_sent' && generatedDeviceCode && login) {
            // Запускаем polling
            pollingRef.current = setInterval(async () => {
                try {
                    const result = await checkDeviceCodeStatus(login.trim(), generatedDeviceCode);

                    if (result.status === 'confirmed') {
                        // Код подтверждён! Останавливаем polling
                        clearInterval(pollingRef.current);
                        clearInterval(timerRef.current);

                        // Сохраняем токены (пришли с сервера)
                        storageHandler.add("tokenAccess", result.accessToken, { method: "cookies", path: "/", secure: false, sameSite: "Lax", expireTime: 1000000 });
                        storageHandler.add("refreshToken", result.refreshToken, { method: "cookies", path: "/", secure: false, sameSite: "Lax", expireTime: 1000000 });
                        if (result.sessionId) storageHandler.add("sessionId", result.sessionId);
                        document.cookie = `auth_token=${result.accessToken}; path=/; max-age=1000000; SameSite=Lax`;

                        if (result.permissions && Array.isArray(result.permissions)) {
                            storageHandler.add("user_permissions", result.permissions, { method: "localStorage" });
                        }

                        // Редирект
                        const redirectUrl = window.location.pathname === '/login' ? '/' : window.location.pathname;
                        storageHandler.remove('redirect_after_login');
                        window.location.href = redirectUrl;
                    } else if (result.status === 'expired') {
                        clearInterval(pollingRef.current);
                        clearInterval(timerRef.current);
                        setError('Код истёк. Запросите новый.');
                        setStep('login');
                    }
                    // Если status === 'pending' — просто продолжаем polling
                } catch (err) {
                    console.error('Ошибка polling:', err);
                    // Не останавливаем polling при сетевых ошибках
                }
            }, 2000); // Каждые 2 секунды
        }

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [step, generatedDeviceCode, login]);

    const resetFlow = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (pollingRef.current) clearInterval(pollingRef.current); // 🆕
        setStep('login');
        setLoginMethod('password');
        setTempSessionToken(null);
        setSecondaryPassword('');
        setError('');
        setLogin('');
        setPass('');
        setSeedPhrase('');
        setGeneratedDeviceCode('');
        setCodeExpiresIn(120); // 🆕
    };

    // ==========================================
    // 1. Вход по Сид-фразе
    // ==========================================
    const handleSeedLogin = async (e) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const currentPath = window.location.pathname;
            storageHandler.add('redirect_after_login', currentPath);

            // Вызываем новый метод API
            const result = await loginSeedServ(seedPhrase.trim());

            if (result.must_change_password) {
                user.setUser(result);
                user.setIsAuth(true);
                setStep('mustChange');
                setIsLoading(false);
                return;
            }

            user.setUser(result);
            user.setIsAuth(true);

            const redirectUrl = currentPath === '/login' ? '/' : currentPath;
            storageHandler.remove('redirect_after_login');
            window.location.href = redirectUrl;

        } catch (err) {
            console.error('Ошибка входа по сид-фразе:', err);
            setError(err?.response?.data?.message || err?.message || 'Неверная сид-фраза');
            setIsLoading(false);
        }
    };

    // ==========================================
    // 2. Запрос кода для входа с другого устройства
    // ==========================================
    const handleRequestDeviceCode = async (e) => {
        if (e) e.preventDefault();
        if (!login.trim()) {
            setError('Введите логин');
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            const result = await requestDeviceCode(login.trim());
            setGeneratedDeviceCode(result.code);
            setCodeExpiresIn(result.expiresIn);
            setStep('device_code_sent');
        } catch (err) {
            console.error('Ошибка запроса кода:', err);
            setError(err?.response?.data?.message || err?.message || 'Не удалось запросить код');
        } finally {
            setIsLoading(false);
        }
    };

    // ==========================================
    // 3. Подтверждение входа по коду устройства (вызывается с ДРУГОГО, доверенного устройства)
    // ==========================================
    const handleVerifyDeviceCode = async (codeToVerify) => {
        setIsLoading(true);
        setError('');
        try {
            const result = await verifyDeviceCode(login.trim(), codeToVerify);

            if (result.must_change_password) {
                user.setUser(result);
                user.setIsAuth(true);
                setStep('mustChange');
                setIsLoading(false);
                return;
            }

            user.setUser(result);
            user.setIsAuth(true);

            const redirectUrl = window.location.pathname === '/login' ? '/' : window.location.pathname;
            storageHandler.remove('redirect_after_login');
            window.location.href = redirectUrl;

        } catch (err) {
            console.error('Ошибка подтверждения кода:', err);
            setError(err?.response?.data?.message || err?.message || 'Неверный или истекший код');
            setIsLoading(false);
        }
    };

    // ==========================================
    // 4. Обычный вход (Пароль) - с поддержкой твоего текущего 2FA
    // ==========================================
    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const currentPath = window.location.pathname;
            storageHandler.add('redirect_after_login', currentPath);
            const result = await loginServ(login, pass);

            // Сценарий А1: Требуется TOTP (или backup code)
            if (result.requiresTOTP) {
                setTempSessionToken(result.tempSessionToken);
                setRequiresTOTP(true);
                setStep('secondary'); // переиспользуем шаг secondary
                setIsLoading(false);
                return;
            }

            // Сценарий А2: Требуется админский код
            if (result.requiresSecondaryPassword) {
                setTempSessionToken(result.tempSessionToken);
                setRequiresTOTP(false);
                setStep('secondary');
                setIsLoading(false);
                return;
            }


            // Сценарий Б: Требуется смена пароля
            if (result.must_change_password) {
                user.setUser(result);
                user.setIsAuth(true);
                setStep('mustChange');
                setIsLoading(false);
                return;
            }

            // Сценарий В: Успешный обычный вход
            user.setUser(result);
            user.setIsAuth(true);

            const redirectUrl = currentPath === '/login' ? '/' : currentPath;
            storageHandler.remove('redirect_after_login');
            window.location.href = redirectUrl;

        } catch (err) {
            console.error('Ошибка авторизации:', err);
            let errorMessage = 'Ошибка авторизации. Проверьте логин и пароль.';

            if (err?.response?.data?.message) errorMessage = String(err.response.data.message);
            else if (err?.response?.data?.error?.message) errorMessage = String(err.response.data.error.message);
            else if (err?.message) errorMessage = String(err.message);

            setError(errorMessage);
            setIsLoading(false);
        }
    };

    // ==========================================
    // 5. Обработка ввода дополнительного пароля (Шаг 2) - без изменений
    // ==========================================
    const handleSecondaryLogin = async (e) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            // Формируем payload в зависимости от типа 2FA
            const payload = { tempSessionToken };
            if (requiresTOTP) {
                payload.totpOrBackupCode = totpOrBackupCode;
            } else {
                payload.secondaryPassword = secondaryPassword;
            }

            console.log(payload)

            const result = await verifySecondaryPassword(payload);

            // Если использован backup code, можно показать уведомление
            if (typeof result.backupCodesRemaining === 'number') {
                // Опционально: можно сохранить это в стейт или показать alert
                console.log(`Осталось аварийных кодов: ${result.backupCodesRemaining}`);
                if (result.backupCodesRemaining === 0) {
                    alert('Все аварийные коды использованы! Зайдите в настройки безопасности и сгенерируйте новые.');
                }
            }

            if (result.must_change_password) {
                user.setUser(result);
                user.setIsAuth(true);
                setStep('mustChange');
                setIsLoading(false);
                return;
            }

            user.setUser(result);
            user.setIsAuth(true);
            const redirectUrl = window.location.pathname === '/login' ? '/' : window.location.pathname;
            storageHandler.remove('redirect_after_login');
            window.location.href = redirectUrl;
        } catch (err) {
            console.error('Ошибка второго фактора:', err);
            setError(err?.response?.data?.message || err?.message || 'Неверный код');
            setIsLoading(false);
        }
    };

    return {
        login, setLogin,
        pass, setPass,
        secondaryPassword, setSecondaryPassword,
        seedPhrase, setSeedPhrase,
        generatedDeviceCode,
        codeExpiresIn,
        loginMethod, setLoginMethod,
        error, setError,
        isLoading,
        step, setStep,
        handleLogin,
        handleSecondaryLogin,
        handleSeedLogin,
        handleRequestDeviceCode,
        resetFlow,
        requiresTOTP,
        totpOrBackupCode,
        setTotpOrBackupCode,
        backupCodesRemaining
    };
};