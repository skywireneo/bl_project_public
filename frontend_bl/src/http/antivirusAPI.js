/**
 * API методы для работы с антивирусными проверками
 */

import { $filesHost } from ".";
import storageHandler from "./utils/storageHandler";

const ANTIVIRUS_API_BASE = '/av';

/**
 * Получение результатов проверок для файла
 * @param {string} moduleName - Имя модуля ('files' или 'files_single')
 * @param {string} recordId - ID записи файла
 * @param {string} fileName - Имя файла (опционально)
 * @returns {Promise<Object>} - Результаты проверок
 */
export const getFileScanResults = async (moduleName, recordId, fileName = null, fileId = null) => {
    try {
        const params = new URLSearchParams({
            moduleName: moduleName,
            recordId: String(recordId)
        });

        if (fileName) {
            params.append('fileName', fileName);
        }

        if (fileId) {
            params.append('fileId', fileId);
        }

        const response = await $filesHost.get(
            `${ANTIVIRUS_API_BASE}/files?${params.toString()}`,
            {
                headers: {
                    Authorization: `Bearer ${storageHandler.get("tokenAccess", "cookies")}`
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ошибка получения результатов проверки:', error);
        throw error;
    }
};

/**
 * Получение результата проверки по ID
 * @param {string} scanId - ID проверки
 * @returns {Promise<Object>} - Результат проверки
 */
export const getScanById = async (scanId) => {
    try {
        const response = await $filesHost.get(
            `${ANTIVIRUS_API_BASE}/scan?scanId=${encodeURIComponent(scanId)}`,
            {
                headers: {
                    Authorization: `Bearer ${storageHandler.get("tokenAccess", "cookies")}`
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ошибка получения проверки:', error);
        throw error;
    }
};

/**
 * Запуск повторной проверки файла
 * @param {string} moduleName - Имя модуля ('files' или 'files_single')
 * @param {string} recordId - ID записи файла
 * @param {string} fileName - Имя файла (опционально)
 * @returns {Promise<Object>} - Результат запуска проверки
 */
export const rescanFile = async (moduleName, recordId, fileName = null, fileId = null) => {
    try {
        const params = new URLSearchParams({
            moduleName: moduleName,
            recordId: String(recordId)
        });

        if (fileName) {
            params.append('fileName', fileName);
        }

        if (fileId) {
            params.append('fileId', fileId);
        }

        const response = await $filesHost.post(
            `${ANTIVIRUS_API_BASE}/rescan?${params.toString()}`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${storageHandler.get("tokenAccess", "cookies")}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ошибка запуска повторной проверки:', error);
        throw error;
    }
};

/**
 * Получение истории всех проверок
 * @param {Object} options - Опции пагинации и фильтрации
 * @returns {Promise<Object>} - История проверок
 */
export const getScanHistory = async (options = {}) => {
    try {
        const params = new URLSearchParams();

        if (options.page) params.append('page', String(options.page));
        if (options.limit) params.append('limit', String(options.limit));
        if (options.status) params.append('status', options.status);
        if (options.infectedOnly) params.append('infectedOnly', 'true');
        if (options.fileTable) params.append('fileTable', options.fileTable);

        const response = await $filesHost.get(
            `${ANTIVIRUS_API_BASE}/history?${params.toString()}`,
            {
                headers: {
                    Authorization: `Bearer ${storageHandler.get("tokenAccess", "cookies")}`
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ошибка получения истории проверок:', error);
        throw error;
    }
};

/**
 * Получение статистики проверок
 * @param {Object} options - Опции фильтрации
 * @returns {Promise<Object>} - Статистика
 */
export const getScanStatistics = async (options = {}) => {
    try {
        const params = new URLSearchParams();

        if (options.startDate) params.append('startDate', options.startDate);
        if (options.endDate) params.append('endDate', options.endDate);
        if (options.status) params.append('status', options.status);

        const response = await $filesHost.get(
            `${ANTIVIRUS_API_BASE}/statistics?${params.toString()}`,
            {
                headers: {
                    Authorization: `Bearer ${storageHandler.get("tokenAccess", "cookies")}`
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        throw error;
    }
};

/**
 * Запуск повторной проверки одиночного файла
 * @param {string} codeName - Кодовое имя файла
 * @returns {Promise<Object>} - Результат запуска проверки
 */
export const rescanSingleFile = async (codeName) => {
    try {
        const params = new URLSearchParams({
            codeName: codeName
        });

        const response = await $filesHost.post(
            `${ANTIVIRUS_API_BASE}/single-files/rescan?${params.toString()}`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${storageHandler.get("tokenAccess", "cookies")}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ошибка запуска повторной проверки одиночного файла:', error);
        throw error;
    }
};

/**
 * Получение истории проверок одиночного файла
 * @param {string} codeName - Кодовое имя файла
 * @param {Object} options - Опции (limit, offset)
 * @returns {Promise<Object>} - История проверок файла
 */
export const getSingleFileHistory = async (codeName, options = {}) => {
    try {
        const params = new URLSearchParams({
            codeName: codeName
        });

        if (options.limit) params.append('limit', String(options.limit));
        if (options.offset) params.append('offset', String(options.offset || 0));

        const response = await $filesHost.get(
            `${ANTIVIRUS_API_BASE}/single-files/history?${params.toString()}`,
            {
                headers: {
                    Authorization: `Bearer ${storageHandler.get("tokenAccess", "cookies")}`
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ошибка получения истории одиночного файла:', error);
        throw error;
    }
};

/**
 * Получение истории проверок модульного файла
 * @param {string} moduleName - Имя модуля (например, 'incident_evidence')
 * @param {string} recordId - ID записи
 * @param {string} fileName - Имя файла (опционально)
 * @param {Object} options - Опции (limit, offset)
 * @returns {Promise<Object>} - История проверок файла
 */
export const getUnifiedFileHistory = async (moduleName, recordId, fileName = null, fileId = null, options = {}) => {
    try {
        const params = new URLSearchParams({
            moduleName: moduleName,
            recordId: String(recordId)
        });

        if (fileName) params.append('fileName', fileName);
        if (fileId) params.append('fileId', fileId);
        if (options.limit) params.append('limit', String(options.limit));
        if (options.offset) params.append('offset', String(options.offset || 0));

        const response = await $filesHost.get(
            `${ANTIVIRUS_API_BASE}/files/history?${params.toString()}`,
            {
                headers: {
                    Authorization: `Bearer ${storageHandler.get("tokenAccess", "cookies")}`
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ошибка получения истории модульного файла:', error);
        throw error;
    }
};

export default {
    getFileScanResults,
    getScanById,
    rescanFile,
    rescanSingleFile,
    getSingleFileHistory,
    getUnifiedFileHistory,
    getScanHistory,
    getScanStatistics
};
