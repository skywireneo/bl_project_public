// const apiError = require('../exceptions/apiError');
// const tokenService = require('./systemServices/tokenService');
// const queryService = require('./systemServices/queryService');
// const personService = require('./incidentSubServices/personService');
// const pvzService = require('./incidentSubServices/pvzService');
// const { hashData } = require('./systemServices/cryptoService');

const apiError = require("../../../exceptions/apiError");
const dictionaryService = require("../../dictionary/dictionaryService");
const statisticService = require("../../stats/statisticService");
const ValidateService = require("../../systemServices/validate/validateService");
const usersEmailService = require("../../users/usersEmailService");
const userTgService = require("../../users/userTgService");
const incidentHistoryService = require("../history/incidentHistoryService");
const incidentUpdateService = require("../incidentUpdate/incidentUpdateService");
const personService = require("../persones/personService");
const pvzService = require("../pvz/pvzService");
const incidentCheckAndGeneratedDataService = require("./incidentCheckAndGeneratedDataService");

const validateService = new ValidateService();

class incidentCreateService {


    //     // ================================================================
    //     //  Создание инцидентов  →  incidentCreateService
    //     // ================================================================

    //     generateIncidentId() { return incidentCreateService.generateIncidentId(); }
    async getCreateIncidentData(client) {
        return {
            cenCreate: true,
            cenEdit: true,
            reasonsList: await dictionaryService.getNonSecureIndor(client, "reasons"),
            postsList: await dictionaryService.getNonSecureIndor(client, "posts"),
            pvzTypeList: await dictionaryService.getNonSecureIndor(client, "pvz_type"),
            trustEmailProviders: validateService.getTrustedEmailProviders()
        }
    }

    async createIncident(client, data, id = null, importInc = false, options = {}) {
        //  RATE LIMITING (не применяем для импорта и для DEVELOPER)
        if (!importInc && !options.skip_rate_limit) {
            const requestIp = options.request_ip || null;
            const deviceId = options.device_id || null;
            const email = data?.email || null;
        }

        if (id) validateService.incidentValidation.validateIncidentId(id);
        if (data.email) validateService.validateEmail(data.email);

        let email = null;
        let tg = data?.tg;

        if (importInc) {
            await incidentCheckAndGeneratedDataService.checkIncidentExist(client, id);
        } else {
            id = await incidentCheckAndGeneratedDataService.generateIncidentId(client);
        }

        if (!importInc && !data.email) {
            throw apiError.BadRequest('NOT_EMAIL', `Отсутствует email заявителя`);
        } else {
            email = data.email || "nonEmail@nonEmail.nonEmail";
        }

        const emailId = email ? await usersEmailService.createEmail(client, email, null, false) : null;
        const tgId = tg ? await userTgService.createTg(client, tg, null, false) : null;
        const safeDescription = data.text ? this.sanitizeText(data.text) : null;
        const reasonId = await dictionaryService.getElementIdByName(client, 'reasons', data.reason);
        // 🛡️ Валидация соответствия типа причины и должностей персон
        await this._validateReasonPositionConsistency(client, data.reason, data.persons || []);

        const incidentResult = await client.query(
            `INSERT INTO incidents_main_info (
                incident_id,
                type,
                date_add,
                user_add_email_id,
                user_add_tg_id,
                add_reason_id,
                user_description,
                condition_id,
                tg_post
            ) VALUES ($1, $2, (NOW() AT TIME ZONE 'UTC'), $3, $4, $5, $6, $7, $8) RETURNING incident_id`,
            [
                id,
                1,
                emailId,
                tgId,
                reasonId,
                safeDescription,
                importInc ? 3 : 1,
                importInc ? false : false,
            ]
        );

        const pvzList = data.pvzList;
        const personList = data.persons;
        const incidentId = incidentResult.rows[0].incident_id;

        await personService.createPersonsForIncident(client, personList, incidentId, importInc);

        if (pvzList != null && pvzList.length > 0) {
            await pvzService.createPVZForIncident(client, pvzList, incidentId);
        }
        if (importInc) {
            await incidentHistoryService.createRecord(client, incidentId, -1, "Импортирован инцидент");
            await incidentUpdateService.updateActive(client, incidentId, true);
        } else {
            await incidentHistoryService.createRecord(client, incidentId, -1, "Создал инцидент");
            await incidentUpdateService.updateActive(client, incidentId, false);
        }

        await statisticService.track('incidents:create', 'incidentList_view');

        // console.log(`[CreateIncident] Created: ${incidentId} by ${email || 'unknown'}`);

        return incidentId;
    }

