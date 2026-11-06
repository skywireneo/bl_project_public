const Router = require('express')
const router = new Router()
// const { body } = require('express-validator')
// const faqController = require('../controllers/faqController')
const authMiddleware = require('../middleware/authMiddleware')
const checkRole = require('../middleware/roleMiddleware')
const policyController = require('../controllers/policyController')
const rateLimitMiddleware = require('../middleware/rateLimitMiddleware')
const trustMiddleware = require('../middleware/trustMiddleware')
// const checkAccess = require('../middleware/accessMiddleware')


router.post('/updatePolicy', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), policyController.updatePolicy)
router.get('/getPolicy', trustMiddleware, rateLimitMiddleware('READ_DATA'), policyController.getPolicy)
router.get('/getPolicyVersions', trustMiddleware, rateLimitMiddleware('READ_DATA'), policyController.getPolicyVersions)
router.get('/getPolicyVersion', trustMiddleware, rateLimitMiddleware('READ_DATA'), policyController.getPolicyVersionDetail)
router.get('/getPDFPolicy', rateLimitMiddleware('READ_DATA'), policyController.getPDFPolicy)

module.exports = router
