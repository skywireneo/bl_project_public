const Router = require('express')
const router = new Router()
// const { body } = require('express-validator')
const authMiddleware = require('../middleware/authMiddleware')
const checkRole = require('../middleware/roleMiddleware')
const statsController = require('../controllers/statsController')
const envApiKeyMiddleware = require('../middleware/envApiKeyMiddleware')
const rateLimitMiddleware = require('../middleware/rateLimitMiddleware')
const trustMiddleware = require('../middleware/trustMiddleware')
// const checkAccess = require('../middleware/accessMiddleware')


// router.post('/updateSettings', authMiddleware, checkRole(["ADMINISTRATOR", "DEVELOPER", "TOP_LEVEL_DEVELOPER"]), checkAccess(["POLICY_EDIT"]), policyController.updateSettings)
router.post('/aggregateFromRedis_gHbXmhaxe4', envApiKeyMiddleware('MONITORING_API_KEY_TO_BACKEND_1'), statsController.aggregateFromRedis)
router.post('/aggregateToHigherGranularity_cFmtVN4Bwg', envApiKeyMiddleware('MONITORING_API_KEY_TO_BACKEND_1'), statsController.aggregateToHigherGranularity)
router.post('/cleanup_rv94V64XGw', envApiKeyMiddleware('MONITORING_API_KEY_TO_BACKEND_1'), statsController.cleanup)
router.get('/get', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), statsController.get)
router.get('/overview', rateLimitMiddleware('READ_DATA'), statsController.overview)
router.post('/delete', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), statsController.delete)

router.get('/getModuleStats', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "ADMINISTRATOR"]), statsController.getModuleStats);
router.post('/cleanupOldStats_rv9IUGjbadds54g5g5f', envApiKeyMiddleware('MONITORING_API_KEY_TO_BACKEND_1'), statsController.cleanupOldStats)

module.exports = router
