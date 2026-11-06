const Router = require('express');
const router = new Router();
const systemVersionController = require('../controllers/systemVersionController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');
const rateLimitMiddleware = require('../middleware/rateLimitMiddleware');
const trustMiddleware = require('../middleware/trustMiddleware');

// Публичные маршруты (или требующие базовой авторизации для активных версий)
router.get('/active', trustMiddleware, rateLimitMiddleware('READ_DATA'), systemVersionController.getActiveForUser);
router.get('/:id', trustMiddleware, rateLimitMiddleware('READ_DATA'), systemVersionController.getById);

// Защищённые маршруты (требуется авторизация и роль DEVELOPER)
router.get('/', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), systemVersionController.getAll);
router.post('/', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), systemVersionController.create);
router.put('/:id', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), systemVersionController.update);
router.delete('/:id', trustMiddleware, authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), systemVersionController.delete);

module.exports = router;