import { $authHost, /*$host,*/ refreshToken as refreshTokenIndex } from "./index";
import { jwtDecode } from "jwt-decode";
import { getDeviceInfo } from "./utils/deviceInfo";
import CryptoJS from "crypto-js";
import storageHandler from "./utils/storageHandler";
import API_ROUTES from "./apiRoutes";
import handleRequest from "./requestHandler";

export const createUser = async (user_data) => {
    return handleRequest('post', 'adm/user/createUser', {
        body: { login: user_data.login, pass: user_data.pass }
    });
};

// export const editUserSettings = async (user_data) => {
//     const { data } = await $authHost.patch('user/updateUserSettings', {
//         login: user_data.login,
//         preferred_language: user_data.preferred_language,
//         theme_preference: user_data.theme_preference,
//         persona_help_type: user_data.persona_help_type
//     });
//     return data;
// };

// export const getUserSettings = async (user_data) => {
//     if (user_data.login) {
//         const { data } = await $authHost.get('user/getUserSettings?login=' + user_data.login);
//         return data;
//     } else {
//         const { data } = await $authHost.get('user/getUserSettings');
//         return data;
//     }
// };

// export const editUser = async (user_data, edit_type) => {
//     if (edit_type === "editMe") {
//         const { data } = await $authHost.patch('user/userEdit', {
//             login: user_data.login,
//             name: user_data.name,
//             email: user_data.email,
//             phone: user_data.phone,
//             birth_date: user_data.birth_date,
//             gender: user_data.gender_code_name,
//             edit_type: edit_type
//         });
//         return data;
//     } else if (edit_type === "activate") {
//         const { data } = await $authHost.patch('user/userEdit', {
//             id: user_data.id,
//             name: user_data.name,
//             phone: user_data.phone,
//             birth_date: user_data.birth_date,
//             email: user_data.email,
//             gender: user_data.gender_code_name,
//             edit_type: edit_type
//         });
//         return data;
//     } else {
//         // Обычное редактирование (admin)
//         const { data } = await $authHost.patch('user/userEdit', {
//             login: user_data.login,
//             telegram_id: user_data.telegram_id,
//             telegram_login: user_data.telegram_login,
//             name: user_data.name,
//             phone: user_data.phone,
//             birth_date: user_data.birth_date,
//             email: user_data.email,
//             flag: user_data.flag,
//             loyalty_points: user_data.loyalty_points,
//             gender: user_data.gender_code_name,
//             edit_type: edit_type
//         });
//         return data;
//     }
// };

// export const getUserById = async (id) => {
//     const { data } = await $authHost.get(`/user/getUserById?id=${id}`);
//     return data;
// };

const SECRET_KEY_BASE64 = process.env.REACT_APP_BACKEND_SECRET_KEY;
const SECRET_KEY = CryptoJS.enc.Base64.parse(SECRET_KEY_BASE64);

const encryptData = (data) => {
    try {
        const iv = CryptoJS.lib.WordArray.random(16);
        const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY, {
            iv,
            mode: CryptoJS.mode.CBC, // CBC работает в браузере
            padding: CryptoJS.pad.Pkcs7
        });

        return {
            encrypted: encrypted.ciphertext.toString(CryptoJS.enc.Hex),
            iv: iv.toString(CryptoJS.enc.Hex)
        };
    } catch (e) {
        console.error("[ERROR] Encryption failed:", e);
        throw e;
    }
};

