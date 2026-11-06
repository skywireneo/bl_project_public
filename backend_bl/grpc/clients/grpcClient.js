const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// const PROTO_PATH = path.join(__dirname, '../proto/mainbot.proto');
const PROTO_PATH_accessgate = path.join(__dirname, '../proto/accessgate.proto');
const PROTO_PATH_fileService = path.join(__dirname, '../proto/files.proto');
// const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
//   keepCase: true,
//   longs: String,
//   enums: String,
//   defaults: true,
//   oneofs: true,
// });

const packageDefinition_accessgate = protoLoader.loadSync(PROTO_PATH_accessgate, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const packageDefinition_fileService = protoLoader.loadSync(PROTO_PATH_fileService, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

// const mainbotProto = grpc.loadPackageDefinition(packageDefinition).mainbot;
const accessgateProto = grpc.loadPackageDefinition(packageDefinition_accessgate).accessgate;
const fileServiceProto = grpc.loadPackageDefinition(packageDefinition_fileService).files;

// const client = new mainbotProto.MainbotService(
//   process.env.MAIN_BOT_GRPC_SERVICE_ADDRESS,
//   grpc.credentials.createInsecure()
// );

const client_accessgateProto = new accessgateProto.AccessGateService(
    'access_gate_ms_bl:50054',
    grpc.credentials.createInsecure()
);

const client_fileServiceProto = new fileServiceProto.FilesService(
    process.env.FILES_CONTROL_GRPC_SERVICE_ADDRESS,
    grpc.credentials.createInsecure()
);

// // Старый метод для совместимости
// function tgNotificationSend(tgId, type, params, metadata) {
//   return new Promise((resolve, reject) => {
//     client.TgNotification({ tgId, type, params }, metadata, (err, response) => {
//       if (err) return reject(err);
//       resolve(response.status);
//     });
//   });
// }

// // Новый метод с JSON
// function tgNotificationSendJson(tgId, type, params, metadata) {
//   return new Promise((resolve, reject) => {
//     client.TgNotificationWithJson({ tgId, type, params }, metadata, (err, response) => {
//       if (err) return reject(err);
//       // response.json — строка, парсим
//       let parsed = {};
//       try { parsed = JSON.parse(response.json); } catch (e) { parsed = {}; }
//       resolve({ status: response.status, json: parsed });
//     });
//   });
// }

function UpdateStatusSend(key, value, metadata) {
    return new Promise((resolve, reject) => {
        client_accessgateProto.UpdateStatus({ key, value }, metadata, (err, response) => {
            if (err) return reject(err);
            resolve(response.success);
        });
    });
}

function addWm(metadata) {
    const payload = true
    return new Promise((resolve, reject) => {
        client_fileServiceProto.addWm({ payload }, metadata, (err, response) => {
            if (err) return reject(err);
            resolve(response.success);
        });
    });
}

function deleteWm(metadata) {
    const payload = true
    return new Promise((resolve, reject) => {
        client_fileServiceProto.deleteWm({ payload }, metadata, (err, response) => {
            if (err) return reject(err);
            resolve(response.success);
        });
    });
}

function DeleteIncidentSend(moduleName, id, metadata) {
    console.log('Calling gRPC method with:', { moduleName, id });
    console.log('Client methods available:', Object.keys(client_fileServiceProto));

    return new Promise((resolve, reject) => {
        client_fileServiceProto.DeleteIncidentString({ moduleName, id }, metadata, (err, response) => {
            if (err) {
                console.error('gRPC error details:', {
                    code: err.code,
                    message: err.message,
                    details: err.details,
                    metadata: err.metadata
                });
                return reject(err);
            }
            resolve(response.status);
        });
    });
}

function FileCountSend(moduleName, id, metadata) {
    console.log('Calling gRPC method with:', { moduleName, id });
    console.log('Client methods available:', Object.keys(client_fileServiceProto));

    return new Promise((resolve, reject) => {
        client_fileServiceProto.FileCount({ moduleName, id }, metadata, (err, response) => {
            if (err) {
                console.error('gRPC error details:', {
                    code: err.code,
                    message: err.message,
                    details: err.details,
                    metadata: err.metadata
                });
                return reject(err);
            }
            resolve(response.count);
        });
    });
}


module.exports = {
    //   tgNotificationSend,
    //   tgNotificationSendJson,
    UpdateStatusSend,
    addWm,
    deleteWm,
    DeleteIncidentSend,
    FileCountSend
};
