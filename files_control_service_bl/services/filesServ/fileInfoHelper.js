/**
 * Утилита для получения информации о файлах из соответствующих сервисов
 * Вынесена в отдельный модуль для избежания циркулярных зависимостей
 */

const { getFilePathByName, generateSingleFilePath } = require('./fileModuleConfig');
const queryService = require('../systemServices/queryService');
const { getModuleConfig } = require('./fileModuleConfig');

/**
 * Получение полной информации о файле из таблицы files
 * @param {string} fileId - ID файла
 * @returns {Promise<Object|null>} - Информация о файле или null
 */
async function getFileInfoFromFiles(fileId) {
    try {
        const query = `
            SELECT 
                id,
                module,
                record_id,
                file_name,
                file_size,
                mimetype,
                sort_order,
                created_at,
                updated_at,
                user_added_id as creator_id,
                antivirus_scan_id
            FROM files
            WHERE id = $1
        `;

        const result = await queryService.query(query, [fileId]);

        if (!result.rows[0]) {
            return null;
        }

        const file = result.rows[0];
        const config = getModuleConfig(file.module);

        // Строим путь к файлу
        const filePath = getFilePathByName(file.module, file.record_id, file.file_name);

        return {
            // Основная информация о файле
            id: file.id,
            module: file.module,
            record_id: file.record_id,
            file_name: file.file_name,
            file_size: file.file_size,
            mimetype: file.mimetype,
            sort_order: file.sort_order,
            created_at: file.created_at,
            updated_at: file.updated_at,
            creator_id: file.creator_id,
            antivirus_scan_id: file.antivirus_scan_id,

            // Построенный путь к файлу
            file_path: filePath,

            // Конфигурация модуля
            module_config: config ? {
                name: config.name,
                description: config.description,
                storagePath: config.storagePath,
                maxFiles: config.maxFiles,
                enableAntivirusScan: config.enableAntivirusScan,
                requiresWatermark: config.requiresWatermark,
                allowedFileTypes: config.allowedFileTypes
            } : null,

            // Метаданные
            source_table: 'files'
        };

    } catch (error) {
        console.error('[fileInfoHelper] Ошибка получения информации о файле из files:', error);
        return null;
    }
}

/**
 * Получение полной информации о файле из таблицы files_single
 * @param {string} fileId - ID файла (или code_name)
 * @returns {Promise<Object|null>} - Информация о файле или null
 */
async function getFileInfoFromFilesSingle(fileId) {
    try {
        // Пытаемся найти по id или code_name
        const query = `
            SELECT 
                id,
                code_name,
                name,
                descr,
                type,
                attached,
                can_delete,
                file_name,
                max_size_mb,
                updated_at,
                antivirus_scan_id
            FROM files_single
            WHERE id = $1
        `;

        const result = await queryService.query(query, [fileId]);

        if (!result.rows[0]) {
            return null;
        }

        const file = result.rows[0];
        const config = getModuleConfig('single_system_files');

        // Строим путь к файлу (если файл прикреплён)
        let filePath = null;
        if (file.attached && file.file_name) {
            filePath = generateSingleFilePath(file.code_name, file.file_name);
        }

        return {
            // Основная информация о файле
            id: file.id,
            code_name: file.code_name,
            name: file.name,
            description: file.descr,
            type: file.type,
            attached: file.attached,
            can_delete: file.can_delete,
            file_name: file.file_name,
            max_size_mb: file.max_size_mb,
            updated_at: file.updated_at,
            antivirus_scan_id: file.antivirus_scan_id,

            // Построенный путь к файлу
            file_path: filePath,

            // Конфигурация модуля single_system_files
            module_config: config ? {
                name: config.name,
                description: config.description,
                storagePath: config.storagePath,
                enableAntivirusScan: config.enableAntivirusScan,
                allowedFileTypes: config.allowedFileTypes
            } : null,

            // Метаданные
            source_table: 'files_single'
        };

    } catch (error) {
        console.error('[fileInfoHelper] Ошибка получения информации о файле из files_single:', error);
        return null;
    }
}

