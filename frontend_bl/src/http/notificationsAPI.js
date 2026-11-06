import { $authHost } from "./index";
import handleRequest from "./requestHandler";

// ============================================
// ПОЛЬЗОВАТЕЛЬСКИЕ МЕТОДЫ
// ============================================

export const getMyNotificationSettings = () =>
    handleRequest('get', '/notifications/notifications/settings');

export const updateMyNotificationSettings = (settings) =>
    handleRequest('put', '/notifications/notifications/settings', {
        body: { settings }
    });

export const getNotifications = ({ type, is_read, limit = 20, offset = 0 }) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (is_read !== undefined) params.append('is_read', is_read);
    params.append('limit', limit);
    params.append('offset', offset);

    return handleRequest('get', `/notifications/notifications?${params.toString()}`);
};

export const getUnreadCounts = () =>
    handleRequest('get', '/notifications/notifications/unread-count');

export const markAsRead = (id) =>
    handleRequest('post', `/notifications/notifications/${id}/read`);

export const markAllAsRead = (type) => {
    const params = type ? `?type=${type}` : '';
    return handleRequest('post', `/notifications/notifications/read-all${params}`);
};

// ============================================
// АДМИНСКИЕ МЕТОДЫ (для будущего)
// ============================================

export const getNotificationGroups = () =>
    handleRequest('get', '/notifications/admin/notifications/groups');

export const createNotificationGroup = (data) =>
    handleRequest('post', '/notifications/admin/notifications/groups', { body: data });

export const updateNotificationGroup = (id, data) =>
    handleRequest('put', `/notifications/admin/notifications/groups/${id}`, { body: data });

export const deleteNotificationGroup = (id) =>
    handleRequest('delete', `/notifications/admin/notifications/groups/${id}`);

export const updateGroupChannels = (id, channels) =>
    handleRequest('put', `/notifications/admin/notifications/groups/${id}/channels`, {
        body: { channels }
    });

export const getGroupTemplates = (id) =>
    handleRequest('get', `/notifications/admin/notifications/groups/${id}/templates`);

export const updateTemplate = (groupId, channelCode, data) =>
    handleRequest('put', '/notifications/admin/notifications/templates', {
        body: {
            group_id: groupId,
            channel_code: channelCode,
            title_template: data.title_template,
            body_template: data.body_template
        }
    });

export const getRoleDefaults = (roleCode) =>
    handleRequest('get', `/notifications/admin/notifications/defaults/${roleCode}`);

export const updateRoleDefaults = (roleCode, settings) =>
    handleRequest('put', `/notifications/admin/notifications/defaults/${roleCode}`, {
        body: { settings }
    });

export const broadcastNotification = (data) =>
    handleRequest('post', '/notifications/admin/notifications/broadcast', { body: data });

// ============================================
// КАНАЛЫ
// ============================================
export const getChannels = () =>
    handleRequest('get', '/notifications/admin/notifications/channels');

export const updateChannel = (id, isActive) =>
    handleRequest('put', `/notifications/admin/notifications/channels/${id}`, {
        body: { is_active: isActive }
    });

// ============================================
// ИСТОРИЯ АДМИНКИ
// ============================================
export const getAdminHistory = ({ page = 1, limit = 20, actionType, actorId } = {}) => {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (actionType) params.append('actionType', actionType);
    if (actorId) params.append('actorId', actorId);
    return handleRequest('get', `/notifications/admin/notifications/history?${params.toString()}`);
};

// ============================================
// ИСТОРИЯ ПОЛЬЗОВАТЕЛЬСКИХ НАСТРОЕК
// ============================================
export const getUserSettingsHistory = (userId, { page = 1, limit = 20 } = {}) => {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    return handleRequest('get', `/notifications/notifications/settings/history/${userId}?${params.toString()}`);
};