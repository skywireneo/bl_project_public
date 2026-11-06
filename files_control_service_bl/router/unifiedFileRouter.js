const Router = require('express');
const router = new Router()
const authMiddleware = require('../middleware/authMiddleware');
const checkAccess = require('../middleware/accessMiddleware')
const checkRole = require('../middleware/roleMiddleware');
const unifiedFileController = require('../controllers/unifiedFileController');

// Основные операции с файлами
// +
router.post('/upload', unifiedFileController.uploadFiles);

//+
router.post('/update', unifiedFileController.updateFile);

// +
router.delete('/delete', unifiedFileController.deleteFile);

// Получение информации о файлах
// +
router.get('/list', unifiedFileController.getFiles);

// Скачивание файла
// +
router.get('/download', unifiedFileController.downloadFile);

// Обновление порядка файлов
// +
router.post('/reorder', unifiedFileController.reorderFiles);

router.get('/archive', authMiddleware, unifiedFileController.downloadIncidentArchive);
// =========================================================================
// Маршруты для одиночных системных файлов (single_system_files)
// =========================================================================

// Получение списка одиночных файлов с пагинацией
// +
router.get('/single-files/list',
    authMiddleware,
    checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"]),
    unifiedFileController.getSingleFiles
);

// Обновление одиночного файла по code_name
// +
router.post('/single-files/update',
    authMiddleware,
    checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"]),
    unifiedFileController.updateSingleFile
);

// Удаление одиночного файла по code_name
// +
router.delete('/single-files/delete',
    authMiddleware,
    checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"]),
    unifiedFileController.deleteSingleFile
);

// Скачивание одиночного файла по code_name
// +
router.get('/single-files/download',
    unifiedFileController.downloadSingleFile
);

module.exports = router;
