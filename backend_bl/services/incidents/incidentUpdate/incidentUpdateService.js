const apiError = require("../../../exceptions/apiError");
const dictionaryService = require("../../dictionary/dictionaryService");
const userEncriptionService = require("../../systemServices/userEncriptionService");
const ValidateService = require("../../systemServices/validate/validateService");
const usersEmailService = require("../../users/usersEmailService");
const userTgService = require("../../users/userTgService");
const incidentConditionStatusesCommon = require("../incidentConditionStatuses/incidentConditionStatusesCommon");
const incidentCheckAndGeneratedDataService = require("../incidentCreate/incidentCheckAndGeneratedDataService");
const personService = require("../persones/personService");
const updatePersonService = require("../persones/updatePersonService");
const pvzService = require("../pvz/pvzService");
const updatePvzService = require("../pvz/updatePvzService");

const validateService = new ValidateService();

class incidentUpdateService {

    async checkCanEditIncidentById(client, incidentId, userId = -1, current_user_status = null, ret = false, ownerToken = null, skipOwner = false) {
        if (['DEVELOPER', 'TOP_LEVEL_DEVELOPER'].includes(current_user_status)) return true;

        console.log(9999999999)
        console.log(incidentId, userId, current_user_status, ret, ownerToken, skipOwner)

        const incidentResult = await client.query(
            `SELECT imf.date_add, imf.condition_id, imf.deleted, imf.user_add_email_id 
             FROM incidents_main_info imf WHERE imf.incident_id = $1`,
            [incidentId]
        );

        if (incidentResult.rowCount === 0) {
            if (ret) return false;
            throw apiError.Forbidden('Нет доступа для редактирования записи');
        }

        const incident = incidentResult.rows[0];

        if (incident.deleted) {
            if (ret) return false;
            throw apiError.Forbidden('Нет доступа для редактирования записи');
        }

        const allStatuses = await incidentConditionStatusesCommon.getAllStatuses(client);
        const currentStatusObj = allStatuses.find(s => String(s.status_id) === String(incident.condition_id));
        const currentStatusCode = currentStatusObj ? currentStatusObj.status_code_name : null;

        const dateAdd = new Date(incident.date_add);
        const now = new Date();
        const diffMinutes = (now - dateAdd) / (1000 * 60);

        console.log(123)
        console.log(diffMinutes, currentStatusCode)
        console.log(incidentId)
        console.log(incident)
        console.log(incident.condition_id, allStatuses)

        if (incidentId.startsWith('D-') && diffMinutes <= 15 && currentStatusCode === 'contestation_new') {
            if (!skipOwner) {
                const ownerTokenService = require('../../systemServices/ownerTokenService');
                const usersEmailService = require('../../users/usersEmailService');

                const dbEmail = await usersEmailService.getDecryptedEmailById(client, incident.user_add_email_id);
                if (!ownerTokenService.verifyOwnerToken(incidentId, dbEmail, ownerToken)) {
                    if (ret) return false;
                    throw apiError.Forbidden('Требуется подтверждение email создателя.');
                }
            }
            return true; // Разрешаем редактирование без иных проверок
        }

        const newStatus = allStatuses.find(s => s.status_code_name === 'new');
        if (!newStatus || String(incident.condition_id) !== String(newStatus.status_id)) {
            if (ret) return false;
            throw apiError.Forbidden('Нет доступа для редактирования записи');
        }

        if (diffMinutes <= 15) {
            if (!skipOwner) {
                const ownerTokenService = require('../../systemServices/ownerTokenService');
                const usersEmailService = require('../../users/usersEmailService');

                const dbEmail = await usersEmailService.getDecryptedEmailById(client, incident.user_add_email_id);
                if (!ownerTokenService.verifyOwnerToken(incidentId, dbEmail, ownerToken)) {
                    if (ret) return false;
                    throw apiError.Forbidden('Требуется подтверждение email создателя.');
                }
            }
            return true;
        }

        // Если для обычного инцидента прошло больше 15 минут
        if (ret) return false;
        throw apiError.Forbidden('Нет доступа для редактирования записи (прошло более 15 минут)');
    }

