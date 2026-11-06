// const apiError = require("../../../exceptions/apiError");
// const { validateString } = require("./addonService");

// class ValidateContestationService {

//     validateContestationId(id) {
//         const validation = validateString(id, ['n'], [1, 10]);
//         if (!validation.isValid) {
//             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации id оспаривания` + validation.error);
//         }
//     }
// }

// module.exports = ValidateContestationService;