    /**
 * 🛡️ Валидация соответствия типа причины и должностей персон
 * 
 * Проверяет, что все должности персон имеют тот же флаг onPvz,
 * что и выбранная причина инцидента.
 * 
 * @param {object} client - клиент БД
 * @param {string} reasonName - название причины
 * @param {Array} personsList - список персон
 * @throws {apiError.BadRequest} при несоответствии типов
 */
    async _validateReasonPositionConsistency(client, reasonName, personsList) {
        if (!reasonName || !Array.isArray(personsList) || personsList.length === 0) {
            return; // Нечего валидировать
        }

        // 1. Получаем полную информацию о причине (включая addonData)
        const reasonId = await dictionaryService.getElementIdByName(client, 'reasons', reasonName);
        const reasonFull = await dictionaryService.getElementFullById(client, reasonId);
        const reasonOnPvz = reasonFull?.addonData?.onPvz ?? false;
        const reasonTypeLabel = reasonOnPvz ? 'на администрацию ПВЗ' : 'на сотрудника ПВЗ';

        // 2. Получаем все должности одним пакетным запросом (оптимизация N+1)
        const positionNames = [...new Set(
            personsList
                .map(p => p.position?.trim())
                .filter(Boolean)
        )];

        if (positionNames.length === 0) return;

        // Получаем ID всех должностей, потом полные данные
        const positionsMap = new Map(); // name -> { onPvz, name }
        for (const posName of positionNames) {
            try {
                const postId = await dictionaryService.getElementIdByName(client, 'posts', posName);
                const postFull = await dictionaryService.getElementFullById(client, postId);
                positionsMap.set(posName, {
                    onPvz: postFull?.addonData?.onPvz ?? false,
                    name: posName
                });
            } catch (err) {
                // Должность не найдена — пропустим, валидация должности произойдёт ниже
            }
        }

        // 3. Проверяем каждую персону
        for (let i = 0; i < personsList.length; i++) {
            const person = personsList[i];
            const posName = person.position?.trim();
            if (!posName) continue;

            const postInfo = positionsMap.get(posName);
            if (!postInfo) continue; // Не найдена — пропустим

            const postOnPvz = postInfo.onPvz;

            if (reasonOnPvz !== postOnPvz) {
                const postTypeLabel = postOnPvz ? 'на администрацию ПВЗ' : 'на сотрудника ПВЗ';
                throw apiError.BadRequest(
                    'REASON_POSITION_TYPE_MISMATCH',
                    `Персона #${i + 1}: должность «${posName}» (${postTypeLabel}) ` +
                    `не соответствует причине «${reasonName}» (${reasonTypeLabel}). ` +
                    `Выберите должность того же типа, что и причина.`
                );
            }
        }
    }

    /**
 * Безопасная обработка текста: очистка от потенциально опасного содержимого
 * @param {string} text - исходный текст
 * @returns {string|null} - очищенный текст или null
 */
    sanitizeText(text) {
        if (!text || typeof text !== 'string') {
            return null;
        }

        // Удаляем HTML-теги (защита от XSS)
        let sanitized = text.replace(/<[^>]*>/g, '');

        // Удаляем потенциально опасные символы и последовательности
        sanitized = sanitized
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '') // onClick, onLoad и т.д.
            .replace(/vbscript:/gi, '')
            .replace(/data:/gi, '');

        // Экранируем специальные символы для дополнительной защиты
        sanitized = sanitized
            .replace(/'/g, "''")
            .replace(/\\/g, '\\\\');

        // Ограничиваем длину текста (например, 10000 символов)
        const maxLength = 10000;
        if (sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength);
        }

        // Удаляем лишние пробелы по краям
        sanitized = sanitized.trim();

        return sanitized || null;
    }
}

module.exports = new incidentCreateService();
