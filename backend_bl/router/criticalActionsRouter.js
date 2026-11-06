const Router = require('express')
const router = new Router()

const authMiddleware = require('../middleware/authMiddleware')
const checkRole = require('../middleware/roleMiddleware')
const envApiKeyMiddleware = require('../middleware/envApiKeyMiddleware')
const criticalActionsController = require('../controllers/criticalActionsController')
const trustMiddleware = require('../middleware/trustMiddleware')
// const checkAccess = require('../middleware/accessMiddleware')

router.post('/executeCriticalAction', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), criticalActionsController.executeCriticalAction)
router.get('/getCriticalActions', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), criticalActionsController.getCriticalActions)
router.get('/getCriticalActionsLogs', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), criticalActionsController.getCriticalActionsLogs)
router.post('/toggleCriticalActionLock', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), criticalActionsController.toggleCriticalActionLock)
router.post("/deleteCritActlogs_Jbs5m8KPKRHLj127", envApiKeyMiddleware('MONITORING_API_KEY_TO_BACKEND_2'), criticalActionsController.deleteCritActlogs);

// Whitelist management
router.get('/getWhitelist', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), criticalActionsController.getWhitelist)
router.post('/updateWhitelist', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), criticalActionsController.updateWhitelist)

router.post('/maintenance/schedule', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), criticalActionsController.scheduleMaintenance);
router.post('/maintenance/cancel', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), criticalActionsController.cancelMaintenance);

// История и очистка техработ
router.get('/maintenance/history', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), criticalActionsController.getMaintenanceHistory);

// Cache Management
router.get('/getCacheStats', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), criticalActionsController.getCacheStats);
router.post('/clearCache', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), criticalActionsController.clearCache);

// Для крона/мониторинга (по секретному ключу, как deleteCritActlogs)
router.post("/cleanupMaintenanceHistory_IUgjhFYG752Vghfy725hGBHJJG6UYghb", envApiKeyMiddleware('MONITORING_API_KEY_TO_BACKEND_1'), criticalActionsController.cleanupMaintenanceHistory);

module.exports = router;
