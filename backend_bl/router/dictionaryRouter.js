const Router = require('express')
const dictionaryController = require('../controllers/dictionaryController')
const router = new Router()

const authMiddleware = require('../middleware/authMiddleware')
// const systemController = require('../controllers/systemController')
const checkRole = require('../middleware/roleMiddleware')
const rateLimitMiddleware = require('../middleware/rateLimitMiddleware')
const trustMiddleware = require('../middleware/trustMiddleware')
// const incidentController = require('../controllers/incidentController')
// const apiKeyMiddleware = require('../middleware/apiKeyMiddleware')
// const checkAccess = require('../middleware/accessMiddleware')

router.post('/createElement', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), dictionaryController.createElement)
router.post('/updateElement', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), dictionaryController.updateElement)
router.post('/deleteElement', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), dictionaryController.deleteElement)
router.get('/getAdm', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), dictionaryController.getAdm)
router.get('/get', trustMiddleware, rateLimitMiddleware('READ_DATA'), dictionaryController.getNonSecure)

module.exports = router