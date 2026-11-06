const apiError = require('../../../exceptions/apiError');
const incidentHistoryService = require('../history/incidentHistoryService');
const usersEmailService = require('../../users/usersEmailService');
const ownerTokenService = require('../../systemServices/ownerTokenService');
const cacheService = require('../../systemServices/cacheService');
const incidentUpdateService = require('../incidentUpdate/incidentUpdateService');
const { DeleteIncidentSend } = require('../../../grpc/handlers/filesHandler');
const incidentConditionStatusesCommon = require('../incidentConditionStatuses/incidentConditionStatusesCommon');
const incidentGetService = require('../incidentGet/incidentGetService');
const statisticService = require('../../stats/statisticService');

const CONTESTATION_STATUSES = {
    NEW: 7,
    IN_PROGRESS: 8,
    REJECTED: 9,
    CONTESTED_FULL: 10,
    CONTESTED_PARTIAL: 11,
    WITHDRAWN: 12
};

const CONTESTATION_TRANSITION_RULES = {
    'contestation_new': ['contestation_in_progress', 'contestation_rejected', 'contestation_withdrawn'],
    'contestation_in_progress': ['contested_full', 'contested_partial', 'contestation_rejected', 'contestation_withdrawn'],
    'contested_full': [],
    'contested_partial': [],
    'contestation_rejected': [],
    'contestation_withdrawn': []
};

const CONTESTATION_EDIT_WINDOW = 15 * 60; // 15 минут

class ContestationService {
    async generateContestationId(client) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' })
            .split('.').map(p => p.padStart(2, '0')).join('');

        const counterKey = `contestation_counter_${dateStr}`;
        let counter = await cacheService.get("contestation_counter", counterKey);

        if (!counter) {
            counter = 1;
            await cacheService.set("contestation_counter", counterKey, counter, 86400);
        } else {
            counter = parseInt(counter) + 1;
            await cacheService.set("contestation_counter", counterKey, counter, 86400);
        }

