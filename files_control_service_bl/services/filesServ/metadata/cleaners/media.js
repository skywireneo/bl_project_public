const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { DEFAULT_METADATA_SETTINGS, SERVICE_NAME } = require('../constants');

const execAsync = promisify(exec);
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Определяет, является ли файл MP3 по расширению
 */
function isMp3(filePath) {
    return path.extname(filePath).toLowerCase() === '.mp3';
}

/**
 * Очищает метаданные видео или аудио файла.
 * - MP3: через FFmpeg (ExifTool не поддерживает запись MP3 в Debian Bullseye)
 * - Остальные (видео, FLAC, OGG, M4A, WAV...): через системный ExifTool
 */
async function cleanMediaMetadata(inputPath, outputPath, options = {}) {
    const settings = { ...DEFAULT_METADATA_SETTINGS, ...options };

    try {
        const originalStats = await fs.stat(inputPath);
        const originalSize = originalStats.size;
        const author = settings.setAuthor || SERVICE_NAME;

        if (isMp3(inputPath)) {
            // ===== MP3: используем FFmpeg =====
            console.log('[DEBUG] Очистка MP3 через FFmpeg...');

            // Создаем временный файл с правильным расширением .mp3
            const dir = path.dirname(outputPath);
            const tempMp3Path = path.join(dir, `temp_cleaned_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`);

            return new Promise((resolve) => {
                const command = ffmpeg(inputPath);

                command.outputOptions([
                    '-map', '0:a',             // Только аудио-поток
                    '-map_metadata', '-1',      // Удаляем ВСЕ метаданные
                    '-id3v2_version', '0',      // Отключаем ID3v2 полностью
                    '-f', 'mp3',                // Явно указываем формат вывода
                    '-c', 'copy',               // Копирование без перекодирования
                    '-metadata', `artist=${author}`,
                    '-metadata', 'title=',
                    '-metadata', 'album=',
                    '-metadata', 'comment=',
                    '-metadata', 'genre=',
                    '-metadata', 'date=',
                    '-metadata', 'track=',
                    '-metadata', 'copyright='
                ]);

                command.on('end', async () => {
                    try {
                        // Переименовываем временный .mp3 в целевой outputPath
                        await fs.rename(tempMp3Path, outputPath);

                        const cleanedStats = await fs.stat(outputPath);
                        console.log('[DEBUG] MP3 метаданные успешно очищены через FFmpeg');
                        resolve({
                            originalSize,
                            cleanedSize: cleanedStats.size,
                            cleaned: true
                        });
                    } catch (statError) {
                        await fs.unlink(tempMp3Path).catch(() => { });
                        resolve({ originalSize, cleanedSize: originalSize, cleaned: false, error: statError.message });
                    }
                });

                command.on('error', async (error) => {
                    await fs.unlink(tempMp3Path).catch(() => { });
                    console.error('Ошибка очистки MP3 через FFmpeg:', error.message);
                    resolve({ originalSize, cleanedSize: originalSize, cleaned: false, error: error.message });
                });

                // Сохраняем во временный .mp3 файл
                command.save(tempMp3Path);
            });

        } else {
            // ===== Остальные форматы: используем ExifTool =====
            console.log('[DEBUG] Очистка медиа через системный ExifTool...');

            const exiftoolCmd = `exiftool -all= -overwrite_original -Artist="${author}" -Software="${SERVICE_NAME}" -EncodedBy="${SERVICE_NAME}" "${inputPath}"`;

            console.log('[DEBUG] Выполняется команда:', exiftoolCmd);
            await execAsync(exiftoolCmd);

            // Атомарно перемещаем очищенный файл на целевой путь
            await fs.rename(inputPath, outputPath);

            const cleanedStats = await fs.stat(outputPath);
            console.log('[DEBUG] Метаданные медиа успешно очищены через ExifTool');

            return {
                originalSize,
                cleanedSize: cleanedStats.size,
                cleaned: true
            };
        }

    } catch (error) {
        console.error('Ошибка очистки медиа метаданных:', error);
        return {
            originalSize: 0,
            cleanedSize: 0,
            cleaned: false,
            error: error.message
        };
    }
}

module.exports = { cleanMediaMetadata };