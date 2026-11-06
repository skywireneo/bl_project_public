const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const { DEFAULT_METADATA_SETTINGS, SERVICE_NAME } = require('../constants');

const execAsync = promisify(exec);

/**
 * Очищает метаданные изображения через системный ExifTool.
 * Принимает Buffer, сохраняет во временный файл, обрабатывает и возвращает очищенный Buffer.
 * Гарантирует удаление ВСЕХ метаданных БЕЗ перекодирования (сохраняет 100% качества).
 */
async function cleanImageMetadata(inputBuffer, mimeType, options = {}) {
    const settings = { ...DEFAULT_METADATA_SETTINGS, ...options };

    let tempFilePath = null;

    try {
        const originalSize = inputBuffer.length;
        const formatInfo = getFormatInfo(mimeType);

        // Создаем временный файл в системной temp-папке
        const tempDir = os.tmpdir();
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        tempFilePath = path.join(tempDir, `metadata_temp_${timestamp}_${random}${formatInfo.extension}`);

        console.log('[DEBUG] Запись изображения во временный файл для ExifTool:', tempFilePath);

        // 1. Записываем буфер во временный файл
        await fs.writeFile(tempFilePath, inputBuffer);

        const author = settings.setAuthor || SERVICE_NAME;

        // 2. Формируем команду для системного ExifTool
        // -all= удаляет ВСЕ метаданные (включая GPS, модель телефона и т.д.)
        // -overwrite_original перезаписывает файл на месте
        const exiftoolCmd = `exiftool -all= -overwrite_original -Artist="${author}" -Software="${SERVICE_NAME}" -Creator="${author}" "${tempFilePath}"`;

        console.log('[DEBUG] Выполняется команда:', exiftoolCmd);

        // 3. Выполняем команду
        await execAsync(exiftoolCmd);

        // 4. Удаляем резервную копию, которую создает ExifTool (суффикс _original)
        const backupPath = `${tempFilePath}_original`;
        await fs.unlink(backupPath).catch(() => {
            console.warn('[WARN] Не удалось удалить резервную копию ExifTool:', backupPath);
        });

        // 5. Читаем очищенный файл обратно в буфер
        const cleanedBuffer = await fs.readFile(tempFilePath);
        console.log('[DEBUG] Метаданные изображения успешно очищены через системный ExifTool');

        return {
            buffer: cleanedBuffer,
            originalSize,
            cleanedSize: cleanedBuffer.length,
            cleaned: true,
            format: formatInfo.format
        };

    } catch (error) {
        console.error('Ошибка очистки метаданных изображения через ExifTool:', error);
        return {
            buffer: inputBuffer,
            originalSize: inputBuffer.length,
            cleanedSize: inputBuffer.length,
            cleaned: false,
            error: error.message
        };
    } finally {
        // 6. Гарантированная очистка временного файла
        if (tempFilePath) {
            await fs.unlink(tempFilePath).catch(() => { });
            // И на всякий случай пробуем удалить backup, если он вдруг остался
            await fs.unlink(`${tempFilePath}_original`).catch(() => { });
        }
    }
}

/**
 * Получает информацию о формате из MIME типа
 */
function getFormatInfo(mimeType) {
    if (mimeType.includes('png')) return { format: 'png', extension: '.png' };
    if (mimeType.includes('webp')) return { format: 'webp', extension: '.webp' };
    if (mimeType.includes('tiff')) return { format: 'tiff', extension: '.tiff' };
    if (mimeType.includes('avif')) return { format: 'avif', extension: '.avif' };
    if (mimeType.includes('gif')) return { format: 'gif', extension: '.gif' };
    if (mimeType.includes('heic') || mimeType.includes('heif')) return { format: 'heic', extension: '.heic' };
    return { format: 'jpeg', extension: '.jpg' };
}

module.exports = { cleanImageMetadata };