        return `D-${dateStr}-${counter.toString().padStart(3, '0')}`;
    }

    async createContestation(client, data, userId, userEmail, ownerToken) {
        const { parentIncidentId, description, creatorPersonId, publishOnSuccess, email } = data;

        const parentIncident = await client.query(
            'SELECT incident_id, type, condition_id FROM incidents_main_info WHERE incident_id = $1',
            [parentIncidentId]
        );

        if (parentIncident.rows.length === 0) throw apiError.NotFound('Основной инцидент не найден');
        if (parentIncident.rows[0].type !== 1) throw apiError.BadRequest('Можно создать оспаривание только для обычного инцидента');
        const statusName = await incidentConditionStatusesCommon.getStatusById(client, parentIncident.rows[0].condition_id)
        if (statusName.status_code_name != 'resolved') throw apiError.BadRequest('Можно создать оспаривание только на обработанный инцидент');

        const contestationId = await this.generateContestationId(client);
        const emailId = await usersEmailService.createEmail(client, email, null, false);

        const result = await client.query(
            `INSERT INTO incidents_main_info (
                incident_id, type, date_add, user_add_email_id, add_reason_id,
                user_description, condition_id, parent_incident_id, publish_on_success, contestation_creator_id
            ) VALUES ($1, $2, (NOW() AT TIME ZONE 'UTC'), $3, $4, $5, $6, $7, $8, $9) 
            RETURNING incident_id`,
            [contestationId, 2, emailId, -1, description, CONTESTATION_STATUSES.NEW, parentIncidentId, publishOnSuccess || false, creatorPersonId || null]
        );

        const newOwnerToken = ownerToken || await ownerTokenService.generateOwnerToken(contestationId, userEmail);

        await incidentHistoryService.createRecord(client, contestationId, -1, 'Создано оспаривание');
        await incidentHistoryService.createRecord(client, parentIncidentId, -1, `Создано оспаривание ${contestationId}`);

        await statisticService.track('contestation:create', 'contestationList_view');

        return { contestationId, ownerToken: newOwnerToken };
    }

    async getContestationById(client, contestationId, currentUser, userStatus, ownerToken) {
        // 1. ЛЕГКАЯ ПРОВЕРКА
        const lightCheckQuery = `
            SELECT incident_id, condition_id, parent_incident_id, publish_on_success, date_add, user_add_email_id, contestation_creator_id
            FROM incidents_main_info 
            WHERE incident_id = $1 AND type = 2
        `;
        const lightResult = await client.query(lightCheckQuery, [contestationId]);
        if (lightResult.rows.length === 0) throw apiError.NotFound('Оспаривание не найдено');

        const lightData = lightResult.rows[0];
        const code_name_status = await incidentConditionStatusesCommon.getStatusCodeById(client, lightResult.rows[0].condition_id);
        const accessCheck = await this._checkContestationAccess(client, lightData, code_name_status, userStatus, ownerToken);

        if (!accessCheck.allowed) {
            const allStatuses = await incidentConditionStatusesCommon.getAllStatuses(client);
            const currentStatus = allStatuses.find(s => String(s.status_id) === String(lightData.condition_id));
            return {
                access_restricted: true,
                id: lightData.incident_id,
                date_create: lightData.date_add,
                status: { code: currentStatus?.status_code_name || 'unknown', name: currentStatus?.status_name || 'Неизвестный статус' },
                parentIncident: { id: lightData.parent_incident_id }
            };
        }

        // 2. ПОЛНЫЙ ЗАПРОС (добавлено i.moderator_id)
        const fullQuery = `
            SELECT 
                i.incident_id, i.date_add, i.user_description, i.condition_id, 
                i.parent_incident_id, i.publish_on_success, i.contestation_creator_id, i.user_add_email_id,
                i.admin_assessment, i.moderator_id,
                cs.status_code_name, cs.status_name,
                pi.user_description as parent_description, pi.tg_post as parent_tg_post
            FROM incidents_main_info i
            JOIN incident_conditions_statuses cs ON i.condition_id = cs.status_id
            LEFT JOIN incidents_main_info pi ON i.parent_incident_id = pi.incident_id
            WHERE i.incident_id = $1 AND i.type = 2
        `;
        const fullResult = await client.query(fullQuery, [contestationId]);
        const data = fullResult.rows[0];

        // 3. ОБОГАЩЕНИЕ ДАННЫХ
        let canGetAdmAccessData = false;
        let creatorEmail = null;
        if (['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(userStatus)) {
            canGetAdmAccessData = true;
            creatorEmail = await usersEmailService.getDecryptedEmailById(client, data.user_add_email_id);
        }

        let creatorInfo = "Сторонний свидетель";
        if (data.contestation_creator_id === '-1') {
            creatorInfo = "Аноним";
        } else if (data.contestation_creator_id) {
            try {
                const nameResult = await client.query(
                    `SELECT name FROM person_names WHERE person_id = $1 LIMIT 1`,
                    [data.contestation_creator_id]
                );
                if (nameResult.rows.length > 0) {
                    creatorInfo = `Персона: ${nameResult.rows[0].name}`;
                } else {
                    creatorInfo = `Персона (ID: ${data.contestation_creator_id})`;
                }
            } catch (e) {
                creatorInfo = `Персона (ID: ${data.contestation_creator_id})`;
            }
        }

        let out = {
            access_restricted: false,
            id: data.incident_id,
            createdAt: data.date_add,
            description: data.user_description,
            status: { code: data.status_code_name, name: data.status_name },
            parentIncident: {
                id: data.parent_incident_id,
                description: data.parent_description
            },
            publishOnSuccess: data.publish_on_success,
            creatorInfo: creatorInfo
        };

        if (canGetAdmAccessData) {
            out.creatorEmail = creatorEmail;
            out.admin_assessment = data.admin_assessment;
            out.parentIncident.hasTgPost = data.parent_tg_post === true;

            const rawAssessment = data.admin_assessment;
            const assessmentHistory = rawAssessment?.history || [];

            out.admin_assessment_history = assessmentHistory;

            out.has_user_checked = assessmentHistory.some(record => String(record.user_id) === String(currentUser?.id));

            const moderatorId = data.moderator_id;
            out.can_user_check = moderatorId ? String(moderatorId) !== String(currentUser?.id) : true;

        } else {
            out.admin_assessment_history = [];
            out.has_user_checked = false;
            out.can_user_check = false;
        }

        return out;
    }

    async getContestationsForIncident(client, incidentId, currentUser, userStatus) {
        const incidentCheck = await client.query('SELECT incident_id FROM incidents_main_info WHERE incident_id = $1', [incidentId]);
        if (incidentCheck.rows.length === 0) throw apiError.NotFound('Инцидент не найден');

        const result = await client.query(
            `SELECT i.incident_id, i.date_add, i.user_description, i.condition_id, cs.status_code_name, cs.status_name, i.publish_on_success
             FROM incidents_main_info i
             JOIN incident_conditions_statuses cs ON i.condition_id = cs.status_id
             WHERE i.parent_incident_id = $1 AND i.type = 2
             ORDER BY i.date_add DESC`,
            [incidentId]
        );

        const contestations = [];
        for (const row of result.rows) {
            contestations.push({
                id: row.incident_id,
                createdAt: row.date_add,
                status: { code: row.status_code_name, name: row.status_name },
                publishOnSuccess: row.publish_on_success
            });
        }
        return contestations;
    }

    async getTransitionInfo(client, contestationId) {
        const result = await client.query(
            `SELECT i.condition_id, cs.status_code_name, cs.status_name
             FROM incidents_main_info i
             JOIN incident_conditions_statuses cs ON i.condition_id = cs.status_id
             WHERE i.incident_id = $1 AND i.type = 2`,
            [contestationId]
        );

        if (result.rows.length === 0) throw apiError.NotFound('Оспаривание не найдено');

        const currentStatusCode = result.rows[0].status_code_name;
        const allowedCodes = CONTESTATION_TRANSITION_RULES[currentStatusCode] || [];

        const allStatuses = await client.query(
            `SELECT status_id, status_code_name, status_name FROM incident_conditions_statuses WHERE status_code_name = ANY($1)`,
            [allowedCodes]
        );

        return {
            current_status: {
                code: currentStatusCode,
                name: result.rows[0].status_name
            },
            available_transitions: allStatuses.rows.map(row => ({
                id: row.status_id,
                code: row.status_code_name,
                name: row.status_name
            }))
        };
    }

    async transition(client, contestationId, targetStatusCode, userId, userStatus) {
        if (['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(userStatus)) {
            throw apiError.Forbidden('Только модераторы могут изменять статус оспаривания');
        }

        const transitionInfo = await this.getTransitionInfo(client, contestationId);
        const allowed = transitionInfo.available_transitions.find(t => t.code === targetStatusCode);

        if (!allowed) {
            throw apiError.BadRequest(`Переход в статус "${targetStatusCode}" невозможен из текущего состояния`);
        }

        await client.query('UPDATE incidents_main_info SET condition_id = $1 WHERE incident_id = $2', [allowed.id, contestationId]);

        const targetStatusName = allowed.name;
        await incidentHistoryService.createRecord(client, contestationId, userId, `Статус изменен на: ${targetStatusName}`);

        const parentCheck = await client.query(
            'SELECT parent_incident_id, publish_on_success FROM incidents_main_info WHERE incident_id = $1',
            [contestationId]
        );

        if (parentCheck.rows.length > 0 && parentCheck.rows[0].parent_incident_id) {
            const parentId = parentCheck.rows[0].parent_incident_id;
            const publishOnSuccess = parentCheck.rows[0].publish_on_success;
            if (targetStatusCode === 'contestation_in_progress') {
                await client.query('UPDATE incidents_main_info SET moderator_id = $2 WHERE incident_id = $1', [contestationId, userId]);
            }
            if (targetStatusCode === 'contested_full') {
                await client.query('UPDATE incidents_main_info SET condition_id = 4 WHERE incident_id = $1', [parentId]);

                await incidentUpdateService.updateActive(client, parentId, false)

                if (publishOnSuccess) {
                    await client.query('UPDATE incidents_main_info SET publish_on_success = true WHERE incident_id = $1', [parentId]);
                }

                const otherContestations = await client.query(
                    `SELECT incident_id FROM incidents_main_info 
                     WHERE parent_incident_id = $1 AND type = 2 AND condition_id IN ($2, $3) AND incident_id != $4`,
                    [parentId, CONTESTATION_STATUSES.NEW, CONTESTATION_STATUSES.IN_PROGRESS, contestationId]
                );

                for (const row of otherContestations.rows) {
                    await client.query(
                        `UPDATE incidents_main_info SET condition_id = $1 WHERE incident_id = $2`,
                        [CONTESTATION_STATUSES.WITHDRAWN, row.incident_id]
                    );
                    await incidentHistoryService.createRecord(
                        client,
                        row.incident_id,
                        userId,
                        'Отозвано в связи с иным полным оспариванием'
                    );
                }

                await incidentHistoryService.createRecord(client, parentId, userId, 'Инцидент закрыт в связи с полным оспариванием');

            } else if (targetStatusCode === 'contested_partial') {
                await client.query('UPDATE incidents_main_info SET partially_contested = true WHERE incident_id = $1', [parentId]);
                await incidentHistoryService.createRecord(client, parentId, userId, 'Установлена метка частичного оспаривания');
            }
        }

        return { code: targetStatusCode, name: targetStatusName };
    }

    async updateDescription(client, contestationId, newDescription, userId, userStatus, ownerToken) {
        await incidentUpdateService.checkCanEditIncidentById(client, contestationId, userId, userStatus, false, ownerToken, false)
        await client.query('UPDATE incidents_main_info SET user_description = $1 WHERE incident_id = $2 AND type = 2', [newDescription, contestationId]);
        await incidentHistoryService.createRecord(client, contestationId, userId ? userId : -1, 'Описание оспаривания обновлено');
        return true;
    }

    async _checkContestationAccess(client, contestation, code_name_status, userStatus, ownerToken) {
        if (['DEVELOPER', 'TOP_LEVEL_DEVELOPER'].includes(userStatus)) return { allowed: true };

        const statusCode = code_name_status;

        if (statusCode === 'contestation_new') {
            if (ownerToken) {
                if (await incidentGetService.checkCanGetIncidentById(client, contestation.incident_id, null, null, true, ownerToken, true)) {
                    return { allowed: true };
                }
            }
            return { allowed: false };
        }

        if (['contestation_in_progress', 'contestation_rejected', 'contestation_withdrawn'].includes(statusCode)) {
            return { allowed: false };
        }

        if (statusCode === 'contested_partial') return { allowed: contestation.publish_on_success === true };

        if (statusCode === 'contested_full') {
            return { allowed: contestation.publish_on_success === true };
        }

        return { allowed: false };
    }

    async deleteContestationsByIncidentId(client, parentIncidentId) {
        const contestationsResult = await client.query(
            `SELECT incident_id, user_add_email_id FROM incidents_main_info WHERE parent_incident_id = $1 AND type = 2`,
            [parentIncidentId]
        );

        for (const row of contestationsResult.rows) {
            const contestationId = row.incident_id;
            const emailId = row.user_add_email_id;

            await DeleteIncidentSend('incident_evidence', contestationId);

            await incidentHistoryService.deleteRecords(client, contestationId);

            if (emailId) {
                const usageCountResult = await client.query(
                    `SELECT COUNT(*) as count FROM incidents_main_info WHERE user_add_email_id = $1`,
                    [emailId]
                );
                const usageCount = parseInt(usageCountResult.rows[0].count);

                if (usageCount === 1) {
                    await usersEmailService.deleteEmailById(client, emailId);
                }
            }

            await client.query(
                `DELETE FROM incidents_main_info WHERE incident_id = $1 AND type = 2`,
                [contestationId]
            );
        }

        return contestationsResult.rowCount;
    }
}

module.exports = new ContestationService();