const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const tokenService = require('../../services/systemServices/tokenService');

// Загружаем proto файлы
const accessgateProto = loadProto(path.join(__dirname, '../proto/accessgate.proto')).accessgate;

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

// Глобальный клиент для доступа
let accessGateClient = null;

/**
 * Инициализация клиента AccessGate
 * @param {string} grpcUrl - URL gRPC сервера (например, 'localhost:50054')
 */
function initAccessGateClient(grpcUrl) {
    if (!grpcUrl) {
        console.warn('ACCESS_GATE_MS_GRPC_URL не установлен, клиент AccessGate не инициализирован');
        return;
    }

    try {
        accessGateClient = new accessgateProto.AccessGateService(
            grpcUrl,
            grpc.credentials.createInsecure()
        );
        console.log(`AccessGate client initialized at ${grpcUrl}`);
    } catch (error) {
        console.error('Ошибка инициализации AccessGate client:', error);
    }
}

/**
 * Получение whitelist из Go-сервиса
 * @param {string} listType - тип списка: 'logins', 'statuses', 'tokens'
 * @returns {Promise<{success: boolean, items: string[], message: string}>}
 */
function getWhitelist(listType) {
    return new Promise((resolve, reject) => {
        if (!accessGateClient) {
            return reject(new Error('AccessGate client not initialized'));
        }

        const request = {
            list_type: listType
        };

        accessGateClient.getWhitelist(request, (err, response) => {
            if (err) {
                console.error('gRPC getWhitelist error:', err);
                return reject(err);
            }
            resolve({
                success: response.success,
                items: response.items || [],
                message: response.message
            });
        });
    });
}

/**
 * Обновление whitelist в Go-сервисе
 * @param {string} listType - тип списка: 'logins', 'statuses', 'tokens'
 * @param {string[]} items - массив элементов списка
 * @returns {Promise<{success: boolean, message: string}>}
 */
function updateWhitelist(listType, items) {
    return new Promise((resolve, reject) => {
        if (!accessGateClient) {
            return reject(new Error('AccessGate client not initialized'));
        }

        const request = {
            list_type: listType,
            items: items
        };

        accessGateClient.updateWhitelist(request, (err, response) => {
            if (err) {
                console.error('gRPC updateWhitelist error:', err);
                return reject(err);
            }
            resolve({
                success: response.success,
                message: response.message
            });
        });
    });
}

module.exports = {
    initAccessGateClient,
    getWhitelist,
    updateWhitelist
};
