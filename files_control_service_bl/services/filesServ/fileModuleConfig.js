/**
 * Конфигурация модулей файлов
 * Определяет настройки для различных типов модулей файлов в системе
 */

const FILE_MODULES = {
    // Модуль доказательств инцидента
    incident_evidence: {
        name: 'Доказательства инцидента',
        module: 'incident_evidence',
        enableAntivirusScan: true,
        compression: {
            image: {
                enabled: true,
                quality: 80,
                maxWidth: 1920,
                maxHeight: 1080
            },
            video: {
                enabled: true,
                crf: 28,
                preset: 'medium',
                resolution: '1280x720'
            }
        },
        metadata: {
            enabled: true,
            // Настройки очистки метаданных
            setAuthor: 'BL',           // Установить автора на 'BL'
        },
        allowedFileTypes: {
            image: { maxSize: 10 * 1024 * 1024, extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
            video: { maxSize: 100 * 1024 * 1024, extensions: ['.mp4', '.webm', '.mov'] },
            audio: { maxSize: 50 * 1024 * 1024, extensions: ['.mp3', '.wav', '.ogg'] },
            document: { maxSize: 50 * 1024 * 1024, extensions: ['.pdf', '.doc', '.docx', '.txt'] }
        },
        storagePath: 'documents/reports',
        maxFiles: 10,
        requiresWatermark: true,
        allowedMimeTypes: [
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'video/mp4', 'video/webm', 'video/quicktime',
            'audio/mpeg', 'audio/wav', 'audio/ogg',
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ],
        filePathField: 'file_path',
        description: 'Файлы доказательств для инцидентов'
    },

    // Модуль доказательств оспаривания
    contestation_evidence: {
        name: 'Доказательства оспаривания',
        module: 'contestation_evidence',
        enableAntivirusScan: true,
        compression: {
            image: {
                enabled: true,
                quality: 80,
                maxWidth: 1920,
                maxHeight: 1080
            },
            video: {
                enabled: true,
                crf: 28,
                preset: 'medium',
                resolution: '1280x720'
            }
        },
        metadata: {
            enabled: true,
            setAuthor: 'BL',
        },
        allowedFileTypes: {
            image: { maxSize: 10 * 1024 * 1024, extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
            video: { maxSize: 100 * 1024 * 1024, extensions: ['.mp4', '.webm', '.mov'] },
            audio: { maxSize: 50 * 1024 * 1024, extensions: ['.mp3', '.wav', '.ogg'] },
            document: { maxSize: 50 * 1024 * 1024, extensions: ['.pdf', '.doc', '.docx', '.txt'] }
        },
        storagePath: 'documents/reports',
        maxFiles: 20,
        requiresWatermark: true,
        allowedMimeTypes: [
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'video/mp4', 'video/webm', 'video/quicktime',
            'audio/mpeg', 'audio/wav', 'audio/ogg',
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ],
        filePathField: 'file_path',
        description: 'Файлы доказательств для оспариваний'
    },

    // Модуль одиночных системных файлов для админов
    single_system_files: {
        name: 'Системные одиночные файлы',
        module: 'single_system_files',
        enableAntivirusScan: true,
        compression: {
            image: {
                enabled: false,
                quality: 85,
                maxWidth: 1920,
                maxHeight: 1080
            },
            video: {
                enabled: false,
                crf: 23,
                preset: 'slow',
                resolution: '1920x1080'
            }
        },
        metadata: {
            enabled: true,
            // Расширенные настройки для системных файлов
            setAuthor: 'BL',           // Установить автора на 'BL'
        },
        allowedFileTypes: {
            image: {
                maxSize: 1024 * 1024 * 1024,
                extensions: [
                    '.jpg', '.jpeg', '.jpe', '.jfif',
                    '.png', '.apng',
                    '.gif',
                    '.bmp', '.dib',
                    '.tiff', '.tif',
                    '.webp', '.avif', '.jxl',
                    '.psd', '.psb',
                    '.raw', '.cr2', '.nef', '.arw', '.dng', '.orf', '.rw2', '.pef', '.sr2', '.srf',
                    '.svg', '.svgz',
                    '.ico', '.cur',
                    '.heic', '.heif',
                    '.eps', '.pict', '.pct', '.pic',
                    '.tga', '.pcx', '.exr', '.hdr', '.exif'
                ]
            },
            video: {
                maxSize: 1024 * 1024 * 1024,
                extensions: [
                    '.mp4', '.m4v', '.mov', '.qt',
                    '.webm',
                    '.avi', '.divx',
                    '.mkv', '.mka',
                    '.wmv',
                    '.flv', '.f4v',
                    '.mpeg', '.mpg', '.mpe', '.m1v', '.m2v',
                    '.3gp', '.3g2', '.3gpp',
                    '.ts', '.mts', '.m2ts',
                    '.ogv',
                    '.vob', '.rm', '.rmvb', '.asf', '.dat', '.mpv', '.m2v'
                ]
            },
            audio: {
                maxSize: 1024 * 1024 * 1024,
                extensions: [
                    '.mp3', '.m4a', '.m4b',
                    '.wav', '.wave',
                    '.ogg', '.oga',
                    '.flac',
                    '.aac',
                    '.wma', '.wmv',
                    '.aiff', '.aif', '.aifc',
                    '.opus',
                    '.mid', '.midi',
                    '.ac3', '.dts',
                    '.alac',
                    '.ape', '.apl',
                    '.mka', '.mkv',
                    '.webm',
                    '.amr', '.awb',
                    '.gsm',
                    '.voc', '.au'
                ]
            },
            document: {
                maxSize: 1024 * 1024 * 1024,
                extensions: [
                    '.pdf', '.pdfa',
                    '.doc', '.dot', '.docx', '.docm', '.dotx', '.dotm',
                    '.xls', '.xlsx', '.xlsm', '.xlsb', '.xlsx',
                    '.ppt', '.pptx', '.pptm', '.potx', '.potm', '.ppam', '.ppsx', '.ppsm',
                    '.vsd', '.vsdx', '.vss', '.vst',
                    '.mpp', '.mpt',
                    '.odt', '.ott', '.odm',
                    '.ods', '.ots',
                    '.odp', '.otp',
                    '.odg', '.otg',
                    '.odf',
                    '.txt', '.text', '.log',
                    '.rtf', '.rtfd',
                    '.csv',
                    '.xml', '.xsl', '.xslt',
                    '.json', '.yaml', '.yml',
                    '.ini', '.cfg', '.conf', '.config',
                    '.html', '.htm', '.xhtml', '.shtml', '.stm',
                    '.css', '.scss', '.sass', '.less',
                    '.js', '.mjs', '.cjs', '.ts', '.tsx',
                    '.md', '.markdown', '.rst', '.tex', '.latex',
                    '.zip', '.7z', '.rar', '.tar', '.gz', '.bz2', '.xz', '.zst',
                    '.iso', '.img', '.dmg', '.vmdk', '.vhd',
                    '.ttf', '.otf', '.woff', '.woff2', '.eot', '.fnt', '.fon',
                    '.ps', '.eps', '.ai', '.indd', '.idml',
                    '.pub',
                    '.msg', '.eml', '.pst', '.ost',
                    '.prn',
                    '.wpd', '.wps',
                    '.abw', '.zabw',
                    '.djvu', '.djv',
                    '.fb2', '.fbz',
                    '.chm', '.hlp',
                    '.man', '.me', '.ms',
                    '.tif', '.tiff'
                ]
            },
            archive: {
                maxSize: 1024 * 1024 * 1024,
                extensions: [
                    '.zip', '.zipx',
                    '.7z', '.7zip',
                    '.rar', '.rar4', '.rar5',
                    '.tar', '.tar.gz', '.tgz', '.tar.bz2', '.tbz2', '.tar.xz', '.txz',
                    '.gz', '.gzip',
                    '.bz2', '.bzip2',
                    '.xz',
                    '.zst', '.zstd',
                    '.lz', '.lzh', '.lha',
                    '.arj',
                    '.cab',
                    '.nsis',
                    '.exe', '.msi', '.app', '.dmg', '.pkg', '.deb', '.rpm'
                ]
            },
            code: {
                maxSize: 1024 * 1024 * 1024,
                extensions: [
                    '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts',
                    '.py', '.pyw', '.pyi', '.pyx',
                    '.java', '.class', '.jar',
                    '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx', '.cs',
                    '.go',
                    '.rs',
                    '.rb', '.erb',
                    '.php', '.phtml',
                    '.swift',
                    '.kt', '.kts',
                    '.sh', '.bash', '.zsh', '.fish',
                    '.sql',
                    '.html', '.htm', '.xhtml', '.css', '.scss', '.sass', '.less',
                    '.json', '.yaml', '.yml', '.xml', '.ini', '.cfg', '.conf', '.toml',
                    '.lua', '.perl', '.r', '.dart', '.elm', '.ex', '.exs', '.vue', '.svelte'
                ]
            }
        },
        storagePath: 'documents/single_system_files',
        maxFiles: 1,
        requiresWatermark: false,
        allowedMimeTypes: [
            'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/jpe',
            'image/png', 'image/apng',
            'image/gif',
            'image/bmp', 'image/x-windows-bmp',
            'image/tiff', 'image/tif',
            'image/webp',
            'image/avif',
            'image/heic', 'image/heif',
            'image/svg+xml',
            'image/vnd.adobe.photoshop', 'image/x-photoshop',
            'image/x-icon', 'image/vnd.microsoft.icon',
            'image/tga', 'image/x-tga',
            'image/pcx', 'image/x-pcx',
            'image/x-exr',
            'image/hdr', 'image/x-hdr',
            'video/mp4', 'video/m4v', 'video/quicktime', 'video/x-quicktime',
            'video/webm',
            'video/x-msvideo', 'video/avi', 'video/msvideo',
            'video/x-matroska', 'video/mkv',
            'video/x-ms-wmv',
            'video/x-flv', 'video/x-f4v',
            'video/mpeg', 'video/mpg', 'video/mpe', 'video/m1v', 'video/m2v',
            'video/3gpp', 'video/3gpp2',
            'video/ogg', 'video/ogv',
            'video/vnd.mpeg.dash.mpd',
            'video/mp2t', 'video/vnd.dlna.mpeg-tts',
            'audio/mpeg', 'audio/mp3', 'audio/mpeg3', 'audio/x-mpeg-3',
            'audio/wav', 'audio/wave', 'audio/x-wav',
            'audio/ogg', 'audio/vorbis',
            'audio/flac',
            'audio/aac', 'audio/x-aac',
            'audio/m4a', 'audio/x-m4a', 'audio/m4b',
            'audio/windows-media',
            'audio/aiff', 'audio/x-aiff',
            'audio/opus',
            'audio/webm',
            'audio/midi', 'audio/x-midi',
            'audio/ac3', 'audio/vnd.dolby.dd-raw',
            'audio/dts',
            'audio/alac',
            'audio/ape',
            'application/pdf', 'application/x-pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-word.document.macroEnabled.12',
            'application/vnd.ms-word.template.macroEnabled.12',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel.sheet.macroEnabled.12',
            'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
            'application/vnd.visio',
            'application/vnd.ms-project',
            'application/vnd.oasis.opendocument.text',
            'application/vnd.oasis.opendocument.spreadsheet',
            'application/vnd.oasis.opendocument.presentation',
            'application/vnd.oasis.opendocument.graphics',
            'text/plain',
            'application/rtf', 'text/rtf',
            'text/csv',
            'application/xml', 'text/xml',
            'application/json', 'text/json',
            'application/yaml', 'text/yaml',
            'text/html', 'application/xhtml+xml',
            'application/zip', 'application/x-zip-compressed',
            'application/x-7z-compressed',
            'application/x-rar-compressed', 'application/vnd.rar',
            'application/x-tar',
            'application/gzip', 'application/x-gzip',
            'application/x-bzip2',
            'application/x-xz',
            'application/zstd',
            'application/x-iso9660-image',
            'application/x-apple-diskimage',
            'application/virtualbox-vdi',
            'application/x-vhd',
            'font/ttf', 'font/otf', 'font/woff', 'font/woff2', 'font/sfnt',
            'application/x-font-ttf', 'application/x-font-otf',
            'application/postscript',
            'application/x-executable',
            'application/x-sh',
            'text/x-java',
            'text/x-python',
            'text/x-c',
            'text/x-csrc', 'text/x-c++src'
        ],
        filePathField: 'file_name',
        description: 'Одиночные системные файлы для админов (картинки на главной и другое)',
        useCodeName: true,
        tableName: 'files_single'
    }
};

/**
 * Общие настройки для всех модулей файлов
 */
const COMMON_SETTINGS = {
    // Общие ограничения
    maxTotalFileSize: 500 * 1024 * 1024, // 500MB общий размер всех файлов
    allowedFileCount: 50, // Максимальное количество файлов за запрос
    tempDirectory: '/tmp/uploads',

    // Настройки безопасности
    allowedFileExtensions: [
        '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp',
        '.mp4', '.webm', '.mov', '.avi', '.mkv',
        '.mp3', '.wav', '.ogg', '.aac', '.flac',
        '.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx'
    ],

    // Настройки хранения
    bucketName: 'documents',
    cleanupTempFiles: true,
    enableVersioning: true,

    // Настройки валидации
    scanForMalware: true,
    validateFileHeaders: true,
    checkFileSignature: true
};

/**
 * Функция для получения конфигурации модуля по имени
 * @param {string} moduleName - Имя модуля
 * @returns {Object|null} - Конфигурация модуля или null если не найден
 */
function getModuleConfig(moduleName) {
    return FILE_MODULES[moduleName] || null;
}

/**
 * Функция для проверки, существует ли модуль
 * @param {string} moduleName - Имя модуля
 * @returns {boolean} - true если модуль существует
 */
function isValidModule(moduleName) {
    return FILE_MODULES.hasOwnProperty(moduleName);
}

/**
 * Функция для получения всех доступных модулей
 * @returns {Array} - Массив доступных модулей
 */
function getAvailableModules() {
    return Object.keys(FILE_MODULES).map(key => ({
        code: key,
        name: FILE_MODULES[key].name,
        module: FILE_MODULES[key].module,
        description: FILE_MODULES[key].description
    }));
}

/**
 * Функция для валидации файла по модулю
 * @param {string} moduleName - Имя модуля
 * @param {Object} file - Объект файла
 * @param {number} dbMaxSizeMb - Максимальный размер из БД в МБ (опционально)
 * @returns {Object} - Результат валидации {valid: boolean, error?: string}
 */
function validateFileForModule(moduleName, file, dbMaxSizeMb = null) {
    const config = getModuleConfig(moduleName);
    if (!config) {
        return { valid: false, error: 'Неизвестный модуль файлов' };
    }

    const { allowedMimeTypes, maxFiles } = config;

    // Проверяем MIME тип
    if (!allowedMimeTypes.includes(file.mimetype)) {
        return { valid: false, error: `Недопустимый тип файла: ${file.mimetype}` };
    }

    // Проверяем расширение
    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    const isValidExtension = config.allowedFileTypes.document?.extensions?.includes(ext) ||
        config.allowedFileTypes.image?.extensions?.includes(ext) ||
        config.allowedFileTypes.video?.extensions?.includes(ext) ||
        config.allowedFileTypes.audio?.extensions?.includes(ext);

    if (!isValidExtension) {
        return { valid: false, error: `Недопустимое расширение файла: ${ext}` };
    }

    // Определяем тип файла для проверки размера
    const fileType = getFileTypeByMime(file.mimetype);

    // Получаем максимальный размер из конфига модуля
    let configMaxSize = config.allowedFileTypes[fileType]?.maxSize || 1024 * 1024 * 1024; // По умолчанию 1GB

    // Если передан размер из БД, используем минимальное значение
    if (dbMaxSizeMb !== null && dbMaxSizeMb !== undefined) {
        const dbMaxSizeBytes = dbMaxSizeMb * 1024 * 1024;
        configMaxSize = Math.min(configMaxSize, dbMaxSizeBytes);
    }

    if (file.size > configMaxSize) {
        const maxSizeMB = Math.floor(configMaxSize / 1024 / 1024);
        return { valid: false, error: `Файл превышает допустимый размер (${maxSizeMB}MB)` };
    }

    return { valid: true };
}

/**
 * Функция для определения типа файла по MIME
 * @param {string} mimeType - MIME тип файла
 * @returns {string|null} - Тип файла или null
 */
function getFileTypeByMime(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('text') ||
        mimeType.includes('spreadsheet') || mimeType.includes('presentation')) {
        return 'document';
    }
    return null;
}

/**
 * Функция для генерации пути сохранения файла
 * @param {string} moduleName - Имя модуля
 * @param {string} recordId - ID записи или code_name
 * @param {string} filename - Имя файла
 * @returns {string} - Путь для сохранения
 */
function generateFilePath(moduleName, recordId, filename) {
    const config = getModuleConfig(moduleName);
    if (!config) {
        throw new Error('Неизвестный модуль файлов');
    }

    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Добавляем подпапку если указана в конфигурации
    const subFolder = config.subFolder ? `/${config.subFolder}` : '';

    return `${config.storagePath}/${recordId}${subFolder}/${timestamp}_${sanitizedFilename}`;
}

/**
 * Генерирует путь для одиночного системного файла
 * @param {string} codeName - Кодовое имя записи
 * @param {string} filename - Имя файла
 * @returns {string} - Путь для сохранения
 */
function generateSingleFilePath(codeName, filename) {
    const config = getModuleConfig('single_system_files');
    if (!config) {
        throw new Error('Модуль single_system_files не найден');
    }

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${config.storagePath}/${codeName}/${sanitizedFilename}`;
}

/**
 * Генерирует путь для одиночного системного файла с timestamp
 * @param {string} codeName - Кодовое имя записи
 * @param {string} filename - Имя файла
 * @returns {string} - Путь для сохранения с timestamp
 */
function generateSingleFilePathWithTimestamp(codeName, filename) {
    const config = getModuleConfig('single_system_files');
    if (!config) {
        throw new Error('Модуль single_system_files не найден');
    }

    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${config.storagePath}/${codeName}/${timestamp}_${sanitizedFilename}`;
}

function getFilePathByName(moduleName, recordId, filename) {
    const config = getModuleConfig(moduleName);
    if (!config) {
        throw new Error('Неизвестный модуль файлов');
    }

    // Добавляем подпапку если указана в конфигурации
    const subFolder = config.subFolder ? `/${config.subFolder}` : '';

    return `${config.storagePath}/${recordId}${subFolder}/${filename}`;
}

/**
 * Функция для определения типа файла по расширению
 * @param {string} filename - Имя файла с расширением
 * @returns {string} - Тип файла: 'image', 'video', 'audio' или 'document'
 */
function getFileTypeByExtension(filename) {
    // Получаем расширение файла в нижнем регистре
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));

    // Расширения для изображений
    const imageExtensions = [
        '.jpg', '.jpeg', '.jpe', '.jfif',
        '.png', '.apng',
        '.gif',
        '.bmp', '.dib',
        '.tiff', '.tif',
        '.webp', '.avif', '.jxl',
        '.psd', '.psb',
        '.raw', '.cr2', '.nef', '.arw', '.dng', '.orf', '.rw2', '.pef', '.sr2', '.srf',
        '.svg', '.svgz',
        '.ico', '.cur',
        '.heic', '.heif',
        '.eps', '.pict', '.pct', '.pic',
        '.tga', '.pcx', '.exr', '.hdr', '.exif'
    ];

    // Расширения для видео
    const videoExtensions = [
        '.mp4', '.m4v', '.mov', '.qt',
        '.webm',
        '.avi', '.divx',
        '.mkv', '.mka',
        '.wmv',
        '.flv', '.f4v',
        '.mpeg', '.mpg', '.mpe', '.m1v', '.m2v',
        '.3gp', '.3g2', '.3gpp',
        '.ts', '.mts', '.m2ts',
        '.ogv',
        '.vob', '.rm', '.rmvb', '.asf', '.dat', '.mpv', '.m2v'
    ];

    // Расширения для аудио
    const audioExtensions = [
        '.mp3', '.m4a', '.m4b',
        '.wav', '.wave',
        '.ogg', '.oga',
        '.flac',
        '.aac',
        '.wma', '.wmv',
        '.aiff', '.aif', '.aifc',
        '.opus',
        '.mid', '.midi',
        '.ac3', '.dts',
        '.alac',
        '.ape', '.apl',
        '.mka', '.mkv',
        '.webm',
        '.amr', '.awb',
        '.gsm',
        '.voc', '.au'
    ];

    // Расширения для документов
    const documentExtensions = [
        '.pdf', '.pdfa',
        '.doc', '.dot', '.docx', '.docm', '.dotx', '.dotm',
        '.xls', '.xlsx', '.xlsm', '.xlsb',
        '.ppt', '.pptx', '.pptm', '.potx', '.potm', '.ppam', '.ppsx', '.ppsm',
        '.vsd', '.vsdx', '.vss', '.vst',
        '.mpp', '.mpt',
        '.odt', '.ott', '.odm',
        '.ods', '.ots',
        '.odp', '.otp',
        '.odg', '.otg',
        '.odf',
        '.txt', '.text', '.log',
        '.rtf', '.rtfd',
        '.csv',
        '.xml', '.xsl', '.xslt',
        '.json', '.yaml', '.yml',
        '.ini', '.cfg', '.conf', '.config',
        '.html', '.htm', '.xhtml', '.shtml', '.stm',
        '.css', '.scss', '.sass', '.less',
        '.js', '.mjs', '.cjs', '.ts', '.tsx',
        '.md', '.markdown', '.rst', '.tex', '.latex',
        '.zip', '.7z', '.rar', '.tar', '.gz', '.bz2', '.xz', '.zst',
        '.iso', '.img', '.dmg', '.vmdk', '.vhd',
        '.ttf', '.otf', '.woff', '.woff2', '.eot', '.fnt', '.fon',
        '.ps', '.eps', '.ai', '.indd', '.idml',
        '.pub',
        '.msg', '.eml', '.pst', '.ost',
        '.prn',
        '.wpd', '.wps',
        '.abw', '.zabw',
        '.djvu', '.djv',
        '.fb2', '.fbz',
        '.chm', '.hlp',
        '.man', '.me', '.ms',
        '.tif', '.tiff'
    ];

    // Проверяем расширение
    if (imageExtensions.includes(ext)) {
        return 'image';
    }

    if (videoExtensions.includes(ext)) {
        return 'video';
    }

    if (audioExtensions.includes(ext)) {
        return 'audio';
    }

    if (documentExtensions.includes(ext)) {
        return 'document';
    }

    // Если расширение не найдено, возвращаем 'document' по умолчанию
    return 'document';
}

module.exports = {
    FILE_MODULES,
    COMMON_SETTINGS,
    getModuleConfig,
    isValidModule,
    getAvailableModules,
    validateFileForModule,
    getFileTypeByMime,
    generateFilePath,
    generateSingleFilePath,
    generateSingleFilePathWithTimestamp,
    getFilePathByName,
    getFileTypeByExtension
};
