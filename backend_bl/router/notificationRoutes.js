const Router = require('express');
const router = new Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');
const trustMiddleware = require('../middleware/trustMiddleware');
const envApiKeyMiddleware = require('../middleware/envApiKeyMiddleware');


router.get('/admin/notifications/groups',
    trustMiddleware, authMiddleware,
    checkRole(['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'ADMINISTRATOR', 'TOP_LEVEL_ADMINISTRATOR']),
    notificationController.getGroups
);

router.post('/admin/notifications/groups',
    trustMiddleware, authMiddleware,
    checkRole(['DEVELOPER', 'TOP_LEVEL_DEVELOPER']),
    notificationController.createGroup
);

router.put('/admin/notifications/groups/:id',
    trustMiddleware, authMiddleware,
    checkRole(['DEVELOPER', 'TOP_LEVEL_DEVELOPER']),
    notificationController.updateGroup
);

router.delete('/admin/notifications/groups/:id',
    trustMiddleware, authMiddleware,
    checkRole(['DEVELOPER', 'TOP_LEVEL_DEVELOPER']),
    notificationController.deleteGroup
);

router.put('/admin/notifications/groups/:id/channels',
    trustMiddleware, authMiddleware,
    checkRole(['DEVELOPER', 'TOP_LEVEL_DEVELOPER']),
    notificationController.updateGroupChannels
);

router.get('/admin/notifications/groups/:id/templates',
    trustMiddleware, authMiddleware,
    checkRole(['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'ADMINISTRATOR', 'TOP_LEVEL_ADMINISTRATOR']),
    notificationController.getGroupTemplates
);

router.put('/admin/notifications/templates',
    trustMiddleware, authMiddleware,
    checkRole(['DEVELOPER', 'TOP_LEVEL_DEVELOPER']),
    notificationController.updateTemplate
);

router.get('/admin/notifications/defaults/:roleCode',
    trustMiddleware, authMiddleware,
    checkRole(['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'ADMINISTRATOR', 'TOP_LEVEL_ADMINISTRATOR']),
    notificationController.getRoleDefaults
);

router.put('/admin/notifications/defaults/:roleCode',
    trustMiddleware, authMiddleware,
    checkRole(['DEVELOPER', 'TOP_LEVEL_DEVELOPER']),
    notificationController.updateRoleDefaults
);

router.post('/admin/notifications/broadcast',
    trustMiddleware, authMiddleware,
    checkRole(['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'ADMINISTRATOR', 'TOP_LEVEL_ADMINISTRATOR']),
    notificationController.broadcast
);


router.get('/notifications/settings',
    trustMiddleware, authMiddleware,
    notificationController.getMySettings
);

router.put('/notifications/settings',
    trustMiddleware, authMiddleware,
    notificationController.updateMySettings
);

router.get('/notifications',
    trustMiddleware, authMiddleware,
    notificationController.getMyNotifications
);

router.get('/notifications/unread-count',
    trustMiddleware, authMiddleware,
    notificationController.getUnreadCounts
);

router.post('/notifications/:id/read',
    trustMiddleware, authMiddleware,
    notificationController.markAsRead
);

router.post('/notifications/read-all',
    trustMiddleware, authMiddleware,
    notificationController.markAllAsRead
);

router.get('/admin/notifications/channels',
    trustMiddleware, authMiddleware,
    checkRole(['DEVELOPER', 'TOP_LEVEL_DEVELOPER']),
    notificationController.getChannels
);

router.put('/admin/notifications/channels/:id',
    trustMiddleware, authMiddleware,
    checkRole(['DEVELOPER', 'TOP_LEVEL_DEVELOPER']),
    notificationController.updateChannel
);

router.get('/admin/notifications/history',
    trustMiddleware, authMiddleware,
    checkRole(['DEVELOPER', 'TOP_LEVEL_DEVELOPER']),
    notificationController.getAdminHistory
);

router.post('/cleanupOldAdminHistory_Kp8mN3873524xR7qW2',
    envApiKeyMiddleware('MONITORING_API_KEY_TO_BACKEND_1'),
    notificationController.cleanupOldAdminHistory
);

router.post('/cleanupOldUserSettingsHistory_xK9mP2nL8qR4',
    envApiKeyMiddleware('MONITORING_API_KEY_TO_BACKEND_2'),
    notificationController.cleanupOldUserSettingsHistory
);

router.get('/notifications/settings/history/:userId',
    trustMiddleware, authMiddleware,
    notificationController.getUserSettingsHistory
);

router.post('/cleanupOldNotifications_xK9mP2nL8qR4',
    envApiKeyMiddleware('MONITORING_API_KEY_TO_BACKEND_1'),
    notificationController.cleanupOldNotifications
);

module.exports = router;