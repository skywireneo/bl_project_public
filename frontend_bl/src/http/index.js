// src/http/index.js
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import storageHandler from "./utils/storageHandler";

// ====================================================================
// ЕДИНЫЙ ИСТОЧНИК ИСТИНЫ: Префикс для всех основных API запросов
// ====================================================================
export const API_PREFIX = '/sys';

const $host = axios.create({
    baseURL: process.env.REACT_APP_API_URL + API_PREFIX + '/'
});

const $authHost = axios.create({
    baseURL: process.env.REACT_APP_API_URL + API_PREFIX + '/'
});

const $filesHost = axios.create({
    baseURL: process.env.REACT_APP_API_URL + '/filesAPI/'
});

const authInterceptor = config => {
    config.headers.authorization = `Bearer ${storageHandler.get("tokenAccess", "cookies")}`;
    return config;
};

let updateUserCallback = null;
export const setUpdateUserCallback = (callback) => {
    updateUserCallback = callback;
};

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

const authErrorInterceptor = async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then(token => {
                originalRequest.headers.authorization = `Bearer ${token}`;
                return $authHost(originalRequest);
            }).catch(err => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            const refreshTokenValue = storageHandler.get("refreshToken", "cookies");
            if (!refreshTokenValue) {
                throw new Error('Нет refresh токена');
            }

            const response = await $host.post('/user/refreshToken', {
                refreshToken: refreshTokenValue
            });

            const newAccessToken = response.data.accessToken;
            storageHandler.add("tokenAccess", newAccessToken, {
                method: "cookies", path: "/", secure: true, sameSite: "Strict", expireTime: 1000000
            });
            storageHandler.add("refreshToken", response.data.refreshToken, {
                method: "cookies", path: "/", secure: true, sameSite: "Strict", expireTime: 1000000
            });
            if (response.data.sessionId) {
                storageHandler.add("sessionId", response.data.sessionId);
            }

            if (updateUserCallback) {
                const decodedAccessToken = jwtDecode(newAccessToken);
                const decodedTokenAccess = jwtDecode(response.data.tokenAccess);
                updateUserCallback({
                    ...decodedAccessToken.data,
                    access: decodedTokenAccess.data.access
                });
            }

            processQueue(null, newAccessToken);
            originalRequest.headers.authorization = `Bearer ${newAccessToken}`;
            return $authHost(originalRequest);

        } catch (refreshError) {
            processQueue(refreshError, null);
            storageHandler.remove("tokenAccess", { method: "cookies", path: "/" });
            storageHandler.remove("refreshToken", { method: "cookies", path: "/" });
            storageHandler.remove("sessionId");
            window.location.href = '/login';
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }

    return Promise.reject(error);
};

$authHost.interceptors.request.use(authInterceptor);
$authHost.interceptors.response.use(response => response, authErrorInterceptor);

export const refreshToken = async () => {
    if (isRefreshing) {
        return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
        }).then(async (token) => {
            const decodedAccessToken = jwtDecode(token);
            const tokenAccess = storageHandler.get("tokenPartsAccess", "cookies");
            const decodedTokenAccess = jwtDecode(tokenAccess);
            return { ...decodedAccessToken.data, access: decodedTokenAccess.data.access };
        });
    }

    isRefreshing = true;

    try {
        const refreshTokenValue = storageHandler.get("refreshToken", "cookies");
        if (!refreshTokenValue) {
            throw new Error('Нет refresh токена');
        }

        const { data } = await $host.post('/user/refreshToken', {
            refreshToken: refreshTokenValue
        });
        storageHandler.add("tokenAccess", data.accessToken, {
            method: "cookies", path: "/", secure: true, sameSite: "Strict", expireTime: 1000000
        });
        storageHandler.add("refreshToken", data.refreshToken, {
            method: "cookies", path: "/", secure: true, sameSite: "Strict", expireTime: 1000000
        });
        if (data.sessionId) {
            storageHandler.add("sessionId", data.sessionId);
        }

        const decodedAccessToken = jwtDecode(data.accessToken);
        const decodedTokenAccess = jwtDecode(data.tokenAccess);

        if (updateUserCallback) {
            updateUserCallback({
                ...decodedAccessToken.data,
                access: decodedTokenAccess.data.access
            });
        }

        processQueue(null, data.accessToken);

        return { ...decodedAccessToken.data, access: decodedTokenAccess.data.access };
    } catch (error) {
        console.error('Ошибка обновления токена:', error);
        processQueue(error, null);
        storageHandler.remove("tokenAccess", { method: "cookies", path: "/" });
        storageHandler.remove("refreshToken", { method: "cookies", path: "/" });
        storageHandler.remove("sessionId");
        throw error;
    } finally {
        isRefreshing = false;
    }
};

// Экспортируем API_PREFIX вместе с инстансами
export { $host, $authHost, $filesHost };