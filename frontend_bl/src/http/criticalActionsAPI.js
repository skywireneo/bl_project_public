import handleRequest from "./requestHandler";
import API_ROUTES from "./apiRoutes";

// Получить все критические действия
export const getCriticalActions = () => {
    return handleRequest('get', API_ROUTES.criticalActions.getCriticalActions, {
        noCache: true  //  флаг для отключения кеша
    });
};

// Выполнить критическое действие
// id_name - идентификатор действия
// value - значение (опционально, для действий с need_value)
export const executeCriticalAction = (id_name, value) => {
    return handleRequest('post', API_ROUTES.criticalActions.executeCriticalAction, {
        body: {
            id_name,
            value: value || null
        }
    });
};

// Получить логи критических действий с пагинацией
// page - номер страницы (по умолчанию 1)
// limit - количество записей на страницу (по умолчанию 10)
// userId - фильтр по ID пользователя (опционально)
export const getCriticalActionsLogs = (page = 1, limit = 10, userId = null) => {
    let url = `criticalActions/getCriticalActionsLogs?page=${page}&limit=${limit}`;
    if (userId !== null && userId !== undefined) {
        url += `&userId=${userId}`;
    }
    return handleRequest('get', url);
};

// Изменить статус блокировки критического действия
// id_name - идентификатор действия
// is_locked - true = разблокировать, false = заблокировать
export const toggleCriticalActionLock = (id_name, is_locked) => {
    return handleRequest('post', API_ROUTES.criticalActions.toggleCriticalActionLock, {
        body: {
            id_name,
            is_locked
        }
    });
};

// Получить whitelist
// listType - тип списка: 'logins', 'statuses', 'tokens'
export const getWhitelist = (listType) => {
    return handleRequest('get', `${API_ROUTES.criticalActions.getWhitelist}?list_type=${listType}`);
};

// Обновить whitelist
// listType - тип списка: 'logins', 'statuses', 'tokens'
// items - массив элементов списка
export const updateWhitelist = (listType, items) => {
    return handleRequest('post', API_ROUTES.criticalActions.updateWhitelist, {
        body: {
            list_type: listType,
            items: items
        }
    });
};


export const getMaintenanceStatus = () => {
    return handleRequest('get', API_ROUTES.criticalActions.getMaintenanceStatus, {
        noCache: true
    });
};

export const scheduleMaintenance = (scheduledAt, expectedOpenAt, message) => {
    return handleRequest('post', API_ROUTES.criticalActions.scheduleMaintenance, {
        body: { scheduledAt, expectedOpenAt, message }
    });
};

export const cancelMaintenance = () => {
    return handleRequest('post', API_ROUTES.criticalActions.cancelMaintenance);
};

// Получить историю техработ
export const getMaintenanceHistory = (page = 1, limit = 20) => {
    return handleRequest('get', API_ROUTES.criticalActions.getMaintenanceHistory, {
        params: { page, limit },
        noCache: true
    });
};

// Получить статистику по кешу
export const getCacheStats = () => {
    return handleRequest('get', API_ROUTES.criticalActions.getCacheStats, { noCache: true });
};

// Очистить кеш
export const clearCache = (type, triggerReload) => {
    return handleRequest('post', API_ROUTES.criticalActions.clearCache, {
        body: { type, triggerReload }
    });
};
