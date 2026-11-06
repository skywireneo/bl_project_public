const Router = require('express')
const router = new Router()

const authMiddleware = require('../middleware/authMiddleware')
const systemController = require('../controllers/systemController')
const checkRole = require('../middleware/roleMiddleware')
const envApiKeyMiddleware = require('../middleware/envApiKeyMiddleware')
const trustMiddleware = require('../middleware/trustMiddleware')
const criticalActionsController = require('../controllers/criticalActionsController')
const rateLimitMiddleware = require('../middleware/rateLimitMiddleware')
// const checkAccess = require('../middleware/accessMiddleware')

router.post('/updateValue', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), systemController.updateValue)
router.get('/getSettings', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), systemController.selectSettings)
router.get('/selectSetting', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), systemController.selectSetting)
router.get('/getSettingHistory', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), systemController.getSettingHistory)
router.post('/cleanupExpiredLimits_Uyug8Gh5f6J', envApiKeyMiddleware('MONITORING_API_KEY_TO_BACKEND_3'), systemController.cleanupExpiredLimits)
router.post('/cleanOldHistory_UIhk45jGUY6GHJ7bjhvcy5K', envApiKeyMiddleware('MONITORING_API_KEY_TO_BACKEND_4'), systemController.cleanOldHistory)

router.get('/maintenance/status', trustMiddleware, rateLimitMiddleware('READ_DATA'), criticalActionsController.getMaintenanceStatus);

module.exports = router
