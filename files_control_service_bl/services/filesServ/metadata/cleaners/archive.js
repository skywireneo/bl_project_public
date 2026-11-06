const AdmZip = require('adm-zip');

/**
 * Очищает метаданные ZIP-архива на уровне контейнера.
 * ВНИМАНИЕ: Этот метод НЕ очищает метаданные файлов, находящихся ВНУТРИ архива.
 * Для полной очистки содержимого требуется асинхронная распаковка и обработка каждого файла.
 */
async function cleanArchiveMetadata(inputBuffer, options = {}) {
    try {
        const originalSize = inputBuffer.length;
        const oldZip = new AdmZip(inputBuffer);
        const newZip = new AdmZip();

        // Список паттернов мусорных файлов ОС, которые стоит удалять из архивов
        const junkFilePatterns = [
            '.DS_Store',           // macOS
            '__MACOSX/',           // macOS скрытая папка с ресурсами
            'Thumbs.db',           // Windows миниатюры
            'desktop.ini',         // Windows настройки папки
            '.Spotlight-V100/',    // macOS
            '.Trashes/'            // macOS
        ];

        let removedJunkCount = 0;

        oldZip.getEntries().forEach(entry => {
            if (entry.isDirectory) {
                return; // Пропускаем сами папки, добавим их неявно при добавлении файлов
            }

            // Проверяем, является ли файл мусорным
            const isJunk = junkFilePatterns.some(pattern =>
                entry.entryName.includes(pattern)
            );

            if (isJunk) {
                removedJunkCount++;
                return; // Не добавляем мусорный файл в новый архив
            }

            // Добавляем файл в новый архив:
            // - entry.getData(): содержимое файла (остается нетронутым)
            // - "": пустой комментарий к файлу
            // - 0o644: стандартные права чтения/записи (сбрасывает специфичные права ОС)
            newZip.addFile(entry.entryName, entry.getData(), "", 0o644);
        });

        const cleanedBuffer = newZip.toBuffer();

        console.log(`[DEBUG] Архив очищен. Удалено мусорных файлов: ${removedJunkCount}`);

        return {
            buffer: cleanedBuffer,
            originalSize,
            cleanedSize: cleanedBuffer.length,
            cleaned: true,
            warning: removedJunkCount > 0 ? `Удалено ${removedJunkCount} системных файлов ОС. Метаданные внутренних файлов НЕ изменены.` : null
        };
    } catch (error) {
        console.error('Ошибка очистки метаданных архива:', error);
        return {
            buffer: inputBuffer,
            originalSize: inputBuffer.length,
            cleanedSize: inputBuffer.length,
            cleaned: false,
            error: error.message
        };
    }
}

module.exports = { cleanArchiveMetadata };