// 🔄 5. МОДИФИКАЦИЯ loginServ для поддержки двухэтапного входа
// 🔄 МОДИФИКАЦИЯ loginServ для поддержки двухэтапного входа через handleRequest
export const loginServ = async (login, pass) => {
    const encryptedPass = encryptData({ pass });
    const deviceInfoData = await getDeviceInfo();
    const encryptedDeviceInfo = encryptData(deviceInfoData);

    try {
        const data = await handleRequest('post', 'user/userLogin', {
            body: { login, pass: encryptedPass, deviceInfo: encryptedDeviceInfo }
        });

        // Сценарий 1: Требуется TOTP или Backup код
        if (data.requiresTOTP) {
            return { requiresTOTP: true, tempSessionToken: data.tempSessionToken };
        }

        // Сценарий 2: Требуется дополнительный пароль (для стаффа)
        if (data.requiresSecondaryPassword) {
            return { requiresSecondaryPassword: true, tempSessionToken: data.tempSessionToken };
        }

        if (data.success === false) {
            throw new Error(data.message || "Ошибка авторизации");
        }
        if (!data.accessToken || typeof data.accessToken !== 'string') {
            throw new Error(data.message || "Некорректный ответ сервера: отсутствует accessToken");
        }

        //  ИСПРАВЛЕНО: SameSite: "Lax" (лучше для навигации) и убран secure для http://localhost
        storageHandler.add("tokenAccess", data.accessToken, { method: "cookies", path: "/", secure: false, sameSite: "Lax", expireTime: 1000000 });
        if (data.refreshToken) {
            storageHandler.add("refreshToken", data.refreshToken, { method: "cookies", path: "/", secure: false, sameSite: "Lax", expireTime: 1000000 });
        }
        if (data.sessionId) {
            storageHandler.add("sessionId", data.sessionId);
        }

        //  КРИТИЧЕСКИ ВАЖНО: Дублируем токен в куку с именем, которое ждет Go-бэкенд
        document.cookie = `auth_token=${data.accessToken}; path=/; max-age=1000000; SameSite=Lax`;

        // СОХРАНЯЕМ ПРАВА В LOCALSTORAGE
        if (data.permissions && Array.isArray(data.permissions)) {
            storageHandler.add("user_permissions", data.permissions, { method: "localStorage" });
        }

        const decodedAccessToken = jwtDecode(data.accessToken);

        return {
            ...decodedAccessToken.data,
            must_change_password: data.must_change_password || false
        };
    } catch (e) {
        console.error("❌ Ошибка внутри loginServ:", e);
        throw e;
    }
};


export const getUser = (login) => {
    const url = API_ROUTES.users.getUser({ login });
    return handleRequest('get', url);
};

export const getRoleHistory = (targetUserId, actorUserId, page, limit) => {
    const url = API_ROUTES.users.getRoleHistory({ targetUserId, actorUserId, page, limit });
    return handleRequest('get', url);
};

export const getLoginHistory = (user_id, limit, page) => {
    const url = API_ROUTES.users.getLoginHistory({ user_id, limit, page });
    return handleRequest('get', url);
};

export const changeUserStatus = (login, newStatusCodeName) => {
    const body = { login, newStatusCodeName };
    return handleRequest('post', API_ROUTES.users.changeUserStatus, { body });
};

export const getUserDevices = (user_id = null) => {
    const url = API_ROUTES.users.getUserDevices + (user_id ? `?user_id=${user_id}` : '');
    return handleRequest('get', url);
};

export const deleteDevice = (device_id, currentSessionId) => {
    return handleRequest('post', API_ROUTES.users.deleteDevice, { body: { device_id, currentSessionId } });
};




// export const getTelegramAuthUrl = async () => {
//     const { data } = await $host.get('/telegram/auth-url');
//     return data;
// };

// export const getTelegramConnectUrl = async (login) => {
//     const { data } = await $authHost.get('/telegram/connect-url?login=' + login);
//     return data;
// };

// export const startTelegramContestation = async (incidentId) => {
//     const { data } = await $host.get('/telegram/startContestation?incidentId=' + incidentId);
//     return data;
// };

// export const checkTelegramAuthStatus = async (token) => {
//     const deviceInfo = await getDeviceInfo();

//     const encryptedDeviceInfo = encryptData(deviceInfo);

