// const apiError = require("../../../exceptions/apiError");
// const addonService = require("./addonService");
const apiError = require("../../../exceptions/apiError");
const { validateString } = require("./addonService");

class ValidatePersoneService {

    // validatePersonId(id) {
    //     const validation = validateString(id, ['n'], [1, 100]);
    //     if (!validation.isValid) {
    //         throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации id персоны` + validation.error);
    //     }
    // }

    //     validateBirthDate(dateStr) {
    //         if (!dateStr || typeof dateStr !== 'string') {
    //             throw apiError.BadRequest('VALIDATE_ERROR', `Дата рождения отсутствует или в неверном формате: ${dateStr}`);
    //         }

    //         // Заменяем пробелы на дефисы
    //         const normalized = dateStr.trim().replace(/\s+/g, '-');

    //         // Проверка по шаблону ГГГГ-ММ-ДД
    //         const regex = /^\d{4}-\d{2}-\d{2}$/;
    //         if (!regex.test(normalized)) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', `Неверный формат даты рождения: ${dateStr}`);
    //         }

    //         // const [day, month, year] = normalized.split('-').map(Number);

    //         // // Проверяем существование даты
    //         // const dateObj = new Date(year, month - 1, day);
    //         // if (
    //         //     dateObj.getFullYear() !== year ||
    //         //     dateObj.getMonth() !== month - 1 ||
    //         //     dateObj.getDate() !== day
    //         // ) {
    //         //     throw apiError.BadRequest('VALIDATE_ERROR', `Несуществующая дата: ${normalized}`);
    //         // }

    //         return normalized; // возвращаем нормализованный и валидный формат даты
    //     };

    validateFIO(fio) {
        if (typeof fio !== 'string' || fio.length > 100) {
            throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации имени: превышена максимальная длина (100 символов)`);
        }
        const words = fio.trim().split(/\s+/); // разбиваем по пробелам
        if (words.length < 1 || words.length > 3) {
            throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации имени: допустимо от 1 до 3 слов`);
        }
        for (const word of words) {
            if (!/^[A-Za-zА-Яа-яЁё]+$/.test(word)) {
                throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации имени: каждое слово должно содержать только буквы`);
            }
            if (word.length > 30) {
                throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации имени: каждое слово не должно превышать 30 символов`);
            }
        }
    }

    validatePhone(phone) {
        if (!phone || typeof phone !== 'string') {
            throw apiError.BadRequest('VALIDATE_ERROR', 'Телефон должен быть строкой.');
        }

        // Удаляем + если он есть
        const normalized = phone.trim().replace(/^\+/, '');

        const validation = validateString(normalized, ['n', 'z'], [10, 15]);

        if (!validation.isValid) {
            throw apiError.BadRequest('VALIDATE_ERROR', 'Ошибка валидации телефона: ' + validation.error);
        }

        return normalized;
    };

    //      validatePhoneLastSix(phone){
    //         if (!phone || typeof phone !== 'string') {
    //             throw apiError.BadRequest('VALIDATE_ERROR', 'Телефон должен быть строкой.');
    //         }

    //         const validation = validateString(phone, ['n'], [6,6]);

    //         if (!validation.isValid) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', 'Ошибка валидации телефона (последних 6 цифр): ' + validation.error);
    //         }

    //         return phone;
    //     };

    //     validateUrl(url) {
    //         const validation = validateString(url, ['E', 'e', 's', 'n'], [1, 150]);
    //         if (!validation.isValid) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации url` + validation.error);
    //         }
    //     }


}

module.exports = ValidatePersoneService;