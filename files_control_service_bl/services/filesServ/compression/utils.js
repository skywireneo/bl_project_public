const path = require('path');

/**
 * Определяет тип файла по MIME (только image или video для сжатия)
 */
function getFileType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return null;
}

/**
 * Определяет формат изображения для Sharp по расширению файла
 */
function getImageFormat(filename) {
    const ext = path.extname(filename).toLowerCase();
    const formatMap = {
        '.jpg': 'jpeg', '.jpeg': 'jpeg', '.jpe': 'jpeg', '.jfif': 'jpeg',
        '.png': 'png', '.apng': 'png',
        '.webp': 'webp',
        '.gif': 'gif',
        '.tiff': 'tiff', '.tif': 'tiff'
    };
    return formatMap[ext] || 'jpeg';
}

module.exports = { getFileType, getImageFormat };