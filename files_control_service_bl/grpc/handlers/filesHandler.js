const grpc = require('@grpc/grpc-js');
const unifiedFileService = require('../../services/filesServ/unifiedFileService');
const secureGrpcClient = require('../clients/secureGrpcClient');

async function sendAVdetectedToMain(id) {
    return await secureGrpcClient.sendAVdetected(String(id));
}

async function checkCanSee(moduleName, recordId, userId, userStatus) {
    return await secureGrpcClient.checkCanSee(String(moduleName), String(recordId), String(userId), String(userStatus));
}

async function checkCanEdit(moduleName, recordId, userId, userStatus) {
    return await secureGrpcClient.checkCanEdit(String(moduleName), String(recordId), String(userId), String(userStatus));
}

async function deleteIncidentStringGRPC(call, callback) {
    try {

        const { moduleName, id } = call.request;
        const finalRes = await unifiedFileService.deleteIncidentFiles(moduleName, id)
        // console.log("-----------")
        // console.log(finalRes)

        if (!finalRes.success) {
            return callback({
                code: grpc.status.NOT_FOUND,
                message: 'Ошибка',
            });
        }

        // Если всё в порядке, отправляем результат
        callback(null, { status: true });

    } catch (error) {
        // Если произошла ошибка на сервере
        callback({
            code: grpc.status.INTERNAL,
            message: error.message,
        });
    }
}


async function addWmGRPC(call, callback) {
    try {

        const { payload } = call.request;
        const finalRes = await unifiedFileService.createMissingWatermarks()

        // Если всё в порядке, отправляем результат
        callback(null, { status: true });

    } catch (error) {
        // Если произошла ошибка на сервере
        callback({
            code: grpc.status.INTERNAL,
            message: error.message,
        });
    }
}


async function deleteWmGRPC(call, callback) {
    try {

        const { payload } = call.request;
        const finalRes = await unifiedFileService.deleteAllWatermarks()

        // Если всё в порядке, отправляем результат
        callback(null, { status: true });

    } catch (error) {
        // Если произошла ошибка на сервере
        callback({
            code: grpc.status.INTERNAL,
            message: error.message,
        });
    }
}

async function fileCountGRPC(call, callback) {
    try {

        const { moduleName, id } = call.request;
        const finalRes = await unifiedFileService.getCurrentFilesCount(moduleName, id)

        // Если всё в порядке, отправляем результат
        callback(null, { count: String(finalRes) });

    } catch (error) {
        // Если произошла ошибка на сервере
        callback({
            code: grpc.status.INTERNAL,
            message: error.message,
        });
    }
}



module.exports = {
    sendAVdetectedToMain,
    checkCanSee,
    checkCanEdit,
    addWmGRPC,
    deleteWmGRPC,
    deleteIncidentStringGRPC,
    fileCountGRPC
};
