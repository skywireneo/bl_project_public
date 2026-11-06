const grpc = require('@grpc/grpc-js');
const grpcClient = require('./grpcClient');
const tokenService = require('../../services/systemServices/tokenService');

function withAuthMetadata(grpcMethod) {
    return async (...args) => {
        const serviceToken = tokenService.generateServiceToken();
        const metadata = new grpc.Metadata();
        metadata.add('authorization', `Bearer ${serviceToken}`);
        return grpcMethod(...args, metadata);
    };
}

module.exports = {
    //   tgNotificationSend: withAuthMetadata(grpcClient.tgNotificationSend),
    //   tgNotificationSendJson: withAuthMetadata(grpcClient.tgNotificationSendJson),
    UpdateStatusSend: withAuthMetadata(grpcClient.UpdateStatusSend),
    addWm: withAuthMetadata(grpcClient.addWm),
    deleteWm: withAuthMetadata(grpcClient.deleteWm),
    DeleteIncidentSend: withAuthMetadata(grpcClient.DeleteIncidentSend),
    FileCountSend: withAuthMetadata(grpcClient.FileCountSend)
};
