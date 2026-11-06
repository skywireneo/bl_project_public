/**
 * Сервис для нанесения водяных знаков (вотермарок) на медиафайлы
 * 
 * НОВАЯ СХЕМА: Pre-generated водяные знаки
 * - Копия с вотермаркой создаётся ОДИН РАЗ при создании/обновлении файла
 * - Хранится рядом с оригиналом с суффиксом _wm (например, photo_wm.jpg)
 * - При получении файла просто скачивается готовая копия
 * 
 * Поддерживает:
 * - Изображения (PNG-оверлей + текст)
 * - Видео (PNG-оверлей)
 * - Аудио (наложение джингла через amix)
 */

const sharp = require('sharp');
const { createCanvas } = require('@napi-rs/canvas');
const os = require('os');
const path = require('path');
const fsSync = require('fs');
const fs = require('fs').promises;
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const minioFileManagerService = require('../systemServices/minioFileManagerService');
const { getSettingWithToken } = require('../../grpc/handlers/settingHandler');
const { getModuleConfig } = require('./fileModuleConfig');

ffmpeg.setFfmpegPath(ffmpegPath);

// Константы для водяных знаков
const WATERMARK_CONSTANTS = {
    IMAGE_WATERMARK_DIR: 'documents/single_system_files/watermark/',
    AUDIO_WATERMARK_DIR: 'documents/single_system_files/watermark_audio/',

    WATERMARK_CACHE_TTL_MS: 5 * 60 * 1000,
    WATERMARK_OPACITY: 0.4,

    ENABLE_VIDEO_WATERMARK: true,
    ENABLE_AUDIO_WATERMARK: true,

    AUDIO_WATERMARK_VOLUME: 0.15,
    AUDIO_WATERMARK_LOOP: true,
    AUDIO_WATERMARK_FADE_IN_MS: 500,
    AUDIO_WATERMARK_FADE_OUT_MS: 2000,

    //  Суффикс для водяных знаков
    WATERMARK_SUFFIX: '_wm'
};

class WatermarkService {
    constructor() {
        this.tempDirectory = os.tmpdir();
        this._watermarkCache = null;
        this._audioWatermarkCache = null;
    }

    // =========================================================================
    // УТИЛИТЫ ДЛЯ ИМЕН ФАЙЛОВ
    // =========================================================================

    /**
     * Сформировать имя файла с водяным знаком
     * photo.jpg → photo_wm.jpg
     * evidence.mp4 → evidence_wm.mp4
     * recording.mp3 → recording_wm.mp3
     */
    getWatermarkFileName(originalFileName) {
        const ext = path.extname(originalFileName);
        const baseName = path.basename(originalFileName, ext);
        return `${baseName}${WATERMARK_CONSTANTS.WATERMARK_SUFFIX}${ext}`;
    }

    /**
     * Проверить, является ли файл водяным знаком
     */
    isWatermarkFile(fileName) {
        const ext = path.extname(fileName);
        const baseName = path.basename(fileName, ext);
        return baseName.endsWith(WATERMARK_CONSTANTS.WATERMARK_SUFFIX);
    }

    /**
     * Проверить, поддерживается ли водяной знак для данного MIME-типа
     */
    isSupportedMediaType(mimeType) {
        return (
            mimeType.startsWith('image/') ||
            mimeType.startsWith('video/') ||
            mimeType.startsWith('audio/')
        );
    }

    // =========================================================================
    // КЭШИРОВАНИЕ ВОДЯНЫХ ЗНАКОВ (ИСТОЧНИКОВ)
    // =========================================================================

