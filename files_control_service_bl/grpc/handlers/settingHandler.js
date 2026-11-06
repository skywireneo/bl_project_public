const secureGrpcClient = require('../clients/secureGrpcClient');

async function getSettingWithToken(name) {
    return await secureGrpcClient.getSetting(name);
}

async function getSettingWithTokenArray(name) {
    return await secureGrpcClient.getSettingArray(name);
}

module.exports = {
    getSettingWithToken,
    getSettingWithTokenArray
};