//     const { data } = await $host.post("/user/status", {
//         token,
//         deviceInfo: encryptedDeviceInfo
//     });
//     storageHandler.add("tokenAccess", data.accessToken, {
//         method: "cookies",
//         path: "/",
//         secure: true,
//         sameSite: "Strict",
//         expireTime: 1000000
//     });
//     storageHandler.add("refreshToken", data.refreshToken, {
//         method: "cookies",
//         path: "/",
//         secure: true,
//         sameSite: "Strict",
//         expireTime: 1000000
//     });
//     storageHandler.add("tokenPartsAccess", data.tokenAccess, {
//         method: "cookies",
//         path: "/",
//         secure: true,
//         sameSite: "Strict",
//         expireTime: 1000000
//     });
//     storageHandler.add("sessionId", data.sessionId)
//     storageHandler.add("test{(dEuq#/5CygKns&*358Auth", true, {
//         method: "cookies",
//         path: "/",
//         secure: true,
//         sameSite: "Strict",
//         expireTime: 1000000
//     });

//     // Декодируем access токен и возвращаем данные (как в других функциях)
//     const decodedAccessToken = jwtDecode(data.accessToken);
//     return decodedAccessToken;
// };

// export const checkTelegramConnectStatus = async (token) => {
//     const { data } = await $authHost.get(`/user/connectStatus?token=${token}`);
//     return data;
// };

// // Получить устройства
// export const getUserDevices = async (user_id = null) => {
//     const { data } = await $authHost.get('/user/devices' + (user_id ? "?user_id=" + user_id : ""));
//     return data;
// };

// // Получить историю входов
// export const getLoginHistory = async (user_id = null, page = 1, limit = 20) => {
//     const { data } = await $authHost.get(`/user/loginHistory?page=${page}&limit=${limit}` + (user_id ? "&user_id=" + user_id : ""));
//     return data;
// };

// // Привязать устройство (пример)
// export const bindDevice = async (deviceInfo) => {
//     const { data } = await $authHost.post('/user/bindDevice', deviceInfo);
//     return data;
// };

// // Удалить устройство
// export const deleteDevice = async (id) => {
//     const { data } = await $authHost.delete(`/user/device/${id}`);
//     return data;
// };

// export const changePasswordServ = async (login, pass, type) => {
//     try {
//         const requestData = {
//             login: login,
//             type: type
//         };

//         if (pass !== "") {
//             requestData.pass = pass;
//         }

//         const { data } = await $authHost.patch('user/editPass', requestData);
//         return data;
//     } catch (error) {
//         // Обработка ошибки, если требуется
//         throw error;
//     }
// }

export const check = async () => {
    try {
        const token = storageHandler.get("tokenAccess", "cookies");
        const storedRefreshToken = storageHandler.get("refreshToken", "cookies");

        if (!token || !storedRefreshToken) {
            return null;
        }

        const decodedToken = jwtDecode(token);
        const tokenExp = decodedToken.exp * 1000;
        const now = Date.now();
        const FIVE_MINUTES = 5 * 60 * 1000;

        if (tokenExp - now < FIVE_MINUTES) {
            return await refreshToken();
        }

        const data = await handleRequest('get', '/user/auth', {
            params: { refreshTokenOld: storedRefreshToken }
        });

        //  ИСПРАВЛЕНО: SameSite: "Lax" и secure: false
        storageHandler.add("tokenAccess", data.accessToken, { method: "cookies", path: "/", secure: false, sameSite: "Lax", expireTime: 1000000 });
        storageHandler.add("refreshToken", data.refreshToken, { method: "cookies", path: "/", secure: false, sameSite: "Lax", expireTime: 1000000 });
        storageHandler.add("sessionId", data.sessionId);

        //  КРИТИЧЕСКИ ВАЖНО: Обновляем куку auth_token при рефреше
        document.cookie = `auth_token=${data.accessToken}; path=/; max-age=1000000; SameSite=Lax`;

        // СОХРАНЯЕМ ПРАВА В LOCALSTORAGE ПРИ ПРОВЕРКЕ
        if (data.permissions && Array.isArray(data.permissions)) {
            storageHandler.add("user_permissions", data.permissions, { method: "localStorage" });
        }

        const decodedAccessToken = jwtDecode(data.accessToken);

        return {
            ...decodedAccessToken.data,
        };
    } catch (err) {
        if (err?.response?.status === 401) {
            try { return await refreshToken(); }
            catch (refreshError) { console.warn('Не удалось обновить токен:', refreshError); }
        }

        // Очищаем токены и права при ошибке
        storageHandler.remove("tokenAccess", { method: "cookies", path: "/" });
        storageHandler.remove("refreshToken", { method: "cookies", path: "/" });
        storageHandler.remove("sessionId");
        storageHandler.remove("user_permissions", { method: "localStorage" }); // 🆕

        console.warn('Auth check failed:', err?.response?.status, err?.message);
        return null;
    }
};


