const Router = require('express')
const router = new Router()

const authMiddleware = require('../middleware/authMiddleware')
const checkRole = require('../middleware/roleMiddleware')
const incidentController = require('../controllers/incidentController')
const contestationController = require('../controllers/contestationController')
const rateLimitMiddleware = require('../middleware/rateLimitMiddleware')
const trustMiddleware = require('../middleware/trustMiddleware')

router.get('/getCreateIncidentData', trustMiddleware, rateLimitMiddleware('READ_DATA'), incidentController.getCreateIncidentData);
router.post('/createIncident', trustMiddleware, rateLimitMiddleware('CREATE_DATA'), incidentController.createIncident);
router.post('/updateIncident', trustMiddleware, rateLimitMiddleware('CREATE_DATA'), incidentController.updateIncident);
router.post('/updateTgPost', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), incidentController.updateTgPost)
router.post('/updateInterestScorePlusOne', trustMiddleware, rateLimitMiddleware('CREATE_DATA'), incidentController.updateInterestScorePlusOne);
router.post('/deleteIncident', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), incidentController.deleteIncident)
router.post('/softDeleteIncident', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), incidentController.softDeleteIncident)
router.post('/createIncidentExport', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), incidentController.createIncidentExport)

router.get('/getIncidents', trustMiddleware, rateLimitMiddleware('READ_DATA'), incidentController.getIncidents);
router.get('/getIncidentStatus', trustMiddleware, rateLimitMiddleware('READ_DATA'), incidentController.getIncidentStatus)
router.get('/getIncidentForExport', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), incidentController.getIncidentForExport)
router.get('/getIncidentsCaban', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), incidentController.getIncidentsCaban)
router.get('/getCollections', trustMiddleware, rateLimitMiddleware('READ_DATA'), incidentController.getCollections);
router.get('/getIncidentHistory', trustMiddleware, rateLimitMiddleware('READ_DATA'), incidentController.getIncidentHistory)

router.post('/transition', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), incidentController.transition)
router.get('/getTransitionInfo', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), incidentController.getTransitionInfo)

router.post('/verifyPvz', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "ADMINISTRATOR"]), incidentController.verifyPvz)

router.post('/withdrawIncident', trustMiddleware, rateLimitMiddleware('CREATE_DATA'), incidentController.withdrawIncident)

router.post('/verifyCreatorEmail', trustMiddleware, rateLimitMiddleware('CREATE_DATA'), incidentController.verifyCreatorEmail);

router.post('/updateAdminAssessment', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "ADMINISTRATOR"]), incidentController.updateAdminAssessment);

// Роуты для оспариваний
router.post('/createContestation', trustMiddleware, rateLimitMiddleware('CREATE_DATA'), contestationController.createContestation);
router.get('/getContestation/:id', trustMiddleware, rateLimitMiddleware('READ_DATA'), contestationController.getContestation);
router.get('/getContestationsForIncident/:incidentId', trustMiddleware, rateLimitMiddleware('READ_DATA'), contestationController.getContestationsForIncident);
router.get('/getContestationTransitionInfo/:id', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), contestationController.getTransitionInfo);
router.post('/transitionContestation/:id', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), contestationController.transition);
router.post('/updateContestationDescription/:id', trustMiddleware, rateLimitMiddleware('CREATE_DATA'), contestationController.updateDescription);

router.post('/updateAiResponse', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), incidentController.updateAiResponse);
router.post('/updateShowAiResponse', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), incidentController.updateShowAiResponse);

// Добавьте рядом с другими роутами админок
router.post('/addAdminAssessmentRecord', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "ADMINISTRATOR"]), incidentController.addAdminAssessmentRecord);

module.exports = router
