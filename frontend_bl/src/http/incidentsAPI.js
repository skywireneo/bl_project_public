import handleRequest from "./requestHandler";
import API_ROUTES from "./apiRoutes";
import { $authHost, $host } from ".";
import { getDeviceId } from "../utils/deviceFingerprint";
import { collectActionStats } from "./utils/telemetry";

export const getAllIncidents = (limit, page) => {
    const url = API_ROUTES.incident.getAllIncidents({ limit, page });
    return handleRequest('get', url);
};

export const getIncident = (id, ownerToken = null) => {
    const url = API_ROUTES.incident.getIncident({ id });
    const config = {};
    if (ownerToken) {
        config.headers = { 'X-Owner-Token': ownerToken };
    }
    return handleRequest('get', url, config);
};

export const getIncidentStatus = (id) => {
    const url = API_ROUTES.incident.getIncidentStatus({ id });
    return handleRequest('get', url);
};

export const getIncidentForExport = (id) => {
    const url = API_ROUTES.incident.getIncidentForExport({ id });
    return handleRequest('get', url);
};

export const getIncidentsCaban = (type, column, limit, page) => {
    const url = API_ROUTES.incident.getIncidentsCaban({ type, column, limit, page });
    return handleRequest('get', url);
};

export const getCollections = (types) => {
    const url = API_ROUTES.incident.getCollections({ types });
    return handleRequest('get', url);
};

export const getIncidentHistory = (id) => {
    const url = API_ROUTES.incident.getIncidentHistory({ id });
    return handleRequest('get', url);
};

export const searchPersone = (email, string) => {
    const url = API_ROUTES.incident.searchPersone({ email, string });
    return handleRequest('get', url);
};

// 2. ДОБАВИТЬ функцию updateAdminAssessment
export const updateAdminAssessment = (incidentId, assessment) => {
    const body = { incidentId, assessment };
    return handleRequest('post', API_ROUTES.incident.updateAdminAssessment, { body });
};

// Добавляем метод верификации
export const verifyCreatorEmail = (incidentId, email) => {
    return handleRequest('post', API_ROUTES.incident.verifyCreatorEmail, { body: { incidentId, email } });
};

export const searchPVZ = (email, city, street, home) => {
    const url = API_ROUTES.incident.searchPVZ({ email, city, street, home });
    return handleRequest('get', url);
};

export const getHistory = (email, type, status, device_id, days, limit, offset) => {
    const url = API_ROUTES.incident.getHistory({ email, type, status, device_id, days, limit, offset });
    return handleRequest('get', url);
};

export const getHistoryStatistics = (email, days) => {
    const url = API_ROUTES.incident.getHistoryStatistics({ email, days });
    return handleRequest('get', url);
};

export const createIncident = async (data) => {
    const telemetryPayload = await collectActionStats('incidentCreate', 'submit');
    const body = {
        data,
        ...telemetryPayload // Добавляем зашифрованные stats_info
    };
    // Device ID добавится автоматически!
    return handleRequest('post', API_ROUTES.incident.createIncident, { body });
};

export const updateIncident = (data, ownerToken = null) => {
    const body = { data };
    if (ownerToken) {
        body.ownerToken = ownerToken;
    }
    return handleRequest('post', API_ROUTES.incident.updateIncident, { body });
};

export const updateTgPost = (incidentId) => {
    const body = { incidentId };
    return handleRequest('post', API_ROUTES.incident.updateTgPost, { body });
};

export const updateInterestScorePlusOne = (incidentId) => {
    const body = { incidentId };
    return handleRequest('post', API_ROUTES.incident.updateInterestScorePlusOne, { body });
};

export const deleteIncident = (id) => {
    const body = { id };
    return handleRequest('post', API_ROUTES.incident.deleteIncident, { body });
};

export const softDeleteIncident = (id, reason_code) => {
    const body = { id, reason_code };
    return handleRequest('post', API_ROUTES.incident.softDeleteIncident, { body });
};

export const getCreateIncidentData = () => {
    return handleRequest('get', API_ROUTES.incident.getCreateIncidentData);
};

export const getTransitionInfo = (incidentId) => {
    const url = API_ROUTES.incident.getTransitionInfo({ incidentId });
    return handleRequest('get', url);
};

export const transition = (incidentId, targetStatusCode, rejectionReason = null) => {
    const body = { incidentId, targetStatusCode, rejectionReason };
    return handleRequest('post', API_ROUTES.incident.transition, { body });
};

// Верификация адреса ПВЗ
export const verifyPvz = (pvzId, isVerified) => {
    const body = { pvzId, isVerified };
    return handleRequest('post', API_ROUTES.incident.verifyPvz, { body });
};

export const withdrawIncident = (incidentId, email = null, tg = null) => {
    const body = { incidentId, email, tg };
    return handleRequest('post', API_ROUTES.incident.withdrawIncident, { body });
};

// Обновление отчёта ИИ (автоматически ставит ai_response_flag = true на беке)
export const updateAiResponse = (incidentId, aiResponse) => {
    const body = { incidentId, aiResponse };
    return handleRequest('post', API_ROUTES.incident.updateAiResponse, { body });
};

// Обновление флага видимости отчёта ИИ
export const updateShowAiResponse = (incidentId, showAiResponse) => {
    const body = { incidentId, showAiResponse };
    return handleRequest('post', API_ROUTES.incident.updateShowAiResponse, { body });
};

// Добавление новой записи в историю проверок (не перезаписывает весь объект, а добавляет запись на бэкенде)
export const addAdminAssessmentRecord = (incidentId, assessmentData) => {
    const body = { incidentId, assessment: assessmentData };
    return handleRequest('post', API_ROUTES.incident.addAdminAssessmentRecord, { body });
};

