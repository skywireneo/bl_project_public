const Minio = require('minio');
const path = require('path');
const mime = require('mime-types');
const fs = require('fs');
const apiError = require('../../exceptions/apiError');

class MinioFileManagerService {
  constructor() {
    this.MINIO_ENDPOINT = process.env.MINIO_ENDPOINT; // имя контейнера или хост
    this.MINIO_PORT = parseInt(process.env.MINIO_PORT, 10);
    this.MINIO_USE_SSL = (process.env.MINIO_USE_SSL === 'true');
    this.MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
    this.MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
    this.BUCKET_NAME = process.env.MINIO_BUCKET;

    this.minioClient = new Minio.Client({
      endPoint: this.MINIO_ENDPOINT,
      port: this.MINIO_PORT,
      useSSL: this.MINIO_USE_SSL,
      accessKey: this.MINIO_ACCESS_KEY,
      secretKey: this.MINIO_SECRET_KEY,
    });

    // Убедимся, что бакет существует (создаём если нет)
    this.ensureBucketExists();
  }

  async ensureBucketExists() {
    const exists = await this.minioClient.bucketExists(this.BUCKET_NAME).catch(() => false);
    if (!exists) {
      await this.minioClient.makeBucket(this.BUCKET_NAME);
      // console.log(`Bucket ${this.BUCKET_NAME} создан.`);
    } else {
      // console.log(`Bucket ${this.BUCKET_NAME} существует.`);
    }
  }

  /**
 * Загрузка буфера напрямую в MinIO с указанием полного пути к объекту
 * @param {Buffer} buffer - Содержимое файла
 * @param {string} objectName - Полный путь к объекту в MinIO (включая имя файла)
 * @returns {Promise<string>} - objectName
 */
  async uploadBuffer(buffer, objectName) {
    const normalizedObjectName = objectName.replace(/\/+/g, '/');
    try {
      await this.minioClient.putObject(this.BUCKET_NAME, normalizedObjectName, buffer);
      // console.log(`Буфер успешно загружен в MinIO: ${normalizedObjectName} (${(buffer.length / 1024).toFixed(1)} KB)`);
      return normalizedObjectName;
    } catch (error) {
      console.error('Ошибка загрузки буфера в MinIO:', error);
      throw error;
    }
  }

  // Загрузка файла из локальной FS в MinIO (upload)
  async uploadFile(filePath, targetPath = '') {
    const fileName = path.basename(filePath);
    const rawObjectName = targetPath ? `${targetPath}/${fileName}` : fileName;

    const objectName = rawObjectName.replace(/\/+/g, '/');

    try {
      await this.minioClient.fPutObject(this.BUCKET_NAME, objectName, filePath);
      // console.log(`Файл ${objectName} успешно загружен в MinIO.`);
      return objectName;
    } catch (error) {
      console.error('Ошибка загрузки файла в MinIO:', error);
      throw error;
    }
  }

  // Получение файла из MinIO в Buffer
  async downloadFile(objectName) {
    try {
      const dataStream = await this.minioClient.getObject(this.BUCKET_NAME, objectName);
      const chunks = [];
      for await (const chunk of dataStream) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('Ошибка при скачивании файла из MinIO:', error);
      throw error;
    }
  }

  // Получение списка объектов (файлов) в "директории" (префиксе)
  // Получение только файлов первого уровня в указанном префиксе
  async listFiles(prefix = '') {
    return new Promise((resolve, reject) => {
      const files = [];
      const stream = this.minioClient.listObjectsV2(this.BUCKET_NAME, prefix, false); // recursive = false

      stream.on('data', (obj) => {
        if (!obj.name) return; // защита от undefined

        const name = obj.name;
        const relativeName = prefix ? name.slice(prefix.length) : name;

        // Только файлы первого уровня (без вложенных слэшей)
        if (!name.endsWith('/') && !relativeName.includes('/')) {
          files.push(name);
        }
      });

      stream.on('error', (err) => {
        reject(err);
      });

      stream.on('end', () => {
        files.sort();
        resolve(files);
      });
    });
  }



  // Удаление файла из MinIO
  async deleteFile(objectName) {
    try {
      await this.minioClient.removeObject(this.BUCKET_NAME, objectName);
      // console.log(`Файл ${objectName} удалён из MinIO.`);
    } catch (error) {
      console.error('Ошибка при удалении файла из MinIO:', error);
      throw error;
    }
  }

  async deleteFileFromMinioByPath(filePath) {
    const normalized = filePath.replace(/\/+/g, '/'); // важно!
    return this.deleteFile(normalized);
  }

