// const tokenService = require('./systemServices/tokenService');
// const queryService = require('./systemServices/queryService');
// const personService = require('./incidentSubServices/personService');
// const pvzService = require('./incidentSubServices/pvzService');
// const { hashData } = require('./systemServices/cryptoService');

const apiError = require("../../../exceptions/apiError");
const ValidateService = require("../../systemServices/validate/validateService");

const validateService = new ValidateService();

class incidentCheckAndGeneratedDataService {

    async checkIncidentExist(client, incidentId, errExit = true) {
        let name_db = await client.query('SELECT incident_id FROM incidents_main_info WHERE incident_id = $1', [incidentId])
        if (name_db.rowCount > 0) {
            if (errExit) {
                throw apiError.BadRequest('INCIDENT_NOT_EXIST', `Инцидент "${incidentId}" уже существует`)
            } else {
                return true
            }
        }
        if (!errExit) {
            return false
        }
    }

    async checkIncidentNotExist(client, incidentId, errExit = true) {
        let name_db = await client.query('SELECT incident_id FROM incidents_main_info WHERE incident_id = $1', [incidentId])
        if (name_db.rowCount == 0) {
            if (errExit) {
                throw apiError.BadRequest('INCIDENT_NOT_EXIST', `Инцидент "${incidentId}" не существует`)
            } else {
                return false
            }
        }
        if (!errExit) {
            return true
        }
    }

    async generateIncidentId(client) {
        const maxAttempts = 4;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const date = new Date();
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const randomLetters = Array.from({ length: 5 }, () =>
                String.fromCharCode(Math.floor(Math.random() * 26) + 65)
            ).join('');

            const incidentId = `${day}${month}${year}-${randomLetters}`;

            // Проверяем, существует ли уже такой ID.
            // Передаем errExit = false, чтобы метод вернул true/false вместо выброса исключения
            const exists = await this.checkIncidentExist(client, incidentId, false);

            if (!exists) {
                return incidentId;
            }
        }

        // Если цикл завершился, но уникальный ID так и не был найден
        throw apiError.InternalError(
            'INCIDENT_GENERATION_FAILED',
            `Не удалось сгенерировать уникальный ID инцидента за ${maxAttempts} попытки`
        );
    }
}

module.exports = new incidentCheckAndGeneratedDataService();