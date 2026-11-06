const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const filesProtoPath = path.join(__dirname, '../proto/files.proto');
const settingsProtoPath = path.join(__dirname, '../proto/settings.proto');

const filesPackage = protoLoader.loadSync(filesProtoPath, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const settingsPackage = protoLoader.loadSync(settingsProtoPath, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});

const filesProto = grpc.loadPackageDefinition(filesPackage).files;
const settingsProto = grpc.loadPackageDefinition(settingsPackage).settings;

const filesClient = new filesProto.FilesService(
  process.env.MAIN_GRPC_SERVICE_ADDRESS,
  grpc.credentials.createInsecure()
);

const settingsClient = new settingsProto.SettingsService(
  process.env.SETTINGS_GRPC_SERVICE_ADDRESS,
  grpc.credentials.createInsecure()
);

//  НОВОЕ: Константа таймаута (1 секунда по умолчанию)
// Можно переопределить через env: GRPC_TIMEOUT_MS=1000
const GRPC_TIMEOUT_MS = parseInt(process.env.GRPC_TIMEOUT_MS || '1000', 10);

/**
 * Создать метаданные с deadline для gRPC-вызова
 * @param {grpc.Metadata} [existingMetadata] - существующие метаданные (например, с токеном)
 * @returns {grpc.Metadata} - метаданные с deadline
 */
function createMetadataWithDeadline(existingMetadata = null) {
  const metadata = existingMetadata || new grpc.Metadata();
  const deadline = new Date(Date.now() + GRPC_TIMEOUT_MS);
  metadata.set('grpc-timeout', `${GRPC_TIMEOUT_MS}m`);  // timeout в миллисекундах
  return { metadata, deadline };
}

//  Обновлённые функции с deadline
function getSetting(name, metadata) {
  const { metadata: meta, deadline } = createMetadataWithDeadline(metadata);

  return new Promise((resolve, reject) => {
    settingsClient.GetSettings(
      { name },
      meta,
      { deadline },  // ← ВАЖНО: deadline на уровне gRPC
      (err, response) => {
        if (err) return reject(err);
        resolve(response.value);
      }
    );
  });
}

function getSettingArray(name, metadata) {
  const { metadata: meta, deadline } = createMetadataWithDeadline(metadata);

  return new Promise((resolve, reject) => {
    settingsClient.GetSettingsArray(
      { name },
      meta,
      { deadline },
      (err, response) => {
        if (err) return reject(err);
        resolve(response.value);
      }
    );
  });
}

function sendAVdetected(id, metadata) {
  const { metadata: meta, deadline } = createMetadataWithDeadline(metadata);

  return new Promise((resolve, reject) => {
    filesClient.AVdetected(
      { id },
      meta,
      { deadline },
      (err, response) => {
        if (err) return reject(err);
        resolve(response.status);
      }
    );
  });
}

function checkCanSee(moduleName, recordId, userId, userStatus, metadata) {
  const { metadata: meta, deadline } = createMetadataWithDeadline(metadata);

  return new Promise((resolve, reject) => {
    filesClient.CanSee(
      { moduleName, recordId, userId, userStatus },
      meta,
      { deadline },
      (err, response) => {
        if (err) return reject(err);
        resolve(response.status);
      }
    );
  });
}

function checkCanEdit(moduleName, recordId, userId, userStatus, metadata) {
  const { metadata: meta, deadline } = createMetadataWithDeadline(metadata);

  return new Promise((resolve, reject) => {
    filesClient.CanEdit(
      { moduleName, recordId, userId, userStatus },
      meta,
      { deadline },
      (err, response) => {
        if (err) return reject(err);
        resolve(response.status);
      }
    );
  });
}

module.exports = {
  getSetting,
  getSettingArray,
  sendAVdetected,
  checkCanSee,
  checkCanEdit,
  GRPC_TIMEOUT_MS  // Экспортируем для отладки
};