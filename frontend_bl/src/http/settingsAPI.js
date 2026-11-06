import handleRequest from "./requestHandler";

export const getSettings = async () => {
    return handleRequest('get', 'system/getSettings');
};

export const updateValueInDb = async (name, value) => {
    return handleRequest('post', 'system/updateValue', {
        body: { name, value }
    });
};

// Получение истории изменений конкретной настройки
export const getSettingHistory = async (settingName) => {
    return handleRequest('get', 'system/getSettingHistory', {
        params: { settingName }
    });
};