    async updateTgPost(client, incidentId, isPublished = true) {
        if (!incidentId) {
            throw apiError.BadRequest('NAME_NO_DATA', `Недостаточно данных для изменения tg_post`);
        }

        // 1. Проверяем, что инцидент существует
        await incidentCheckAndGeneratedDataService.checkIncidentNotExist(client, incidentId);

        // 2. Проверка статуса только при ПУБЛИКАЦИИ (не при снятии)
        if (isPublished === true) {
            const FORBIDDEN_STATUSES = ['new', 'in_progress'];

            const incidentConditionStatusesControl = require("../incidentConditionStatuses/incidentConditionStatusesControl");

            const currentStatus = await incidentConditionStatusesControl.getCurrentStatus(
                client,
                incidentId
            );

            if (FORBIDDEN_STATUSES.includes(currentStatus.code)) {
                throw apiError.BadRequest(
                    'INCIDENT_NOT_READY_FOR_PUBLISH',
                    `Инцидент находится в статусе "${currentStatus.name}" и не может быть опубликован. ` +
                    `Публикация возможна только после завершения работы над инцидентом (статусы: resolved, closed, rejected).`
                );
            }
        }

        // 3. Обновляем поле в БД
        const result = await client.query(
            `UPDATE incidents_main_info 
         SET tg_post = $1 
         WHERE incident_id = $2 
         RETURNING tg_post`,
            [isPublished, incidentId]
        );

        if (result.rowCount === 0) {
            throw apiError.BadRequest('INCIDENT_NOT_UPDATED', `Не удалось обновить статус публикации`);
        }

        return result.rows[0].tg_post;
    }

    async updateIncident(client, data, current_user, current_user_status, ownerToken = null) {
        await this.checkCanEditIncidentById(client, data.id, current_user?.id, current_user_status, false, ownerToken)

        if (data.id) {
            validateService.incidentValidation.validateIncidentId(data.id);
        } else {
            throw apiError.BadRequest('NOT_EMAIL_ID', `Отсутствует ID инцидента для обновления`);
        }
        const id = data.id

        await incidentCheckAndGeneratedDataService.checkIncidentNotExist(client, id);

        let emailId = data.emailId || null;
        let tgId = data.tgId || null;

        if (data.email) {
            if (!data.emailId) {
                throw apiError.BadRequest('NOT_EMAIL_ID', `Отсутствует ID email для обновления`);
            }
            validateService.validateEmail(data.email);
            emailId = await usersEmailService.updateEmail(client, emailId, data.email, false);
        }

        if (data.tg) {
            if (!data.tgId) {
                throw apiError.BadRequest('NOT_TG_ID', `Отсутствует ID tg для обновления`);
            }
            tgId = await userTgService.updateTg(client, tgId, data.tg, false);
        }

        const safeDescription = data.text ? this.sanitizeText(data.text) : null;

        let reasonId = null;
        if (data.reason) {
            reasonId = await dictionaryService.getElementIdByName(client, 'reasons', data.reason);

            const currentIncidentRes = await client.query(
                `SELECT add_reason_id FROM incidents_main_info WHERE incident_id = $1`,
                [id]
            );
            const currentReasonId = currentIncidentRes.rows[0]?.add_reason_id;

            if (currentReasonId) {
                const currentReasonFull = await dictionaryService.getElementFullById(client, currentReasonId);
                const currentOnPvz = currentReasonFull?.addonData?.onPvz ?? false;

                const newReasonFull = await dictionaryService.getElementFullById(client, reasonId);
                const newOnPvz = newReasonFull?.addonData?.onPvz ?? false;

                if (currentOnPvz !== newOnPvz) {
                    throw apiError.BadRequest(
                        'CANNOT_CHANGE_REASON_TYPE',
                        `Нельзя изменить тип причины инцидента. ` +
                        `Текущая причина: ${currentOnPvz ? 'на администрацию ПВЗ' : 'на сотрудника ПВЗ'}, ` +
                        `новая: ${newOnPvz ? 'на администрацию ПВЗ' : 'на сотрудника ПВЗ'}. ` +
                        `Создайте новый инцидент с нужной причиной.`
                    );
                }
            }

            await this._validateReasonPositionConsistency(client, data.reason, data.persons || []);
        }

        const incidentResult = await client.query(
            `UPDATE incidents_main_info 
            SET user_add_email_id = $1,
                user_add_tg_id = $2,
                add_reason_id = $3,
                user_description = $4
            WHERE incident_id = $5
            RETURNING incident_id`,
            [
                emailId,
                tgId,
                reasonId,
                safeDescription,
                id
            ]
        );

        if (incidentResult.rowCount === 0) {
            throw apiError.BadRequest('INCIDENT_NOT_UPDATED', `Не удалось обновить инцидент или он не найден`);
        }

        const incidentId = incidentResult.rows[0].incident_id;

        const pvzList = data.pvzList;
        const personList = data.persons;

        await personService.updatePersonsForIncident(client, incidentId, personList)
        if (pvzList != null && pvzList != []) { await pvzService.updatePVZForIncident(client, incidentId, pvzList) }

        return incidentId;
    }