// export const getMeInfo = async (type) => {
//     const { data } = await $authHost.get('user/getMeInfo?type=' + type);
//     return data;
// };

// export const selectUsersTypes = async () => {
//     const data = await $authHost.get('/user/selectUsersTypes')
//     return data.data
// }

// export const selectUsersGenders = async () => {
//     const data = await $authHost.get('/user/selectUsersGenders')
//     return data.data
// }

// export const selectUsersThemes = async () => {
//     const data = await $authHost.get('/user/selectUsersThemes')
//     return data.data
// }

// export const selectUsersLanguages = async () => {
//     const data = await $authHost.get('/user/selectUsersLanguages')
//     return data.data
// }

// export const updateUserStatusAct = async (id, status, blockReason = null) => {
//     const data = await $authHost.post('user/updateUserStatus', {
//         id: id,
//         status: status,
//         block_reason: blockReason
//     })
//     return data
// }

export const fatchUsers = async (limit = 20, page = 1, filter = 'all') => {
    return handleRequest('get', '/user/selectUsers', { params: { limit, page, filter } });
};

// export const getUser = async () => {
//     const users = await $authHost.get('/user/getUser')
//     return users
// }

// export const searchUsersAct = async (str, limit = 10) => {
//     const result = await $authHost.get('/user/searchUsers?str=' + str + '&limit=' + limit)
//     return result
// }

// export const selectUsersStaffAct = async () => {
//     const users = await $authHost.get('/user/selectUsersStaff')
//     return users.data
// }

// export const updateUserProbAct = async (id, prob) => {
//     const data = await $authHost.post('user/updateUserProb', {
//         id: id,
//         prob: prob
//     })
//     return data
// }

// export const addUserIdentity = async (identityText) => {
//     const data = await $authHost.post('user/addUserIdentity', {
//         identityText: identityText
//     })
//     return data
// }

// export const checkUserIdentity = async (identityText) => {
//     const data = await $authHost.post('user/checkUserIdentity', {
//         identityText: identityText
//     })
//     return data
// }

// export const updateUserStatusActChat = async (id, status) => {
//     const data = await $authHost.post('user/updateUserStatusChat', {
//         id: id,
//         status: status
//     })
//     return data
// }


















// Экспортируем функцию refreshToken из index.js для использования в сокетах
export const refreshToken = refreshTokenIndex;

// export const getAllAccesses = async () => {
//     const { data } = await $authHost.get('/user/getAllAccesses');
//     return data;
// };

// // Создать или обновить доступ
// export const setAccess = async (access) => {
//     const { data } = await $authHost.post('/user/setAccess', access);
//     return data;
// };

// // Удалить доступ
// export const deleteAccess = async (id) => {
//     const { data } = await $authHost.post('/user/deleteAccess', { id });
//     return data;
// };

// // Дефолтные доступы по статусу
// export const getDefaultAccessesForStatus = async (statusCodeName) => {
//     const { data } = await $authHost.get(`/user/getDefaultAccessesForStatus?statusCodeName=${statusCodeName}`);
//     return data;
// };

