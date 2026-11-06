import { $authHost, $host } from "./index";

// ============================================================================
// ПУБЛИЧНЫЕ API (без авторизации)
// ============================================================================

/**
 * Получить список активных пакетов с плюшками
 */
export const getDonationPackages = async () => {
    const response = await $host.get('donation/packages');
    return response.data;
};

/**
 * Создать заявку на донат
 * @param {string} email - email донатера
 */
export const createDonationRequest = async (email) => {
    const response = await $host.post('donation/createRequest', { email });
    return response.data;
};

/**
 * Получить данные "Моих плюшек" по токену
 * @param {string} token - персональный токен доступа
 */
export const getMyDonation = async (token) => {
    const response = await $host.get(`donation/my?token=${encodeURIComponent(token)}`);
    return response.data;
};

/**
 * Войти по email + кодовое слово
 * @param {string} email
 * @param {string} code - кодовое слово (XXX-XXX-XXX)
 */
export const loginWithDonationCode = async (email, code) => {
    const response = await $host.post('donation/login', { email, code });
    return response.data;
};

// ============================================================================
// АДМИН API (требуется авторизация)
// ============================================================================

// --- Заявки ---
export const getDonationRequests = async (status = null, limit = 50, offset = 0) => {
    let url = `donation/admin/requests?limit=${limit}&offset=${offset}`;
    if (status) url += `&status=${status}`;
    const response = await $authHost.get(url);
    return response.data;
};

export const getDonationRequestDetail = async (requestId) => {
    const response = await $authHost.get(`donation/admin/request/${requestId}`);
    return response.data;
};

export const approveDonationRequest = async (requestId, actualAmount, notes = null) => {
    const response = await $authHost.post('donation/admin/approve', {
        request_id: requestId,
        actual_amount: actualAmount,
        notes
    });
    return response.data;
};

export const rejectDonationRequest = async (requestId, reason) => {
    const response = await $authHost.post('donation/admin/reject', {
        request_id: requestId,
        rejection_reason: reason
    });
    return response.data;
};

export const cancelDonationApproval = async (requestId, reason) => {
    const response = await $authHost.post('donation/admin/cancelApproval', {
        request_id: requestId,
        reason
    });
    return response.data;
};

export const markDonationEmailSent = async (requestId) => {
    const response = await $authHost.post('donation/admin/markEmailSent', {
        request_id: requestId
    });
    return response.data;
};

export const getDonationEmailPreview = async (requestId) => {
    const response = await $authHost.get(`donation/admin/emailPreview/${requestId}`);
    return response.data;
};

// --- История и пользователи ---
export const getDonationPayments = async (limit = 50, offset = 0) => {
    const response = await $authHost.get(`donation/admin/payments?limit=${limit}&offset=${offset}`);
    return response.data;
};

export const getDonationUserInfo = async (emailHesh) => {
    const response = await $authHost.get(`donation/admin/user?email_hesh=${encodeURIComponent(emailHesh)}`);
    return response.data;
};

export const regenerateDonationAccess = async (emailHesh, type = 'both') => {
    const response = await $authHost.post('donation/admin/regenerateAccess', {
        email_hesh: emailHesh,
        type
    });
    return response.data;
};

export const revokeDonationAccess = async (emailHesh, reason) => {
    const response = await $authHost.post('donation/admin/revokeAccess', {
        email_hesh: emailHesh,
        reason
    });
    return response.data;
};

export const getDonationStats = async (period = 'month') => {
    const response = await $authHost.get(`donation/admin/stats?period=${period}`);
    return response.data;
};

// --- Пакеты ---
export const getDonationPackagesAdmin = async () => {
    const response = await $authHost.get('donation/admin/packages/list');
    return response.data;
};

export const createDonationPackage = async (packageData) => {
    const response = await $authHost.post('donation/admin/packages', packageData);
    return response.data;
};

export const updateDonationPackage = async (packageId, packageData) => {
    const response = await $authHost.put(`donation/admin/packages/${packageId}`, packageData);
    return response.data;
};

export const deleteDonationPackage = async (packageId) => {
    const response = await $authHost.delete(`donation/admin/packages/${packageId}`);
    return response.data;
};

// --- Плюшки ---
export const getDonationPerksAdmin = async () => {
    const response = await $authHost.get('donation/admin/perks/list');
    return response.data;
};

export const createDonationPerk = async (perkData) => {
    const response = await $authHost.post('donation/admin/perks', perkData);
    return response.data;
};

export const updateDonationPerk = async (perkId, perkData) => {
    const response = await $authHost.put(`donation/admin/perks/${perkId}`, perkData);
    return response.data;
};

export const deleteDonationPerk = async (perkId) => {
    const response = await $authHost.delete(`donation/admin/perks/${perkId}`);
    return response.data;
};

// --- Настройки ---
export const getDonationSettings = async () => {
    const response = await $authHost.get('donation/admin/settings');
    return response.data;
};

export const updateDonationSettings = async (settings) => {
    const response = await $authHost.put('donation/admin/settings', settings);
    return response.data;
};