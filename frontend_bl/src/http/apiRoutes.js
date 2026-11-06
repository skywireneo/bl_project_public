const API_ROUTES = {
    criticalActions: {
        getCriticalActions: 'criticalActions/getCriticalActions',
        executeCriticalAction: 'criticalActions/executeCriticalAction',
        getCriticalActionsLogs: 'criticalActions/getCriticalActionsLogs',
        toggleCriticalActionLock: 'criticalActions/toggleCriticalActionLock',
        getWhitelist: 'criticalActions/getWhitelist',
        updateWhitelist: 'criticalActions/updateWhitelist',
        getMaintenanceStatus: 'system/maintenance/status',
        scheduleMaintenance: 'criticalActions/maintenance/schedule',
        cancelMaintenance: 'criticalActions/maintenance/cancel',
        clearCache: 'criticalActions/clearCache',
        getCacheStats: 'criticalActions/getCacheStats',
        getMaintenanceHistory: 'criticalActions/maintenance/history'
    },
    stats: {
        getStats: ({ metric_name, entity_id, from, to, granularity, format, force_refresh }) =>
            `stats/get?metric_name=${metric_name}&entity_id=${entity_id}&from=${from}&to=${to}&granularity=${granularity}&format=${format}&force_refresh=${force_refresh}`,
        overview: () =>
            `stats/overview`,
        getModuleStats: ({ module }) =>
            `stats/getModuleStats?module=${module}`,
        deleteStats: 'stats/delete',
    },
    incident: {
        getAllIncidents: ({ limit, page }) =>
            `incident/getIncidents?limit=${limit}&offset=${page}`,
        getIncident: ({ id }) =>
            `incident/getIncidents?incidentId=${id}`,
        getIncidentStatus: ({ id }) =>
            `incident/getIncidentStatus?incidentId=${id}`,
        getIncidentForExport: ({ id }) =>
            `incident/getIncidentForExport?incidentId=${id}`,
        getIncidentsCaban: ({ type, column, limit, page }) =>
            `incident/getIncidentsCaban?type=${type}&column=${column}&limit=${limit}&page=${page}`,
        getCollections: ({ types }) =>
            `incident/getCollections?types=${types}`,
        getIncidentHistory: ({ id }) =>
            `incident/getIncidentHistory?incidentId=${id}`,
        getTransitionInfo: ({ incidentId }) =>
            `incident/getTransitionInfo?incidentId=${incidentId}`,

        searchPersone: ({ email, string }) =>
            `search/searchPersone?email=${email}&string=${string}`,
        searchPVZ: ({ email, city, street, home }) =>
            `search/searchPVZ?email=${email}&city=${city}&street=${street}&home=${home}`,

        getHistory: ({ email, type, status, device_id, days, limit, offset }) =>
            `search/getHistory?email=${email}&type=${type}&status=${status}&device_id=${device_id}&days=${days}&limit=${limit}&offset=${offset}`,
        getHistoryStatistics: ({ email, days }) =>
            `search/getHistoryStatistics?email=${email}&days=${days}`,

        verifyPvz: 'incident/verifyPvz',
        createIncident: 'incident/createIncident',
        updateIncident: 'incident/updateIncident',
        updateTgPost: 'incident/updateTgPost',
        updateInterestScorePlusOne: 'incident/updateInterestScorePlusOne',
        deleteIncident: 'incident/deleteIncident',
        softDeleteIncident: 'incident/softDeleteIncident',
        getCreateIncidentData: 'incident/getCreateIncidentData',
        transition: 'incident/transition',
        withdrawIncident: 'incident/withdrawIncident',
        verifyCreatorEmail: 'incident/verifyCreatorEmail',
        updateAdminAssessment: 'incident/updateAdminAssessment',
        updateAiResponse: '/incident/updateAiResponse',
        updateShowAiResponse: '/incident/updateShowAiResponse',
        addAdminAssessmentRecord: '/incident/addAdminAssessmentRecord',

    },

    // Отчёты
    reports: {
        generatePersonReport: 'reports/generate-person-report',
        generatePvzReport: 'reports/generate-pvz-report'
    },
    verify: {
        getInfo: ({ token }) => `verify/${token}`
    },

    // Оспаривания
    contestation: {
        createContestation: 'incident/createContestation',
        getContestation: ({ id }) => `incident/getContestation/${id}`,
        getContestationsForIncident: ({ incidentId }) => `incident/getContestationsForIncident/${incidentId}`,
        updateContestationStatus: ({ id }) => `incident/updateContestationStatus/${id}`
    },

    users: {
        getUser: ({ login }) =>
            `user/getUser?login=${login}`,

        activeSessions: ({ user_id }) =>
            `user/activeSessions?user_id=${user_id}`,

        getRoleHistory: ({ targetUserId, actorUserId, page, limit }) =>
            `user/getRoleHistory?targetUserId=${targetUserId}&actorUserId=${actorUserId}&page=${page}&limit=${limit}`,

        getLoginHistory: ({ user_id, limit, page }) =>
            `user/getLoginHistory?user_id=${user_id}&page=${page}&limit=${limit}`,

        changeUserStatus: 'user/changeUserStatus',
        getUserDevices: 'user/getUserDevices',
        deleteDevice: 'user/deleteDevice',
        getSystemStats: 'user/getSystemStats',
        getPasswordChangeInfo: 'user/getPasswordChangeInfo',
        changePassword: 'user/changePassword',
        regenerateSecondaryPassword: 'user/regenerateSecondaryPassword',
        verifySecondaryPassword: 'user/verifySecondaryPassword',
        getPasswordHistory: 'user/getPasswordHistory',
        logoutSession: 'user/logoutSession',
        setDeviceTrusted: '/user/setDeviceTrusted',
        updateDeviceName: '/user/updateDeviceName',
    }

};

export default API_ROUTES;
