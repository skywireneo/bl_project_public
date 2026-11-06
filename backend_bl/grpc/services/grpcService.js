const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { selectSettingString } = require('../handlers/settingHandler');
// const { getPostsGRPC, getReasonsGRPC, getPVZTypesGRPC, addIncidentGRPC, getContestationPersonesGRPC, getContestationPersonesArrayGRPC, getContestationCheckIncidentIdGRPC, addContestationGRPC, updateTgPostMessageIdGRPC } = require('../handlers/incidentsHandler');
// const { userExistByTgIdGRPC, createUserViaTgGRPC, connectUserViaTgGRPC } = require('../handlers/userHandler');
const tokenService = require('../../services/systemServices/tokenService');
const { CanEditHandler, CanSeeHandler } = require('../handlers/filesHandler');
const { initAccessGateClient } = require('../handlers/accessGateHandler');

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
// const mainbotProto = loadProto(path.join(__dirname, '../proto/mainbot.proto')).mainbot;
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

// // Функция для запуска gRPC сервера
function startGrpcServer() {
    const server = new grpc.Server();

    // Инициализируем клиент AccessGate
    const accessGateGrpcUrl = process.env.ACCESS_GATE_MS_GRPC_URL;
    if (accessGateGrpcUrl) {
        initAccessGateClient(accessGateGrpcUrl);
    } else {
        console.warn('ACCESS_GATE_MS_GRPC_URL не установлен, клиент AccessGate не инициализирован');
    }

    //   // Регистрируем MainbotService (без изменений - для совместимости)
    //   registerService(server, mainbotProto, 'MainbotService', {
    //     GetPosts: withAuth(getPostsGRPC),
    //     GetReasons: withAuth(getReasonsGRPC),
    //     GetPVZTypes: withAuth(getPVZTypesGRPC),
    //     AddIncident: withAuth(addIncidentGRPC),
    //     GetContestationPersones: withAuth(getContestationPersonesGRPC),
    //     GetContestationPersonesArray: withAuth(getContestationPersonesArrayGRPC),
    //     GetContestationCheckIncidentId: withAuth(getContestationCheckIncidentIdGRPC),
    //     AddContestation: withAuth(addContestationGRPC),
    //     UserExistByTgId: withAuth(userExistByTgIdGRPC),
    //     CreateUserViaTg: withAuth(createUserViaTgGRPC),
    //     ConnectUserViaTg: withAuth(connectUserViaTgGRPC),
    //     UpdateTgPostMessageId: withAuth(updateTgPostMessageIdGRPC)
    //   });

    // Регистрируем FilesService с авторизацией
    registerService(server, filesProto, 'FilesService', {
        // AVdetected: withAuth(AVdetectedHandler),
        CanSee: withAuth(CanSeeHandler),
        CanEdit: withAuth(CanEditHandler)
    });

    // Регистрируем SettingsService с авторизацией
    registerService(server, settingsProto, 'SettingsService', {
        GetSettings: withAuth(selectSettingString),
        GetSettingsArray: withAuth(selectSettingString)
    });

    const bindAddress = process.env.BACKEND_GRPC_BIND_ADDRESS;
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
    checkAuthorization
};
