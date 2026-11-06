const Router = require('express')
const router = new Router()
const { body } = require('express-validator')

const userController = require('../controllers/userController')
const authMiddleware = require('../middleware/authMiddleware')
const checkRole = require('../middleware/roleMiddleware')
const rateLimitMiddleware = require('../middleware/rateLimitMiddleware')
const envApiKeyMiddleware = require('../middleware/envApiKeyMiddleware')
const trustMiddleware = require('../middleware/trustMiddleware')
const permissionController = require('../controllers/permissionController')

router.post('/userLogin', trustMiddleware, rateLimitMiddleware('AUTH_LOGIN'), userController.loginUser);
router.post('/refreshToken', trustMiddleware, rateLimitMiddleware('AUTH_LOGIN'), userController.refreshToken);
router.get('/auth', trustMiddleware, authMiddleware, userController.check)

router.get('/selectUsers', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), userController.selectUsers)
router.get('/getUser', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), userController.getUser)
router.get('/getRoleHistory', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), userController.getRoleHistory)
router.get('/getLoginHistory', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), userController.getLoginHistory)
router.post('/changeUserStatus', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), userController.changeUserStatus)

router.get('/getUserDevices', trustMiddleware, authMiddleware, userController.getUserDevices);
router.post('/deleteDevice', trustMiddleware, authMiddleware, userController.deleteDevice);

router.post('/setDeviceTrusted', trustMiddleware, authMiddleware, userController.updateDeviceTrust);
router.post('/updateDeviceName', trustMiddleware, authMiddleware, userController.updateDeviceName);

router.post('/downgradeOldTrustedDevices_xK9mP2nL8qR4', envApiKeyMiddleware('MONITORING_API_KEY_TO_BACKEND_4'), userController.downgradeOldTrustedDevices);

router.get('/getSystemStats', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "ADMINISTRATOR"]), userController.getSystemStats);


router.get('/activeSessions', trustMiddleware, authMiddleware, userController.getActiveSessions);
router.post('/logoutSession', trustMiddleware, authMiddleware, userController.logoutFromSession);


router.get('/getPasswordChangeInfo', trustMiddleware, authMiddleware, userController.getPasswordChangeInfo);
router.post('/changePassword', trustMiddleware, authMiddleware, userController.changePassword);
router.post('/regenerateSecondaryPassword', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), userController.regenerateSecondaryPassword);
router.post('/verifySecondaryPassword', trustMiddleware, rateLimitMiddleware('AUTH_LOGIN'), userController.verifySecondaryPassword);
router.get('/getPasswordHistory', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "ADMINISTRATOR"]), userController.getPasswordHistory);
router.post('/cleanupOldPasswordHistory_xK9mP2nL8qR4', envApiKeyMiddleware('MONITORING_API_KEY_TO_BACKEND_4'), userController.cleanupOldPasswordHistory);


router.get('/permissions/dictionary', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), permissionController.getDictionary);
router.post('/permissions/role/:statusCode', trustMiddleware, authMiddleware, checkRole(["TOP_LEVEL_DEVELOPER"]), permissionController.updateRole);
router.get('/permissions/user/:userId', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "ADMINISTRATOR"]), permissionController.getUserOverrides);
router.post('/permissions/user/:userId', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "ADMINISTRATOR"]), permissionController.updateUserOverrides);

router.get('/getAllStatuses', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), userController.getAllStatuses);
router.get('/getPermissionHistory', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "ADMINISTRATOR"]), userController.getPermissionHistory);

router.post('/cleanupOldPermissionHistory_xR7kM3nP9qW2', envApiKeyMiddleware('MONITORING_API_KEY_TO_BACKEND_4'), userController.cleanupOldPermissionHistory);

router.post('/cleanupOldRoleHistory_UhjgHBjghjhbhmjgbT1', envApiKeyMiddleware('MONITORING_API_KEY_TO_BACKEND_4'), userController.cleanupOldRoleHistory)
router.post('/deleteOldLoginLogs_rdivvAl57ASct', envApiKeyMiddleware('MONITORING_API_KEY_TO_BACKEND_4'), userController.deleteOldLoginLogs)
router.post('/cleanupOldDevices_UhjgHYG5jbK4IYGK5JBjghKJB', envApiKeyMiddleware('MONITORING_API_KEY_TO_BACKEND_3'), userController.deleteOldDevices);
router.post('/deleteOldRevokedTokens_IyvyuY8Uga5ff5ers', envApiKeyMiddleware('MONITORING_API_KEY_TO_BACKEND_2'), userController.deleteOldRevokedTokens);

router.post('/generateSeedPhrase', trustMiddleware, authMiddleware, userController.generateSeedPhrase);
router.post('/setupTOTP', trustMiddleware, authMiddleware, userController.setupTOTP);
router.post('/verifyTOTP', trustMiddleware, authMiddleware, userController.verifyTOTP);
router.post('/requestDeviceCode', trustMiddleware, rateLimitMiddleware('AUTH_LOGIN'), userController.requestDeviceCode); // Без authMiddleware, так как мы еще не вошли
router.post('/verifyDeviceCode', trustMiddleware, rateLimitMiddleware('AUTH_LOGIN'), userController.verifyDeviceCode);
router.get('/getSecuritySettings', trustMiddleware, authMiddleware, userController.getSecuritySettings);
router.post('/loginSeed', trustMiddleware, rateLimitMiddleware('AUTH_LOGIN'), userController.loginSeed);
router.post('/checkDeviceCodeStatus', trustMiddleware, userController.checkDeviceCodeStatus);

router.post('/disableSeedPhrase', trustMiddleware, authMiddleware, userController.disableSeedPhrase);
router.post('/disableTOTP', trustMiddleware, authMiddleware, userController.disableTOTP);
router.post('/generateBackupCodes', trustMiddleware, authMiddleware, userController.generateBackupCodes);

module.exports = router