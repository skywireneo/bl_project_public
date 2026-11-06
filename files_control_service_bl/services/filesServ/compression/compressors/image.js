const sharp = require('sharp');
const fs = require('fs').promises;
const { DEFAULT_COMPRESSION_SETTINGS } = require('../constants');
const { getImageFormat } = require('../utils');

/**
 * Сжимает изображение с сохранением пропорций
 */
async function compressImage(input, options = {}, originalFilename = '') {
    const settings = { ...DEFAULT_COMPRESSION_SETTINGS.image, ...options };

    if (!settings.enabled) {
        const inputBuffer = Buffer.isBuffer(input) ? input : await fs.readFile(input);
        return { buffer: inputBuffer, originalSize: inputBuffer.length, compressedSize: inputBuffer.length, compressionRatio: 0 };
    }

    const inputBuffer = Buffer.isBuffer(input) ? input : await fs.readFile(input);
    const originalSize = inputBuffer.length;

    try {
        let pipeline = sharp(inputBuffer);
        const metadata = await pipeline.metadata();

        //  ИСПОЛЬЗУЕМ НАТИВНЫЙ resize Sharp. 
        // fit: 'inside' автоматически сохраняет пропорции и не увеличивает маленькие изображения.
        if (settings.maxWidth || settings.maxHeight) {
            pipeline = pipeline.resize(settings.maxWidth, settings.maxHeight, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }

        const outputFormat = originalFilename ? getImageFormat(originalFilename) : 'jpeg';
        let formatOptions = {};

        switch (outputFormat) {
            case 'jpeg':
                formatOptions = { quality: settings.quality, progressive: true, mozjpeg: true };
                break;
            case 'png':
                //  Для PNG quality не влияет на визуал, только на уровень сжатия (0-9). Ставим максимум.
                formatOptions = { compressionLevel: 9, progressive: true };
                break;
            case 'webp':
                formatOptions = { quality: settings.quality, effort: 6 };
                break;
            case 'gif':
                // GIF не сжимаем, чтобы не сломать анимацию
                return { buffer: inputBuffer, originalSize, compressedSize: originalSize, compressionRatio: 0 };
            case 'tiff':
                formatOptions = { quality: settings.quality };
                break;
        }

        pipeline = pipeline.toFormat(outputFormat, formatOptions);
        const compressedBuffer = await pipeline.toBuffer();
        const compressedSize = compressedBuffer.length;

        //  ЗАЩИТА: Если сжатый файл больше оригинала, возвращаем оригинал
        if (compressedSize >= originalSize) {
            return { buffer: inputBuffer, originalSize, compressedSize: originalSize, compressionRatio: 0 };
        }

        return {
            buffer: compressedBuffer,
            originalSize,
            compressedSize,
            compressionRatio: ((originalSize - compressedSize) / originalSize * 100).toFixed(2),
            format: outputFormat
        };

    } catch (error) {
        console.error('Ошибка сжатия изображения:', error);
        return { buffer: inputBuffer, originalSize, compressedSize: originalSize, compressionRatio: 0, error: error.message };
    }
}

module.exports = { compressImage };