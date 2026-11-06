import handleRequest from "./requestHandler";

// Маппинг типов для удобства (фронтенд ключ -> бэкенд тип)
export const DICTIONARY_TYPES = {
    positions: 'posts',
    reasons: 'reasons',
    pvzTypes: 'pvz_type'
};

export const getAdm = async (type) => {
    return handleRequest('get', '/dictionary/getAdm', { params: { type } });
};

export const createElement = async (type, name, ball, addonData) => {
    const payload = { type, name: name.trim(), ball: Number(ball) || 0 };
    if (addonData !== undefined && addonData !== null) payload.addonData = addonData;

    return handleRequest('post', '/dictionary/createElement', { body: payload });
};

export const updateElement = async (element_id, type, name, ball, active, addonData) => {
    const payload = { element_id, type, name: name.trim(), ball: Number(ball) || 0, active };
    if (addonData !== undefined && addonData !== null) payload.addonData = addonData;

    return handleRequest('post', '/dictionary/updateElement', { body: payload });
};

export const deleteElement = async (type, name) => {
    return handleRequest('post', '/dictionary/deleteElement', { body: { type, name: name.trim() } });
};