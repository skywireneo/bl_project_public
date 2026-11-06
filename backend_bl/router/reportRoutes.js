const Router = require('express');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');
const rateLimitMiddleware = require('../middleware/rateLimitMiddleware');
const trustMiddleware = require('../middleware/trustMiddleware');
// const checkRole = require('../middleware/roleMiddleware')

const router = new Router();

router.post('/generate-person-report', trustMiddleware, rateLimitMiddleware('CREATE_DATA'), reportController.generatePersonReport);
router.post('/generate-pvz-report', trustMiddleware, rateLimitMiddleware('CREATE_DATA'), reportController.generatePvzReport);

module.exports = router;