// // Доступы конкретного пользователя
// export const getUserAccesses = async (id) => {
//     const { data } = await $authHost.get(`/user/getUserAccesses?id=${id}`);
//     return data;
// };

// // Назначить доступы пользователю
// export const setUserAccesses = async (id, accesses) => {
//     const { data } = await $authHost.post(`/user/setUserAccesses`, { id, accesses });
//     return data;
// };

// // Управление активными сессиями
// export const getActiveSessions = async (user_id = null) => {
//     const { data } = await $authHost.get('/user/activeSessions' + (user_id ? "?user_id=" + user_id : ""));
//     return data;
// };

// export const logoutFromSession = async (session_id, user_id) => {
//     const { data } = await $authHost.post('/user/logoutSession', { session_id, user_id });
//     return data;
// };

// export const logoutFromAllSessions = async (user_id = null) => {
//     let userId = ''
//     if (user_id)
//         userId = '?user_id=' + user_id
//     const { data } = await $authHost.post('/user/logoutAllSessions' + userId);
//     return data;
// };

// export const logoutFromAllSessionsExceptCurrent = async (current_session_id) => {
//     const { data } = await $authHost.post('/user/logoutAllSessionsExceptCurrent', { current_session_id });
//     return data;
// };

// // Приостановить или разморозить аккаунт пользователя
// export const suspendAccount = async (user_id, suspend, changePassReq = false, reason = "") => {
//     const { data } = await $authHost.post('/user/suspendAccount', {
//         user_id,
//         suspend,
//         changePassReq,
//         reason
//     });
//     return data;
// };

// // Восстановление пароля
// export const forgotPassword = async (email) => {
//     const { data } = await $host.post('/user/forgot-password', { email });
//     return data;
// };

// export const verifyResetToken = async (token) => {
//     const { data } = await $host.post('/user/verify-reset-token', { token });
//     return data;
// };

// export const resetPassword = async (token, newPassword) => {
//     const { data } = await $host.post('/user/reset-password', { token, newPassword });
//     return data;
// };

// // Регистрация нового пользователя
// export const registerUser = async (userData) => {
//     const { data } = await $host.post('/user/register', {
//         ...userData,
//         deviceInfo: userData.deviceInfo || null
//     });
//     return data;
// };

// // Генерация уникального логина
// export const generateLogin = async () => {
//     const { data } = await $host.get('/user/generate-login');
//     return data;
// };

// // Проверка доступности логина
// export const checkLoginAvailability = async (login) => {
//     const { data } = await $host.get(`/user/check-login?login=${encodeURIComponent(login)}`);
//     return data;
// };

// // Проверка доступности email
// export const checkEmailAvailability = async (email) => {
//     const { data } = await $authHost.get(`/user/check-email?email=${encodeURIComponent(email)}`);
//     return data;
// };

// // Получить причины чатов с назначенными пользователями
// export const getChatReasonsWithUsers = async () => {
//     const { data } = await $authHost.get('/user/getChatReasonsWithUsers');
//     return data;
// };

// // Публичный resend подтверждения email (для страницы регистрации)
// export const resendConfirmEmailPublic = async (email) => {
//     const { data } = await $host.post('user-emails/resend-standalone', { email });
//     return data;
// };

// // ============================================
// // НАСТРОЙКИ ФОРМ АВТОРИЗАЦИИ
// // ============================================

// // Получить настройки форм авторизации/регистрации
// export const getFormSettings = async () => {
//     const { data } = await $host.get('/user/form-settings');
//     return data;
// };

export const logoutSession = (session_id, current_session_id, user_id, type) => {
    return handleRequest('post', API_ROUTES.users.logoutSession, {
        body: { session_id, current_session_id, user_id, type }
    });
};

export const activeSessions = (user_id) => {
    return handleRequest('get', API_ROUTES.users.activeSessions({ user_id }));
};