    async updateActive(client, incidentId, active) {
        if (!incidentId) {
            throw apiError.BadRequest('NAME_NO_DATA', `Недостаточно данных для изменения active`)
        }
        await updatePvzService.updateActiveInConnector(client, incidentId, active)
        await updatePersonService.updateActiveInConnector(client, incidentId, active)
        await this.updateActiveInIncidentMainInfo(client, incidentId, active)
    }

    async updateActiveInIncidentMainInfo(client, incidentId, active) {
        if (!incidentId) {
            throw apiError.BadRequest('NAME_NO_DATA', `Недостаточно данных для изменения active`)
        }
        const connectorResult = await client.query(
            `UPDATE incidents_main_info SET active = $1 WHERE incident_id = $2`,
            [active, incidentId]
        );
    }

    async updateResponsible(client, incidentId, moderatorId) {
        if (!incidentId || !moderatorId) {
            throw apiError.BadRequest('NAME_NO_DATA', `Недостаточно данных для изменения moderatorId`)
        }
        const connectorResult = await client.query(
            `UPDATE incidents_main_info SET moderator_id = $1 WHERE incident_id = $2`,
            [moderatorId, incidentId]
        );
    }

    async updateInterestScorePlusOne(client, incidentId) {
        if (!incidentId) {
            throw apiError.BadRequest('NAME_NO_DATA', `Недостаточно данных для изменения active`)
        }
        const connectorResult = await client.query(
            `UPDATE incidents_main_info SET interest_score = interest_score + 1 WHERE incident_id = $1 RETURNING interest_score`,
            [incidentId]
        );
        return connectorResult.rows[0].interest_score
    }

    async _validateReasonPositionConsistency(client, reasonName, personsList) {
        if (!reasonName || !Array.isArray(personsList) || personsList.length === 0) {
            return;
        }

        const reasonId = await dictionaryService.getElementIdByName(client, 'reasons', reasonName);
        const reasonFull = await dictionaryService.getElementFullById(client, reasonId);
        const reasonOnPvz = reasonFull?.addonData?.onPvz ?? false;
        const reasonTypeLabel = reasonOnPvz ? 'на администрацию ПВЗ' : 'на сотрудника ПВЗ';

        const positionNames = [...new Set(
            personsList.map(p => p.position?.trim()).filter(Boolean)
        )];

        if (positionNames.length === 0) return;

        const positionsMap = new Map();
        for (const posName of positionNames) {
            try {
                const postId = await dictionaryService.getElementIdByName(client, 'posts', posName);
                const postFull = await dictionaryService.getElementFullById(client, postId);
                positionsMap.set(posName, {
                    onPvz: postFull?.addonData?.onPvz ?? false,
                    name: posName
                });
            } catch (err) {
            }
        }

        for (let i = 0; i < personsList.length; i++) {
            const person = personsList[i];
            const posName = person.position?.trim();
            if (!posName) continue;

            const postInfo = positionsMap.get(posName);
            if (!postInfo) continue;

            if (reasonOnPvz !== postInfo.onPvz) {
                const postTypeLabel = postInfo.onPvz ? 'на администрацию ПВЗ' : 'на сотрудника ПВЗ';
                throw apiError.BadRequest(
                    'REASON_POSITION_TYPE_MISMATCH',
                    `Персона #${i + 1}: должность «${posName}» (${postTypeLabel}) ` +
                    `не соответствует причине «${reasonName}» (${reasonTypeLabel}). ` +
                    `Выберите должность того же типа, что и причина.`
                );
            }
        }
    }

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