/**
 * Получение информации о файле из соответствующего сервиса
 * @param {string} fileTable - Таблица файлов ('files' или 'files_single')
 * @param {string} fileId - ID файла
 * @returns {Promise<Object|null>} - Информация о файле
 */
async function getFileInfoFromService(fileTable, fileId) {
    if (fileTable === 'files_single') {
        return await getFileInfoFromFilesSingle(fileId);
    } else {
        return await getFileInfoFromFiles(fileId);
    }
}

/**
 * Полное форматирование записи сканирования с информацией о файле (для getScanById)
 * @param {Object} scan - Запись сканирования
 * @param {Object} fileInfo - Информация о файле
 * @returns {Object} - Полная форматированная запись
 */
function formatScanWithFileInfo(scan, fileInfo) {
    if (!fileInfo) {
        return {
            ...scan,
            file_info: null,
            module_config: null,
            file_path: null,
            is_old_scan: false
        };
    }

    // Проверяем, является ли это актуальным сканированием
    const currentScanId = fileInfo.antivirus_scan_id;
    const isOldScan = currentScanId && String(currentScanId) !== String(scan.id);

    return {
        ...scan,
        file_info: {
            id: fileInfo.id,
            source_table: fileInfo.source_table
        },
        // Для таблицы files
        ...(fileInfo.source_table === 'files' ? {
            module: fileInfo.module,
            record_id: fileInfo.record_id,
            file_name: fileInfo.file_name,
            creator_id: fileInfo.creator_id
        } : {}),
        // Для таблицы files_single
        ...(fileInfo.source_table === 'files_single' ? {
            code_name: fileInfo.code_name,
            single_name: fileInfo.name,
            single_description: fileInfo.description
        } : {}),
        module_config: fileInfo.module_config,
        file_path: fileInfo.file_path,
        is_old_scan: isOldScan,
        current_scan_id: currentScanId
    };
}

/**
 * Краткое форматирование записи сканирования для истории (только необходимые поля)
 * @param {Object} scan - Запись сканирования
 * @param {Object} fileInfo - Информация о файле
 * @returns {Object} - Краткая форматированная запись
 */
function formatScanWithFileInfoForHistory(scan, fileInfo) {
    // Базовые поля из результата проверки
    const result = {
        id: scan.id,
        file_table: scan.file_table,
        status: scan.status,
        is_infected: scan.is_infected,
        verdict: scan.verdict,
        confidence: scan.confidence,
        threat_count: scan.threat_count,
        scanned_at: scan.scanned_at,
        scan_duration_ms: scan.scan_duration_ms
    };

    if (!fileInfo) {
        return {
            ...result,
            module: null,
            record_id: null,
            file_name: null,
            module_config: null,
            file_path: null,
            is_old_scan: false,
            current_scan_id: null
        };
    }

    // Проверяем, является ли это актуальным сканированием
    const currentScanId = fileInfo.antivirus_scan_id;
    const isOldScan = currentScanId && String(currentScanId) !== String(scan.id);

    // Поля из информации о файле
    if (fileInfo.source_table === 'files') {
        result.module = fileInfo.module;
        result.record_id = fileInfo.record_id;
        result.file_name = fileInfo.file_name;
    } else {
        result.module = fileInfo.source_table;
        result.record_id = fileInfo.code_name;
        result.file_name = fileInfo.file_name;
    }

    result.module_config = fileInfo.module_config ? fileInfo.module_config.name : null;
    result.file_path = fileInfo.file_path;
    result.is_old_scan = isOldScan;
    result.current_scan_id = currentScanId;

    return result;
}

module.exports = {
    getFileInfoFromFiles,
    getFileInfoFromFilesSingle,
    getFileInfoFromService,
    formatScanWithFileInfo,
    formatScanWithFileInfoForHistory
};
