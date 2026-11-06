const path = require('path');
const fs = require('fs').promises;
const { compressImage } = require('./compressors/image');
const { compressVideo } = require('./compressors/video');
const { getFileType } = require('./utils');

/**
 * Обрабатывает файл с применением сжатия
 * @param {Object} file - Объект файла (например, из multer)
 * @param {string} tempDirectory - Временная директория
 * @param {Object} moduleCompressionSettings - Настройки сжатия из конфига модуля
 * @returns {Promise<{file: Object, compressionInfo: Object}>}
 */
async function processFileCompression(file, tempDirectory, moduleCompressionSettings = {}) {
    const fullTempPath = path.join(tempDirectory, file.filename);
    const mimeType = file.mimetype;
    const fileType = getFileType(mimeType);

    // Если файл не изображение и не видео, сжатие не применяется
    if (!fileType) {
        return {
            file,
            compressionInfo: { compressed: false, reason: 'unsupported_type', originalSize: file.size, compressedSize: file.size }
        };
    }

    const typeSettings = moduleCompressionSettings[fileType];
    if (!typeSettings || !typeSettings.enabled) {
        return {
            file,
            compressionInfo: { compressed: false, reason: 'compression_disabled', originalSize: file.size, compressedSize: file.size }
        };
    }

    const outputFilename = `compressed_${Date.now()}_${path.basename(file.filename)}`;
    const outputPath = path.join(tempDirectory, outputFilename);

    try {
        let result;

        if (fileType === 'image') {
            result = await compressImage(fullTempPath, typeSettings, file.originalname);

            if (result.buffer && result.compressionRatio > 0) {
                await fs.writeFile(outputPath, result.buffer);
                file.size = result.compressedSize;
                file.compressedPath = outputPath;
                file.compressionInfo = {
                    compressed: true,
                    originalSize: result.originalSize,
                    compressedSize: result.compressedSize,
                    compressionRatio: result.compressionRatio,
                    type: 'image',
                    format: result.format
                };
            } else {
                file.compressionInfo = { compressed: false, reason: 'no_savings', originalSize: file.size, compressedSize: file.size, type: 'image' };
            }

        } else if (fileType === 'video') {
            result = await compressVideo(fullTempPath, outputPath, typeSettings);

            if (result.compressionRatio > 0) {
                file.size = result.compressedSize;
                file.compressedPath = outputPath;
                file.compressionInfo = {
                    compressed: true,
                    originalSize: result.originalSize,
                    compressedSize: result.compressedSize,
                    compressionRatio: result.compressionRatio,
                    type: 'video'
                };
            } else {
                file.compressionInfo = { compressed: false, reason: 'no_savings', originalSize: result.originalSize, compressedSize: result.compressedSize, type: 'video' };
            }
        }

        //  АТОМАРНАЯ ЗАМЕНА: Удаляем оригинал ТОЛЬКО если сжатие прошло успешно и дало экономию
        if (file.compressedPath && file.compressionInfo.compressed) {
            await fs.unlink(fullTempPath).catch(() => { });
            file.path = file.compressedPath;
            file.filename = outputFilename;
        }

        return { file, compressionInfo: file.compressionInfo };

    } catch (error) {
        console.error('Критическая ошибка обработки сжатия файла:', error);
        return {
            file,
            compressionInfo: { compressed: false, reason: 'error', error: error.message, originalSize: file.size, compressedSize: file.size }
        };
    }
}

/**
 * Очищает временные файлы сжатия (если что-то пошло не так)
 */
async function cleanupCompressedFile(filePath) {
    if (filePath && filePath.includes('/tmp/')) {
        await fs.unlink(filePath).catch(() => { });
    }
}

module.exports = {
    processFileCompression,
    cleanupCompressedFile,
    getFileType // Экспортируем для удобства
};