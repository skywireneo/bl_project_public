// const apiError = require("../../../exceptions/apiError");
// const { validateString } = require("./addonService");

// class validateMessageService {
//     validateId(id) {
//         const validation = validateString(id, ['n'], [1, 10]);
//         if (!validation.isValid) {
//             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации id сообщения` + validation.error);
//         }
//     }
// }

// module.exports = validateMessageService;