const fs = require('fs').promises;
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { DEFAULT_COMPRESSION_SETTINGS } = require('../constants');

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Сжимает видео с ОБЯЗАТЕЛЬНЫМ сохранением пропорций (защита от сплющивания вертикальных видео)
 */
async function compressVideo(inputPath, outputPath, options = {}) {
    const settings = { ...DEFAULT_COMPRESSION_SETTINGS.video, ...options };

    if (!settings.enabled) {
        const stats = await fs.stat(inputPath);
        return { originalSize: stats.size, compressedSize: stats.size, compressionRatio: 0 };
    }

    const originalStats = await fs.stat(inputPath);
    const originalSize = originalStats.size;

    return new Promise((resolve) => {
        try {
            const command = ffmpeg(inputPath);

            //  КРИТИЧЕСКИ ВАЖНО: Умное масштабирование вместо жесткого command.size()
            // Это предотвращает сплющивание вертикальных видео с телефонов.
            const [maxW, maxH] = settings.resolution.split('x');
            const scaleFilter = `scale='min(${maxW},iw)':'min(${maxH},ih)':force_original_aspect_ratio=decrease`;

            command.outputOptions([
                `-c:v ${settings.videoCodec}`,
                `-crf ${settings.crf}`,
                `-preset ${settings.preset}`,
                `-vf ${scaleFilter}`, // Применяем безопасный фильтр масштабирования
                `-c:a ${settings.audioCodec}`,
                `-b:a ${settings.audioBitrate}`,
                '-movflags +faststart', // Оптимизация для веб-воспроизведения
                '-pix_fmt yuv420p',     // Максимальная совместимость с плеерами
                '-y'                    // Перезаписывать выходной файл без запроса
            ]);

            command.output(outputPath);

            command.on('end', async () => {
                try {
                    const compressedStats = await fs.stat(outputPath);
                    const compressedSize = compressedStats.size;

                    //  ЗАЩИТА: Если сжатый файл больше или равен оригиналу, удаляем его и возвращаем оригинал
                    if (compressedSize >= originalSize) {
                        await fs.unlink(outputPath).catch(() => { });
                        resolve({ originalSize, compressedSize: originalSize, compressionRatio: 0 });
                    } else {
                        resolve({
                            originalSize,
                            compressedSize,
                            compressionRatio: ((originalSize - compressedSize) / originalSize * 100).toFixed(2)
                        });
                    }
                } catch (statError) {
                    resolve({ originalSize, compressedSize: originalSize, compressionRatio: 0, error: statError.message });
                }
            });

            command.on('error', async (error) => {
                console.error('Ошибка сжатия видео:', error.message);
                await fs.unlink(outputPath).catch(() => { });
                resolve({ originalSize, compressedSize: originalSize, compressionRatio: 0, error: error.message });
            });

            command.run();

        } catch (error) {
            console.error('Ошибка инициализации сжатия видео:', error);
            resolve({ originalSize, compressedSize: originalSize, compressionRatio: 0, error: error.message });
        }
    });
}

module.exports = { compressVideo };