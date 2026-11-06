const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const { DEFAULT_METADATA_SETTINGS, SERVICE_NAME } = require('../constants');

const execAsync = promisify(exec);

/**
 * Очищает метаданные PDF документа через системный ExifTool.
 * Гарантирует удаление ВСЕХ метаданных: Info dict, XMP, custom streams, annotations metadata.
 * БЕЗ перекодирования — содержание документа остаётся нетронутым.
 */
async function cleanPdfMetadata(inputBuffer, options = {}) {
    const settings = { ...DEFAULT_METADATA_SETTINGS, ...options };

    let tempFilePath = null;

    try {
        const originalSize = inputBuffer.length;

        // Создаём временный файл
        const tempDir = os.tmpdir();
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        tempFilePath = path.join(tempDir, `pdf_temp_${timestamp}_${random}.pdf`);

        console.log('[DEBUG] Запись PDF во временный файл для ExifTool:', tempFilePath);

        // 1. Записываем буфер во временный файл
        await fs.writeFile(tempFilePath, inputBuffer);

        const author = settings.setAuthor || SERVICE_NAME;

        // 2. Формируем команду для системного ExifTool
        // -all= удаляет ВСЁ: Info dict, XMP, custom metadata streams
        // -overwrite_original не создаёт резервную копию
        const exiftoolCmd = `exiftool -all= -overwrite_original -Author="${author}" -Creator="${SERVICE_NAME}" -Producer="${SERVICE_NAME}" "${tempFilePath}"`;

        console.log('[DEBUG] Выполняется команда:', exiftoolCmd);
        await execAsync(exiftoolCmd);

        // 3. Читаем очищенный файл обратно в буфер
        const cleanedBuffer = await fs.readFile(tempFilePath);
        console.log('[DEBUG] Метаданные PDF успешно очищены через ExifTool');

        return {
            buffer: cleanedBuffer,
            originalSize,
            cleanedSize: cleanedBuffer.length,
            cleaned: true
        };

    } catch (error) {
        console.error('Ошибка очистки метаданных PDF через ExifTool:', error);
        return {
            buffer: inputBuffer,
            originalSize: inputBuffer.length,
            cleanedSize: inputBuffer.length,
            cleaned: false,
            error: error.message
        };
    } finally {
        // 4. Гарантированная очистка временного файла
        if (tempFilePath) {
            await fs.unlink(tempFilePath).catch(() => { });
        }
    }
}

module.exports = { cleanPdfMetadata };