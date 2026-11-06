const apiError = require("../../../exceptions/apiError");
const { validateString } = require("./addonService");

class ValidateIncService {

    validateIncidentId(incidentId) {
        const regex = /^\d{8}-[A-Z]{5}$/;
        if (!regex.test(incidentId)) {
            throw apiError.BadRequest('VALIDATE_ERROR', `Неверное значение параметра: ${incidentId}`);
        }
    }

    //     validateIncidentTypeRequest(typeRequest) {
    //         const validation = validateString(typeRequest, ['E', 'e', 's'], [1, 21]);
    //         if (!validation.isValid) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', `Ошибка валидации типа на кого жалоба` + validation.error);
    //         }
    //     }
}

module.exports = ValidateIncService;