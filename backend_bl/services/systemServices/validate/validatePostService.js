// const apiError = require("../../../exceptions/apiError");
// const addonService = require("./addonService");
// const { validateString } = require("./addonService");

// class ValidatePostService {
//     validateName(name) {
//         const validation = validateString(name, ['E', 'e', 'R', 'r', 's', 'n'], [1, 80]);
//         if (!validation.isValid) {
//             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации названия должности` + validation.error);
//         }
//     }

//     validatePostId(id) {
//         const validation = validateString(id, ['n'], [1, 10]);
//         if (!validation.isValid) {
//             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации id должности` + validation.error);
//         }
//     }

//     validateBall(ball) {
//     // Попробуем преобразовать в число
//     const parsedBall = Number(ball);

//     // Проверяем, что преобразование прошло успешно и это не NaN
//     if (isNaN(parsedBall)) {
//         throw apiError.BadRequest('VALIDATE_ERROR', 'Балл должен быть числом');
//     }

//     // Проверяем, что исходное значение — не объект и не boolean (защита от {}/true -> числу)
//     if (typeof ball === 'object' || typeof ball === 'boolean' || ball === null) {
//         throw apiError.BadRequest('VALIDATE_ERROR', 'Балл должен быть числом или строкой с числом');
//     }

//     // Проверяем, что число целое
//     if (!Number.isInteger(parsedBall)) {
//         throw apiError.BadRequest('VALIDATE_ERROR', 'Балл должен быть целым числом');
//     }

//     // Проверяем диапазон: от 1 до 100 включительно
//     if (parsedBall < 1 || parsedBall > 100) {
//         throw apiError.BadRequest('VALIDATE_ERROR', 'Балл должен быть от 1 до 100 включительно');
//     }

//     // Если всё ок, можно вернуть нормализованное значение (по желанию)
//     return parsedBall;
//     }
// }

// module.exports = ValidatePostService;