// src/http/utils/telemetry.js
import CryptoJS from "crypto-js";
import { getDeviceInfo } from "./deviceInfo"; // Импортируем нашу мощную функцию определения устройства

const SECRET_KEY_BASE64 = process.env.REACT_APP_BACKEND_SECRET_KEY;
const SECRET_KEY = CryptoJS.enc.Base64.parse(SECRET_KEY_BASE64);

const encryptData = (data) => {
    try {
        const iv = CryptoJS.lib.WordArray.random(16);
        const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY, {
            iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        return {
            encrypted: encrypted.ciphertext.toString(CryptoJS.enc.Hex),
            iv: iv.toString(CryptoJS.enc.Hex)
        };
    } catch (e) {
        console.error("[Telemetry] Encryption failed:", e);
        return null;
    }
};

// Делаем функцию async, чтобы корректно получить данные от getDeviceInfo
export const collectActionStats = async (module, action) => {
    try {
        // 1. Получаем максимально точные данные об устройстве
        const deviceInfo = await getDeviceInfo();

        // 2. Получаем тип соединения (4g, wifi и т.д.)
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

        // 3. Формируем объект статистики на основе проверенных данных
        const statsData = {
            module,
            action,
            timestamp: new Date().toISOString(),
            os: deviceInfo.os,
            browser: deviceInfo.browser,
            browserVersion: deviceInfo.browserVersion,
            deviceType: deviceInfo.isMobile ? 'mobile' : 'desktop',
            screenResolution: `${deviceInfo.screen.width}x${deviceInfo.screen.height}`,
            connectionType: connection?.effectiveType || 'unknown',
            language: deviceInfo.language,
            timezone: deviceInfo.timezone
        };

        const encrypted = encryptData(statsData);
        return encrypted ? { stats_info: encrypted } : {};
    } catch (e) {
        console.error("[Telemetry] Collection failed:", e);
        return {};
    }
};