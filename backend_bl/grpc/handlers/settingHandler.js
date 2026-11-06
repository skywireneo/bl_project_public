// /grpc/handlers/settingHandler.js
const grpc = require('@grpc/grpc-js');

const tokenService = require('../../services/systemServices/tokenService');
const settingsService = require('../../services/systemSettings/settingsService');
const pgdb = require('../../pgdb');

// Функция обработки запроса с метаданными
async function selectSettingString(call, callback) {
    try {

        // Получаем настройку по имени из запроса
        const { name } = call.request;
        let setting = null
        const client = await pgdb.connect();
        setting = await settingsService.selectSetting(client, name);
        // console.log("-----------")
        // console.log(name)

        if (!setting) {
            return callback({
                code: grpc.status.NOT_FOUND,
                message: 'Настройка не найдена',
            });
        }

        // Если всё в порядке, отправляем результат
        callback(null, { value: setting });

    } catch (error) {
        // Если произошла ошибка на сервере
        callback({
            code: grpc.status.INTERNAL,
            message: error.message,
        });
    }
}

module.exports = {
    selectSettingString,
};