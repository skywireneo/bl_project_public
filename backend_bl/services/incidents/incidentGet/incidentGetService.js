const apiError = require("../../../exceptions/apiError");
const dictionaryService = require("../../dictionary/dictionaryService");
const statisticService = require("../../stats/statisticService");
const cacheService = require("../../systemServices/cacheService");
const ValidateService = require("../../systemServices/validate/validateService");
const usersEmailService = require("../../users/usersEmailService");
const userTgService = require("../../users/userTgService");
const incidentConditionStatusesCommon = require("../incidentConditionStatuses/incidentConditionStatusesCommon");
const incidentConditionStatusesControl = require("../incidentConditionStatuses/incidentConditionStatusesControl");
const incidentUpdateService = require("../incidentUpdate/incidentUpdateService");
const personService = require("../persones/personService");
const pvzService = require("../pvz/pvzService");

const validateService = new ValidateService();

const REVERSE_SORT_STATUSES = ['resolved', 'closed', 'rejected'];

const COLLECTIONS_CACHE_TYPE = 'incident_collections';

//  Статус по умолчанию для пользователей без роли
const DEFAULT_STATUS = 'USER';
const GUEST_STATUS = 'GUEST';

const COLLECTIONS_CONFIG = {
    // КОЛЛЕКЦИИ ИНЦИДЕНТОВ (type = 1 или NULL)
    most_viewed: {
        name: 'Самые просматриваемые инциденты',
        description: 'Инциденты с наибольшим количеством просмотров',
        access: [],
        limit: 5,
        detail_level: 'card',
        cache: { enabled: true, ttl: 300 },
        type_filter: 'incident',
        status_filter: {
            USER: ['resolved'],
            MODERATOR: ['resolved'],
            TOP_LEVEL_DEVELOPER: ['resolved'],
            DEVELOPER: ['resolved']
        },
        sort: { field: 'views', order: 'DESC' },
        filters: { deleted: false }
    },
    most_interesting: {
        name: 'Самые интересные инциденты',
        description: 'Инциденты с лучшим сочетанием оценок и просмотров',
        access: [],
        limit: 5,
        detail_level: 'card',
        cache: { enabled: true, ttl: 300 },
        type_filter: 'incident',
        status_filter: {
            USER: ['resolved'],
            MODERATOR: ['resolved'],
            TOP_LEVEL_DEVELOPER: ['resolved'],
            DEVELOPER: ['resolved']
        },
        sort: { field: '((imf.interest_score * 10) + imf.views)', order: 'DESC', custom: true },
        filters: { deleted: false }
    },
    top_rated: {
        name: 'Топ по рейтингу инциденты',
        description: 'Инциденты с наивысшим interest_score',
        access: [],
        limit: 5,
        detail_level: 'card',
        cache: { enabled: true, ttl: 300 },
        type_filter: 'incident',
        status_filter: { USER: ['resolved'], MODERATOR: 'all', TOP_LEVEL_DEVELOPER: 'all', DEVELOPER: 'all' },
        sort: { field: 'interest_score', order: 'DESC' },
        filters: { deleted: false }
    },
    trending: {
        name: 'Трендовые инциденты',
        description: 'Популярные недавние инциденты',
        access: [],
        limit: 5,
        detail_level: 'card',
        cache: { enabled: true, ttl: 180 },
        type_filter: 'incident',
        status_filter: { USER: ['resolved'], MODERATOR: 'all', DEVELOPER: 'all', TOP_LEVEL_DEVELOPER: 'all' },
        sort: { field: 'interest_score', order: 'DESC' },
        filters: { deleted: false, date_add_min: '7 days' }
    },
    latest: {
        name: 'Последние добавленные инциденты',
        description: 'Недавно созданные инциденты',
        access: [],
        limit: 5,
        detail_level: 'card',
        cache: { enabled: true, ttl: 60 },
        type_filter: 'incident',
        status_filter: { USER: ['resolved'], MODERATOR: 'all', TOP_LEVEL_DEVELOPER: 'all', DEVELOPER: 'all' },
        sort: { field: 'date_add', order: 'DESC' },
        filters: { deleted: false }
    },
    stale: {
        name: 'Долго без изменений инциденты',
        description: 'Инциденты, которые висят без движения больше 7 дней',
        access: ['MODERATOR', 'DEVELOPER', 'TOP_LEVEL_DEVELOPER'],
        limit: 5,
        detail_level: 'full',
        cache: { enabled: true, ttl: 600 },
        type_filter: 'incident',
        status_filter: { MODERATOR: ['new', 'in_progress'], DEVELOPER: ['new', 'in_progress'], TOP_LEVEL_DEVELOPER: ['new', 'in_progress'] },
        sort: { field: 'date_add', order: 'ASC' },
        filters: { deleted: false, date_add_max: '7 days' }
    },
    unverified_pvz: {
        name: 'Инциденты с непроверенными адресами ПВЗ',
        description: 'Инциденты, содержащие хотя бы один неподтверждённый адрес ПВЗ',
        access: ['DEVELOPER', 'TOP_LEVEL_DEVELOPER'],
        limit: 20,
        detail_level: 'card',
        cache: { enabled: true, ttl: 10 },
        type_filter: 'incident',
        status_filter: { DEVELOPER: 'all_except_new', TOP_LEVEL_DEVELOPER: 'all_except_new' },
        sort: { field: 'date_add', order: 'DESC' },
        filters: { deleted: false, has_unverified_pvz: true }
    },
    my_recent: {
        name: 'Мои последние инциденты',
        description: 'Ваши последние инциденты',
        access: ['MODERATOR', 'DEVELOPER', 'TOP_LEVEL_DEVELOPER'],
        limit: 5,
        detail_level: 'full',
        cache: { enabled: true, ttl: 60, personal: true },
        type_filter: 'incident',
        status_filter: { MODERATOR: 'all', DEVELOPER: 'all', TOP_LEVEL_DEVELOPER: 'all' },
        sort: { field: 'date_add', order: 'DESC' },
        filters: { deleted: false, moderator_id: '$current_user_id' }
    },
    needs_attention: {
        name: 'Требуют внимания инциденты',
        description: 'Старые инциденты в статусе new без ответственного',
        access: ['MODERATOR', 'DEVELOPER', 'TOP_LEVEL_DEVELOPER'],
        limit: 5,
        detail_level: 'full',
        cache: { enabled: true, ttl: 300 },
        type_filter: 'incident',
        status_filter: { MODERATOR: ['new'], DEVELOPER: ['new'], TOP_LEVEL_DEVELOPER: ['new'] },
        sort: { field: 'date_add', order: 'ASC' },
        filters: { deleted: false, moderator_id: null, date_add_max: '3 days' }
    },
    no_responsible: {
        name: 'Без ответственного инциденты',
        description: 'Инциденты в работе без назначенного модератора',
        access: ['MODERATOR', 'DEVELOPER', 'TOP_LEVEL_DEVELOPER'],
        limit: 5,
        detail_level: 'full',
        cache: { enabled: true, ttl: 300 },
        type_filter: 'incident',
        status_filter: { MODERATOR: ['in_progress'], DEVELOPER: ['in_progress'], TOP_LEVEL_DEVELOPER: ['in_progress'] },
        sort: { field: 'date_add', order: 'ASC' },
        filters: { deleted: false, moderator_id: null }
    },
    unpublished_tg: {
        name: 'Не опубликованные в Telegram инциденты',
        description: 'Закрытые инциденты, которые ещё не были опубликованы в Telegram',
        access: ['DEVELOPER', 'TOP_LEVEL_DEVELOPER'],
        limit: 20,
        detail_level: 'card',
        cache: { enabled: true, ttl: 300 },
        type_filter: 'incident',
        status_filter: { DEVELOPER: ['resolved'], TOP_LEVEL_DEVELOPER: ['resolved'] },
        sort: { field: 'date_add', order: 'ASC' },
        filters: { deleted: false, tg_post: false }
    },
    high_priority: {
        name: 'Высокий приоритет инциденты',
        description: 'Инциденты с высоким interest_score в активных статусах',
        access: [],
        limit: 5,
        detail_level: 'card',
        cache: { enabled: true, ttl: 300 },
        type_filter: 'incident',
        status_filter: { USER: ['resolved'], MODERATOR: ['new', 'in_progress'], DEVELOPER: ['new', 'in_progress'], TOP_LEVEL_DEVELOPER: ['new', 'in_progress'] },
        sort: { field: 'interest_score', order: 'DESC' },
        filters: { deleted: false, interest_score_min: 8 }
    },
    stats_overview: {
        name: 'Статистика инцидентов и оспариваний',
        description: 'Общая статистика по инцидентам и оспариваниям',
        access: [],
        detail_level: 'stats',
        cache: { enabled: true, ttl: 600 },
        type_filter: 'incident',
        status_filter: { USER: ['resolved'], MODERATOR: 'all', DEVELOPER: 'all', TOP_LEVEL_DEVELOPER: 'all' }
    },
    new_incidents_queue: {
        name: 'Новые инциденты (требуют обработки)',
        description: 'Инциденты в статусе "Новый", созданные более 15 минут назад (таймаут редактирования истёк)',
        access: ['MODERATOR', 'DEVELOPER', 'TOP_LEVEL_DEVELOPER'],
        limit: 15,
        detail_level: 'full',
        cache: { enabled: true, ttl: 60 },
        type_filter: 'incident',
        status_filter: {
            MODERATOR: ['new'],
            TOP_LEVEL_DEVELOPER: ['new'],
            DEVELOPER: ['new']
        },
        sort: { field: 'date_add', order: 'ASC' }, // Сначала самые старые (FIFO)
        filters: {
            deleted: false,
            date_add_max: '15 minutes' // Строго старше 15 минут
        }
    },

    no_ai_analysis: {
        name: 'Инциденты без ИИ анализа',
        description: 'Инциденты, которые ещё не были проанализированы ИИ (исключая статус "Новый")',
        access: ['MODERATOR', 'DEVELOPER', 'TOP_LEVEL_DEVELOPER'],
        limit: 20,
        detail_level: 'full',
        cache: { enabled: true, ttl: 300 },
        type_filter: 'incident',
        status_filter: {
            MODERATOR: 'all_except_new',
            DEVELOPER: 'all_except_new',
            TOP_LEVEL_DEVELOPER: 'all_except_new'
        },
        sort: { field: 'date_add', order: 'DESC' },
        filters: { deleted: false, has_ai_analysis: false }
    },
    no_admin_assessment: {
        name: 'Без проверок администраторов',
        description: 'Инциденты, по которым ещё не было ни одной проверки',
        access: ['MODERATOR', 'DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'ADMINISTRATOR'],
        limit: 20,
        detail_level: 'full',
        cache: { enabled: true, ttl: 60 },
        type_filter: 'incident',
        status_filter: { MODERATOR: 'all_except_new', DEVELOPER: 'all_except_new', TOP_LEVEL_DEVELOPER: 'all_except_new' },
        sort: { field: 'date_add', order: 'DESC' },
        filters: { deleted: false, no_admin_assessment: true }
    },
    last_assessment_not_approved: {
        name: 'Последняя проверка не одобрена',
        description: 'Инциденты, где последняя проверка имеет статус отличный от "approved"',
        access: ['MODERATOR', 'DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'ADMINISTRATOR'],
        limit: 20,
        detail_level: 'full',
        cache: { enabled: true, ttl: 60 },
        type_filter: 'incident',
        status_filter: { MODERATOR: 'all_except_new', DEVELOPER: 'all_except_new', TOP_LEVEL_DEVELOPER: 'all_except_new' },
        sort: { field: 'date_add', order: 'DESC' },
        filters: { deleted: false, last_assessment_not_approved: true }
    },

    // НОВЫЕ КОЛЛЕКЦИИ ОСПАРИВАНИЙ (type = 2)
    contestation_needs_attention: {
        name: 'Новые оспаривания (требуют внимания)',
        description: 'Оспаривания в статусе "Новое", созданные более 15 минут назад',
        access: ['MODERATOR', 'DEVELOPER', 'TOP_LEVEL_DEVELOPER'],
        limit: 10,
        detail_level: 'full',
        cache: { enabled: true, ttl: 60 },
        type_filter: 'contestation',
        status_filter: { MODERATOR: ['contestation_new'], DEVELOPER: ['contestation_new'], TOP_LEVEL_DEVELOPER: ['contestation_new'] },
        sort: { field: 'date_add', order: 'ASC' }, // Сначала самые старые
        filters: { deleted: false, date_add_max: '15 minutes' } // Старше 15 минут
    },
    my_contestations: {
        name: 'Мои оспаривания',
        description: 'Оспаривания, назначенные на вас',
        access: ['MODERATOR', 'DEVELOPER', 'TOP_LEVEL_DEVELOPER'],
        limit: 10,
        detail_level: 'full',
        cache: { enabled: true, ttl: 60, personal: true },
        type_filter: 'contestation',
        status_filter: { MODERATOR: 'all', DEVELOPER: 'all', TOP_LEVEL_DEVELOPER: 'all' }, // Все статусы оспариваний
        sort: { field: 'date_add', order: 'DESC' },
        filters: { deleted: false, moderator_id: '$current_user_id' }
    },
    contestation_no_responsible: {
        name: 'Оспаривания без ответственного',
        description: 'Оспаривания в работе, на которые ещё не назначен модератор',
        access: ['MODERATOR', 'DEVELOPER', 'TOP_LEVEL_DEVELOPER'],
        limit: 10,
        detail_level: 'full',
        cache: { enabled: true, ttl: 300 },
        type_filter: 'contestation',
        status_filter: { MODERATOR: ['contestation_new', 'contestation_in_progress'], DEVELOPER: ['contestation_new', 'contestation_in_progress'], TOP_LEVEL_DEVELOPER: ['contestation_new', 'contestation_in_progress'] },
        sort: { field: 'date_add', order: 'ASC' },
        filters: { deleted: false, moderator_id: null }
    },
    contestation_stale: {
        name: 'Зависшие оспаривания',
        description: 'Оспаривания, которые висят без движения больше 7 дней',
        access: ['MODERATOR', 'DEVELOPER', 'TOP_LEVEL_DEVELOPER'],
        limit: 10,
        detail_level: 'full',
        cache: { enabled: true, ttl: 600 },
        type_filter: 'contestation',
        status_filter: { MODERATOR: ['contestation_new', 'contestation_in_progress'], DEVELOPER: ['contestation_new', 'contestation_in_progress'], TOP_LEVEL_DEVELOPER: ['contestation_new', 'contestation_in_progress'] },
        sort: { field: 'date_add', order: 'ASC' },
        filters: { deleted: false, date_add_max: '7 days' }
    },
    contestation_no_admin_assessment: {
        name: 'Оспаривания без проверок администраторов',
        description: 'Оспаривания, по которым ещё не было ни одной проверки',
        access: ['MODERATOR', 'DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'ADMINISTRATOR'],
        limit: 20,
        detail_level: 'full',
        cache: { enabled: true, ttl: 60 },
        type_filter: 'contestation',
        status_filter: {
            MODERATOR: 'all_except_new',
            TOP_LEVEL_DEVELOPER: 'all_except_new',
            DEVELOPER: 'all_except_new'
        },
        sort: { field: 'date_add', order: 'DESC' },
        filters: { deleted: false, no_admin_assessment: true }
    },
    contestation_last_assessment_not_approved: {
        name: 'Последняя проверка оспаривания не одобрена',
        description: 'Оспаривания, где последняя проверка имеет статус отличный от "approved"',
        access: ['MODERATOR', 'DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'ADMINISTRATOR'],
        limit: 20,
        detail_level: 'full',
        cache: { enabled: true, ttl: 60 },
        type_filter: 'contestation',
        status_filter: {
            MODERATOR: 'all_except_new',
            TOP_LEVEL_DEVELOPER: 'all_except_new',
            DEVELOPER: 'all_except_new'
        },
        sort: { field: 'date_add', order: 'DESC' },
        filters: { deleted: false, last_assessment_not_approved: true }
    }
};

class incidentGetService {

    async checkCanGetIncidentById(client, incidentId, userId = null, current_user_status = null, ret = false, ownerToken = null, skipOwner = false) {
        if (['DEVELOPER', 'TOP_LEVEL_DEVELOPER'].includes(current_user_status)) return true;

        const allStatuses = await incidentConditionStatusesCommon.getAllStatuses(client);

        const resolvedStatus = allStatuses.find(s => s.status_code_name === 'resolved');
        const resolvedStatusId = resolvedStatus ? resolvedStatus.status_id : null;

        const newStatus = allStatuses.find(s => s.status_code_name === 'new');
        const newStatusId = newStatus ? newStatus.status_id : null;

        const closedStatus = allStatuses.find(s => s.status_code_name === 'closed');
        const closedStatusId = closedStatus ? closedStatus.status_id : null;

        const contestationNewStatus = allStatuses.find(s => s.status_code_name === 'contestation_new');
        const contestationNewStatusId = contestationNewStatus ? contestationNewStatus.status_id : null;

        const contestationFullStatus = allStatuses.find(s => s.status_code_name === 'contested_full');
        const contestationFullStatusId = contestationFullStatus ? contestationFullStatus.status_id : null;

        const contestationPartialStatus = allStatuses.find(s => s.status_code_name === 'contested_partial');
        const contestationPartialStatusId = contestationPartialStatus ? contestationPartialStatus.status_id : null;

        const incidentResult = await client.query(
            `SELECT imf.date_add, imf.condition_id, imf.user_add_email_id, imf.publish_on_success 
         FROM incidents_main_info imf 
         WHERE imf.incident_id = $1 AND imf.deleted = false`,
            [incidentId]
        );
        if (incidentResult.rowCount === 0) {
            if (ret) return false;
            throw apiError.Forbidden('Инцидент не найден или удален');
        }

        const incident = incidentResult.rows[0];

        const dateAddStr = incident.date_add;

        const now = new Date();
        const diffMinutes = (now - dateAddStr) / (1000 * 60);

        if (resolvedStatusId && incident.condition_id === resolvedStatusId) {
            return true;
        }

        if (closedStatusId && incident.condition_id === closedStatusId && incident.publish_on_success === true) {
            return true;
        }

        if (incidentId.startsWith('D-') && diffMinutes <= 15 && contestationNewStatusId && incident.condition_id === contestationNewStatusId) {
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

        if (incident.condition_id === contestationFullStatusId || incident.condition_id === contestationPartialStatusId) {
            if (incident.publish_on_success) return true;
        }

        if (diffMinutes <= 15 && newStatusId && incident.condition_id === newStatusId) {
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

        if (ret) {
            return false;
        } else {
            throw apiError.Forbidden('Нет доступа: инцидент уже в обработке, завершен, или прошло более 15 минут с момента создания.');
        }
    }

    async getIncidentsList(client, current_user, current_user_status, limit, offset) {
        const canGetAdmAccessData = ['DEVELOPER', 'TOP_LEVEL_DEVELOPER'].includes(current_user_status);

        await statisticService.track('page:incidentList_view', 'incidentList');

        const allStatuses = await incidentConditionStatusesCommon.getAllStatuses(client);

        const statusMap = new Map(allStatuses.map(s => [
            String(s.status_id),
            { code: s.status_code_name, name: s.status_name }
        ]));

        let dataQuery = `
        SELECT 
            imf.incident_id, 
            imf.date_add, 
            imf.user_add_email_id, 
            imf.user_add_tg_id, 
            imf.add_reason_id, 
            imf.user_description, 
            imf.interest_score, 
            imf.views, 
            imf.tg_post, 
            imf.active,
            imf.condition_id
        FROM 
            incidents_main_info imf
        WHERE imf.deleted = false AND (imf.type IS NULL OR imf.type != 2)
        `;

        let countQuery = `SELECT COUNT(*) as total FROM incidents_main_info imf WHERE imf.deleted = false AND (imf.type IS NULL OR imf.type != 2)`;

        let dataParams = [];
        let countParams = [];
        const limitForNonAdm = 10;
        const offsetForNonAdm = 0;
        let paramIndex = 1;

        if (!canGetAdmAccessData) {
            const resolvedStatus = allStatuses.find(s => s.status_code_name === 'resolved');

            if (resolvedStatus) {
                dataQuery += ` AND imf.condition_id = $${paramIndex}`;
                countQuery += ` AND imf.condition_id = $${paramIndex}`;
                dataParams.push(resolvedStatus.status_id);
                countParams.push(resolvedStatus.status_id);
                paramIndex++;
            } else {
                return { data: [], total: 0, limit: limitForNonAdm, offset: offsetForNonAdm };
            }
        }

        dataQuery += ` ORDER BY imf.date_add DESC`;

        if (canGetAdmAccessData) {
            dataQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            dataParams.push(limit, offset);
        } else {
            dataQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            dataParams.push(limitForNonAdm, offsetForNonAdm);
        }

        const [incidentResult, countResult] = await Promise.all([
            client.query(dataQuery, dataParams),
            client.query(countQuery, countParams)
        ]);

        const rows = incidentResult.rows;
        const totalCount = canGetAdmAccessData ? parseInt(countResult.rows[0].total) : limitForNonAdm;

        if (rows.length === 0) {
            return {
                data: [],
                total: totalCount,
                limit: limit,
                offset: offset
            };
        }

        const processedData = await Promise.all(rows.map(async (row) => {
            const add_reason_name = await dictionaryService.getElementNameById(client, row.add_reason_id);
            const user_description = row.user_description || '';

            const truncatedDescription = user_description.length > 60
                ? user_description.substring(0, 60) + '...'
                : user_description;

            const statusInfo = statusMap.get(String(row.condition_id)) || { code: null, name: null };

            let item = {
                id: row.incident_id,
                date_create: row.date_add,
                add_reason_name: add_reason_name,
                user_description: truncatedDescription,
                interest_score: row.interest_score,
                status: statusInfo.code,
                status_name: statusInfo.name,
            };

            if (canGetAdmAccessData) {
                const user_add_email = await usersEmailService.getDecryptedEmailById(client, row.user_add_email_id);
                const user_add_tg_id = row?.user_add_tg_id;
                const user_add_tg = user_add_tg_id ? await userTgService.getDecryptedTgById(client, row.user_add_tg_id) : null;
                item.user_add_email = user_add_email;
                item.user_add_tg = user_add_tg;
                item.views = row.views;
                item.tg_post = row.tg_post;
            }

            return item;
        }));

        return {
            data: processedData,
            total: totalCount,
            limit: limit,
            offset: offset
        };
    }

    async incrementIncidentViews(client, incidentId) {
        if (!incidentId) {
            return 0;
        }

        try {
            const result = await client.query(
                `UPDATE incidents_main_info 
             SET views = COALESCE(views, 0) + 1 
             WHERE incident_id = $1 
             RETURNING views`,
                [incidentId]
            );

            return result.rows[0]?.views || 0;
        } catch (error) {
            console.error(`[Incidents] Failed to increment views for ${incidentId}:`, error.message);
            return 0;
        }
    }

    async getIncidentById(client, incidentId, current_user, current_user_status, skipViewIncrement, ownerToken = null, exportInc = false) {
        let canGetAdmAccessData = false
        let hasFullAccess = false
        if (!exportInc) {
            canGetAdmAccessData = await incidentUpdateService.checkCanEditIncidentById(client, incidentId, current_user?.id, current_user_status, true, ownerToken);

            hasFullAccess = await this.checkCanGetIncidentById(client, incidentId, current_user?.id, current_user_status, true, ownerToken);

            if (!incidentId) {
                throw apiError.BadRequest('INCIDENT_NOT_EXIST', `Инцидент не существует`);
            }

            if (!hasFullAccess) {
                const incidentResult = await client.query(
                    `SELECT imf.incident_id, imf.condition_id, imf.deleted, imf.date_add FROM incidents_main_info imf WHERE imf.incident_id = $1`,
                    [incidentId]
                );
                if (incidentResult.rowCount === 0) {
                    throw apiError.BadRequest('INCIDENT_NOT_EXIST', `Инцидент не существует`);
                }
                if (!incidentResult.rows[0].deleted) {
                    const allStatuses = await incidentConditionStatusesCommon.getAllStatuses(client);
                    const currentConditionId = String(incidentResult.rows[0].condition_id);
                    const currentStatus = allStatuses.find(s => String(s.status_id) === currentConditionId);
                    return {
                        id: incidentResult.rows[0].incident_id,
                        date_create: incidentResult.rows[0].date_add,
                        status: currentStatus?.status_code_name || null,
                        status_name: currentStatus?.status_name || null,
                        access_restricted: true,
                        user_description: 'На данном этапе доступ к деталям инцидента ограничен.',
                        pvzList: [],
                        personesList: [],
                        interest_score: 0
                    };
                }
            }
        } else {
            canGetAdmAccessData = false
        }

        const incidentResult = await client.query(
            `SELECT 
                imf.incident_id, 
                imf.date_add, 
                imf.user_add_email_id, 
                imf.user_add_tg_id, 
                imf.add_reason_id, 
                imf.user_description,
                imf.deleted,
                imf.deleted_reason, 
                imf.interest_score, 
                imf.tg_post, 
                imf.active,
                imf.condition_id,
                imf.rejection_reason,
                imf.admin_assessment,
                imf.partially_contested,
                imf.publish_on_success,
                imf.ai_response_flag,
                imf.ai_response,
                imf.show_ai_response,
                imf.moderator_id
            FROM 
                incidents_main_info imf
            WHERE
                imf.incident_id = $1 `, [incidentId]
        );

        if (incidentResult.rowCount == 0) {
            throw apiError.BadRequest('INCIDENT_NOT_EXIST', `Инцидент не существует`)
        }
        if (incidentResult.rows[0].deleted) {
            return { deleted: true, deleted_reason: incidentResult.rows[0].deleted_reason }
        }

        let currentViews = 0;
        if (!skipViewIncrement) {
            currentViews = await this.incrementIncidentViews(client, incidentId);
        }

        await statisticService.track('incidents:view', incidentId);

        const id = incidentResult.rows[0].incident_id
        const date_add = incidentResult.rows[0].date_add
        const add_reason_id = incidentResult.rows[0].add_reason_id

        const reasonElement = await dictionaryService.getElementFullById(client, incidentResult.rows[0].add_reason_id);
        const add_reason_name = reasonElement?.name || null;
        const add_reason_onPvz = !!(reasonElement?.addonData && reasonElement.addonData.onPvz);
        const user_description = incidentResult.rows[0].user_description

        const user_add_email_id = incidentResult.rows[0].user_add_email_id
        const user_add_email = await usersEmailService.getDecryptedEmailById(client, incidentResult.rows[0].user_add_email_id)
        const user_add_tg_id = incidentResult.rows[0]?.user_add_tg_id
        const user_add_tg = user_add_tg_id ? await userTgService.getDecryptedTgById(client, incidentResult.rows[0].user_add_tg_id) : null

        const allStatuses = await incidentConditionStatusesCommon.getAllStatuses(client);
        const currentConditionId = String(incidentResult.rows[0].condition_id);
        const currentStatus = allStatuses.find(s => String(s.status_id) === currentConditionId);

        const newStatus = allStatuses.find(s => s.status_code_name === 'new');
        const isNewStatus = newStatus && String(newStatus.status_id) === currentConditionId;

        const isClosedStatus = currentStatus?.status_code_name === 'closed';
        const isPublishedOnSuccess = incidentResult.rows[0].publish_on_success === true;
        const shouldHideData = isClosedStatus && isPublishedOnSuccess && !canGetAdmAccessData;

        let finalPvzList = [];
        let finalPersonesList = [];

        if (shouldHideData) {
            finalPvzList = [];
            finalPersonesList = [];
        } else {
            finalPvzList = await pvzService.getPVZByIncidentId(client, id, canGetAdmAccessData);
            finalPersonesList = await personService.getPersonsByIncidentId(client, id, canGetAdmAccessData);
        }

        let output = {
            id: id,
            date_create: date_add,
            add_reason_name: add_reason_name,
            add_reason_onPvz: add_reason_onPvz,
            user_description: user_description,
            pvzList: finalPvzList,
            personesList: finalPersonesList,
            interest_score: incidentResult.rows[0].interest_score,
            partially_contested: incidentResult.rows[0].partially_contested || false,
            status: currentStatus?.status_code_name || null,
            status_name: currentStatus?.status_name || null
        };

        if (isNewStatus || canGetAdmAccessData) {
            output.user_add_email = user_add_email;
            output.user_add_email_id = user_add_email_id;
            output.user_add_tg = user_add_tg;
            output.user_add_tg_id = user_add_tg_id;
        }

        if (canGetAdmAccessData) {
            output.active = incidentResult.rows[0].active;
            output.views = currentViews;
            output.tg_post = incidentResult.rows[0].tg_post;
            output.publish_on_success = isPublishedOnSuccess;
            output.ai_response_flag = incidentResult.rows[0].ai_response_flag || false;
            output.ai_response = incidentResult.rows[0].ai_response || null; // Полный JSON
            output.show_ai_response = incidentResult.rows[0].show_ai_response || false;
        } else {
            const showAi = incidentResult.rows[0].show_ai_response === true;
            output.show_ai_response = showAi;

            if (showAi && incidentResult.rows[0].ai_response) {
                const rawAi = incidentResult.rows[0].ai_response;
            } else {
                output.ai_response = null;
            }
        }

        if (currentStatus?.status_code_name === 'rejected' || canGetAdmAccessData) {
            output.rejection_reason = incidentResult.rows[0].rejection_reason;
        }

        const rawAssessment = incidentResult.rows[0].admin_assessment;
        const assessmentHistory = rawAssessment?.history || [];

        if (rawAssessment && typeof rawAssessment === 'object') {
            if (canGetAdmAccessData) {
                output.admin_assessment = rawAssessment;

                output.admin_assessment_history = assessmentHistory;

                output.has_user_checked = assessmentHistory.some(record => String(record.user_id) === String(current_user?.id));

                const moderatorId = incidentResult.rows[0].moderator_id;
                output.can_user_check = moderatorId ? String(moderatorId) !== String(current_user?.id) : true;

            } else {
                const {
                    internal_note,
                    verdict,
                    evidence,
                    investigation_depth,
                    history,
                    ...publicAssessment
                } = rawAssessment;
                if (Object.keys(publicAssessment).length > 0) {
                    output.admin_assessment = publicAssessment;
                }
            }
        } else if (canGetAdmAccessData) {
            output.admin_assessment_history = [];
            output.has_user_checked = false;
            const moderatorId = incidentResult.rows[0].moderator_id;
            output.can_user_check = moderatorId ? String(moderatorId) !== String(current_user?.id) : true;
        }

        return output;
    }

    async getIncidentForExport(client, incidentId) {
        const { FileCount } = require("../../../grpc/handlers/filesHandler");
        const resp = await this.getIncidentById(client, incidentId, null, null, true, null, true)
        const fileCount = Number(await FileCount('incident_evidence', incidentId))
        return { data: resp, fileCount: fileCount };
    }

    async getIncidents(client, incidentId, current_user, current_user_status, limit, offset, ownerToken = null) {
        if (incidentId) validateService.incidentValidation.validateIncidentId(incidentId)
        if (incidentId) {
            return await this.getIncidentById(client, incidentId, current_user, current_user_status, false, ownerToken)
        } else {
            return await this.getIncidentsList(client, current_user, current_user_status, limit, offset)
        }
    }

    async getIncidentMainInfoById(client, incidentId) {
        const incidentResult = await client.query(
            `SELECT 
                imf.incident_id, 
                imf.user_add_email_id, 
                imf.user_add_tg_id
            FROM 
                incidents_main_info imf
            WHERE
                imf.incident_id = $1 `, [incidentId]
        );
        const id = incidentResult.rows[0].incident_id

        let output = {
            id: id,
            user_add_email_id: incidentResult.rows[0].user_add_email_id,
            user_add_tg_id: incidentResult.rows[0]?.user_add_tg_id
        }
        return output
    }


    async getIncidentsCaban(client, type, column, limit, page, current_user, current_user_status) {
        try {
            let statuses = await incidentConditionStatusesCommon.getAllStatuses(client);

            if (column && column !== 'all') {
                statuses = statuses.filter(s => s.status_code_name === column);
                if (statuses.length === 0) {
                    throw apiError.BadRequest('COLUMN_NOT_FOUND', `Колонка "${column}" не найдена`);
                }
            }

            const TRANSITION_RULES = incidentConditionStatusesControl.TRANSITION_RULES;

            const columnsData = await Promise.all(statuses.map(async (status) => {
                const offset = (page - 1) * limit;

                const sortOrder = REVERSE_SORT_STATUSES.includes(status.status_code_name) ? 'DESC' : 'ASC';

                let dataQuery = `
                    SELECT 
                        imf.incident_id,
                        imf.date_add,
                        imf.add_reason_id,
                        imf.user_description,
                        imf.condition_id,
                        imf.moderator_id,
                        imf.user_add_email_id,
                        imf.user_add_tg_id
                    FROM incidents_main_info imf
                    WHERE imf.deleted = false
                      AND imf.condition_id = $1
                      AND imf.date_add <= NOW() - INTERVAL '15 minutes'
                `;

                const dataParams = [status.status_id];
                let paramIndex = 2;

                if (type === 'me' && current_user?.id && status.status_code_name !== 'new') {
                    dataQuery += ` AND imf.moderator_id = $${paramIndex}`;
                    dataParams.push(current_user.id);
                    paramIndex++;
                }

                let countQuery = `
                    SELECT COUNT(*) as total 
                    FROM incidents_main_info imf
                    WHERE imf.deleted = false
                      AND imf.condition_id = $1
                      AND imf.date_add <= NOW() - INTERVAL '15 minutes'
                `;
                const countParams = [status.status_id];

                if (type === 'me' && current_user?.id && status.status_code_name !== 'new') {
                    countQuery += ` AND imf.moderator_id = $2`;
                    countParams.push(current_user.id);
                }

                dataQuery += `
                    ORDER BY imf.date_add ${sortOrder}
                    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
                `;
                dataParams.push(limit, offset);

                const [dataResult, countResult] = await Promise.all([
                    client.query(dataQuery, dataParams),
                    client.query(countQuery, countParams)
                ]);

                const totalCount = parseInt(countResult.rows[0].total);
                const totalPages = Math.ceil(totalCount / limit);
                const incidents = dataResult.rows;

                const processedIncidents = await Promise.all(incidents.map(async (incident) => {
                    const incidentType = incident?.add_reason_id && incident.add_reason_id != -1 ? await dictionaryService.getElementNameById(
                        client,
                        incident.add_reason_id
                    ) : null;

                    const truncatedDescription = incident.user_description
                        ? (incident.user_description.length > 100
                            ? incident.user_description.substring(0, 100) + '...'
                            : incident.user_description)
                        : '';

                    const user_add_email = incident.user_add_email_id
                        ? await usersEmailService.getDecryptedEmailById(client, incident.user_add_email_id)
                        : null;
                    const user_add_tg = incident.user_add_tg_id
                        ? await userTgService.getDecryptedTgById(client, incident.user_add_tg_id)
                        : null;

                    let responsible = null;
                    if (incident.moderator_id) {
                        try {
                            const userQuery = `
                                SELECT login 
                                FROM users 
                                WHERE user_id = $1
                            `;
                            const userResult = await client.query(userQuery, [incident.moderator_id]);

                            if (userResult.rows.length > 0) {
                                const userData = userResult.rows[0];
                                responsible = {
                                    id: incident.moderator_id,
                                    login: userData.login || null
                                };
                            }
                        } catch (err) {
                            console.error(`[getIncidentsCaban] Ошибка получения данных ответственного для инцидента ${incident.incident_id}:`, err);
                        }
                    }

                    return {
                        id: incident.incident_id,
                        date_create: incident.date_add,
                        type: incidentType || 'Оспаривание',
                        description: truncatedDescription,
                        user_add_email: user_add_email,
                        user_add_tg: user_add_tg,
                        responsible: responsible
                    };
                }));

                const columnData = {
                    code: status.status_code_name,
                    name: status.status_name,
                    button_text: status.button_text,
                    descr: status.descr,
                    button_color: status.button_color,
                    need_alert: status.need_alert,
                    incidents_count: totalCount,
                    incidents: processedIncidents,
                    pagination: {
                        page: page,
                        limit: limit,
                        total: totalCount,
                        total_pages: totalPages
                    }
                };

                if (!column || column === 'all') {
                    columnData.available_transitions = TRANSITION_RULES[status.status_code_name] || [];
                }

                return columnData;
            }));

            return {
                columns: columnsData
            };

        } catch (error) {
            console.error('[getIncidentsCaban] Ошибка:', error);
            throw error;
        }
    }


    _buildCollectionCacheKey(type, config, current_user_status, current_user) {
        const statusKey = current_user_status || GUEST_STATUS;
        const baseKey = `${type}:${statusKey}`;

        if (config.cache?.personal && current_user?.id) {
            return `${baseKey}:${current_user.id}`;
        }

        return baseKey;
    }

    async getCollections(client, types, current_user, current_user_status) {
        const normalizedStatus = current_user_status || DEFAULT_STATUS;

        let typesArray;

        if (typeof types === 'string') {
            typesArray = types.split(',')
                .map(t => t.trim())
                .filter(t => t.length > 0);
        } else if (Array.isArray(types)) {
            typesArray = types;
        } else {
            throw apiError.BadRequest('INVALID_TYPES', 'Параметр types должен быть строкой или массивом');
        }

        if (typesArray.length === 0) {
            throw apiError.BadRequest('INVALID_TYPES', 'Параметр types не может быть пустым');
        }

        try {
            const allStatuses = await incidentConditionStatusesCommon.getAllStatuses(client);
            const statusMap = new Map(allStatuses.map(s => [s.status_code_name, s.status_id]));

            const results = {};

            const promises = typesArray.map(async (type) => {
                const result = await this._processCollection(
                    client,
                    type,
                    current_user,
                    normalizedStatus,
                    statusMap
                );
                return { type, result };
            });

            const settled = await Promise.all(promises);

            for (const { type, result } of settled) {
                results[type] = result;
            }

            return results;

        } catch (error) {
            console.error('[getCollections] Критическая ошибка:', error);
            throw error;
        }
    }

    async _processCollection(client, type, current_user, current_user_status, statusMap) {
        const config = COLLECTIONS_CONFIG[type];

        if (!config) {
            return {
                error: 'UNKNOWN_COLLECTION',
                message: `Сборка "${type}" не существует`
            };
        }

        const hasAccess = !config.access ||
            config.access.length === 0 ||
            config.access.includes(current_user_status);

        if (!hasAccess) {
            return {
                access_denied: true,
                name: config.name,
                description: config.description
            };
        }

        const cacheEnabled = config.cache?.enabled === true;
        const cacheTTL = config.cache?.ttl || 300;
        const cacheKey = this._buildCollectionCacheKey(type, config, current_user_status, current_user);

        const fetchFromDB = async () => {
            if (config.detail_level === 'stats') {
                return await this._getStatsOverview(
                    client,
                    config,
                    current_user_status,
                    statusMap
                );
            }

            const incidents = await this._fetchCollectionIncidents(
                client,
                type,
                config,
                current_user,
                current_user_status,
                statusMap
            );

            return {
                name: config.name,
                description: config.description,
                count: incidents.length,
                incidents: incidents
            };
        };

        try {
            let data;

            if (cacheEnabled) {
                data = await cacheService.getOrSet(
                    COLLECTIONS_CACHE_TYPE,
                    cacheKey,
                    fetchFromDB,
                    cacheTTL
                );
            } else {
                data = await fetchFromDB();
            }

            return data;

        } catch (err) {
            console.error(`[getCollections] Ошибка получения "${type}":`, err);
            return {
                error: 'FETCH_ERROR',
                message: `Ошибка при получении "${type}"`,
                name: config.name
            };
        }
    }

    async invalidateCollectionsCache() {
        try {
            const deleted = await cacheService.deletePattern(COLLECTIONS_CACHE_TYPE, '*');
            // console.log(`[invalidateCollectionsCache] Удалено ключей: ${deleted}`);
            return deleted;
        } catch (error) {
            console.error('[invalidateCollectionsCache] Ошибка:', error);
            return 0;
        }
    }

    async invalidateUserCollectionsCache(userId) {
        try {
            const deleted = await cacheService.deletePattern(
                COLLECTIONS_CACHE_TYPE,
                `*:*:${userId}`
            );
            // console.log(`[invalidateUserCollectionsCache] User ${userId}: удалено ${deleted} ключей`);
            return deleted;
        } catch (error) {
            console.error('[invalidateUserCollectionsCache] Ошибка:', error);
            return 0;
        }
    }

    async _getStatsOverview(client, config, current_user_status, statusMap) {
        let allowedStatusCodes = config.status_filter[current_user_status];

        if (allowedStatusCodes === undefined) {
            allowedStatusCodes = 'all';
        }

        let statusIds = null;

        if (allowedStatusCodes !== 'all') {
            if (Array.isArray(allowedStatusCodes)) {
                statusIds = allowedStatusCodes
                    .map(code => statusMap.get(code))
                    .filter(id => id !== undefined);
            }
        }

        let query = `
            SELECT 
                imf.condition_id,
                COUNT(*) as count
            FROM incidents_main_info imf
            WHERE imf.deleted = false
        `;
        const params = [];
        let paramIndex = 1;

        if (statusIds && statusIds.length > 0) {
            query += ` AND imf.condition_id = ANY($${paramIndex})`;
            params.push(statusIds);
            paramIndex++;
        }

        query += ` GROUP BY imf.condition_id`;

        const result = await client.query(query, params);

        const by_status = {};
        let total = 0;

        for (const [code, id] of statusMap.entries()) {
            if (statusIds && !statusIds.includes(id)) continue;

            const row = result.rows.find(r => r.condition_id === id);
            const count = row ? parseInt(row.count) : 0;
            by_status[code] = count;
            total += count;
        }

        return {
            name: config.name,
            description: config.description,
            total: total,
            by_status: by_status
        };
    }

    async _fetchCollectionIncidents(client, type, config, current_user, current_user_status, statusMap) {
        let allowedStatusCodes = config.status_filter[current_user_status];

        if (allowedStatusCodes === undefined) {
            allowedStatusCodes = 'all';
        }

        let statusIds = null;

        if (allowedStatusCodes === 'all_except_new') {
            const newStatusId = statusMap.get('new');
            statusIds = Array.from(statusMap.values()).filter(id => id !== newStatusId);
        } else if (allowedStatusCodes !== 'all') {
            if (Array.isArray(allowedStatusCodes)) {
                statusIds = allowedStatusCodes
                    .map(code => statusMap.get(code))
                    .filter(id => id !== undefined);
            }
        }

        let query = `
            SELECT 
                imf.incident_id,
                imf.date_add,
                imf.add_reason_id,
                imf.user_description,
                imf.condition_id,
                imf.moderator_id,
                imf.user_add_email_id,
                imf.user_add_tg_id,
                imf.interest_score,
                imf.views,
                imf.tg_post
            FROM incidents_main_info imf
            WHERE imf.deleted = false
        `;

        if (config.type_filter === 'incident') {
            // type = 1 для инцидентов, NULL для очень старых записей (для обратной совместимости)
            query += ` AND (imf.type IS NULL OR imf.type = 1)`;
        } else if (config.type_filter === 'contestation') {
            // type = 2 строго для оспариваний
            query += ` AND imf.type = 2`;
        }

        const params = [];
        let paramIndex = 1;

        if (statusIds && statusIds.length > 0) {
            query += ` AND imf.condition_id = ANY($${paramIndex})`;
            params.push(statusIds);
            paramIndex++;
        }

        const filters = config.filters || {};

        if ('moderator_id' in filters) {
            if (filters.moderator_id === null) {
                query += ` AND imf.moderator_id IS NULL`;
            } else if (filters.moderator_id === '$current_user_id') {
                query += ` AND imf.moderator_id = $${paramIndex}`;
                params.push(current_user?.id);
                paramIndex++;
            }
        }

        if (filters.date_add_min) {
            query += ` AND imf.date_add >= NOW() - INTERVAL '${filters.date_add_min}'`;
        }

        if (filters.date_add_max) {
            query += ` AND imf.date_add <= NOW() - INTERVAL '${filters.date_add_max}'`;
        }

        if (filters.interest_score_min !== undefined) {
            query += ` AND imf.interest_score >= $${paramIndex}`;
            params.push(filters.interest_score_min);
            paramIndex++;
        }

        if ('tg_post' in filters) {
            if (filters.tg_post === false) {
                query += ` AND (imf.tg_post = false OR imf.tg_post IS NULL)`;
            } else if (filters.tg_post === true) {
                query += ` AND imf.tg_post = true`;
            }
        }

        if (filters.has_unverified_pvz) {
            query += ` AND EXISTS (
                SELECT 1 
                FROM incident_pvz_connector ipc 
                INNER JOIN incident_pvz ip ON ipc.pvz_id = ip.pvz_id 
                WHERE ipc.incident_id = imf.incident_id 
                AND ip.is_verified = false
            )`;
        }

        if (filters.has_unverified_pvz) {
            query += ` AND EXISTS (
                SELECT 1 
                FROM incident_pvz_connector ipc 
                INNER JOIN incident_pvz ip ON ipc.pvz_id = ip.pvz_id 
                WHERE ipc.incident_id = imf.incident_id 
                AND ip.is_verified = false
            )`;
        }

        if (filters.has_ai_analysis === false) {
            query += ` AND (imf.ai_response_flag = false OR imf.ai_response_flag IS NULL)`;
        }

        if (filters.no_admin_assessment) {
            query += ` AND (
                imf.admin_assessment IS NULL 
                OR imf.admin_assessment->'history' IS NULL 
                OR jsonb_array_length(imf.admin_assessment->'history') = 0
            )`;
        }

        if (filters.last_assessment_not_approved) {
            query += ` AND (
                imf.admin_assessment IS NOT NULL 
                AND imf.admin_assessment->'history' IS NOT NULL 
                AND jsonb_array_length(imf.admin_assessment->'history') > 0
                AND (imf.admin_assessment->'history'->-1->>'result') != 'approved'
            )`;
        }

        if (filters.no_admin_assessment) {
            query += ` AND (
        imf.admin_assessment IS NULL 
        OR imf.admin_assessment->'history' IS NULL 
        OR jsonb_array_length(imf.admin_assessment->'history') = 0
    )`;
        }

        if (filters.last_assessment_not_approved) {
            query += ` AND (
        imf.admin_assessment IS NOT NULL 
        AND imf.admin_assessment->'history' IS NOT NULL 
        AND jsonb_array_length(imf.admin_assessment->'history') > 0
        AND (imf.admin_assessment->'history'->-1->>'result') != 'approved'
    )`;
        }

        const sortField = config.sort?.field || 'date_add';
        const sortOrder = config.sort?.order || 'DESC';

        if (config.sort?.custom) {
            query += ` ORDER BY ${sortField} ${sortOrder}`;
        } else {
            query += ` ORDER BY imf.${sortField} ${sortOrder}`;
        }

        query += ` LIMIT $${paramIndex}`;
        params.push(config.limit);

        const result = await client.query(query, params);
        const incidents = result.rows;

        return await Promise.all(incidents.map(async (incident) => {
            const incidentType = incident?.add_reason_id && incident.add_reason_id != -1 ? await dictionaryService.getElementNameById(
                client,
                incident.add_reason_id
            ) : null;

            const truncatedDescription = incident.user_description
                ? (incident.user_description.length > 100
                    ? incident.user_description.substring(0, 100) + '...'
                    : incident.user_description)
                : '';

            const baseData = {
                id: incident.incident_id,
                date_create: incident.date_add,
                type: incidentType || 'Оспаривание',
                description: truncatedDescription,
                interest_score: incident.interest_score
            };

            if (config.detail_level === 'card') {
                return baseData;
            }

            const user_add_email = incident.user_add_email_id
                ? await usersEmailService.getDecryptedEmailById(client, incident.user_add_email_id)
                : null;
            const user_add_tg = incident.user_add_tg_id
                ? await userTgService.getDecryptedTgById(client, incident.user_add_tg_id)
                : null;

            let responsible = null;
            if (incident.moderator_id) {
                try {
                    const userQuery = `SELECT login FROM users WHERE user_id = $1`;
                    const userResult = await client.query(userQuery, [incident.moderator_id]);

                    if (userResult.rows.length > 0) {
                        responsible = {
                            id: incident.moderator_id,
                            login: userResult.rows[0].login || null
                        };
                    }
                } catch (err) {
                    console.error(`[getCollections] Ошибка получения ответственного для инцидента ${incident.incident_id}:`, err);
                }
            }

            return {
                ...baseData,
                user_add_email: user_add_email,
                user_add_tg: user_add_tg,
                responsible: responsible
            };
        }));
    }

    async getIncidentStatus(client, incidentId) {
        if (!incidentId) {
            throw apiError.BadRequest('INCIDENT_NOT_EXIST', `Инцидент не существует`);
        }

        validateService.incidentValidation.validateIncidentId(incidentId);

        const incidentResult = await client.query(
            `SELECT 
                imf.incident_id,
                imf.condition_id,
                imf.deleted
            FROM 
                incidents_main_info imf
            WHERE
                imf.incident_id = $1`,
            [incidentId]
        );

        if (incidentResult.rowCount === 0) {
            throw apiError.BadRequest('INCIDENT_NOT_EXIST', `Инцидент с ID ${incidentId} не найден`);
        }

        const incident = incidentResult.rows[0];

        if (incident.deleted) {
            return {
                id: incident.incident_id,
                status: 'deleted',
                status_name: 'Удалён',
                condition_id: null
            };
        }

        const allStatuses = await incidentConditionStatusesCommon.getAllStatuses(client);
        const currentConditionId = String(incident.condition_id);

        const currentStatus = allStatuses.find(
            s => String(s.status_id) === currentConditionId
        );

        return {
            id: incident.incident_id,
            status: currentStatus?.status_code_name || null,
            status_name: currentStatus?.status_name || null,
            condition_id: incident.condition_id
        };
    }
}

module.exports = new incidentGetService();