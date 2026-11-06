import { $filesHost } from './index';
import storageHandler from './utils/storageHandler';

// /**
//  * Унифицированный API для работы с файлами
//  * Заменяет разрозненные методы работы с файлами в различных модулях
//  */

const API_BASE = '/files';
const SINGLE_FILES_API_BASE = '/files/single-files';

/**
 * Получение токена из storage
 */
function getToken() {
    return storageHandler.get("tokenAccess", "cookies");
}

/**
 * Получение заголовков авторизации
 */
function getAuthHeaders() {
    const token = getToken();
    return {
        Authorization: `Bearer ${token}`
    };
}

// ==================== УНИФИЦИРОВАННЫЕ ФАЙЛЫ ====================

/**
 * Загрузка файлов к записи
 * POST /files/upload?module={module}&recordId={id}
 * @param {string} moduleName - Имя модуля файлов
 * @param {string} recordId - ID записи
 * @param {File[]} files - Массив файлов для загрузки
 * @returns {Promise<Object>} - Результат загрузки
 */
export const uploadFiles = async (moduleName, recordId, files) => {
    try {
        const formData = new FormData();

        // Добавляем файлы в formData с именем 'files'
        // Важно: multer на бэкенде использует upload.array('files'),
        // поэтому поле должно называться 'files'
        files.forEach((file) => {
            formData.append('files', file);
        });

        const response = await $filesHost.post(
            `${API_BASE}/upload?module=${encodeURIComponent(moduleName)}&recordId=${encodeURIComponent(recordId)}`,
            formData,
            {
                headers: {
                    ...getAuthHeaders()
                    // Не указываем Content-Type для FormData - браузер сам установит с boundary
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ошибка загрузки файлов:', error);
        throw error;
    }
};

/**
 * Обновление файла
 * POST /files/update?module={module}&recordId={id}&fileName={name}
 * @param {string} moduleName - Имя модуля файлов
 * @param {string} recordId - ID записи
 * @param {string} fileName - Текущее имя файла
 * @param {File} newFile - Новый файл
 * @returns {Promise<Object>} - Результат обновления
 */
export const updateFile = async (fileId, newFile) => {
    try {
        const formData = new FormData();
        formData.append('files', newFile);

        const response = await $filesHost.post(
            `${API_BASE}/update?fileId=${encodeURIComponent(fileId)}`,
            formData,
            {
                headers: {
                    ...getAuthHeaders()
                    // Не указываем Content-Type для FormData
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ошибка обновления файла:', error);
        throw error;
    }
};

/**
 * Удаление файла
 * DELETE /files/delete?module={module}&recordId={id}&fileName={name}
 * @param {string} moduleName - Имя модуля файлов
 * @param {string} recordId - ID записи
 * @param {string} fileName - Имя файла для удаления
 * @returns {Promise<Object>} - Результат удаления
 */
export const deleteFile = async (fileId) => {
    try {
        const response = await $filesHost.delete(
            `${API_BASE}/delete?fileId=${encodeURIComponent(fileId)}`,
            {
                headers: getAuthHeaders()
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ошибка удаления файла:', error);
        throw error;
    }
};

/**
 * Получение списка файлов записи
 * GET /files/list?module={module}&recordId={id}
 * @param {string} moduleName - Имя модуля файлов
 * @param {string} recordId - ID записи
 * @returns {Promise<Object>} - Список файлов
 */
export const getFiles = async (moduleName, recordId) => {
    try {
        const response = await $filesHost.get(
            `${API_BASE}/list?module=${encodeURIComponent(moduleName)}&recordId=${encodeURIComponent(recordId)}`,
            {
                headers: getAuthHeaders()
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ошибка получения списка файлов:', error);
        throw error;
    }
};

/**
 * Скачивание/получение файла с авторизацией
 * GET /files/download?module={module}&recordId={id}&fileId={id}
 * @param {string} fileId - ID файла
 * @returns {Promise<Blob>} - Файл в виде Blob
 */
export const downloadFile = async (fileId) => {
    try {
        const response = await $filesHost.get(
            `${API_BASE}/download?&fileId=${encodeURIComponent(fileId)}`,
            {
                headers: getAuthHeaders(),
                responseType: 'blob'
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ошибка скачивания файла:', error);
        throw error;
    }
};

/**
 * Получение Blob URL для просмотра файла
 * Использует downloadFile для загрузки файла с авторизацией
 * @param {string} fileName - Имя файла
 * @returns {Promise<string>} - Blob URL для просмотра
 */
export const getFileBlobUrl = async (fileId) => {
    try {
        const blob = await downloadFile(fileId);
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Ошибка получения Blob URL:', error);
        throw error;
    }
};

/**
 * Обновление порядка файлов
 * POST /files/reorder?module={module}&recordId={id}
 * @param {string} moduleName - Имя модуля файлов
 * @param {string} recordId - ID записи
 * @param {Array<{fileName: string, sortOrder: number}>} fileOrders - Новый порядок файлов
 * @returns {Promise<Object>} - Результат обновления
 */
export const reorderFiles = async (moduleName, recordId, fileOrders) => {
    try {
        const response = await $filesHost.post(
            `${API_BASE}/reorder?module=${encodeURIComponent(moduleName)}&recordId=${encodeURIComponent(recordId)}`,
            { fileOrders },
            {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ошибка изменения порядка файлов:', error);
        throw error;
    }
};

/**
 * Скачивание ZIP-архива с файлами инцидента
 * GET /files/archive?module={module}&recordId={id}
 * 
 * @param {string} moduleName - Имя модуля файлов (например, 'incident_evidence')
 * @param {string} recordId - ID записи (инцидента)
 * @returns {Promise<Object>} - Результат скачивания { success, fileName, skippedCount }
 */
export const downloadIncidentArchive = async (moduleName, recordId) => {
    try {
        const response = await $filesHost.get(
            `${API_BASE}/archive?module=${encodeURIComponent(moduleName)}&recordId=${encodeURIComponent(recordId)}`,
            {
                headers: getAuthHeaders(),
                responseType: 'blob'
            }
        );

        // Извлекаем имя файла из заголовка Content-Disposition
        const contentDisposition = response.headers['content-disposition'];
        let fileName = `archive_${recordId}.zip`;

        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/i);
            if (filenameMatch && filenameMatch[1]) {
                fileName = filenameMatch[1];
            }
        }

        // Получаем информацию о пропущенных файлах
        const skippedCount = parseInt(response.headers['x-skipped-files']) || 0;

        // Создаём Blob и инициируем скачивание через браузер
        const blob = new Blob([response.data], { type: 'application/zip' });
        const downloadUrl = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();

        // Очистка
        setTimeout(() => {
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(link);
        }, 100);

        return {
            success: true,
            fileName: fileName,
            skippedCount: skippedCount
        };
    } catch (error) {
        console.error('Ошибка скачивания архива инцидента:', error);

        // Если пришёл blob с ошибкой — пытаемся извлечь JSON из blob
        if (error.response?.data instanceof Blob) {
            try {
                const text = await error.response.data.text();
                const errorData = JSON.parse(text);
                throw new Error(errorData.message || 'Ошибка скачивания архива');
            } catch (parseError) {
                // Не удалось распарсить — бросаем оригинальную ошибку
            }
        }

        throw error;
    }
};

// ==================== ОДИНОЧНЫЕ СИСТЕМНЫЕ ФАЙЛЫ ====================

/**
 * Получение списка всех одиночных файлов
 * GET /single-files/list
 * @returns {Promise<Object>} - Список файлов с метаданными
 */
export const getSingleFilesList = async () => {
    try {
        const response = await $filesHost.get(
            `${SINGLE_FILES_API_BASE}/list`,
            {
                headers: getAuthHeaders()
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ошибка получения списка одиночных файлов:', error);
        throw error;
    }
};

/**
 * Получение информации о конкретном одиночном файле
 * GET /single-files/info?codeName={codeName}
 * @param {string} codeName - Кодовое имя файла
 * @returns {Promise<Object>} - Информация о файле
 */
export const getSingleFileInfo = async (codeName) => {
    try {
        const response = await $filesHost.get(
            `${SINGLE_FILES_API_BASE}/info?codeName=${encodeURIComponent(codeName)}`,
            {
                headers: getAuthHeaders()
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ошибка получения информации о файле:', error);
        throw error;
    }
};

/**
 * Скачивание одиночного файла по codeName
 * GET /single-files/download?codeName={codeName}
 * @param {string} codeName - Кодовое имя файла
 * @returns {Promise<Blob>} - Файл в виде Blob
 */
export const downloadSingleFile = async (codeName) => {
    try {
        const response = await $filesHost.get(
            `${SINGLE_FILES_API_BASE}/download?codeName=${encodeURIComponent(codeName)}`,
            {
                headers: getAuthHeaders(),
                responseType: 'blob'
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ошибка скачивания одиночного файла:', error);
        throw error;
    }
};

/**
 * Получение Blob URL для просмотра одиночного файла
 * @param {string} codeName - Кодовое имя файла
 * @returns {Promise<string>} - Blob URL для просмотра
 */
export const getSingleFileBlobUrl = async (codeName) => {
    try {
        const blob = await downloadSingleFile(codeName);
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Ошибка получения Blob URL для одиночного файла:', error);
        throw error;
    }
};

/**
 * Обновление одиночного файла
 * POST /single-files/update?codeName={codeName}
 * @param {string} codeName - Кодовое имя файла
 * @param {File} file - Новый файл
 * @returns {Promise<Object>} - Результат обновления
 */
export const updateSingleFile = async (codeName, file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await $filesHost.post(
            `${SINGLE_FILES_API_BASE}/update?codeName=${encodeURIComponent(codeName)}`,
            formData,
            {
                headers: {
                    ...getAuthHeaders()
                    // Не указываем Content-Type для FormData - браузер сам установит с boundary
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ошибка обновления одиночного файла:', error);
        throw error;
    }
};

/**
 * Удаление одиночного файла
 * DELETE /single-files/delete?codeName={codeName}
 * @param {string} codeName - Кодовое имя файла
 * @returns {Promise<Object>} - Результат удаления
 */
export const deleteSingleFile = async (codeName) => {
    try {
        const response = await $filesHost.delete(
            `${SINGLE_FILES_API_BASE}/delete?codeName=${encodeURIComponent(codeName)}`,
            {
                headers: getAuthHeaders()
            }
        );

        return response.data;
    } catch (error) {
        console.error('Ошибка удаления одиночного файла:', error);
        throw error;
    }
};

/**
 * Проверка доступности одиночного файла
 * @param {string} codeName - Кодовое имя файла
 * @returns {Promise<boolean>} - Доступен ли файл
 */
export const isSingleFileAvailable = async (codeName) => {
    try {
        const info = await getSingleFileInfo(codeName);
        return info.success && info.data?.attached && info.data?.file_name;
    } catch {
        return false;
    }
};

// ==================== УТИЛИТЫ ====================

/**
 * Форматирование размера файла
 * @param {number} bytes - Размер в байтах
 * @returns {string} - Отформатированный размер
 */
export const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Получение расширения файла
 * @param {string} filename - Имя файла
 * @returns {string} - Расширение без точки
 */
export const getFileExtension = (filename) => {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

/**
 * Получение MIME-типа по расширению
 * @param {string} extension - Расширение файла
 * @returns {string} - MIME тип
 */
export const getMimeType = (extension) => {
    const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'bmp': 'image/bmp',
        'ico': 'image/x-icon',
        'tif': 'image/tiff',
        'tiff': 'image/tiff',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'mkv': 'video/x-matroska',
        'flv': 'video/x-flv',
        'wmv': 'video/x-ms-wmv',
        'm4v': 'video/x-m4v',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'aac': 'audio/aac',
        'flac': 'audio/flac',
        'm4a': 'audio/mp4',
        'wma': 'audio/x-ms-wma',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'rtf': 'application/rtf',
        'csv': 'text/csv',
        'zip': 'application/zip',
        'rar': 'application/vnd.rar',
        '7z': 'application/x-7z-compressed'
    };
    return mimeTypes[extension?.toLowerCase()] || 'application/octet-stream';
};

/**
 * Определение типа контента по расширению
 * @param {string} extension - Расширение файла
 * @returns {string} - Тип контента
 */
export const getContentType = (extension) => {
    const ext = extension?.toLowerCase().replace('.', '') || '';

    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'avif'];
    const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v'];
    const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'];
    const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv'];

    if (imageExtensions.includes(ext)) return 'image';
    if (videoExtensions.includes(ext)) return 'video';
    if (audioExtensions.includes(ext)) return 'audio';
    if (documentExtensions.includes(ext)) return 'document';
    return 'other';
};

/**
 * Получение иконки типа файла
 * @param {string} contentType - Тип контента
 * @returns {string} - Bootstrap иконка
 */
export const getTypeIcon = (contentType) => {
    const icons = {
        'image': 'bi-image',
        'video': 'bi-film',
        'audio': 'bi-music-note-beamed',
        'document': 'bi-file-earmark-text',
        'other': 'bi-file-earmark',
        'unknown': 'bi-file-earmark'
    };
    return icons[contentType] || icons['unknown'];
};

/**
 * Получение названия типа файла
 * @param {string} contentType - Тип контента
 * @returns {string} - Название типа
 */
export const getTypeName = (contentType) => {
    const names = {
        'image': 'Изображение',
        'video': 'Видео',
        'audio': 'Аудио',
        'document': 'Документ',
        'other': 'Файл',
        'unknown': 'Файл'
    };
    return names[contentType] || names['unknown'];
};

/**
 * Группировка файлов по типу контента
 * @param {Array} files - Массив файлов
 * @returns {Object} - Объект с группами файлов
 */
export const groupFilesByType = (files) => {
    const groups = {
        image: [],
        video: [],
        audio: [],
        document: [],
        other: []
    };

    files.forEach(file => {
        if (!file?.file_name) {
            groups.other.push(file);
            return;
        }

        const extension = getFileExtension(file.file_name);
        const type = getContentType(extension);

        if (groups[type]) {
            groups[type].push(file);
        } else {
            groups.other.push(file);
        }
    });

    return groups;
};

/**
 * Поиск файла по codeName
 * @param {Array} files - Массив файлов
 * @param {string} codeName - Кодовое имя для поиска
 * @returns {Object|undefined} - Найденный файл или undefined
 */
export const findFileByCodeName = (files, codeName) => {
    return files.find(file => file?.code_name === codeName);
};

/**
 * Фильтрация прикреплённых файлов
 * @param {Array} files - Массив файлов
 * @returns {Array} - Только прикреплённые файлы
 */
export const filterAttachedFiles = (files) => {
    return files.filter(file => file?.attached && file?.file_name);
};

/**
 * Фильтрация файлов, которые можно удалить
 * @param {Array} files - Массив файлов
 * @returns {Array} - Файлы с can_delete = true
 */
export const filterDeletableFiles = (files) => {
    return files.filter(file => file?.can_delete && file?.attached);
};

/**
 * Безопасное освобождение Blob URL
 * @param {string} blobUrl - Blob URL для освобождения
 */
export const revokeBlobUrl = (blobUrl) => {
    if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
    }
};

/**
 * Получение полного Blob URL с авторизацией и автоматическим управлением
 * @param {string} codeName - Кодовое имя файла
 * @returns {Promise<{url: string, revoke: function}>} - Объект с URL и функцией для освобождения
 */
export const getSingleFileManagedUrl = async (codeName) => {
    try {
        const blob = await downloadSingleFile(codeName);
        const url = URL.createObjectURL(blob);
        return {
            url,
            revoke: () => revokeBlobUrl(url)
        };
    } catch (error) {
        console.error('Ошибка получения управляемого URL:', error);
        throw error;
    }
};

/**
 * Запуск антивирусной проверки файла
 * POST /antivirus/rescan?module={module}&recordId={id}&fileName={name}
 * @param {string} moduleName - Имя модуля ('files' или 'files_single')
 * @param {string} recordId - ID записи файла
 * @param {string} fileName - Имя файла (опционально)
 * @returns {Promise<Object>} - Результат запуска проверки
 */
export const rescanFile = async (fileId) => {
    try {
        const params = new URLSearchParams({
            fileId: fileId
        });

        const response = await $filesHost.post(
            `/av/rescan?${params.toString()}`,
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

export default {
    // Унифицированные файлы
    uploadFiles,
    updateFile,
    deleteFile,
    getFiles,
    downloadFile,
    getFileBlobUrl,
    reorderFiles,
    downloadIncidentArchive,
    // Одиночные системные файлы
    getSingleFilesList,
    getSingleFileInfo,
    downloadSingleFile,
    getSingleFileBlobUrl,
    updateSingleFile,
    deleteSingleFile,
    isSingleFileAvailable,
    // Утилиты
    formatFileSize,
    getFileExtension,
    getMimeType,
    getContentType,
    getTypeIcon,
    getTypeName,
    groupFilesByType,
    findFileByCodeName,
    filterAttachedFiles,
    filterDeletableFiles,
    revokeBlobUrl,
    getSingleFileManagedUrl,
    rescanFile
};