export const getSystemStats = () => {
    return handleRequest('get', API_ROUTES.users.getSystemStats);
};

// 1. Получение информации перед сменой пароля
export const getPasswordChangeInfo = () => {
    return handleRequest('get', API_ROUTES.users.getPasswordChangeInfo);
};

// 2. Смена пароля (себе или админом другому)
export const changePassword = (payload) => {
    // payload: { targetUserId?, oldPassword?, newPassword?, autoGenerate?, reason? }
    return handleRequest('post', API_ROUTES.users.changePassword, { body: payload });
};

// 3. Регенерация доп. пароля (только для DEVELOPER)
export const regenerateSecondaryPassword = (targetUserId) => {
    return handleRequest('post', API_ROUTES.users.regenerateSecondaryPassword, {
        body: { targetUserId }
    });
};

// 4. Подтверждение доп. пароля (второй этап входа)
// 4. Подтверждение доп. пароля (второй этап входа)
export const verifySecondaryPassword = async (payload) => {
    const deviceInfoData = await getDeviceInfo();
    const encryptedDeviceInfo = encryptData(deviceInfoData);

    const data = await handleRequest('post', API_ROUTES.users.verifySecondaryPassword, {
        body: { tempSessionToken: payload.tempSessionToken, secondaryPassword: payload.secondaryPassword, totpOrBackupCode: payload.totpOrBackupCode, deviceInfo: encryptedDeviceInfo }
    });

    if (data.accessToken) {
        //  ИСПРАВЛЕНО: SameSite: "Lax" и secure: false
        storageHandler.add("tokenAccess", data.accessToken, { method: "cookies", path: "/", secure: false, sameSite: "Lax", expireTime: 1000000 });
        storageHandler.add("refreshToken", data.refreshToken, { method: "cookies", path: "/", secure: false, sameSite: "Lax", expireTime: 1000000 });
        if (data.sessionId) storageHandler.add("sessionId", data.sessionId);

        //  КРИТИЧЕСКИ ВАЖНО: Записываем куку после второго этапа
        document.cookie = `auth_token=${data.accessToken}; path=/; max-age=1000000; SameSite=Lax`;

        // СОХРАНЯЕМ ПРАВА ПОСЛЕ УСПЕШНОГО ВТОРОГО ЭТАПА
        if (data.permissions && Array.isArray(data.permissions)) {
            storageHandler.add("user_permissions", data.permissions, { method: "localStorage" });
        }

        const decodedAccessToken = jwtDecode(data.accessToken);
        return {
            ...decodedAccessToken.data,
            must_change_password: data.must_change_password || false
        };
    }
    return data;
};

export const getPasswordHistory = (targetUserId) => {
    return handleRequest('get', `${API_ROUTES.users.getPasswordHistory}?targetUserId=${targetUserId}`);
};


export const getPermissionsDictionary = (statusCode = null) => {
    const url = statusCode ? `/user/permissions/dictionary?statusCode=${statusCode}` : '/user/permissions/dictionary';
    return handleRequest('get', url);
};

export const updateRolePermissions = (statusCode, permissions) => {
    return handleRequest('post', `/user/permissions/role/${statusCode}`, { body: { permissions } });
};

export const getUserOverrides = (userId) => {
    return handleRequest('get', `/user/permissions/user/${userId}`);
};

export const updateUserOverrides = (userId, overrides) => {
    return handleRequest('post', `/user/permissions/user/${userId}`, { body: { overrides } });
};

export const getAllStatuses = () => {
    return handleRequest('get', '/user/getAllStatuses');
};

// История прав доступа
export const getPermissionHistory = (targetUserId, page = 1, limit = 20) => {
    return handleRequest('get', `/user/getPermissionHistory?targetUserId=${targetUserId}&page=${page}&limit=${limit}`);
};

export const setDeviceTrusted = (deviceId, isTrusted, confirmPassword = null) => {
    return handleRequest('post', API_ROUTES.users.setDeviceTrusted, {
        body: { device_id: deviceId, isTrusted, confirmPassword }
    });
};

