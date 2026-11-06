// const apiError = require("../../../exceptions/apiError");
// const { countStatuses } = require("../statusService");
// const addonService = require("./addonService");
// const { validateString } = require("./addonService");

// class ValidateStatusService {

//     async validateId(id) {
//         const validation = validateString(id, ['n'], [1, 1]);
//         if (!validation.isValid) {
//             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации id статуса` + validation.error);
//         }
//         if (id < 0 || id > await countStatuses()){
//             throw apiError.BadRequest('VALID_ERROR', `Ошибка валидации статуса. Вне диапазона допустимых значений.`)
//         }
//     }

//     validateCodeName(name) {
//         const validation = validateString(name, ['E', 'e', 's', 'n'], [3, 50]);
//         if (!validation.isValid) {
//             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации кодового названия статуса` + validation.error);
//         }
//     }

//     validateName(login) {
//         const validation = validateString(login, ['E', 'e', 'R', 'r', 's', 'n'], [3, 50]);
//         if (!validation.isValid) {
//             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации названия статуса` + validation.error);
//         }
//     }

//     validateDescr(descr) {
//         const validation = validateString(descr, ['E', 'e', 'R', 'r', 's', 'n', 'p'], [3, 200]);
//         if (!validation.isValid) {
//             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации описания статуса` + validation.error);
//         }
//     }
// }

// module.exports = ValidateStatusService;