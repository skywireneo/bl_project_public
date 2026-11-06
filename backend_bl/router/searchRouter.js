const Router = require('express');
const router = new Router();

const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');
const searchController = require('../controllers/searchController');
const envApiKeyMiddleware = require('../middleware/envApiKeyMiddleware');
const rateLimitMiddleware = require('../middleware/rateLimitMiddleware'); // <-- Новый middleware
const trustMiddleware = require('../middleware/trustMiddleware');

// Применяем rateLimitMiddleware ПЕРЕД authMiddleware и контроллером
// Если authMiddleware упадет с 401, rateLimit не сработает (что логично)
router.get('/searchPersone', trustMiddleware, rateLimitMiddleware('SEARCH_PERSONE'), searchController.searchPersone);
router.get('/searchPVZ', trustMiddleware, rateLimitMiddleware('SEARCH_PVZ'), searchController.searchPVZ);

router.get('/getHistory', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), searchController.getHistory);
router.get('/getHistoryStatistics', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), searchController.getHistoryStatistics);
router.post('/historyCleanup_Jbs5m8KPKRHLj127', envApiKeyMiddleware('MONITORING_API_KEY_TO_BACKEND_2'), searchController.historyCleanup);

module.exports = router;