    async getWatermarkImage() {
        const now = Date.now();

        if (
            this._watermarkCache &&
            (now - this._watermarkCache.timestamp) < WATERMARK_CONSTANTS.WATERMARK_CACHE_TTL_MS
        ) {
            return this._watermarkCache.buffer;
        }

        // console.log(`[Watermark:Image] Кэш пуст или устарел, загружаем из MinIO...`);

        try {
            const files = await minioFileManagerService.listFiles(
                WATERMARK_CONSTANTS.IMAGE_WATERMARK_DIR
            );

            if (!files || files.length === 0) {
                console.warn(`[Watermark:Image] В папке ${WATERMARK_CONSTANTS.IMAGE_WATERMARK_DIR} не найдено файлов`);
                this._watermarkCache = { buffer: null, timestamp: now, sourcePath: null };
                return null;
            }

            const watermarkPath = files[0];
            // console.log(`[Watermark:Image] Найден: ${watermarkPath}`);

            const rawBuffer = await minioFileManagerService.downloadFile(watermarkPath);

            let pngBuffer = await sharp(rawBuffer)
                .ensureAlpha()
                .png({ quality: 95, compressionLevel: 6 })
                .toBuffer();

            const opacity = WATERMARK_CONSTANTS.WATERMARK_OPACITY;

            if (opacity > 0 && opacity < 1) {
                const alphaValue = Math.round(opacity * 255);
                pngBuffer = await sharp(pngBuffer)
                    .composite([{
                        input: Buffer.from([255, 255, 255, alphaValue]),
                        raw: { width: 1, height: 1, channels: 4 },
                        tile: true,
                        blend: 'dest-in'
                    }])
                    .png({ quality: 95, compressionLevel: 6 })
                    .toBuffer();

                // console.log(`[Watermark:Image] Применена полупрозрачность: ${Math.round(opacity * 100)}%`);
            }

            this._watermarkCache = { buffer: pngBuffer, timestamp: now, sourcePath: watermarkPath };
            return pngBuffer;
        } catch (error) {
            console.error('[Watermark:Image] Ошибка:', error.message);
            this._watermarkCache = {
                buffer: null,
                timestamp: now - WATERMARK_CONSTANTS.WATERMARK_CACHE_TTL_MS + 60000,
                sourcePath: null
            };
            return null;
        }
    }

    async getAudioWatermarkPath() {
        const now = Date.now();

        if (
            this._audioWatermarkCache &&
            (now - this._audioWatermarkCache.timestamp) < WATERMARK_CONSTANTS.WATERMARK_CACHE_TTL_MS
        ) {
            try {
                await fs.access(this._audioWatermarkCache.path);
                return this._audioWatermarkCache.path;
            } catch {
                this._audioWatermarkCache = null;
            }
        }

        // console.log(`[Watermark:Audio] Кэш пуст или устарел, загружаем из MinIO...`);

        try {
            const files = await minioFileManagerService.listFiles(
                WATERMARK_CONSTANTS.AUDIO_WATERMARK_DIR
            );

            if (!files || files.length === 0) {
                console.warn(`[Watermark:Audio] В папке ${WATERMARK_CONSTANTS.AUDIO_WATERMARK_DIR} не найдено аудио-файлов`);
                this._audioWatermarkCache = { path: null, timestamp: now, sourcePath: null };
                return null;
            }

            const watermarkPath = files[0];
            // console.log(`[Watermark:Audio] Найден: ${watermarkPath}`);

            const audioBuffer = await minioFileManagerService.downloadFile(watermarkPath);

            const tempPath = path.join(this.tempDirectory, `audio_watermark_${Date.now()}.mp3`);
            await fs.writeFile(tempPath, audioBuffer);

            // console.log(`[Watermark:Audio] Сохранён во временный файл (${(audioBuffer.length / 1024).toFixed(1)} KB)`);

            this._audioWatermarkCache = { path: tempPath, timestamp: now, sourcePath: watermarkPath };
            return tempPath;
        } catch (error) {
            console.error('[Watermark:Audio] Ошибка:', error.message);
            this._audioWatermarkCache = {
                path: null,
                timestamp: now - WATERMARK_CONSTANTS.WATERMARK_CACHE_TTL_MS + 60000,
                sourcePath: null
            };
            return null;
        }
    }

