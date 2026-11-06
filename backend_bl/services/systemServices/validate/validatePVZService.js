const apiError = require("../../../exceptions/apiError");
// const addonService = require("./addonService");
// const { validateString } = require("./addonService");

class ValidatePVZService {
    //     validateName(name) {
    //         const validation = validateString(name, ['E', 'e', 'R', 'r', 's', 'n'], [1, 80]);
    //         if (!validation.isValid) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации названия пвз` + validation.error);
    //         }
    //     }

    validateAddress(address) {
        if (!address || typeof address !== "string") {
            throw apiError.BadRequest("VALIDATE_ERROR", "Адрес должен быть строкой");
        }

        const parts = address.split(",").map(p => p.trim());
        if (parts.length !== 3) {
            throw apiError.BadRequest("VALIDATE_ERROR", "Адрес должен состоять из 3 частей: город, улица, дом");
        }

        let [city, street, house] = parts;

        // Очистка города
        city = city.replace(/^(г\.?|город|гор\.)\s*/i, "").trim();
        if (city.length === 0 || city.length > 30) {
            throw apiError.BadRequest("VALIDATE_ERROR", "Некорректное название города");
        }

        // Очистка улицы
        street = street.replace(/^(ул\.?|улица)\s*/i, "").trim();
        if (street.length === 0 || street.length > 70) {
            throw apiError.BadRequest("VALIDATE_ERROR", "Некорректное название улицы");
        }

        // Очистка дома
        house = house
            .replace(/^(д\.?|дом|корпус|к\.?)\s*/i, "")
            .replace(/\s+/g, "") // убираем пробелы
            .trim();

        if (!/^[0-9]+[А-Яа-яA-Za-z0-9]*$/.test(house)) {
            throw apiError.BadRequest("VALIDATE_ERROR", "Некорректный номер дома");
        }
        if (house.length > 10) {
            throw apiError.BadRequest("VALIDATE_ERROR", "Слишком длинный номер дома");
        }
    }


    //     validatePVZId(id) {
    //         const validation = validateString(id, ['n'], [1, 10]);
    //         if (!validation.isValid) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации id пвз` + validation.error);
    //         }
    //     }

    //     validateTypeId(id) {
    //         const validation = validateString(id, ['n'], [1, 10]);
    //         if (!validation.isValid) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации id типа пвз` + validation.error);
    //         }
    //     }

    //     validateTypeName(name) {
    //         const validation = validateString(name, ['E', 'e', 'R', 'r', 's', 'n'], [1, 80]);
    //         if (!validation.isValid) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации названия типа пвз` + validation.error);
    //         }
    //     }
}

module.exports = ValidatePVZService;