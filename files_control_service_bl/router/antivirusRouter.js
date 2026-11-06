const Router = require('express');
const router = new Router();
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');
const antivirusController = require('../controllers/antivirusController');

// =========================================================================
// Общие маршруты антивирусных проверок
// =========================================================================

// Получение истории всех проверок с пагинацией
// GET /api/antivirus/history?page=1&limit=50&status=infected&infected_only=false&file_table=files
router.get('/history',
    authMiddleware,
    checkRole(["MODERATOR", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"]),
    antivirusController.getHistory
);

// Получение статистики антивирусных проверок
// GET /api/antivirus/statistics?start_date=2024-01-01&end_date=2024-12-31&status=infected
router.get('/statistics',
    authMiddleware,
    checkRole(["MODERATOR", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"]),
    antivirusController.getStatistics
);

// Получение результата проверки по ID
// GET /api/antivirus/scan?scanId=xxx
router.get('/scan',
    authMiddleware,
    checkRole(["MODERATOR", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"]),
    antivirusController.getScanById
);

// Очистка старых результатов проверок
// DELETE /api/antivirus/cleanup?days=30
router.delete('/cleanup',
    authMiddleware,
    checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"]),
    antivirusController.cleanupOldScans
);

// =========================================================================
// Маршруты для антивирусных проверок одиночных системных файлов
// =========================================================================

// Получение истории проверок для сингл файла
// GET /api/antivirus/single-files/history?codeName=main_logo&limit=20&offset=0
router.get('/single-files/history',
    authMiddleware,
    checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"]),
    antivirusController.getSingleFileScanHistory
);

// Получение результата последней проверки для сингл файла
// GET /api/antivirus/single-files?codeName=main_logo
router.get('/single-files',
    authMiddleware,
    checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"]),
    antivirusController.getSingleFileScanResult
);

// Принудительное пересканирование одиночного файла
// POST /api/antivirus/single-files/rescan?codeName=main_logo
router.post('/single-files/rescan',
    authMiddleware,
    checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"]),
    antivirusController.rescanSingleFile
);

// =========================================================================
// Маршруты для антивирусных проверок файлов в модулях
// =========================================================================

// Получение истории проверок для конкретного файла
// GET /api/antivirus/files/history?moduleName=incident_evidence&recordId=xxx&fileName=photo.jpg&limit=20&offset=0
router.get('/files/history',
    authMiddleware,
    checkRole(["USER", "PARTNER", "USER_BUSINESS", "USER_INACTIVE", "MODERATOR", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"]),
    antivirusController.getFileScanHistory
);

// Получение результата последней проверки для конкретного файла
// GET /api/antivirus/files?moduleName=incident_evidence&recordId=xxx&fileName=photo.jpg
router.get('/files',
    authMiddleware,
    checkRole(["USER", "PARTNER", "USER_BUSINESS", "USER_INACTIVE", "MODERATOR", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"]),
    antivirusController.getFileScanResult
);

// Получение истории проверок для всех файлов записи
// GET /api/antivirus/records/history?moduleName=incident_evidence&recordId=xxx&page=1&limit=50&status=infected
router.get('/records/history',
    authMiddleware,
    checkRole(["USER", "PARTNER", "USER_BUSINESS", "USER_INACTIVE", "MODERATOR", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"]),
    antivirusController.getRecordScanHistory
);

// Принудительная повторная проверка файла
// POST /api/antivirus/rescan?moduleName=incident_evidence&recordId=xxx&fileName=photo.jpg
router.post('/rescan',
    authMiddleware,
    checkRole(["MODERATOR", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"]),
    antivirusController.rescanFile
);

module.exports = router;