    clearWatermarkCache() {
        this._watermarkCache = null;
        if (this._audioWatermarkCache?.path) {
            fs.unlink(this._audioWatermarkCache.path).catch(() => { });
        }
        this._audioWatermarkCache = null;
        // console.log('[Watermark] Все кэши очищены');
    }

    // =========================================================================
    // ПРОВЕРКА НЕОБХОДИМОСТИ ВОДЯНОГО ЗНАКА
    // =========================================================================

    async shouldAddWatermark(moduleName, recordId) {
        try {
            const config = getModuleConfig(moduleName);
            if (!config || !config.requiresWatermark) return false;

            const useWatermarks = await getSettingWithToken("use_watermarks");
            if (useWatermarks === "false") return false;

            return true;
        } catch (error) {
            console.error('Ошибка проверки необходимости вотермарки:', error);
            return false;
        }
    }

    async shouldAddWatermarkToVideo(moduleName, recordId) {
        if (!WATERMARK_CONSTANTS.ENABLE_VIDEO_WATERMARK) return false;
        if (!(await this.shouldAddWatermark(moduleName, recordId))) return false;

        try {
            const useVideoWatermarks = await getSettingWithToken("use_watermarks_video");
            if (useVideoWatermarks === "false") return false;
        } catch (error) { /* используем константу */ }

        return true;
    }

    async shouldAddWatermarkToAudio(moduleName, recordId) {
        if (!WATERMARK_CONSTANTS.ENABLE_AUDIO_WATERMARK) return false;
        if (!(await this.shouldAddWatermark(moduleName, recordId))) return false;

        try {
            const useAudioWatermarks = await getSettingWithToken("use_watermarks_audio");
            if (useAudioWatermarks === "false") return false;
        } catch (error) { /* используем константу */ }

        return true;
    }

    // =========================================================================
    //  ГЛАВНЫЕ МЕТОДЫ ДЛЯ PRE-GENERATED ВОДЯНЫХ ЗНАКОВ
    // =========================================================================

