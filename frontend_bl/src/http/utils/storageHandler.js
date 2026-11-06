/**
 * Универсальный обработчик для хранения данных на клиентской стороне
 * Поддерживает различные методы хранения: localStorage, cookies, sessionStorage
 */

class StorageHandler {
    constructor() {
        this.storageMethods = {
            localStorage: {
                add: (key, data, options = {}) => {
                    try {
                        if (options.expireTime) {
                            const expiresAt = Date.now() + (options.expireTime * 1000);
                            const storageData = { data, expiresAt };
                            localStorage.setItem(key, JSON.stringify(storageData));
                        } else {
                            localStorage.setItem(key, JSON.stringify(data));
                        }
                        return { success: true, method: 'localStorage' };
                    } catch (error) {
                        console.error('LocalStorage error:', error);
                        return { success: false, error: error.message };
                    }
                },
                remove: (key) => {
                    try {
                        localStorage.removeItem(key);
                        return { success: true, method: 'localStorage' };
                    } catch (error) {
                        console.error('LocalStorage error:', error);
                        return { success: false, error: error.message };
                    }
                },
                get: (key) => {
                    try {
                        const item = localStorage.getItem(key);
                        if (!item) return null;

                        const parsed = JSON.parse(item);
                        // Проверяем на наличие срока годности
                        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
                            localStorage.removeItem(key);
                            return null;
                        }

                        return parsed.data || parsed;
                    } catch (error) {
                        console.error('LocalStorage error:', error);
                        return null;
                    }
                }
            },
            cookies: {
                add: (key, data, options = {}) => {
                    try {
                        const cookieValue = options.encode ? encodeURIComponent(JSON.stringify(data)) : JSON.stringify(data);
                        let cookie = `${key}=${cookieValue}`;

                        if (options.expireTime) {
                            const expires = new Date();
                            expires.setTime(expires.getTime() + (options.expireTime * 1000));
                            cookie += `; expires=${expires.toUTCString()}`;
                        }

                        if (options.path) cookie += `; path=${options.path}`;
                        if (options.domain) cookie += `; domain=${options.domain}`;
                        if (options.secure) cookie += `; secure`;
                        if (options.sameSite) cookie += `; samesite=${options.sameSite}`;

                        document.cookie = cookie;
                        return { success: true, method: 'cookies' };
                    } catch (error) {
                        console.error('Cookies error:', error);
                        return { success: false, error: error.message };
                    }
                },
                remove: (key, options = {}) => {
                    try {
                        let cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${options.path || '/'};`;
                        if (options.domain) cookie += ` domain=${options.domain};`;
                        document.cookie = cookie;
                        return { success: true, method: 'cookies' };
                    } catch (error) {
                        console.error('Cookies error:', error);
                        return { success: false, error: error.message };
                    }
                },
                get: (key) => {
                    try {
                        const name = `${key}=`;
                        const decodedCookie = decodeURIComponent(document.cookie);
                        const ca = decodedCookie.split(';');

                        for (let i = 0; i < ca.length; i++) {
                            let c = ca[i].trim();
                            if (c.indexOf(name) === 0) {
                                const value = c.substring(name.length, c.length);
                                try {
                                    return JSON.parse(value);
                                } catch {
                                    return value;
                                }
                            }
                        }
                        return null;
                    } catch (error) {
                        console.error('Cookies error:', error);
                        return null;
                    }
                }
            },
            sessionStorage: {
                add: (key, data, options = {}) => {
                    try {
                        sessionStorage.setItem(key, JSON.stringify(data));
                        return { success: true, method: 'sessionStorage' };
                    } catch (error) {
                        console.error('SessionStorage error:', error);
                        return { success: false, error: error.message };
                    }
                },
                remove: (key) => {
                    try {
                        sessionStorage.removeItem(key);
                        return { success: true, method: 'sessionStorage' };
                    } catch (error) {
                        console.error('SessionStorage error:', error);
                        return { success: false, error: error.message };
                    }
                },
                get: (key) => {
                    try {
                        const item = sessionStorage.getItem(key);
                        return item ? JSON.parse(item) : null;
                    } catch (error) {
                        console.error('SessionStorage error:', error);
                        return null;
                    }
                }
            }
        };
    }

    /**
     * Добавление или обновление данных
     * @param {string} key - Ключ для хранения данных
     * @param {any} data - Данные для хранения
     * @param {Object} options - Дополнительные параметры
     * @param {string} options.method - Метод хранения ('localStorage', 'cookies', 'sessionStorage')
     * @param {number} options.expireTime - Время жизни в секундах
     * @param {string} options.path - Путь для cookies
     * @param {string} options.domain - Домен для cookies
     * @param {boolean} options.secure - Флаг secure для cookies
     * @param {string} options.sameSite - SameSite атрибут для cookies
     * @param {boolean} options.encode - Кодировать данные в cookies
     */
    add(key, data, options = {}) {
        const method = options.method || 'localStorage';
        const storageMethod = this.storageMethods[method];

        if (!storageMethod) {
            return { success: false, error: `Unsupported storage method: ${method}` };
        }

        return storageMethod.add(key, data, options);
    }

    /**
     * Удаление данных
     * @param {string} key - Ключ для удаления
     * @param {Object} options - Дополнительные параметры
     * @param {string} options.method - Метод хранения
     * @param {string} options.path - Путь для cookies
     * @param {string} options.domain - Домен для cookies
     */
    remove(key, options = {}) {
        const method = options.method || 'localStorage';
        const storageMethod = this.storageMethods[method];

        if (!storageMethod) {
            return { success: false, error: `Unsupported storage method: ${method}` };
        }

        return storageMethod.remove(key, options);
    }

    /**
     * Получение данных
     * @param {string} key - Ключ для получения данных
     * @param {string} method - Метод хранения
     */
    get(key, method = 'localStorage') {
        const storageMethod = this.storageMethods[method];

        if (!storageMethod) {
            console.error(`Unsupported storage method: ${method}`);
            return null;
        }

        return storageMethod.get(key);
    }

    /**
     * Очистка всех данных указанного метода хранения
     * @param {string} method - Метод хранения для очистки
     */
    clear(method = 'localStorage') {
        try {
            switch (method) {
                case 'localStorage':
                    localStorage.clear();
                    break;
                case 'sessionStorage':
                    sessionStorage.clear();
                    break;
                case 'cookies':
                    // Удаляем все cookies
                    const cookies = document.cookie.split(";");
                    for (let cookie of cookies) {
                        const eqPos = cookie.indexOf("=");
                        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                    }
                    break;
                default:
                    console.warn(`Clear method not implemented for: ${method}`);
                    return { success: false, error: `Clear method not implemented for: ${method}` };
            }
            return { success: true, method };
        } catch (error) {
            console.error('Clear error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Проверка поддержки метода хранения
     * @param {string} method - Метод хранения для проверки
     */
    isSupported(method) {
        switch (method) {
            case 'localStorage':
                try {
                    const test = '__storage_test__';
                    localStorage.setItem(test, test);
                    localStorage.removeItem(test);
                    return true;
                } catch {
                    return false;
                }
            case 'sessionStorage':
                try {
                    const test = '__storage_test__';
                    sessionStorage.setItem(test, test);
                    sessionStorage.removeItem(test);
                    return true;
                } catch {
                    return false;
                }
            case 'cookies':
                return navigator.cookieEnabled;
            default:
                return false;
        }
    }

    /**
     * Получение списка всех доступных методов хранения
     */
    getAvailableMethods() {
        const methods = [];
        Object.keys(this.storageMethods).forEach(method => {
            if (this.isSupported(method)) {
                methods.push(method);
            }
        });
        return methods;
    }
}

// Создаем экземпляр обработчика
const storageHandler = new StorageHandler();

export default storageHandler;