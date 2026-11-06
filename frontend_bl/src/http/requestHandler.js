import { $authHost, API_PREFIX } from ".";
import { getDeviceId } from "../utils/deviceFingerprint";
import CryptoJS from "crypto-js";

// ====================================================================
// УТИЛИТЫ ДЛЯ ФОРМАТИРОВАНИЯ ВРЕМЕНИ
// ====================================================================
const getNoun = (number, one, two, five) => {
    let n = Math.abs(number);
    n %= 100;
    if (n >= 5 && n <= 20) return five;
    n %= 10;
    if (n === 1) return one;
    if (n >= 2 && n <= 4) return two;
    return five;
};

const formatTimeRemaining = (seconds) => {
    if (!seconds || seconds <= 0) return "некоторое время";

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days} ${getNoun(days, 'день', 'дня', 'дней')}`);
    if (hours > 0) parts.push(`${hours} ${getNoun(hours, 'час', 'часа', 'часов')}`);
    if (minutes > 0) parts.push(`${minutes} ${getNoun(minutes, 'минута', 'минуты', 'минут')}`);

    if (days === 0 && hours === 0 && minutes === 0 && secs > 0) {
        parts.push(`${secs} ${getNoun(secs, 'секунда', 'секунды', 'секунд')}`);
    }

    return parts.join(' ') || "менее минуты";
};

// ====================================================================
// ГЛОБАЛЬНЫЕ ИНСТАНСЫ ДЛЯ СВЯЗИ С UI
// ====================================================================
let toastInstance = null;
let errorModalInstance = null;
let userCheckInstance = null;

export const setToast = (fn) => {
    toastInstance = fn;
};

export const setErrorModal = (fn) => {
    errorModalInstance = fn;
};

export const setUserCheck = (fn) => {
    userCheckInstance = fn;
};

// ====================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ СООБЩЕНИЙ
// ====================================================================
const getErrorTitle = (status, type) => {
    if (status === 401) return 'Требуется авторизация';
    if (status === 403) return 'Доступ запрещён';
    if (status === 404) return 'Не найдено';
    if (status === 422) return 'Ошибка валидации';
    if (status >= 500) return 'Ошибка сервера';
    if (status >= 400) return 'Ошибка запроса';
    return type === 'success' ? 'Успешно' : 'Информация';
};

const getUserFriendlyMessage = (message, status) => {
    if (message && !isTechnicalMessage(message)) {
        return message;
    }
    if (status === 401) return 'Необходимо войти в систему для выполнения этого действия';
    if (status === 403) return 'У вас нет прав для выполнения этого действия';
    if (status === 404) return 'Запрашиваемый ресурс не найден';
    if (status === 422) return 'Проверьте правильность заполнения формы';
    if (status >= 500) return 'Произошла ошибка на сервере. Попробуйте позже';
    if (status >= 400) return 'Не удалось выполнить запрос. Проверьте введённые данные';
    return message || 'Произошла непредвиденная ошибка';
};

const isTechnicalMessage = (message) => {
    const technicalPatterns = [
        /^Error:/i, /^TypeError:/i, /^ReferenceError:/i,
        /stack trace/i, /at Object\./i, /ECONNREFUSED/i, /ETIMEDOUT/i
    ];
    return technicalPatterns.some(pattern => pattern.test(message));
};

const SECRET_KEY_BASE64 = process.env.REACT_APP_BACKEND_SECRET_KEY;
const SECRET_KEY = CryptoJS.enc.Base64.parse(SECRET_KEY_BASE64);

/**
 * Генерация HMAC-SHA256 подписи для доверия к запросу
 */
const generateTrustSignature = (method, url) => {
    const timestamp = Math.floor(Date.now() / 1000);

    let cleanUrl = url ? url.split('?')[0] : '';

    // Гарантируем ведущий слеш
    if (!cleanUrl.startsWith('/')) {
        cleanUrl = '/' + cleanUrl;
    }

    // ИСПОЛЬЗУЕМ ИМПОРТИРОВАННЫЙ API_PREFIX
    // Проверяем, начинается ли URL с "/sys/" или "/api/"
    // API_PREFIX + '/' даст нам "/sys/", что исключает ложное совпадение с "/systemVersions"
    if (!cleanUrl.startsWith(API_PREFIX + '/') && !cleanUrl.startsWith('/api/')) {
        cleanUrl = API_PREFIX + cleanUrl;
    }

    const stringToSign = `${timestamp}|${method.toUpperCase()}|${cleanUrl}`;
    const signature = CryptoJS.HmacSHA256(stringToSign, SECRET_KEY).toString(CryptoJS.enc.Hex);

    return { timestamp: timestamp.toString(), signature };
};

// ====================================================================
// ОСНОВНОЙ ОБРАБОТЧИК ЗАПРОСОВ
// ====================================================================
const handleRequest = async (method, url, options = {}, type = null) => {
    try {
        const { noCache, ...restOptions } = options;

        const { timestamp, signature } = generateTrustSignature(method, url);

        const autoHeaders = {
            'X-Device-ID': getDeviceId(),
            'X-Trust-Timestamp': timestamp.toString(),
            'X-Trust-Signature': signature,
            ...(restOptions.headers || {})
        };

        let response;
        if (type === "logs") {
            throw new Error("Logs host is disabled");
        } else {
            let requestConfig = {};

            if (method === 'get') {
                requestConfig = {
                    headers: autoHeaders,
                    params: restOptions.params || {}
                };

                if (noCache) {
                    requestConfig.headers = {
                        ...requestConfig.headers,
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    };
                    requestConfig.params = { ...requestConfig.params, _t: Date.now() };
                }
            } else {
                requestConfig = {
                    ...restOptions.config,
                    headers: autoHeaders
                };
            }

            if (method === 'get') {
                response = await $authHost.get(url, requestConfig);
            } else if (method === 'post') {
                response = await $authHost.post(url, restOptions.body, requestConfig);
            } else if (method === 'put') {
                response = await $authHost.put(url, restOptions.body, requestConfig);
            } else if (method === 'delete') {
                response = await $authHost.delete(url, requestConfig);
            } else {
                throw new Error("Unsupported method: " + method);
            }
        }

        return response.data;
    } catch (error) {
        const status = error.response?.status;
        const isAdmin = error.response?.data?.error?.isMore;
        const errorData = error?.response?.data?.error;
        const message = errorData?.message || error?.response?.data?.message || error.message || "Неизвестная ошибка";
        const code = errorData?.code;
        const serviceCode = errorData?.serviceCode;

        if (code === 'RATE_LIMIT_EXCEEDED') {
            const retryAfter = errorData?.retryAfter || 60;
            const friendlyTime = formatTimeRemaining(retryAfter);
            const customText = `Повторная попытка будет доступна через ${friendlyTime}.`;

            toastInstance?.({
                title: 'Лимит исчерпан',
                text: customText,
                code: code,
                serviceCode: serviceCode,
                type: 'warning'
            }, 'warning');

            throw error;
        }

        const toastType = status >= 400 ? 'danger' : (status === 401 || status === 403) ? 'warning' : 'info';

        if (status >= 400 && isAdmin && errorModalInstance) {
            const fullErrorData = {
                ...errorData,
                request: {
                    url: error.config?.url || url,
                    method: (error.config?.method || method).toUpperCase(),
                    headers: error.config?.headers || {},
                    query: error.config?.params || {},
                    body: error.config?.data || options?.body || null,
                    response: error.response?.data || null,
                    statusCode: status
                }
            };
            errorModalInstance(fullErrorData);
        } else {
            const toastData = {
                title: getErrorTitle(status, toastType),
                text: getUserFriendlyMessage(message, status),
                code: code,
                serviceCode: serviceCode,
                errors: errorData?.errors || [],
                additionalData: {
                    status: status,
                    timestamp: new Date().toISOString(),
                    url: error.config?.url || url,
                    ...errorData?.additionalData
                },
                type: toastType
            };
            toastInstance?.(toastData, toastType);
        }

        throw error;
    }
};

export default handleRequest;