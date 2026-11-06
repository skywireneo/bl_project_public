const Router = require('express');
const router = new Router();
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');
const donationController = require('../controllers/donationController');

// ============================================================================
// ПУБЛИЧНЫЕ РОУТЫ (для пользователей)
// ============================================================================

// // Список активных пакетов с плюшками (для страницы доната)
// router.get('/packages', donationController.getPackages);

// // Создание заявки на донат
// router.post('/createRequest', donationController.createRequest);

// // Доступ к "Моим плюшкам" по токену
// router.get('/my', donationController.getMyDonation);

// // Вход по email + кодовому слову (запасной доступ)
// router.post('/login', donationController.loginWithCode);

// // ============================================================================
// // АДМИН РОУТЫ (для сотрудников)
// // ============================================================================

// // --- Заявки ---
// router.get('/admin/requests',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "MODERATOR"]),
//     donationController.getRequests);

// router.get('/admin/request/:id',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "MODERATOR"]),
//     donationController.getRequestDetail);

// router.post('/admin/approve',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "MODERATOR"]),
//     donationController.approveRequest);

// router.post('/admin/reject',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "MODERATOR"]),
//     donationController.rejectRequest);

// router.post('/admin/cancelApproval',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]),
//     donationController.cancelApproval);

// router.post('/admin/markEmailSent',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "MODERATOR"]),
//     donationController.markEmailSent);

// router.get('/admin/emailPreview/:id',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "MODERATOR"]),
//     donationController.getEmailPreview);

// // --- История платежей ---
// router.get('/admin/payments',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "MODERATOR"]),
//     donationController.getPayments);

// // --- Пользователи ---
// router.get('/admin/user',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "MODERATOR"]),
//     donationController.getUserInfo);

// router.post('/admin/regenerateAccess',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]),
//     donationController.regenerateAccess);

// router.post('/admin/revokeAccess',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]),
//     donationController.revokeAccess);

// // --- Статистика ---
// router.get('/admin/stats',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "MODERATOR"]),
//     donationController.getStats);

// // ============================================================================
// // РОУТЫ УПРАВЛЕНИЯ (только для разработчиков)
// // ============================================================================

// // --- Пакеты ---
// router.get('/admin/packages/list',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]),
//     donationController.getPackagesAdmin);

// router.post('/admin/packages',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]),
//     donationController.createPackage);

// router.put('/admin/packages/:id',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]),
//     donationController.updatePackage);

// router.delete('/admin/packages/:id',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]),
//     donationController.deletePackage);

// // --- Плюшки ---
// router.get('/admin/perks/list',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]),
//     donationController.getPerksAdmin);

// router.post('/admin/perks',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]),
//     donationController.createPerk);

// router.put('/admin/perks/:id',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]),
//     donationController.updatePerk);

// router.delete('/admin/perks/:id',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]),
//     donationController.deletePerk);

// // --- Настройки ---
// router.get('/admin/settings',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]),
//     donationController.getSettings);

// router.put('/admin/settings',
//     authMiddleware,
//     checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]),
//     donationController.updateSettings);

module.exports = router;