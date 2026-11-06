const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { deleteIncidentStringGRPC, addWmGRPC, deleteWmGRPC, fileCountGRPC } = require('../handlers/filesHandler');
const tokenService = require('../../services/systemServices/tokenService');

// Утилита для загрузки .proto файлов
function loadProto(protoPath) {
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  return grpc.loadPackageDefinition(packageDefinition);
}

// Загружаем proto файлы
const filesProto = loadProto(path.join(__dirname, '../proto/files.proto')).files;
const settingsProto = loadProto(path.join(__dirname, '../proto/settings.proto')).settings;

// Функция для регистрации сервисов
function registerService(server, proto, serviceName, handler) {
  if (proto && proto[serviceName]) {
    server.addService(proto[serviceName].service, handler);
    console.log(`Service ${serviceName} registered successfully.`);
  } else {
    console.error(`Service ${serviceName} not found in the proto file.`);
  }
}

/**
 * Middleware для проверки авторизации
 * @param {Object} call - gRPC call объект
 * @returns {boolean} - результат проверки
 */
function checkAuthorization(call) {
  // Используем улучшенную функцию валидации из tokenService
  const validation = tokenService.validateMetadataToken(call.metadata);

  if (!validation.valid) {
    console.warn(`Authorization failed: ${validation.error}`);
    return false;
  }

  return true;
}

// Оборачиваем обработчики с авторизацией
function withAuth(handler) {
  return (call, callback) => {
    if (!checkAuthorization(call)) {
      return callback({
        code: grpc.status.UNAUTHENTICATED,
        message: 'Неверный или отсутствующий токен авторизации'
      });
    }
    handler(call, callback);
  };
}

// Функция для запуска gRPC сервера
function startGrpcServer() {
  const server = new grpc.Server();

  // Регистрируем FilesService
  registerService(server, filesProto, 'FilesService', {
    DeleteIncidentString: withAuth(deleteIncidentStringGRPC),
    addWm: withAuth(addWmGRPC),
    deleteWm: withAuth(deleteWmGRPC),
    fileCount: withAuth(fileCountGRPC)
  });

  const bindAddress = process.env.FILES_CONTROL_GRPC_BIND_ADDRESS;
  console.log('Trying to bind gRPC server to:', bindAddress);

  server.bindAsync(bindAddress, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('Ошибка при запуске gRPC сервера:', err);
      throw new Error('Ошибка запуска gRPC сервера:', err);
    }
    console.log(`gRPC сервер запущен на порту ${port}`);
    server.start();
  });
}

module.exports = {
  startGrpcServer,
};
