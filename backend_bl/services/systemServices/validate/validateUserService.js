const apiError = require("../../../exceptions/apiError");
// const addonService = require("./addonService");
const { validateString } = require("./addonService");

class ValidateUserService {

    //     validateId(id) {
    //         const validation = validateString(id, ['n'], [1, 10]);
    //         if (!validation.isValid) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации id пользователя` + validation.error);
    //         }
    //     }

    //     validateName(name) {
    //         const validation = validateString(name, ['E', 'e', 'R', 'r', 's', 'n'], [1, 80]);
    //         if (!validation.isValid) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации имени` + validation.error);
    //         }
    //     }

    validateLogin(login) {
        const validation = validateString(login, ['E', 'e', 's', 'n'], [1, 50]);
        if (!validation.isValid) {
            throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации логина` + validation.error);
        }
    }

    //     validateGender(genger) {
    //         const validation = validateString(genger, ['E', 'e', 's', 'n'], [1, 10]);
    //         if (!validation.isValid) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации гендера` + validation.error);
    //         }
    //     }

    //     validateLanguage(language) {
    //         const validation = validateString(language, ['E', 'e', 's', 'n'], [1, 10]);
    //         if (!validation.isValid) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации предпочитаемого языка` + validation.error);
    //         }
    //     }

    //     validateTheme(theme) {
    //         const validation = validateString(theme, ['E', 'e', 's', 'n'], [1, 20]);
    //         if (!validation.isValid) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации предпочитаемой темы` + validation.error);
    //         }
    //     }

    validatePassword(pass) {
        if (typeof pass !== 'string') {
            throw apiError.BadRequest('VALIDATE_ERROR', 'Пароль должен быть строкой');
        }

        if (pass.length < 5 || pass.length > 20) {
            throw apiError.BadRequest('VALIDATE_ERROR', 'Пароль должен содержать от 5 до 20 символов');
        }

        if (!/[a-z]/.test(pass)) {
            throw apiError.BadRequest('VALIDATE_ERROR', 'Пароль должен содержать строчные английские буквы');
        }

        if (!/[A-Z]/.test(pass)) {
            throw apiError.BadRequest('VALIDATE_ERROR', 'Пароль должен содержать заглавные английские буквы');
        }

        if (!/[0-9]/.test(pass)) {
            throw apiError.BadRequest('VALIDATE_ERROR', 'Пароль должен содержать цифры');
        }

        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) {
            throw apiError.BadRequest('VALIDATE_ERROR', 'Пароль должен содержать спецсимволы');
        }

        return true;
    }

    //     validateEmail(email) {
    //         if (typeof email !== 'string') {
    //             throw apiError.BadRequest('VALIDATE_ERROR', 'Email должен быть строкой');
    //         }

    //         // Убираем лишние пробелы
    //         const trimmed = email.trim();

    //         // Проверка длины
    //         if (trimmed.length < 5 || trimmed.length > 150) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', 'Недопустимая длина email (от 5 до 150 символов)');
    //         }

    //         // Проверка формата (упрощённый, но надёжный)
    //         const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    //         if (!emailRegex.test(trimmed)) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', 'Некорректный формат email');
    //         }

    //         // Проверка на пробелы внутри
    //         if (/\s/.test(trimmed)) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', 'Email не должен содержать пробелов');
    //         }
    //     }
}

module.exports = ValidateUserService;