export const updateDeviceName = (deviceId, customName, appendDeviceInfo = false) => {
    return handleRequest('post', API_ROUTES.users.updateDeviceName, {
        body: { device_id: deviceId, customName, appendDeviceInfo }
    });
};

export const generateSeedPhrase = (password) =>
    handleRequest('post', '/user/generateSeedPhrase', { body: { password } });
export const setupTOTP = () => handleRequest('post', '/user/setupTOTP');
export const verifyTOTP = (token, password) =>
    handleRequest('post', '/user/verifyTOTP', { body: { token, password } });
export const getSecuritySettings = () => handleRequest('get', '/user/getSecuritySettings');

// Проверка статуса кода (вызывается с нового устройства)
export const checkDeviceCodeStatus = async (login, code) => {
    return handleRequest('post', 'user/checkDeviceCodeStatus', {
        body: { login, code }
    });
};

// Вход по сид-фразе
export const loginSeedServ = async (seedPhrase) => {
    const deviceInfoData = await getDeviceInfo();
    const encryptedDeviceInfo = encryptData(deviceInfoData);
    // Сид-фразу можно отправить как есть, или тоже зашифровать, если хочешь максимальной паранойи.
    // Но HTTPS и так защищает. Отправляем как есть для простоты проверки на бэке.

    const data = await handleRequest('post', 'user/loginSeed', {
        body: { seedPhrase, deviceInfo: encryptedDeviceInfo }
    });

    if (data.success === false) {
        throw new Error(data.message || "Ошибка авторизации по сид-фразе");
    }

    // Сохранение токенов (копия логики из loginServ)
    storageHandler.add("tokenAccess", data.accessToken, { method: "cookies", path: "/", secure: false, sameSite: "Lax", expireTime: 1000000 });
    if (data.refreshToken) {
        storageHandler.add("refreshToken", data.refreshToken, { method: "cookies", path: "/", secure: false, sameSite: "Lax", expireTime: 1000000 });
    }
    if (data.sessionId) {
        storageHandler.add("sessionId", data.sessionId);
    }
    document.cookie = `auth_token=${data.accessToken}; path=/; max-age=1000000; SameSite=Lax`;

    if (data.permissions && Array.isArray(data.permissions)) {
        storageHandler.add("user_permissions", data.permissions, { method: "localStorage" });
    }

    const decodedAccessToken = jwtDecode(data.accessToken);
    return {
        ...decodedAccessToken.data,
        must_change_password: data.must_change_password || false
    };
};

// Запрос 6-значного кода для нового устройства
export const requestDeviceCode = async (login) => {
    const deviceInfoData = await getDeviceInfo();
    const encryptedDeviceInfo = encryptData(deviceInfoData);
    return handleRequest('post', 'user/requestDeviceCode', {
        body: { login, deviceInfo: encryptedDeviceInfo }
    });
};

// Подтверждение входа по коду (вызывается с доверенного устройства)
// Подтверждение входа по коду (вызывается с ДОВЕРЕННОГО устройства)
export const verifyDeviceCode = async (login, code) => {
    const deviceInfoData = await getDeviceInfo();
    const encryptedDeviceInfo = encryptData(deviceInfoData);

    const data = await handleRequest('post', 'user/verifyDeviceCode', {
        body: { login, code, deviceInfo: encryptedDeviceInfo }
    });

    // ВАЖНО: НЕ сохраняем токены здесь! Они пойдут на новое устройство
    return data;
};

export const disableSeedPhrase = (password) =>
    handleRequest('post', '/user/disableSeedPhrase', { body: { password } });

export const disableTOTP = (password) =>
    handleRequest('post', '/user/disableTOTP', { body: { password } });

export const generateBackupCodes = (password) =>
    handleRequest('post', '/user/generateBackupCodes', { body: { password } });