    /**
     * Создать копию файла с водяным знаком и загрузить в MinIO
     * 
     * @param {string} moduleName - Имя модуля
     * @param {string} recordId - ID записи
     * @param {string} originalFileName - Имя оригинального файла
     * @param {string} mimeType - MIME тип
     * @param {string} originalMinioPath - Полный путь к оригиналу в MinIO
     * @returns {Promise<{success: boolean, watermarkFileName: string|null, watermarkPath: string|null, error: string|null}>}
     */
    async createWatermarkCopy(moduleName, recordId, originalFileName, mimeType, originalMinioPath) {
        const startTime = Date.now();
        const watermarkFileName = this.getWatermarkFileName(originalFileName);

        // Вычисляем путь для вотермарк-файла (рядом с оригиналом)
        const originalDir = path.dirname(originalMinioPath);
        const watermarkMinioPath = `${originalDir}/${watermarkFileName}`.replace(/\/+/g, '/');

        // console.log(`[Watermark:Create] Начало создания копии: ${originalFileName} → ${watermarkFileName}`);

        // Проверяем, поддерживается ли тип
        if (!this.isSupportedMediaType(mimeType)) {
            // console.log(`[Watermark:Create] MIME-тип ${mimeType} не поддерживается для вотермарок`);
            return { success: false, watermarkFileName: null, watermarkPath: null, error: 'unsupported_type' };
        }

        // Проверяем, нужно ли создавать вотермарк для данного типа
        let shouldCreate = false;
        if (mimeType.startsWith('image/')) {
            shouldCreate = await this.shouldAddWatermark(moduleName, recordId);
        } else if (mimeType.startsWith('video/')) {
            shouldCreate = await this.shouldAddWatermarkToVideo(moduleName, recordId);
        } else if (mimeType.startsWith('audio/')) {
            shouldCreate = await this.shouldAddWatermarkToAudio(moduleName, recordId);
        }

        if (!shouldCreate) {
            // console.log(`[Watermark:Create] Пропущен (отключён для ${mimeType})`);
            return { success: false, watermarkFileName: null, watermarkPath: null, error: 'disabled' };
        }

        let tempOriginalPath = null;
        let tempWatermarkedPath = null;

        try {
            // 1. Скачиваем оригинал
            const originalBuffer = await minioFileManagerService.downloadFile(originalMinioPath);

            // 2. Сохраняем во временный файл
            tempOriginalPath = path.join(this.tempDirectory, `original_${Date.now()}_${originalFileName}`);
            tempWatermarkedPath = path.join(this.tempDirectory, `watermarked_${Date.now()}_${watermarkFileName}`);
            await fs.writeFile(tempOriginalPath, originalBuffer);

            // 3. Применяем водяной знак
            if (mimeType.startsWith('image/')) {
                await this.addWatermarkToImage(tempOriginalPath, tempWatermarkedPath);
            } else if (mimeType.startsWith('video/')) {
                await this.addWatermarkToVideo(tempOriginalPath, tempWatermarkedPath);
            } else if (mimeType.startsWith('audio/')) {
                await this.addWatermarkToAudio(tempOriginalPath, tempWatermarkedPath);
            }

            // 4.  Читаем буфер из временного файла
            const watermarkedBuffer = await fs.readFile(tempWatermarkedPath);

            // 5.  Загружаем в MinIO напрямую с ПРАВИЛЬНЫМ именем (через uploadBuffer)
            // Это гарантирует что файл будет сохранён как "photo_wm.jpg", а не "watermarked_123456_photo_wm.jpg"
            await minioFileManagerService.uploadBuffer(watermarkedBuffer, watermarkMinioPath);

            const duration = Date.now() - startTime;
            // console.log(`[Watermark:Create]  Создан: ${watermarkFileName} за ${duration}ms`);

            return {
                success: true,
                watermarkFileName: watermarkFileName,
                watermarkPath: watermarkMinioPath,
                error: null
            };
        } catch (error) {
            console.error(`[Watermark:Create] ❌ Ошибка: ${error.message}`);
            return {
                success: false,
                watermarkFileName: watermarkFileName,
                watermarkPath: null,
                error: error.message
            };
        } finally {
            // 5. Очищаем временные файлы
            if (tempOriginalPath) await fs.unlink(tempOriginalPath).catch(() => { });
            if (tempWatermarkedPath) await fs.unlink(tempWatermarkedPath).catch(() => { });
        }
    }

    /**
     * Удалить копию с водяным знаком из MinIO
     * 
     * @param {string} originalMinioPath - Путь к оригиналу
     * @returns {Promise<boolean>} - true если удалено
     */
    async deleteWatermarkCopy(originalMinioPath) {
        const originalFileName = path.basename(originalMinioPath);
        const watermarkFileName = this.getWatermarkFileName(originalFileName);
        const originalDir = path.dirname(originalMinioPath);
        const watermarkMinioPath = `${originalDir}/${watermarkFileName}`.replace(/\/+/g, '/');

        try {
            await minioFileManagerService.deleteFile(watermarkMinioPath);
            // console.log(`[Watermark:Delete]  Удалён: ${watermarkFileName}`);
            return true;
        } catch (error) {
            // Файл мог не существовать — это нормально
            if (error.message?.includes('not found') || error.code === 'NotFound') {
                // console.log(`[Watermark:Delete] Файл ${watermarkFileName} не существовал`);
                return false;
            }
            console.error(`[Watermark:Delete] ❌ Ошибка: ${error.message}`);
            return false;
        }
    }

