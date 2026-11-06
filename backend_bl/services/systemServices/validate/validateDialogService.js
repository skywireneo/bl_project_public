// const apiError = require("../../../exceptions/apiError");
// const { validateString } = require("./addonService");

// class validateDialogService {
//     validateId(id) {
//         const validation = validateString(id, ['n'], [1, 10]);
//         if (!validation.isValid) {
//             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации id диалога` + validation.error);
//         }
//     }

//     validateReasonId(id) {
//         const validation = validateString(id, ['n'], [1, 10]);
//         if (!validation.isValid) {
//             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации id причины` + validation.error);
//         }
//     }

//     validateReasonCodeName(name) {
//         const validation = validateString(name, ['E', 'e', 's', 'n'], [3, 50]);
//         if (!validation.isValid) {
//             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации кодового названия причины диалога` + validation.error);
//         }
//     }

//     validateMessage(name) {
//         const validation = validateString(name, ['E', 'e', 'R', 'r', 'z', 'p', 's', 'n'], [1, 5000]);
//         if (!validation.isValid) {
//             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации сообщения` + validation.error);
//         }
//     }
// }

// module.exports = validateDialogService;