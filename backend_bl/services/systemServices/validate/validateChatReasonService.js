// const apiError = require("../../../exceptions/apiError");
// const { countChatReasons } = require("../chatReasonServiceService");
// const addonService = require("./addonService");
// const { validateString } = require("./addonService");

// class validateChatReasonService {
//     async validateId(id) {
//         const validation = validateString(id, ['n'], [1, 1]);
//         if (!validation.isValid) {
//             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации id причины чата` + validation.error);
//         }
//         if (id < 1 || id > await countChatReasons()) {
//             throw apiError.BadRequest('VALID_ERROR', `Ошибка валидации id причины чата. Вне диапазона допустимых значений.`)
//         }
//     }

//     validateCodeName(name) {
//         const validation = validateString(name, ['E', 'e', 's', 'n'], [3, 50]);
//         if (!validation.isValid) {
//             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации кодового названия причины чата` + validation.error);
//         }
//     }

//     validateName(login) {
//         const validation = validateString(login, ['E', 'e', 'R', 'r', 's', 'n'], [3, 50]);
//         if (!validation.isValid) {
//             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации названия причины чата` + validation.error);
//         }
//     }

//     validateDescr(descr) {
//         const validation = validateString(descr, ['E', 'e', 'R', 'r', 's', 'n', 'p'], [3, 200]);
//         if (!validation.isValid) {
//             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации описания причины чата` + validation.error);
//         }
//     }

//     validateStatusesToGet(statusesToGet) {
//         const allowedValues = ['DEVELOPER', 'USER', 'MODERATOR', 'ADMINISTRATOR', 'USER_BUSINESS', 'USER_INACTIVE', 'BLOCKED']; // твои допустимые значения
//         let statusesArray = [];

//         if (typeof statusesToGet !== 'string') {
//             throw apiError.BadRequest('VALIDATE_ERROR', 'Ошибка валидации: данные должны быть строкой');
//         }

//         try {
//             // Пытаемся распарсить как JSON
//             const parsed = JSON.parse(statusesToGet);

//             if (!Array.isArray(parsed)) {
//                 throw new Error('Не массив');
//             }

//             statusesArray = parsed;
//         } catch (e) {
//             // Если не JSON — пробуем разбить по запятой
//             statusesArray = statusesToGet
//                 .split(',')                        // Разделить по запятой
//                 .map(s => s.trim())                // Убрать лишние пробелы
//                 .filter(Boolean);                  // Убрать пустые
//         }

//         // Проверка, что все элементы допустимы
//         for (const value of statusesArray) {
//             if (!allowedValues.includes(value)) {
//                 throw apiError.BadRequest(
//                     'VALIDATE_ERROR',
//                     `Недопустимое значение: "${value}". Допустимые значения: ${allowedValues.join(', ')}`
//                 );
//             }
//         }

//         return statusesArray; // возвращаем массив для дальнейшего использования
//     }
// }

// module.exports = validateChatReasonService;