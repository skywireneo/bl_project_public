const fs = require('fs').promises;
const { DEFAULT_METADATA_SETTINGS } = require('./constants');
const { getFileType, getMimeType } = require('./utils');

const { cleanImageMetadata } = require('./cleaners/image');
const { cleanMediaMetadata } = require('./cleaners/media');
const { cleanPdfMetadata } = require('./cleaners/pdf');
const { cleanOfficeMetadata } = require('./cleaners/office');
const { cleanArchiveMetadata } = require('./cleaners/archive');

/**
 * Основная функция обработки файла
 */
async function processFileMetadata(filePath, metadataSettings = {}) {
    const settings = { ...DEFAULT_METADATA_SETTINGS, ...metadataSettings };

    if (!settings.enabled) {
        return { processed: false, reason: 'disabled', error: null };
    }

    // Временный файл в той же директории для атомарного rename
    const tempOutputPath = `${filePath}.tmp`;

    try {
        const mimeType = getMimeType(filePath);
        const fileType = getFileType(mimeType);

        if (!fileType) {
            return { processed: false, reason: 'unsupported_type', error: null };
        }

        let result;

        switch (fileType) {
            case 'image': {
                const fileBuffer = await fs.readFile(filePath);
                result = await cleanImageMetadata(fileBuffer, mimeType, settings);
                if (result.cleaned && result.buffer) await fs.writeFile(tempOutputPath, result.buffer);
                break;
            }
            case 'video':
            case 'audio':
                result = await cleanMediaMetadata(filePath, tempOutputPath, settings);
                break;
            case 'pdf': {
                const fileBuffer = await fs.readFile(filePath);
                result = await cleanPdfMetadata(fileBuffer, settings);
                if (result.cleaned && result.buffer) await fs.writeFile(tempOutputPath, result.buffer);
                break;
            }
            case 'office': {
                const fileBuffer = await fs.readFile(filePath);
                result = await cleanOfficeMetadata(fileBuffer, settings);
                if (result.cleaned && result.buffer) await fs.writeFile(tempOutputPath, result.buffer);
                break;
            }
            case 'archive': {
                const fileBuffer = await fs.readFile(filePath);
                result = await cleanArchiveMetadata(fileBuffer, settings);
                if (result.cleaned && result.buffer) await fs.writeFile(tempOutputPath, result.buffer);
                break;
            }
            default:
                return { processed: false, reason: 'unsupported_type', error: null };
        }

        if (result.cleaned) {
            // Атомарная замена оригинала на очищенную версию
            await fs.rename(tempOutputPath, filePath);
            return {
                processed: true,
                originalSize: result.originalSize,
                cleanedSize: result.cleanedSize,
                type: fileType,
                error: null
            };
        } else {
            await fs.unlink(tempOutputPath).catch(() => { });
            return { processed: false, reason: result.error ? 'error' : 'no_changes', error: result.error || null };
        }

    } catch (error) {
        await fs.unlink(tempOutputPath).catch(() => { });
        console.error('Критическая ошибка обработки метаданных:', error);
        return { processed: false, reason: 'error', error: error.message };
    }
}

module.exports = { processFileMetadata };