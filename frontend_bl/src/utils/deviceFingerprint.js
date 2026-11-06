/**
 * Генерация уникального идентификатора устройства
 * Комбинация: UUID (localStorage) + Browser Fingerprint
 */

/**
 * Генерация UUID v4
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Получение или создание Device ID из localStorage
 */
function getOrCreateDeviceId() {
    const STORAGE_KEY = 'sb_device_id';
    let deviceId = localStorage.getItem(STORAGE_KEY);

    if (!deviceId) {
        deviceId = generateUUID();
        localStorage.setItem(STORAGE_KEY, deviceId);
    }

    return deviceId;
}

/**
 * Простой browser fingerprint (без тяжёлых Canvas/WebGL)
 */
function getBrowserFingerprint() {
    //  Используем window.screen вместо screen
    const screenInfo = window.screen || {};

    const components = [
        navigator.userAgent,
        navigator.language,
        screenInfo.colorDepth || 0,
        `${screenInfo.width || 0}x${screenInfo.height || 0}`,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 0,
        navigator.maxTouchPoints || 0,
        navigator.platform || ''
    ];

    // Простой хэш через сложение кодов символов
    const str = components.join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(36);
}

/**
 * Генерация финального Device ID
 * Формат: {uuid}_{fingerprint_hash}
 * 
 * Это гарантирует:
 * - Уникальность для устройства (UUID)
 * - Привязку к браузеру (fingerprint)
 * - Если пользователь почистит localStorage - UUID новый, но fingerprint тот же
 * - Если поменяет браузер - fingerprint новый, но UUID тот же (в старом браузере)
 */
export function getDeviceId() {
    const uuid = getOrCreateDeviceId();
    const fingerprint = getBrowserFingerprint();
    return `${uuid}_${fingerprint}`;
}

/**
 * Проверка что Device ID валидный
 */
export function isDeviceIdValid(deviceId) {
    return typeof deviceId === 'string' && deviceId.length >= 20 && deviceId.length <= 100;
}