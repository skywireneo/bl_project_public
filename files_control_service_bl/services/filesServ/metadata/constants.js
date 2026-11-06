const SERVICE_NAME = 'BL Security Metadata Cleaner';

const DEFAULT_METADATA_SETTINGS = {
    enabled: false,
    setAuthor: SERVICE_NAME
};

const SUPPORTED_TYPES = {
    image: [
        'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/apng',
        'image/gif', 'image/webp', 'image/tiff', 'image/tif', 'image/bmp',
        'image/x-windows-bmp', 'image/avif', 'image/svg+xml',
        'image/vnd.adobe.photoshop', 'image/x-photoshop', 'image/heic', 'image/heif',
        'image/tga', 'image/x-tga', 'image/pcx', 'image/x-pcx', 'image/x-exr',
        'image/hdr', 'image/x-hdr', 'image/x-icon', 'image/vnd.microsoft.icon'
    ],
    video: [
        'video/mp4', 'video/m4v', 'video/webm', 'video/quicktime', 'video/x-quicktime',
        'video/x-msvideo', 'video/avi', 'video/msvideo', 'video/x-matroska', 'video/mkv',
        'video/x-ms-wmv', 'video/x-flv', 'video/x-f4v', 'video/mpeg', 'video/mpg',
        'video/mpe', 'video/m1v', 'video/m2v', 'video/3gpp', 'video/3gpp2',
        'video/ogg', 'video/ogv', 'video/mp2t', 'video/vnd.dlna.mpeg-tts', 'video/vnd.mpeg.dash.mpd'
    ],
    audio: [
        'audio/mpeg', 'audio/mp3', 'audio/mpeg3', 'audio/x-mpeg-3', 'audio/wav',
        'audio/wave', 'audio/x-wav', 'audio/ogg', 'audio/vorbis', 'audio/flac',
        'audio/aac', 'audio/x-aac', 'audio/m4a', 'audio/x-m4a', 'audio/m4b',
        'audio/windows-media', 'audio/aiff', 'audio/x-aiff', 'audio/opus',
        'audio/webm', 'audio/midi', 'audio/x-midi', 'audio/ac3', 'audio/vnd.dolby.dd-raw',
        'audio/dts', 'audio/alac', 'audio/ape'
    ],
    pdf: ['application/pdf', 'application/x-pdf'],
    office: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint'
    ],
    archive: [
        'application/zip', 'application/x-zip-compressed', 'application/x-7z-compressed',
        'application/vnd.rar', 'application/x-rar-compressed', 'application/x-tar',
        'application/gzip', 'application/x-gzip', 'application/x-bzip2',
        'application/x-xz', 'application/zstd'
    ]
};

const MIME_TYPES_MAP = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.jpe': 'image/jpeg', '.jfif': 'image/jpeg',
    '.png': 'image/png', '.apng': 'image/apng', '.gif': 'image/gif', '.webp': 'image/webp',
    '.tiff': 'image/tiff', '.tif': 'image/tiff', '.bmp': 'image/bmp', '.dib': 'image/bmp',
    '.avif': 'image/avif', '.svg': 'image/svg+xml', '.svgz': 'image/svg+xml',
    '.psd': 'image/vnd.adobe.photoshop', '.psb': 'image/vnd.adobe.photoshop',
    '.heic': 'image/heic', '.heif': 'image/heif', '.ico': 'image/x-icon', '.cur': 'image/x-icon',
    '.tga': 'image/tga', '.pcx': 'image/pcx', '.exr': 'image/x-exr', '.hdr': 'image/hdr',
    '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.f4v': 'video/mp4', '.mov': 'video/quicktime',
    '.qt': 'video/quicktime', '.webm': 'video/webm', '.avi': 'video/x-msvideo', '.divx': 'video/x-msvideo',
    '.mkv': 'video/x-matroska', '.mka': 'video/x-matroska', '.wmv': 'video/x-ms-wmv', '.flv': 'video/x-flv',
    '.mpeg': 'video/mpeg', '.mpg': 'video/mpeg', '.mpe': 'video/mpeg', '.m1v': 'video/mpeg',
    '.m2v': 'video/mpeg', '.3gp': 'video/3gpp', '.3g2': 'video/3gpp', '.ogv': 'video/ogg',
    '.ts': 'video/mp2t', '.mts': 'video/mp2t', '.m2ts': 'video/mp2t', '.vob': 'video/mpeg',
    '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.m4b': 'audio/mp4', '.wav': 'audio/wav',
    '.wave': 'audio/wav', '.ogg': 'audio/ogg', '.oga': 'audio/ogg', '.flac': 'audio/flac',
    '.aac': 'audio/aac', '.wma': 'audio/windows-media', '.aiff': 'audio/aiff', '.aif': 'audio/aiff',
    '.opus': 'audio/opus', '.mid': 'audio/midi', '.midi': 'audio/midi', '.ac3': 'audio/ac3',
    '.pdf': 'application/pdf', '.pdfa': 'application/pdf', '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.zip': 'application/zip', '.zipx': 'application/zip', '.7z': 'application/x-7z-compressed',
    '.rar': 'application/vnd.rar', '.tar': 'application/x-tar', '.gz': 'application/gzip',
    '.tgz': 'application/gzip', '.bz2': 'application/x-bzip2', '.xz': 'application/x-xz',
    '.zst': 'application/zstd', '.txt': 'text/plain', '.rtf': 'application/rtf', '.csv': 'text/csv'
};

module.exports = {
    SERVICE_NAME,
    DEFAULT_METADATA_SETTINGS,
    SUPPORTED_TYPES,
    MIME_TYPES_MAP
};