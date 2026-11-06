const apiError = require("../../../exceptions/apiError");
const ValidateService = require("../../systemServices/validate/validateService");
const dictionaryService = require("../../dictionary/dictionaryService");

const validateService = new ValidateService();

class commonPersonService {

    async checkPersonExist(client, personId, errExit = true) {
        let person_db = await client.query(`
        SELECT 
            person_id 
        FROM 
            incident_persones 
        WHERE 
            person_id = $1
        `, [personId])
        if (person_db.rowCount == 0) {
            if (errExit) {
                throw apiError.BadRequest('PERSON_NOT_EXIST', `Персона не существует`)
            } else {
                return false
            }
        }
        if (!errExit) {
            return true
        }
    }

    async checkPersonExistConnector(client, personId, incidentId, errExit = true) {
        let person_db = await client.query(`
            SELECT 
                id 
            FROM 
                incident_persone_connector 
            WHERE 
                person_id = $1
                AND incident_id = $2
            `, [personId, incidentId])
        if (person_db.rowCount > 0) {
            if (errExit) {
                throw apiError.BadRequest('PERSON_CONNECTOR_EXIST', `Связь персоны с инцидентом уже существует`)
            } else {
                return true
            }
        }
        if (!errExit) {
            return false
        }
    }

    async getPostId(client, position) {
        if (!position) {
            throw apiError.BadRequest('POST_NO_DATA', 'Должность не указана');
        }
        const postId = await dictionaryService.getElementIdByName(client, 'posts', position);
        if (!postId) {
            throw apiError.BadRequest('POST_NOT_EXIST', `Должность "${position}" не найдена в справочнике`);
        }
        return postId;
    }

    /**
     * Нормализация и валидация даты рождения.
     * Поддерживает форматы: YYYY-MM-DD, DD.MM.YYYY, DD-MM-YYYY.
     * Возвращает строку в формате YYYY-MM-DD для БД или null.
     * @param {string|null|undefined} birthDate 
     * @returns {string|null} - дата в формате YYYY-MM-DD или null
     */
    normalizeBirthDate(birthDate) {
        // console.log(birthDate)
        // Если null, undefined или пустая строка — возвращаем null
        if (birthDate === null || birthDate === undefined || birthDate === '') {
            return null;
        }

        // Если это объект Date, преобразуем в строку YYYY-MM-DD
        if (birthDate instanceof Date && !isNaN(birthDate)) {
            const year = birthDate.getFullYear();
            const month = String(birthDate.getMonth() + 1).padStart(2, '0');
            const day = String(birthDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // Если пришла строка — парсим
        if (typeof birthDate !== 'string') {
            throw apiError.BadRequest('VALIDATE_ERROR', 'Дата рождения должна быть строкой или объектом Date');
        }

        const trimmed = birthDate.trim();
        if (!trimmed) {
            return null;
        }

        let year, month, day;

        // Определяем формат по позиции разделителей и длине частей
        // Формат YYYY-MM-DD: первая часть 4 цифры
        const ymdRegex = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/;
        // Формат DD.MM.YYYY или DD-MM-YYYY: последняя часть 4 цифры
        const dmyRegex = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/;

        const ymdMatch = trimmed.match(ymdRegex);
        const dmyMatch = trimmed.match(dmyRegex);

        if (ymdMatch) {
            year = parseInt(ymdMatch[1], 10);
            month = parseInt(ymdMatch[2], 10);
            day = parseInt(ymdMatch[3], 10);
        } else if (dmyMatch) {
            day = parseInt(dmyMatch[1], 10);
            month = parseInt(dmyMatch[2], 10);
            year = parseInt(dmyMatch[3], 10);
        } else {
            throw apiError.BadRequest('VALIDATE_ERROR',
                `Неверный формат даты рождения: "${birthDate}". Допустимые форматы: YYYY-MM-DD, DD.MM.YYYY, DD-MM-YYYY`);
        }

        // Базовые диапазоны
        if (month < 1 || month > 12) {
            throw apiError.BadRequest('VALIDATE_ERROR',
                `Неверный месяц "${month}" в дате рождения`);
        }
        if (day < 1 || day > 31) {
            throw apiError.BadRequest('VALIDATE_ERROR',
                `Неверный день "${day}" в дате рождения`);
        }
        if (year < 1900 || year > new Date().getFullYear()) {
            throw apiError.BadRequest('VALIDATE_ERROR',
                `Недопустимый год "${year}" в дате рождения. Ожидается от 1900 до текущего года`);
        }

        // Проверяем реальное количество дней в месяце (через Date — автокоррекция)
        const dateObj = new Date(Date.UTC(year, month - 1, day));
        if (
            dateObj.getUTCFullYear() !== year ||
            dateObj.getUTCMonth() !== month - 1 ||
            dateObj.getUTCDate() !== day
        ) {
            throw apiError.BadRequest('VALIDATE_ERROR',
                `Дата "${birthDate}" не существует (например, 31 февраля)`);
        }

        // Нельзя родиться в будущем
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dateObj > today) {
            throw apiError.BadRequest('VALIDATE_ERROR',
                `Дата рождения не может быть в будущем: "${birthDate}"`);
        }

        // Приводим к формату YYYY-MM-DD с ведущими нулями
        const yyyy = year.toString().padStart(4, '0');
        const mm = month.toString().padStart(2, '0');
        const dd = day.toString().padStart(2, '0');

        return `${yyyy}-${mm}-${dd}`;
    }
}

module.exports = new commonPersonService();