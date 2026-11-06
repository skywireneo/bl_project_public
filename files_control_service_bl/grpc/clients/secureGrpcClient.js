// /grpc/clients/secureGrpcClient.js
const grpc = require('@grpc/grpc-js');
const grpcClient = require('./grpcClient');
const tokenService = require('../../services/systemServices/tokenService');

function withAuthMetadata(grpcMethod) {
  return async (...args) => {
    const serviceToken = tokenService.generateServiceToken(); // с данными
    // console.log(args[0])
    // console.log(serviceToken)
    const metadata = new grpc.Metadata();
    metadata.add('authorization', `Bearer ${serviceToken}`);

    // добавим метаданные в конец аргументов
    return grpcMethod(...args, metadata);
  };
}

module.exports = {
  getSetting: withAuthMetadata(grpcClient.getSetting),
  getSettingArray: withAuthMetadata(grpcClient.getSettingArray),
  sendAVdetected: withAuthMetadata(grpcClient.sendAVdetected),
  checkCanEdit: withAuthMetadata(grpcClient.checkCanEdit),
  checkCanSee: withAuthMetadata(grpcClient.checkCanSee)
};