// ====================================================================
// ГЕНЕРАЦИЯ PDF ОТЧЁТОВ (с HMAC-подписью)
// ====================================================================

/**
 * Генерация PDF отчёта по персоне
 * @param {Object} groupData - данные группы (должен содержать _signature из ответа поиска)
 */
export const generatePersonReportPDF = async (groupData) => {
    const deviceId = getDeviceId();
    try {
        const response = await $authHost.post(
            API_ROUTES.reports.generatePersonReport,
            {
                group_data: groupData,
                signature: groupData._signature || null // Передаём HMAC-подпись
            },
            {
                responseType: 'blob',
                headers: {
                    'X-Device-ID': deviceId
                }
            }
        );
        return response.data; // Blob
    } catch (error) {
        // Обработка ошибок от сервера (Blob с JSON внутри)
        if (error.response?.data instanceof Blob) {
            const text = await error.response.data.text();
            try {
                const jsonError = JSON.parse(text);
                throw new Error(
                    jsonError.message ||
                    jsonError.error?.message ||
                    'Ошибка генерации отчёта'
                );
            } catch (e) {
                throw new Error('Ошибка генерации отчёта (не удалось прочитать ответ сервера)');
            }
        }
        throw new Error(error.response?.data?.message || error.message || 'Ошибка генерации отчёта');
    }
};

/**
 * Генерация PDF отчёта по ПВЗ
 * @param {Object} pvzData - данные ПВЗ (должен содержать _signature из ответа поиска)
 */
export const generatePvzReportPDF = async (pvzData) => {
    const deviceId = getDeviceId();
    try {
        const response = await $authHost.post(
            API_ROUTES.reports.generatePvzReport,
            {
                pvz_data: pvzData,
                signature: pvzData._signature || null // Передаём HMAC-подпись
            },
            {
                responseType: 'blob',
                headers: {
                    'X-Device-ID': deviceId
                }
            }
        );
        return response.data; // Blob
    } catch (error) {
        if (error.response?.data instanceof Blob) {
            const text = await error.response.data.text();
            try {
                const jsonError = JSON.parse(text);
                throw new Error(
                    jsonError.message ||
                    jsonError.error?.message ||
                    'Ошибка генерации отчёта'
                );
            } catch (e) {
                throw new Error('Ошибка генерации отчёта (не удалось прочитать ответ сервера)');
            }
        }
        throw new Error(error.response?.data?.message || error.message || 'Ошибка генерации отчёта');
    }
};

// ====================================================================
// ВЕРИФИКАЦИЯ PDF ДОКУМЕНТОВ (публичный endpoint)
// ====================================================================

/**
 * Проверка подлинности документа по токену (UUID)
 * Публичный метод — не требует авторизации ($host вместо $authHost)
 *
 * @param {string} token - UUID из ссылки /verify/:token
 * @returns {Promise<Object>} - { valid: true/false, data: {...} }
 */
export const getVerifyInfo = async (token) => {
    const url = API_ROUTES.verify.getInfo({ token });
    try {
        const response = await $host.get(url);
        return response.data;
    } catch (error) {
        const status = error.response?.status;
        const serverMessage =
            error.response?.data?.message ||
            error.response?.data?.error?.message ||
            error.message;

        if (status === 429) {
            throw new Error('Слишком много запросов. Попробуйте позже.');
        }
        if (status === 400) {
            throw new Error(serverMessage || 'Некорректный токен верификации');
        }
        if (status === 500) {
            throw new Error('Ошибка сервера при проверке документа');
        }

        throw new Error(serverMessage || 'Ошибка проверки документа');
    }
};

// ====================================================================
// ОСПАРИВАНИЯ ИНЦИДЕНТОВ
// ====================================================================

/**
 * Создать оспаривание
 */
export const createContestation = (data, ownerToken = null) => {
    const deviceId = getDeviceId();
    const config = {};
    if (ownerToken) {
        config.headers = { 'X-Owner-Token': ownerToken };
    }
    return handleRequest('post', API_ROUTES.contestation.createContestation, {
        body: data,
        ...config,
        headers: {
            ...config.headers,
            'X-Device-ID': deviceId
        }
    });
};

/**
 * Получить информацию об оспаривании
 */
export const getContestation = (id, ownerToken = null) => {
    const url = API_ROUTES.contestation.getContestation({ id });
    const config = {};
    if (ownerToken) {
        config.headers = { 'X-Owner-Token': ownerToken };
    }
    return handleRequest('get', url, config);
};

/**
 * Получить список оспариваний для инцидента
 */
export const getContestationsForIncident = (incidentId) => {
    const url = API_ROUTES.contestation.getContestationsForIncident({ incidentId });
    return handleRequest('get', url);
};

/**
 * Обновить статус оспаривания (только для модераторов)
 */
export const updateContestationStatus = (id, statusId) => {
    const url = API_ROUTES.contestation.updateContestationStatus({ id });
    return handleRequest('post', url, { body: { statusId } });
};

/**
 * Получить информацию о доступных переходах статусов оспаривания
 */
export const getContestationTransitionInfo = (id) => {
    const url = `/incident/getContestationTransitionInfo/${id}`;
    return handleRequest('get', url);
};

/**
 * Изменить статус оспаривания
 */
export const transitionContestation = (id, targetStatusCode) => {
    const url = `/incident/transitionContestation/${id}`;
    return handleRequest('post', url, { body: { targetStatusCode } });
};

/**
 * Обновить описание оспаривания
 */
export const updateContestationDescription = (id, description, ownerToken) => {
    const url = `/incident/updateContestationDescription/${id}`;
    return handleRequest('post', url, { body: { description, ownerToken } });
};