  /**
   * Замена файла в MinIO (удаляет старый и загружает новый с указанным именем)
   * @param {string} sourcePath - Путь к локальному файлу (временный файл)
   * @param {string} targetObjectName - Полный путь к объекту в MinIO (включая имя файла)
   */
  async replaceFile(sourcePath, targetObjectName) {
    try {
      // Удаляем старый файл, если существует
      const normalizedTargetPath = targetObjectName.replace(/\/+/g, '/');

      try {
        await this.minioClient.statObject(this.BUCKET_NAME, normalizedTargetPath);
        // Файл существует, удаляем его
        await this.minioClient.removeObject(this.BUCKET_NAME, normalizedTargetPath);
        // console.log(`Старый файл ${normalizedTargetPath} удалён из MinIO.`);
      } catch (statError) {
        if (statError.code === 'NotFound') {
          // console.log(`Файл ${normalizedTargetPath} не найден, будет создан новый.`);
        } else {
          throw statError;
        }
      }

      // Загружаем новый файл
      await this.minioClient.fPutObject(this.BUCKET_NAME, normalizedTargetPath, sourcePath);
      // console.log(`Файл ${normalizedTargetPath} успешно загружен в MinIO.`);
      return normalizedTargetPath;
    } catch (error) {
      console.error('Ошибка замены файла в MinIO:', error);
      throw error;
    }
  }


  // Скачивание из Telegram и загрузка в MinIO
  // async downloadFromTgAndUpload(fileId, ctx, targetPath = '') {
  //   try {
  //     const fileLink = await ctx.telegram.getFileLink(fileId);
  //     const response = await fetch(fileLink);
  //     const fileBuffer = await response.buffer();

  //     const fileName = `${fileId}.jpg`; // или по расширению из Telegram

  //     // Загружаем в MinIO напрямую из буфера
  //     await this.minioClient.putObject(this.BUCKET_NAME, targetPath ? `${targetPath}/${fileName}` : fileName, fileBuffer);

  //     console.log(`Файл ${fileName} загружен в MinIO в директорию ${targetPath}`);
  //     return fileName;
  //   } catch (error) {
  //     console.error('Ошибка загрузки файла из Telegram в MinIO:', error);
  //     throw error;
  //   }
  // }
  // async downloadFromTgAndUpload(fileId, ctx, targetPath = '') {
  //   try {
  //     // Получаем информацию о файле (в том числе путь)
  //     const fileInfo = await ctx.telegram.getFile(fileId);
  //     const filePathFromTg = fileInfo.file_path;

  //     const fileLink = await ctx.telegram.getFileLink(fileId);
  //     const response = await fetch(fileLink);
  //     const fileBuffer = await response.buffer();

  //     // Извлекаем оригинальное имя и расширение
  //     const originalExt = path.extname(filePathFromTg) || '.bin'; // если вдруг нет — ставим .bin
  //     const fileName = `${fileId}${originalExt}`;

  //     const objectPath = targetPath ? `${targetPath}/${fileName}` : fileName;

  //     // Загружаем в MinIO
  //     await this.minioClient.putObject(this.BUCKET_NAME, objectPath, fileBuffer);

  //     console.log(`Файл ${fileName} загружен в MinIO в директорию ${targetPath}`);
  //     return fileName;
  //   } catch (error) {
  //     console.error('Ошибка загрузки файла из Telegram в MinIO:', error);
  //     throw error;
  //   }
  // }


  // Удаление всех файлов из указанной "папки" (префикса)
  async deleteFolder(prefixPath = '') {
    const normalizedPrefix = prefixPath.replace(/^\/+|\/+$/g, '') + '/'; // Убедиться, что путь корректен и заканчивается слэшем

    try {
      const objectsToDelete = [];

      const stream = this.minioClient.listObjectsV2(this.BUCKET_NAME, normalizedPrefix, true); // recursive = true

      for await (const obj of stream) {
        if (obj.name) {
          objectsToDelete.push(obj.name);
        }
      }

      if (objectsToDelete.length === 0) {
        // console.log(`Нет файлов для удаления в папке ${normalizedPrefix}`);
        return;
      }

      const deleteChunks = [];
      // Удаление порциями по 1000 объектов (ограничение MinIO)
      for (let i = 0; i < objectsToDelete.length; i += 1000) {
        const chunk = objectsToDelete.slice(i, i + 1000);
        deleteChunks.push(this.minioClient.removeObjects(this.BUCKET_NAME, chunk));
      }

      await Promise.all(deleteChunks);
      // console.log(`Папка ${normalizedPrefix} и все её содержимое удалены из MinIO.`);
    } catch (error) {
      console.error(`Ошибка при удалении папки ${prefixPath}:`, error);
      throw error;
    }
  }

}

module.exports = new MinioFileManagerService();