    /**
     * Проверить существование копии с водяным знаком в MinIO
     */
    async watermarkCopyExists(originalMinioPath) {
        const originalFileName = path.basename(originalMinioPath);
        const watermarkFileName = this.getWatermarkFileName(originalFileName);
        const originalDir = path.dirname(originalMinioPath);
        const watermarkMinioPath = `${originalDir}/${watermarkFileName}`.replace(/\/+/g, '/');

        try {
            await minioFileManagerService.minioClient.statObject(
                minioFileManagerService.BUCKET_NAME,
                watermarkMinioPath
            );
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Получить путь к водяному знаку, если он существует, иначе путь к оригиналу
     */
    async getWatermarkedOrOriginalPath(originalMinioPath) {
        const exists = await this.watermarkCopyExists(originalMinioPath);
        if (!exists) {
            return { path: originalMinioPath, isWatermarked: false };
        }

        const originalFileName = path.basename(originalMinioPath);
        const watermarkFileName = this.getWatermarkFileName(originalFileName);
        const originalDir = path.dirname(originalMinioPath);
        const watermarkMinioPath = `${originalDir}/${watermarkFileName}`.replace(/\/+/g, '/');

        return { path: watermarkMinioPath, isWatermarked: true };
    }

    // =========================================================================
    //  МАССОВЫЕ ОПЕРАЦИИ
    // =========================================================================

    /**
     * Перегенерация всех водяных знаков (удалить старые + создать новые)
     * Используется когда изменились настройки водяных знаков
     * 
     * @param {string} [moduleName] - Опционально: конкретный модуль
     * @returns {Promise<Object>} - статистика операции
     */
    async regenerateAllWatermarks(moduleName = null) {
        const startTime = Date.now();
        // console.log(`[Watermark:Regenerate] Начало перегенерации${moduleName ? ` для ${moduleName}` : ' для всех модулей'}`);

        let query = `SELECT id, module, record_id, file_name, mimetype FROM files`;
        const params = [];

        if (moduleName) {
            query += ` WHERE module = $1`;
            params.push(moduleName);
        }

        const { default: queryService } = await import('../systemServices/queryService.js').catch(() => {
            return { default: require('../systemServices/queryService') };
        });
        const queryServiceInstance = queryService.default || queryService;

        const result = await queryServiceInstance.query(query, params);
        const files = result.rows;

        // console.log(`[Watermark:Regenerate] Найдено файлов: ${files.length}`);

        let deleted = 0;
        let created = 0;
        let skipped = 0;
        let failed = 0;

        for (const file of files) {
            // Пропускаем сами вотермарк-файлы (если они как-то попали в таблицу)
            if (this.isWatermarkFile(file.file_name)) {
                skipped++;
                continue;
            }

            if (!this.isSupportedMediaType(file.mimetype)) {
                skipped++;
                continue;
            }

            try {
                const config = getModuleConfig(file.module);
                if (!config) {
                    skipped++;
                    continue;
                }

                const originalPath = `${config.storagePath}/${file.record_id}/${file.file_name}`.replace(/\/+/g, '/');

                // Удаляем старую копию
                const deleteResult = await this.deleteWatermarkCopy(originalPath);
                if (deleteResult) deleted++;

                // Создаём новую
                const createResult = await this.createWatermarkCopy(
                    file.module,
                    file.record_id,
                    file.file_name,
                    file.mimetype,
                    originalPath
                );

                if (createResult.success) {
                    created++;
                } else if (createResult.error === 'disabled' || createResult.error === 'unsupported_type') {
                    skipped++;
                } else {
                    failed++;
                }
            } catch (error) {
                console.error(`[Watermark:Regenerate] Ошибка для ${file.file_name}:`, error.message);
                failed++;
            }
        }

        const duration = Date.now() - startTime;
        const stats = {
            total: files.length,
            deleted,
            created,
            skipped,
            failed,
            durationMs: duration
        };

        // console.log(`[Watermark:Regenerate]  Готово за ${duration}ms:`, stats);
        return stats;
    }

    /**
     * Удалить все копии с водяными знаками
     */
    async deleteAllWatermarks(moduleName = null) {
        const startTime = Date.now();
        // console.log(`[Watermark:DeleteAll] Начало удаления всех вотермарок${moduleName ? ` для ${moduleName}` : ''}`);

        let query = `SELECT id, module, record_id, file_name, mimetype FROM files`;
        const params = [];

        if (moduleName) {
            query += ` WHERE module = $1`;
            params.push(moduleName);
        }

        const queryService = require('../systemServices/queryService');
        const result = await queryService.query(query, params);
        const files = result.rows;

        let deleted = 0;
        let skipped = 0;
        let failed = 0;

        for (const file of files) {
            if (this.isWatermarkFile(file.file_name) || !this.isSupportedMediaType(file.mimetype)) {
                skipped++;
                continue;
            }

            try {
                const config = getModuleConfig(file.module);
                if (!config) { skipped++; continue; }

                const originalPath = `${config.storagePath}/${file.record_id}/${file.file_name}`.replace(/\/+/g, '/');
                const deleteResult = await this.deleteWatermarkCopy(originalPath);

                if (deleteResult) deleted++;
                else skipped++;
            } catch (error) {
                console.error(`[Watermark:DeleteAll] Ошибка для ${file.file_name}:`, error.message);
                failed++;
            }
        }

        const duration = Date.now() - startTime;
        const stats = { total: files.length, deleted, skipped, failed, durationMs: duration };

        // console.log(`[Watermark:DeleteAll]  Готово за ${duration}ms:`, stats);
        return stats;
    }

    /**
     * Создать недостающие копии с водяными знаками
     * Пропускает файлы, у которых копия уже есть
     */
    async createMissingWatermarks(moduleName = null) {
        const startTime = Date.now();
        // console.log(`[Watermark:CreateMissing] Начало создания недостающих вотермарок${moduleName ? ` для ${moduleName}` : ''}`);

        let query = `SELECT id, module, record_id, file_name, mimetype FROM files`;
        const params = [];

        if (moduleName) {
            query += ` WHERE module = $1`;
            params.push(moduleName);
        }

        const queryService = require('../systemServices/queryService');
        const result = await queryService.query(query, params);
        const files = result.rows;

        let created = 0;
        let skipped = 0;
        let alreadyExists = 0;
        let failed = 0;

        for (const file of files) {
            if (this.isWatermarkFile(file.file_name) || !this.isSupportedMediaType(file.mimetype)) {
                skipped++;
                continue;
            }

            try {
                const config = getModuleConfig(file.module);
                if (!config) { skipped++; continue; }

                const originalPath = `${config.storagePath}/${file.record_id}/${file.file_name}`.replace(/\/+/g, '/');

                // Проверяем существование
                const exists = await this.watermarkCopyExists(originalPath);
                if (exists) {
                    alreadyExists++;
                    continue;
                }

                // Создаём
                const createResult = await this.createWatermarkCopy(
                    file.module,
                    file.record_id,
                    file.file_name,
                    file.mimetype,
                    originalPath
                );

                if (createResult.success) {
                    created++;
                } else if (createResult.error === 'disabled' || createResult.error === 'unsupported_type') {
                    skipped++;
                } else {
                    failed++;
                }
            } catch (error) {
                console.error(`[Watermark:CreateMissing] Ошибка для ${file.file_name}:`, error.message);
                failed++;
            }
        }

        const duration = Date.now() - startTime;
        const stats = { total: files.length, created, alreadyExists, skipped, failed, durationMs: duration };

        // console.log(`[Watermark:CreateMissing]  Готово за ${duration}ms:`, stats);
        return stats;
    }

    // =========================================================================
    // МЕТОДЫ НАНЕСЕНИЯ ВОДЯНЫХ ЗНАКОВ (для конкретного файла)
    // =========================================================================

    async addWatermarkToImage(inputPath, outputPath) {
        try {
            const image = sharp(inputPath);
            const metadata = await image.metadata();

            let watermarkImage = null;
            try {
                const watermarkBuffer = await this.getWatermarkImage();
                if (watermarkBuffer) {
                    watermarkImage = sharp(watermarkBuffer);
                }
            } catch (error) {
                console.warn('PNG недоступен:', error.message);
            }

            const textWatermark = await this.createTextWatermark(metadata.width, metadata.height);
            let composite = [];

            if (watermarkImage) {
                const watermarkMetadata = await watermarkImage.metadata();

                if (await getSettingWithToken("center_watermark") !== "false") {
                    const watermarkHeight = Math.floor(metadata.height * 0.3);
                    const watermarkWidth = Math.floor(watermarkMetadata.width * (watermarkHeight / watermarkMetadata.height));
                    const centerLeft = Math.floor((metadata.width - watermarkWidth) / 2);
                    const centerTop = Math.floor((metadata.height - watermarkHeight) / 2);

                    const lightWatermark = await watermarkImage
                        .resize(watermarkWidth, watermarkHeight, { fit: 'contain' })
                        .modulate({ brightness: 1.8, saturation: 0.3, hue: 0 })
                        .toBuffer();

                    composite.push({
                        input: lightWatermark,
                        gravity: 'northwest',
                        left: centerLeft,
                        top: centerTop,
                        blend: 'soft-light'
                    });
                } else {
                    const watermarkWidth = Math.floor(metadata.width * 0.2);
                    const watermarkHeight = Math.floor(watermarkMetadata.height * (watermarkWidth / watermarkMetadata.width));

                    composite.push({
                        input: await watermarkImage
                            .resize(watermarkWidth, watermarkHeight, { fit: 'contain' })
                            .toBuffer(),
                        gravity: 'northwest',
                        left: 10,
                        top: metadata.height - watermarkHeight - 10,
                        blend: 'over'
                    });
                }
            }

            if (textWatermark) {
                composite.push({
                    input: textWatermark,
                    gravity: 'south',
                    left: 0,
                    top: 20,
                    blend: 'over'
                });
            }

            await image.composite(composite).jpeg({ quality: 95 }).toFile(outputPath);
            return outputPath;
        } catch (error) {
            console.error('Ошибка addWatermarkToImage:', error);
            await fs.copyFile(inputPath, outputPath);
            return outputPath;
        }
    }

    async createTextWatermark(imageWidth, imageHeight) {
        try {
            const TEXT_WATERMARK = await getSettingWithToken("watermark_text");
            if (!TEXT_WATERMARK) return null;

            const canvas = createCanvas(imageWidth, imageHeight);
            const ctx = canvas.getContext('2d');

            const fontSize = Math.max(18, Math.floor(imageWidth * 0.025));
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const x = imageWidth / 2;
            const y = imageHeight - fontSize * 2;

            ctx.strokeText(TEXT_WATERMARK, x, y);
            ctx.fillText(TEXT_WATERMARK, x, y);

            return canvas.toBuffer('image/png');
        } catch (error) {
            console.error('Ошибка создания текстового watermark:', error);
            return null;
        }
    }

    async addWatermarkToVideo(inputPath, outputPath) {
        const startTime = Date.now();

        let watermarkTempPath = null;
        try {
            const pngBuffer = await this.getWatermarkImage();
            if (pngBuffer) {
                watermarkTempPath = path.join(this.tempDirectory, `video_watermark_${Date.now()}.png`);
                await fs.writeFile(watermarkTempPath, pngBuffer);
            }
        } catch (error) {
            console.warn('[Watermark:Video] PNG недоступен:', error.message);
        }

        if (!watermarkTempPath) {
            await fs.copyFile(inputPath, outputPath);
            return outputPath;
        }

        let useCenterWatermark = true;
        try {
            const centerSetting = await getSettingWithToken("center_watermark");
            useCenterWatermark = centerSetting !== "false";
        } catch (e) { }

        return new Promise((resolve) => {
            try {
                const command = ffmpeg(inputPath).input(watermarkTempPath);
                let filterParts;
                let sizePercent;

                if (useCenterWatermark) {
                    sizePercent = 30;
                    filterParts = [
                        `[1:v]scale=w=iw*0.${sizePercent}:h=-1[wm]`,
                        `[0:v][wm]overlay=(W-w)/2:(H-h)/2[vout]`
                    ];
                } else {
                    sizePercent = 20;
                    filterParts = [
                        `[1:v]scale=w=iw*0.${sizePercent}:h=-1[wm]`,
                        `[0:v][wm]overlay=W-w-30:H-h-30[vout]`
                    ];
                }

                command
                    .complexFilter(filterParts)
                    .outputOptions(['-map', '[vout]', '-map', '0:a?'])
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .outputOptions(['-preset', 'fast', '-crf', '23', '-movflags', '+faststart'])
                    .output(outputPath)
                    .on('start', () => {
                        // console.log(`[Watermark:Video] ffmpeg запущен (${useCenterWatermark ? 'центр' : 'угол'}, ${sizePercent}%)`);
                    })
                    .on('progress', (progress) => {
                        if (progress.percent && Math.round(progress.percent) % 25 === 0) {
                            // console.log(`[Watermark:Video] Прогресс: ${Math.round(progress.percent)}%`);
                        }
                    })
                    .on('end', () => {
                        // console.log(`[Watermark:Video]  Готово за ${Date.now() - startTime}ms`);
                        fs.unlink(watermarkTempPath).catch(() => { });
                        resolve(outputPath);
                    })
                    .on('error', (error, stdout, stderr) => {
                        console.error('[Watermark:Video] ❌ Ошибка:', error.message);
                        fs.unlink(watermarkTempPath).catch(() => { });
                        fs.copyFile(inputPath, outputPath)
                            .then(() => resolve(outputPath))
                            .catch(() => resolve(inputPath));
                    })
                    .run();
            } catch (error) {
                console.error('[Watermark:Video] Исключение:', error);
                if (watermarkTempPath) fs.unlink(watermarkTempPath).catch(() => { });
                fs.copyFile(inputPath, outputPath)
                    .then(() => resolve(outputPath))
                    .catch(() => resolve(inputPath));
            }
        });
    }

    async addWatermarkToAudio(inputPath, outputPath) {
        const startTime = Date.now();

        const watermarkAudioPath = await this.getAudioWatermarkPath();

        if (!watermarkAudioPath) {
            await fs.copyFile(inputPath, outputPath);
            return outputPath;
        }

        return new Promise((resolve) => {
            try {
                const volume = WATERMARK_CONSTANTS.AUDIO_WATERMARK_VOLUME;
                const command = ffmpeg();

                command.input(inputPath);
                command.input(watermarkAudioPath).inputOptions(['-stream_loop', '-1']);

                const filterParts = [
                    `[1:a]volume=${volume}[quiet]`,
                    `[0:a][quiet]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[out]`
                ];

                command
                    .complexFilter(filterParts)
                    .outputOptions(['-map', '[out]'])
                    .audioCodec('libmp3lame')
                    .audioBitrate(192)
                    .output(outputPath)
                    .on('start', () => {
                        // console.log(`[Watermark:Audio] ffmpeg запущен`);
                    })
                    .on('progress', (progress) => {
                        if (progress.percent && Math.round(progress.percent) % 25 === 0) {
                            // console.log(`[Watermark:Audio] Прогресс: ${Math.round(progress.percent)}%`);
                        }
                    })
                    .on('end', () => {
                        // console.log(`[Watermark:Audio]  Готово за ${Date.now() - startTime}ms`);
                        resolve(outputPath);
                    })
                    .on('error', (error, stdout, stderr) => {
                        console.error('[Watermark:Audio] ❌ Ошибка:', error.message);
                        fs.copyFile(inputPath, outputPath)
                            .then(() => resolve(outputPath))
                            .catch(() => resolve(inputPath));
                    })
                    .run();
            } catch (error) {
                console.error('[Watermark:Audio] Исключение:', error);
                fs.copyFile(inputPath, outputPath)
                    .then(() => resolve(outputPath))
                    .catch(() => resolve(inputPath));
            }
        });
    }
}

const instance = new WatermarkService();
module.exports = instance;
module.exports.WATERMARK_CONSTANTS = WATERMARK_CONSTANTS;