    // Добавьте в конец класса incidentUpdateService
    async updateAdminAssessment(client, incidentId, assessment) {
        if (!incidentId) throw apiError.BadRequest('Не указан ID инцидента');

        const result = await client.query(
            `UPDATE incidents_main_info 
         SET admin_assessment = $1 
         WHERE incident_id = $2 
         RETURNING admin_assessment`,
            [JSON.stringify(assessment), incidentId]
        );

        if (result.rowCount === 0) throw apiError.BadRequest('Инцидент не найден');
        return result.rows[0].admin_assessment;
    }

    async updateAiResponse(client, incidentId, aiResponse) {
        if (!incidentId) {
            throw apiError.BadRequest('Не указан ID инцидента');
        }

        const checkResult = await client.query(
            `SELECT incident_id FROM incidents_main_info WHERE incident_id = $1`,
            [incidentId]
        );

        if (checkResult.rowCount === 0) {
            throw apiError.BadRequest('Инцидент не найден');
        }

        const result = await client.query(
            `UPDATE incidents_main_info 
             SET ai_response = $1, 
                 ai_response_flag = true 
             WHERE incident_id = $2 
             RETURNING incident_id, ai_response_flag, ai_response`,
            [JSON.stringify(aiResponse), incidentId]
        );

        return result.rows[0];
    }

    async updateShowAiResponse(client, incidentId, showAiResponse) {
        return null
    }

    async addAdminAssessmentRecord(client, incidentId, assessment, current_user) {
        if (!incidentId) throw apiError.BadRequest('Не указан ID инцидента');
        if (!current_user || !current_user.id) throw apiError.Forbidden('Требуется авторизация');

        const incRes = await client.query(
            `SELECT moderator_id, admin_assessment FROM incidents_main_info WHERE incident_id = $1`,
            [incidentId]
        );
        if (incRes.rowCount === 0) throw apiError.BadRequest('Инцидент не найден');

        const incident = incRes.rows[0];

        if (String(incident.moderator_id) === String(current_user.id)) {
            throw apiError.BadRequest(
                'MODERATOR_CANNOT_ASSESS',
                'Действующий модератор не может оставлять оценку по этому инциденту. Проверка должна быть выполнена другим администратором.'
            );
        }

        const newRecord = {
            user_id: current_user.id,
            user_login: current_user.login || null,
            result: assessment.result || 'unknown', // Ожидаем: 'approved', 'rejected', 'needs_review'
            comment: assessment.comment || null,
            timestamp: new Date().toISOString()
        };

        let currentAssessment = incident.admin_assessment || {};
        if (!Array.isArray(currentAssessment.history)) {
            currentAssessment.history = [];
        }
        currentAssessment.history.push(newRecord);

        const result = await client.query(
            `UPDATE incidents_main_info
             SET admin_assessment = $1
             WHERE incident_id = $2
             RETURNING admin_assessment`,
            [JSON.stringify(currentAssessment), incidentId]
        );
        if (result.rowCount === 0) throw apiError.BadRequest('Инцидент не найден');
        return result.rows[0].admin_assessment;
    }
}

module.exports = new incidentUpdateService();