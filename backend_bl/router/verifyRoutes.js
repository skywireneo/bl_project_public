const Router = require('express');
const verifyController = require('../controllers/verifyController');
const rateLimitMiddleware = require('../middleware/rateLimitMiddleware');
const trustMiddleware = require('../middleware/trustMiddleware');

const router = new Router();

// Публичный роут — без авторизации
router.get('/:token', trustMiddleware, rateLimitMiddleware('VERIFY_TOKEN'), verifyController.verifyDocument);

module.exports = router;