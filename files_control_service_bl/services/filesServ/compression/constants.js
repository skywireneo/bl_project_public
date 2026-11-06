/**
 * Настройки сжатия по умолчанию
 * Используются как fallback, если в конфиге модуля чего-то не хватает
 */
const DEFAULT_COMPRESSION_SETTINGS = {
    image: {
        enabled: false,
        quality: 80,
        maxWidth: 1920,
        maxHeight: 1080
    },
    video: {
        enabled: false,
        crf: 23, // 18-28: золотая середина (меньше = лучше качество, но больше размер)
        preset: 'medium', // ultrafast, fast, medium, slow, veryslow
        resolution: '1280x720',
        audioBitrate: '128k',
        videoCodec: 'libx264',
        audioCodec: 'aac'
    }
};

module.exports = { DEFAULT_COMPRESSION_SETTINGS };