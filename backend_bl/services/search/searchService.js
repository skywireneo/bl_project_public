const apiError = require("../../exceptions/apiError");
const dictionaryService = require("../dictionary/dictionaryService");
const incidentConditionStatusesCommon = require("../incidents/incidentConditionStatuses/incidentConditionStatusesCommon");
const { hashData } = require("../systemServices/cryptoService");
const { getPhoneticTokenHashes } = require("../systemServices/translitService");
const { maskPhone, maskTgId, maskTgName, maskFIO, maskBirthDate } = require("../systemServices/mask");
const searchHistoryService = require("./searchHistoryService");
const statisticService = require("../stats/statisticService");
const hmacService = require("../systemServices/hmacService");

// =========================
// КОНФИГУРАЦИЯ
// =========================
const PROPVZ = true;
const PROPERSONE = true;
const DISABLE_MASKING = false;
const BASE_RELIABILITY_SCORE = 100;
const MIN_SHARED_PARAMS_FOR_MERGE = 2;
const MAX_GRAPH_DEPTH = 5;
const MIN_SEARCH_PARAMS = 1;
const MAX_GROUPS_IN_RESPONSE = 3;

// Коэффициенты ролей
const ROLE_MULTIPLIER = {
    ADMINISTRATION: 1.5, // Администрация ПВЗ — больше ответственности
    EMPLOYEE: 1.0        // Обычный сотрудник
};

// Пороги для red flags
const RED_FLAGS_THRESHOLDS = {
    ADMIN_WITH_VIOLATIONS: 3,    // ≥3 инцидентов как администрация
    RECIDIVISM: 3,                // ≥3 повторений одной причины
    MIGRATING_VIOLATOR: 3,        // ≥3 разных ПВЗ
    ESCALATION: true              // сотрудник → администрация с продолжением нарушений
};

const PARAM_WEIGHTS = {
    phone: 2, phone_last_six: 2, tg_id: 2, tg_username: 2,
    name: 1, phonetic: 0.5, birth_date: 3
};

const RISK_LEVELS = {
    CRITICAL: { threshold: 30, label: 'critical' },
    HIGH: { threshold: 50, label: 'high' },
    MEDIUM: { threshold: 70, label: 'medium' },
    LOW: { threshold: 101, label: 'low' }
};

class searchService {
    constructor() {
        this.resolvedStatusId = null;
    }

    // =========================
    // ВСПОМОГАТЕЛЬНЫЕ
    // =========================
    async _getResolvedStatusId(client) {
        if (this.resolvedStatusId !== null) return this.resolvedStatusId;
        const statuses = await incidentConditionStatusesCommon.getAllStatuses(client);
        const resolved = statuses.find(s => s.status_code_name === 'resolved');
        if (!resolved) throw apiError.BadRequest('STATUS_NOT_FOUND', 'Статус resolved не найден');
        this.resolvedStatusId = resolved.status_id;
        return this.resolvedStatusId;
    }

    _normalizePhone(phoneString) {
        const digitsOnly = phoneString.replace(/\D/g, '');
        if (digitsOnly.length === 11 && digitsOnly.startsWith('8')) return '7' + digitsOnly.slice(1);
        if (digitsOnly.length === 10) return '7' + digitsOnly;
        return digitsOnly;
    }

    _getRiskLevel(score) {
        if (score < RISK_LEVELS.CRITICAL.threshold) return RISK_LEVELS.CRITICAL.label;
        if (score < RISK_LEVELS.HIGH.threshold) return RISK_LEVELS.HIGH.label;
        if (score < RISK_LEVELS.MEDIUM.threshold) return RISK_LEVELS.MEDIUM.label;
        return RISK_LEVELS.LOW.label;
    }

    _normalizeDate(dateValue) {
        if (!dateValue) return null;
        if (dateValue instanceof Date) return dateValue.toISOString().split('T')[0];
        return String(dateValue).split('T')[0];
    }

    _capitalizeWords(str) {
        if (!str || typeof str !== 'string') return str;
        return str.split(' ').filter(w => w.length > 0).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }

    // =========================
    // МУЛЬТИПЛИКАТОРЫ И АГРЕГАЦИЯ ОЦЕНОК
    // =========================
    _getSeverityMultiplier(severity) {
        const map = { 'Низкая': 0.5, 'Средняя': 1.0, 'Высокая': 1.5, 'Критическая': 2.0 };
        return map[severity] || 1.0; // Не указано = Средняя = 1.0
    }

    _getConfidenceMultiplier(confidence) {
        const map = { 'Низкая': 0.5, 'Средняя': 0.8, 'Высокая': 1.0 };
        return map[confidence] || 1.0; // Не указано = Высокая = 1.0
    }

    _parseAssessment(rawAssessment) {
        if (!rawAssessment) return {};
        if (typeof rawAssessment === 'string') {
            try { return JSON.parse(rawAssessment); } catch { return {}; }
        }
        return typeof rawAssessment === 'object' ? rawAssessment : {};
    }

    _aggregateAssessments(incidents) {
        const SEVERITY_ORDER = { 'Низкая': 1, 'Средняя': 2, 'Высокая': 3, 'Критическая': 4 };
        const CONFIDENCE_ORDER = { 'Низкая': 1, 'Средняя': 2, 'Высокая': 3 };

        let maxSev = null, maxSevVal = 0;
        let minConf = null, minConfVal = 999;

        for (const inc of incidents) {
            const a = this._parseAssessment(inc.admin_assessment);
            if (a.severity && SEVERITY_ORDER[a.severity] > maxSevVal) {
                maxSevVal = SEVERITY_ORDER[a.severity];
                maxSev = a.severity;
            }
            if (a.confidence && CONFIDENCE_ORDER[a.confidence] < minConfVal) {
                minConfVal = CONFIDENCE_ORDER[a.confidence];
                minConf = a.confidence;
            }
        }
        return { max_severity: maxSev, min_confidence: minConf };
    }

    // =========================
    // ПАРСИНГ
    // =========================
    _classifyToken(token) {
        const trimmed = token.trim();
        const digitsOnly = trimmed.replace(/\D/g, '');
        if (digitsOnly.length >= 10) {
            const normalized = this._normalizePhone(digitsOnly);
            return { type: 'phone', value: normalized, last_six: normalized.slice(-6) };
        }
        if (/^\d{8,9}$/.test(trimmed)) return { type: 'tg_id', value: trimmed };
        const tgUsernameRegex = /^[a-zA-Z0-9_]{5,}$/;
        if ((trimmed.startsWith('@') || tgUsernameRegex.test(trimmed)) && /[a-zA-Z]/.test(trimmed)) {
            return { type: 'tg_username', value: trimmed.replace('@', '') };
        }
        if (/[а-яА-Яa-zA-Z]/.test(trimmed)) return { type: 'fio', value: trimmed.toLowerCase() };
        return { type: 'ambiguous', value: trimmed };
    }

    _parseSearchString(searchString) {
        if (!searchString || typeof searchString !== 'string') throw apiError.BadRequest('INVALID_INPUT', 'Строка поиска пуста');
        const tokens = searchString.split(',').map(t => t.trim()).filter(t => t.length > 0);
        if (tokens.length === 0) throw apiError.BadRequest('INVALID_INPUT', 'Не найдено валидных токенов');
        const classified = { fio: [], phone: [], tg_username: [], tg_id: [], ambiguous: [] };
        for (const token of tokens) {
            const r = this._classifyToken(token);
            classified[r.type].push(r);
        }
        return classified;
    }

    // =========================
    // SQL УСЛОВИЯ
    // =========================
    async _buildPersonSearchConditions(classified) {
        const orConditions = [];
        const params = [];
        const searchParams = [];
        let paramIndex = 1;

        if (classified.fio.length > 0) {
            const fioSubs = [];
            for (const token of classified.fio) {
                const nameHash = hashData(token.value, 'USER_NAME');
                const phoneticTokens = await getPhoneticTokenHashes(token.value);
                params.push(nameHash); const exactIdx = paramIndex++;
                params.push(phoneticTokens); const phoneticIdx = paramIndex++;
                fioSubs.push(`EXISTS (SELECT 1 FROM persone_name_connector pnc INNER JOIN persone_names pn ON pnc.name_id = pn.name_id WHERE pnc.person_id = ip.person_id AND (pn.name_hesh = $${exactIdx} OR pn.name_phonetic_tokens && $${phoneticIdx}::text[]))`);
                searchParams.push({ type: 'fio', value: token.value, methods: ['exact_hash', 'phonetic'], phonetic_tokens: phoneticTokens });
            }
            orConditions.push(`(${fioSubs.join(' OR ')})`);
        }

        if (classified.phone.length > 0) {
            const phoneSubs = [];
            for (const token of classified.phone) {
                const phoneHash = hashData(token.value, 'USER_PHONE');
                params.push(phoneHash); const hashIdx = paramIndex++;
                params.push(token.last_six); const lastSixIdx = paramIndex++;
                phoneSubs.push(`EXISTS (SELECT 1 FROM persone_phone_connector ppc INNER JOIN persone_phones pp ON ppc.phone_id = pp.phone_id WHERE ppc.person_id = ip.person_id AND (pp.phone_hesh = $${hashIdx} OR pp.phone_last_six = $${lastSixIdx}))`);
                searchParams.push({ type: 'phone', value: token.value, last_six: token.last_six, methods: ['exact_hash', 'last_six'] });
            }
            orConditions.push(`(${phoneSubs.join(' OR ')})`);
        }

        if (classified.tg_username.length > 0) {
            const tgUserSubs = [];
            for (const token of classified.tg_username) {
                const usernameHash = hashData(token.value.toLowerCase(), 'USER_TG');
                params.push(usernameHash);
                tgUserSubs.push(`EXISTS (SELECT 1 FROM persone_telegramm_accaunt_connector ptac INNER JOIN persone_telegramm_accaunts pta ON ptac.telegramm_accaunt_id = pta.tg_id WHERE ptac.person_id = ip.person_id AND pta.tg_username_hesh = $${paramIndex++})`);
                searchParams.push({ type: 'tg_username', value: token.value.toLowerCase(), methods: ['exact_hash'] });
            }
            orConditions.push(`(${tgUserSubs.join(' OR ')})`);
        }

        if (classified.tg_id.length > 0) {
            const tgIdSubs = [];
            for (const token of classified.tg_id) {
                const tgIdHash = hashData(token.value, 'USER_TG');
                params.push(tgIdHash);
                tgIdSubs.push(`EXISTS (SELECT 1 FROM persone_telegramm_accaunt_connector ptac INNER JOIN persone_telegramm_accaunts pta ON ptac.telegramm_accaunt_id = pta.tg_id WHERE ptac.person_id = ip.person_id AND pta.tg_id_hesh = $${paramIndex++})`);
                searchParams.push({ type: 'tg_id', value: token.value, methods: ['exact_hash'] });
            }
            orConditions.push(`(${tgIdSubs.join(' OR ')})`);
        }

        if (classified.ambiguous.length > 0) {
            const ambSubs = [];
            for (const token of classified.ambiguous) {
                const tokenConds = [];
                const digitsOnly = token.value.replace(/\D/g, '');
                if (digitsOnly.length >= 10) {
                    const np = this._normalizePhone(digitsOnly);
                    const ph = hashData(np, 'USER_PHONE'); const ls = np.slice(-6);
                    params.push(ph); const hIdx = paramIndex++;
                    params.push(ls); const lIdx = paramIndex++;
                    tokenConds.push(`EXISTS (SELECT 1 FROM persone_phone_connector ppc INNER JOIN persone_phones pp ON ppc.phone_id = pp.phone_id WHERE ppc.person_id = ip.person_id AND (pp.phone_hesh = $${hIdx} OR pp.phone_last_six = $${lIdx}))`);
                }
                if (/^\d{8,9}$/.test(token.value)) {
                    const h = hashData(token.value, 'USER_TG'); params.push(h);
                    tokenConds.push(`EXISTS (SELECT 1 FROM persone_telegramm_accaunt_connector ptac INNER JOIN persone_telegramm_accaunts pta ON ptac.telegramm_accaunt_id = pta.tg_id WHERE ptac.person_id = ip.person_id AND pta.tg_id_hesh = $${paramIndex++})`);
                }
                if (/^[a-zA-Z0-9_]{5,}$/.test(token.value) && /[a-zA-Z]/.test(token.value)) {
                    const h = hashData(token.value.toLowerCase(), 'USER_TG'); params.push(h);
                    tokenConds.push(`EXISTS (SELECT 1 FROM persone_telegramm_accaunt_connector ptac INNER JOIN persone_telegramm_accaunts pta ON ptac.telegramm_accaunt_id = pta.tg_id WHERE ptac.person_id = ip.person_id AND pta.tg_username_hesh = $${paramIndex++})`);
                }
                if (/[а-яА-Яa-zA-Z]/.test(token.value)) {
                    const lv = token.value.toLowerCase();
                    const nh = hashData(lv, 'USER_NAME'); const pt = await getPhoneticTokenHashes(lv);
                    params.push(nh); const eIdx = paramIndex++;
                    params.push(pt); const pIdx = paramIndex++;
                    tokenConds.push(`EXISTS (SELECT 1 FROM persone_name_connector pnc INNER JOIN persone_names pn ON pnc.name_id = pn.name_id WHERE pnc.person_id = ip.person_id AND (pn.name_hesh = $${eIdx} OR pn.name_phonetic_tokens && $${pIdx}::text[]))`);
                }
                if (tokenConds.length > 0) ambSubs.push(`(${tokenConds.join(' OR ')})`);
            }
            if (ambSubs.length > 0) orConditions.push(`(${ambSubs.join(' OR ')})`);
        }

        return { orConditions, params, searchParams };
    }

    // =========================
    // BATCH ЗАПРОСЫ (с addonData)
    // =========================
    async _getNamesByPersonIds(client, personIds, canGetFullData) {
        if (personIds.length === 0) return new Map();
        const query = `SELECT pnc.person_id, pn.name_id, pn.name_encrypted, pn.name_iv, pn.name_auth_tag, pn.name_hesh, pn.name_phonetic_tokens FROM persone_name_connector pnc INNER JOIN persone_names pn ON pnc.name_id = pn.name_id WHERE pnc.person_id = ANY($1)`;
        const result = await client.query(query, [personIds]);
        const map = new Map();
        for (const row of result.rows) {
            if (!map.has(row.person_id)) map.set(row.person_id, []);
            let name = null;
            if (canGetFullData) {
                try {
                    const { decrypt } = require("../systemServices/cryptoService");
                    name = this._capitalizeWords(decrypt({ encrypted: row.name_encrypted, iv: row.name_iv, authTag: row.name_auth_tag }, 'USER_NAME'));
                } catch { name = 'Ошибка расшифровки'; }
            }
            map.get(row.person_id).push({ id: row.name_id, name, name_hesh: row.name_hesh, phonetic_tokens: row.name_phonetic_tokens });
        }
        return map;
    }

    async _getPhonesByPersonIds(client, personIds, canGetFullData) {
        if (personIds.length === 0) return new Map();
        const query = `SELECT ppc.person_id, pp.phone_id, pp.phone_encrypted, pp.phone_iv, pp.phone_auth_tag, pp.phone_hesh, pp.phone_last_six FROM persone_phone_connector ppc INNER JOIN persone_phones pp ON ppc.phone_id = pp.phone_id WHERE ppc.person_id = ANY($1)`;
        const result = await client.query(query, [personIds]);
        const map = new Map();
        for (const row of result.rows) {
            if (!map.has(row.person_id)) map.set(row.person_id, []);
            let phone = null;
            if (canGetFullData) {
                try {
                    const { decrypt } = require("../systemServices/cryptoService");
                    phone = decrypt({ encrypted: row.phone_encrypted, iv: row.phone_iv, authTag: row.phone_auth_tag }, 'USER_PHONE');
                } catch { phone = 'Ошибка расшифровки'; }
            }
            map.get(row.person_id).push({ id: row.phone_id, phone, phone_hesh: row.phone_hesh, phone_last_six: row.phone_last_six });
        }
        return map;
    }

    async _getTgByPersonIds(client, personIds, canGetFullData) {
        if (personIds.length === 0) return new Map();
        const query = `SELECT ptac.person_id, pta.tg_id, pta.tg_username_encrypted, pta.tg_username_iv, pta.tg_username_auth_tag, pta.tg_username_hesh, pta.tg_id_encrypted, pta.tg_id_iv, pta.tg_id_auth_tag, pta.tg_id_hesh FROM persone_telegramm_accaunt_connector ptac INNER JOIN persone_telegramm_accaunts pta ON ptac.telegramm_accaunt_id = pta.tg_id WHERE ptac.person_id = ANY($1)`;
        const result = await client.query(query, [personIds]);
        const map = new Map();
        for (const row of result.rows) {
            if (!map.has(row.person_id)) map.set(row.person_id, []);
            let u = null, tid = null;
            if (canGetFullData) {
                try {
                    const { decrypt } = require("../systemServices/cryptoService");
                    u = decrypt({ encrypted: row.tg_username_encrypted, iv: row.tg_username_iv, authTag: row.tg_username_auth_tag }, 'USER_TG');
                } catch { u = 'Ошибка'; }
                try {
                    const { decrypt } = require("../systemServices/cryptoService");
                    tid = decrypt({ encrypted: row.tg_id_encrypted, iv: row.tg_id_iv, authTag: row.tg_id_auth_tag }, 'USER_TG');
                } catch { tid = null; }
            }
            map.get(row.person_id).push({ id: row.tg_id, username: u, tg_id: tid, tg_username_hesh: row.tg_username_hesh, tg_id_hesh: row.tg_id_hesh });
        }
        return map;
    }

    /**
     * Получение инцидентов персоны с полной информацией о причине и должности (включая addonData)
     */
    async _getIncidentsByPersonIds(client, personIds, resolvedStatusId) {
        if (personIds.length === 0) return new Map();
        const query = `
            SELECT
                ipc.person_id,
                imf.incident_id,
                imf.add_reason_id,
                ip2.post_id,
                ip2.birth_date,
                imf.date_add,
                imf.admin_assessment,
                reason_dict.addon_data AS reason_addon_data,
                reason_dict.name AS reason_name_raw,
                reason_dict.ball AS reason_ball,
                post_dict.addon_data AS post_addon_data,
                post_dict.name AS post_name_raw,
                post_dict.ball AS post_ball
            FROM incident_persone_connector ipc
            INNER JOIN incidents_main_info imf ON ipc.incident_id = imf.incident_id
            INNER JOIN incident_persones ip2 ON ipc.person_id = ip2.person_id
            LEFT JOIN incidents_data_dictionary reason_dict ON imf.add_reason_id = reason_dict.element_id
            LEFT JOIN incidents_data_dictionary post_dict ON ip2.post_id = post_dict.element_id
            WHERE ipc.person_id = ANY($1)
              AND ipc.active = true
              AND imf.condition_id = $2
              AND imf.deleted = false
            ORDER BY imf.date_add DESC
        `;
        const result = await client.query(query, [personIds, resolvedStatusId]);
        const map = new Map();
        for (const row of result.rows) {
            if (!map.has(row.person_id)) map.set(row.person_id, []);
            let reasonAddon = row.reason_addon_data;
            let postAddon = row.post_addon_data;
            if (typeof reasonAddon === 'string') { try { reasonAddon = JSON.parse(reasonAddon); } catch { reasonAddon = {}; } }
            if (typeof postAddon === 'string') { try { postAddon = JSON.parse(postAddon); } catch { postAddon = {}; } }

            map.get(row.person_id).push({
                incident_id: row.incident_id,
                add_reason_id: row.add_reason_id,
                post_id: row.post_id,
                birth_date: row.birth_date,
                date_add: row.date_add,
                admin_assessment: row.admin_assessment,
                reason_name: row.reason_name_raw,
                reason_ball: parseInt(row.reason_ball) || 0,
                reason_onPvz: reasonAddon?.onPvz === true,
                reason_description: reasonAddon?.description || null,
                post_name: row.post_name_raw,
                post_ball: parseInt(row.post_ball) || 0,
                post_onPvz: postAddon?.onPvz === true
            });
        }
        return map;
    }

    /**
     * Cross-reference: получение всех ПВЗ, где работал человек
     */
    async _getPersonPvzHistory(client, personIds, resolvedStatusId) {
        if (personIds.length === 0) return new Map();
        const query = `
            SELECT DISTINCT
                ipc.person_id,
                pvz.pvz_id,
                pvz.type_id,
                pvz.addr_city,
                pvz.addr_street,
                pvz.addr_home,
                COUNT(DISTINCT imf.incident_id) AS incident_count,
                MAX(imf.date_add) AS last_incident_date
            FROM incident_persone_connector ipc
            INNER JOIN incident_pvz_connector ipvc ON ipc.incident_id = ipvc.incident_id
            INNER JOIN incident_pvz pvz ON ipvc.pvz_id = pvz.pvz_id
            INNER JOIN incidents_main_info imf ON ipc.incident_id = imf.incident_id
            WHERE ipc.person_id = ANY($1)
              AND ipc.active = true
              AND ipvc.active = true
              AND imf.condition_id = $2
              AND imf.deleted = false
            GROUP BY ipc.person_id, pvz.pvz_id, pvz.type_id, pvz.addr_city, pvz.addr_street, pvz.addr_home
            ORDER BY last_incident_date DESC
        `;
        const result = await client.query(query, [personIds, resolvedStatusId]);
        const map = new Map();
        for (const row of result.rows) {
            if (!map.has(row.person_id)) map.set(row.person_id, []);
            const typeBall = await this._getElementBall(client, row.type_id);
            map.get(row.person_id).push({
                pvz_id: row.pvz_id,
                type_id: row.type_id,
                incident_count: parseInt(row.incident_count),
                last_incident_date: row.last_incident_date,
                address: `г. ${this._capitalizeWords(row.addr_city) || '?'}, ул. ${this._capitalizeWords(row.addr_street) || '?'}, д. ${row.addr_home || '?'}`,
                type_ball: typeBall
            });
        }
        return map;
    }

    /**
     * Cross-reference: получение всех людей, работавших на конкретном ПВЗ
     */
    async _getPvzPersonnelHistory(client, pvzIds, resolvedStatusId) {
        if (pvzIds.length === 0) return new Map();
        const query = `
            SELECT DISTINCT
                ipvc.pvz_id,
                ipc.person_id,
                ip.post_id,
                post_dict.addon_data AS post_addon_data,
                post_dict.name AS post_name_raw,
                COUNT(DISTINCT imf.incident_id) AS incident_count,
                MAX(imf.date_add) AS last_incident_date
            FROM incident_pvz_connector ipvc
            INNER JOIN incident_persone_connector ipc ON ipvc.incident_id = ipc.incident_id
            INNER JOIN incident_persones ip ON ipc.person_id = ip.person_id
            INNER JOIN incidents_main_info imf ON ipc.incident_id = imf.incident_id
            LEFT JOIN incidents_data_dictionary post_dict ON ip.post_id = post_dict.element_id
            WHERE ipvc.pvz_id = ANY($1)
              AND ipc.active = true
              AND ipvc.active = true
              AND imf.condition_id = $2
              AND imf.deleted = false
            GROUP BY ipvc.pvz_id, ipc.person_id, ip.post_id, post_dict.addon_data, post_dict.name
            ORDER BY last_incident_date DESC
        `;
        const result = await client.query(query, [pvzIds, resolvedStatusId]);
        const map = new Map();
        for (const row of result.rows) {
            if (!map.has(row.pvz_id)) map.set(row.pvz_id, []);
            let postAddon = row.post_addon_data;
            if (typeof postAddon === 'string') { try { postAddon = JSON.parse(postAddon); } catch { postAddon = {}; } }
            map.get(row.pvz_id).push({
                person_id: row.person_id,
                post_id: row.post_id,
                post_name: row.post_name_raw || 'Неизвестная должность',
                post_onPvz: postAddon?.onPvz === true,
                incident_count: parseInt(row.incident_count),
                last_incident_date: row.last_incident_date,
                role: postAddon?.onPvz === true ? 'administration' : 'employee'
            });
        }
        return map;
    }

    async _getElementsBall(client, elementIds) {
        if (elementIds.length === 0) return new Map();
        const uniqueIds = [...new Set(elementIds.filter(id => id != null))];
        if (uniqueIds.length === 0) return new Map();
        const result = await client.query(`SELECT element_id, ball FROM incidents_data_dictionary WHERE element_id = ANY($1) AND (deleted IS NULL OR deleted = false)`, [uniqueIds]);
        const map = new Map();
        for (const r of result.rows) map.set(r.element_id, parseInt(r.ball) || 0);
        return map;
    }

    async _getElementBall(client, elementId) {
        if (!elementId) return 0;
        const r = await client.query(`SELECT ball FROM incidents_data_dictionary WHERE element_id = $1 AND (deleted IS NULL OR deleted = false) LIMIT 1`, [elementId]);
        return r.rowCount > 0 ? parseInt(r.rows[0].ball) : 0;
    }

    async _getElementsName(client, elementIds) {
        if (elementIds.length === 0) return new Map();
        const uniqueIds = [...new Set(elementIds.filter(id => id != null))];
        if (uniqueIds.length === 0) return new Map();
        const r = await client.query(`SELECT element_id, name FROM incidents_data_dictionary WHERE element_id = ANY($1) AND (deleted IS NULL OR deleted = false)`, [uniqueIds]);
        const m = new Map(); for (const row of r.rows) m.set(row.element_id, row.name); return m;
    }

    // =========================
    // MATCH SCORE
    // =========================
    async _calculateMatchScores(client, personIds, classified) {
        const [namesMap, phonesMap, tgMap] = await Promise.all([
            this._getNamesByPersonIds(client, personIds, true),
            this._getPhonesByPersonIds(client, personIds, true),
            this._getTgByPersonIds(client, personIds, true)
        ]);
        const scoresMap = new Map();
        for (const pid of personIds) {
            let score = 0;
            const matchedParams = [];
            const names = namesMap.get(pid) || [], phones = phonesMap.get(pid) || [], tgAccounts = tgMap.get(pid) || [];

            for (const token of classified.fio) {
                const nh = hashData(token.value, 'USER_NAME');
                const pt = await getPhoneticTokenHashes(token.value);
                for (const n of names) {
                    if (n.name_hesh === nh) { score += PARAM_WEIGHTS.name; matchedParams.push({ type: 'fio', value: token.value, method: 'exact' }); break; }
                    if ((n.phonetic_tokens || []).some(p => pt.includes(p))) { score += PARAM_WEIGHTS.phonetic; matchedParams.push({ type: 'fio', value: token.value, method: 'phonetic' }); break; }
                }
            }
            for (const token of classified.phone) {
                const ph = hashData(token.value, 'USER_PHONE');
                for (const p of phones) {
                    if (p.phone_hesh === ph) { score += PARAM_WEIGHTS.phone; matchedParams.push({ type: 'phone', value: token.value, method: 'exact' }); break; }
                    if (p.phone_last_six === token.last_six) { score += PARAM_WEIGHTS.phone_last_six; matchedParams.push({ type: 'phone', value: token.value, method: 'last_six' }); break; }
                }
            }
            for (const token of classified.tg_username) {
                const h = hashData(token.value.toLowerCase(), 'USER_TG');
                for (const t of tgAccounts) if (t.tg_username_hesh === h) { score += PARAM_WEIGHTS.tg_username; matchedParams.push({ type: 'tg_username', value: token.value, method: 'exact' }); break; }
            }
            for (const token of classified.tg_id) {
                const h = hashData(token.value, 'USER_TG');
                for (const t of tgAccounts) if (t.tg_id_hesh === h) { score += PARAM_WEIGHTS.tg_id; matchedParams.push({ type: 'tg_id', value: token.value, method: 'exact' }); break; }
            }
            scoresMap.set(pid, { score, matchedParams });
        }
        return scoresMap;
    }

    // =========================
    // ГРАФ СВЯЗЕЙ
    // =========================
    async _getPersonParams(client, personIds) {
        if (personIds.length === 0) return {};
        const pp = {};
        for (const pid of personIds) pp[pid] = { names: [], phones: [], tg_usernames: [], tg_ids: [], birth_dates: [] };
        const nr = await client.query(`SELECT pnc.person_id, pn.name_hesh FROM persone_name_connector pnc INNER JOIN persone_names pn ON pnc.name_id = pn.name_id WHERE pnc.person_id = ANY($1)`, [personIds]);
        for (const r of nr.rows) if (pp[r.person_id]) pp[r.person_id].names.push(r.name_hesh);
        const pr = await client.query(`SELECT ppc.person_id, pp.phone_hesh FROM persone_phone_connector ppc INNER JOIN persone_phones pp ON ppc.phone_id = pp.phone_id WHERE ppc.person_id = ANY($1)`, [personIds]);
        for (const r of pr.rows) if (pp[r.person_id]) pp[r.person_id].phones.push(r.phone_hesh);
        const tr = await client.query(`SELECT ptac.person_id, pta.tg_username_hesh, pta.tg_id_hesh FROM persone_telegramm_accaunt_connector ptac INNER JOIN persone_telegramm_accaunts pta ON ptac.telegramm_accaunt_id = pta.tg_id WHERE ptac.person_id = ANY($1)`, [personIds]);
        for (const r of tr.rows) if (pp[r.person_id]) { if (r.tg_username_hesh) pp[r.person_id].tg_usernames.push(r.tg_username_hesh); if (r.tg_id_hesh) pp[r.person_id].tg_ids.push(r.tg_id_hesh); }
        const br = await client.query(`SELECT DISTINCT person_id, birth_date FROM incident_persones WHERE person_id = ANY($1) AND birth_date IS NOT NULL`, [personIds]);
        for (const r of br.rows) if (pp[r.person_id]) { const d = this._normalizeDate(r.birth_date); if (d && !pp[r.person_id].birth_dates.includes(d)) pp[r.person_id].birth_dates.push(d); }
        return pp;
    }

    _countSharedParams(a, b) {
        let shared = 0; const details = [];
        const sn = a.names.filter(h => b.names.includes(h));
        const sp = a.phones.filter(h => b.phones.includes(h));
        const stu = a.tg_usernames.filter(h => b.tg_usernames.includes(h));
        const sti = a.tg_ids.filter(h => b.tg_ids.includes(h));
        const sbd = a.birth_dates.filter(d => b.birth_dates.includes(d));
        shared += sn.length + sp.length + stu.length + sti.length + sbd.length;
        if (sn.length) details.push(`общее ФИО (${sn.length})`);
        if (sp.length) details.push(`общий телефон (${sp.length})`);
        if (stu.length) details.push(`общий TG username (${stu.length})`);
        if (sti.length) details.push(`общий TG ID (${sti.length})`);
        if (sbd.length) details.push(`общая дата рождения (${sbd.length})`);
        return { count: shared, details };
    }

    async _findLinkedPersons(client, initialPersonIds) {
        if (initialPersonIds.length === 0) return { linkedPersonIds: [], groups: [], mergeDetails: [] };
        const allPersonParams = await this._getPersonParams(client, initialPersonIds);
        const mergeDetails = [];
        for (let i = 0; i < initialPersonIds.length; i++) {
            for (let j = i + 1; j < initialPersonIds.length; j++) {
                const a = initialPersonIds[i], b = initialPersonIds[j];
                if (!allPersonParams[a] || !allPersonParams[b]) continue;
                const { count, details } = this._countSharedParams(allPersonParams[a], allPersonParams[b]);
                if (count >= MIN_SHARED_PARAMS_FOR_MERGE) {
                    mergeDetails.push({ person_a: a, person_b: b, shared_count: count, shared_details: details.join(', '), merge_reason: `Совпадение по ${count} параметрам: ${details.join(', ')}` });
                }
            }
        }
        const parent = new Map();
        const find = (x) => { if (!parent.has(x)) parent.set(x, x); if (parent.get(x) !== x) parent.set(x, find(parent.get(x))); return parent.get(x); };
        const union = (x, y) => { const rx = find(x), ry = find(y); if (rx !== ry) parent.set(rx, ry); };
        for (const pid of initialPersonIds) parent.set(pid, pid);
        for (const m of mergeDetails) union(m.person_a, m.person_b);
        const groupMap = new Map();
        for (const pid of initialPersonIds) { const root = find(pid); if (!groupMap.has(root)) groupMap.set(root, []); groupMap.get(root).push(pid); }
        const groups = [];
        for (const [, members] of groupMap) if (members.length > 1) groups.push([...members]);

        const allGroupMembers = new Set(initialPersonIds);
        const visited = new Set(initialPersonIds);
        let depth = 0;
        while (depth < MAX_GRAPH_DEPTH) {
            depth++;
            const batch = [...allGroupMembers];
            let foundNew = false;
            for (const pid of batch) {
                const cp = allPersonParams[pid]; if (!cp) continue;
                const linked = new Set();
                if (cp.names.length > 0) {
                    const r = await client.query(`SELECT DISTINCT pnc.person_id FROM persone_name_connector pnc INNER JOIN persone_names pn ON pnc.name_id = pn.name_id INNER JOIN incident_persone_connector ipc_active ON pnc.person_id = ipc_active.person_id AND ipc_active.active = true WHERE pn.name_hesh = ANY($1) AND pnc.person_id != $2`, [cp.names, pid]);
                    r.rows.forEach(r => linked.add(r.person_id));
                }
                if (cp.phones.length > 0) {
                    const r = await client.query(`SELECT DISTINCT ppc.person_id FROM persone_phone_connector ppc INNER JOIN persone_phones pp ON ppc.phone_id = pp.phone_id INNER JOIN incident_persone_connector ipc_active ON ppc.person_id = ipc_active.person_id AND ipc_active.active = true WHERE pp.phone_hesh = ANY($1) AND ppc.person_id != $2`, [cp.phones, pid]);
                    r.rows.forEach(r => linked.add(r.person_id));
                }
                const tgh = [...cp.tg_usernames, ...cp.tg_ids];
                if (tgh.length > 0) {
                    const r = await client.query(`SELECT DISTINCT ptac.person_id FROM persone_telegramm_accaunt_connector ptac INNER JOIN persone_telegramm_accaunts pta ON ptac.telegramm_accaunt_id = pta.tg_id INNER JOIN incident_persone_connector ipc_active ON ptac.person_id = ipc_active.person_id AND ipc_active.active = true WHERE (pta.tg_username_hesh = ANY($1) OR pta.tg_id_hesh = ANY($1)) AND ptac.person_id != $2`, [tgh, pid]);
                    r.rows.forEach(r => linked.add(r.person_id));
                }
                for (const lid of linked) {
                    if (visited.has(lid)) continue;
                    if (!allPersonParams[lid]) { const lp = await this._getPersonParams(client, [lid]); allPersonParams[lid] = lp[lid]; }
                    if (!allPersonParams[lid]) continue;
                    const { count, details } = this._countSharedParams(cp, allPersonParams[lid]);
                    if (count >= MIN_SHARED_PARAMS_FOR_MERGE) {
                        visited.add(lid); allGroupMembers.add(lid); foundNew = true;
                        mergeDetails.push({ person_a: pid, person_b: lid, shared_count: count, shared_details: details.join(', '), merge_reason: `Совпадение по ${count} параметрам: ${details.join(', ')}` });
                        let added = false;
                        for (const g of groups) if (g.includes(pid)) { g.push(lid); added = true; break; }
                        if (!added) groups.push([pid, lid]);
                    }
                }
            }
            if (!foundNew) break;
        }
        return { linkedPersonIds: [...allGroupMembers], groups, mergeDetails };
    }

    // =========================
    // РОЛЕВОЙ АНАЛИЗ И RED FLAGS
    // =========================

    /**
     * Разделение инцидентов на "как администрация" и "как сотрудник"
     * + расчёт штрафов с коэффициентом роли
     */
    _analyzeIncidentsByRole(incidents) {
        const asAdministration = [];
        const asEmployee = [];
        let totalDeduction = 0;
        const deductions = [];

        for (const inc of incidents) {
            const reasonBall = inc.reason_ball || 0;
            const postBall = inc.post_ball || 0;
            const baseIncidentBall = reasonBall + postBall;
            const isAdminRole = inc.post_onPvz === true;
            const roleMultiplier = isAdminRole ? ROLE_MULTIPLIER.ADMINISTRATION : ROLE_MULTIPLIER.EMPLOYEE;

            // Расчёт множителей оценок
            const assessment = this._parseAssessment(inc.admin_assessment);
            const sevMult = this._getSeverityMultiplier(assessment.severity);
            const confMult = this._getConfidenceMultiplier(assessment.confidence);

            // Итоговый балл с учётом ВСЕХ множителей
            const finalBall = Math.round(baseIncidentBall * roleMultiplier * sevMult * confMult);

            const incidentInfo = {
                ...inc,
                base_ball: baseIncidentBall,
                role_multiplier: roleMultiplier,
                severity_multiplier: sevMult,
                confidence_multiplier: confMult,
                final_ball: finalBall,
                role: isAdminRole ? 'administration' : 'employee'
            };

            if (isAdminRole) asAdministration.push(incidentInfo);
            else asEmployee.push(incidentInfo);

            totalDeduction += finalBall;
            deductions.push({
                incident_id: inc.incident_id,
                date: inc.date_add,
                reason_name: inc.reason_name,
                post_name: inc.post_name,
                reason_ball: reasonBall,
                post_ball: postBall,
                role_multiplier: roleMultiplier,
                severity_multiplier: sevMult,
                confidence_multiplier: confMult,
                total_deduction: -finalBall,
                role: isAdminRole ? 'administration' : 'employee'
            });
        }

        return {
            asAdministration,
            asEmployee,
            totalDeduction,
            deductions,
            stats: {
                admin_count: asAdministration.length,
                employee_count: asEmployee.length,
                total_count: incidents.length
            }
        };
    }

    /**
     * Расчёт трендов: помесячная динамика инцидентов
     */
    _calculateTrends(incidents) {
        if (incidents.length === 0) return null;
        const byMonth = {};
        for (const inc of incidents) {
            const date = new Date(inc.date_add);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!byMonth[key]) byMonth[key] = { count: 0, admin: 0, employee: 0 };
            byMonth[key].count++;
            if (inc.post_onPvz) byMonth[key].admin++;
            else byMonth[key].employee++;
        }
        const months = Object.keys(byMonth).sort();
        const trend = months.length >= 2
            ? (byMonth[months[months.length - 1]].count > byMonth[months[0]].count ? 'up' : byMonth[months[months.length - 1]].count < byMonth[months[0]].count ? 'down' : 'stable')
            : 'insufficient_data';

        return {
            by_month: byMonth,
            months_count: months.length,
            trend,
            first_incident: incidents[incidents.length - 1]?.date_add,
            last_incident: incidents[0]?.date_add
        };
    }

    /**
     * Вычисление red flags (критических предупреждений)
     */
    _detectRedFlags(roleAnalysis, trends, pvzHistory) {
        const flags = [];
        const allIncidents = [...roleAnalysis.asAdministration, ...roleAnalysis.asEmployee];

        // 1. Руководитель с системными нарушениями
        if (roleAnalysis.stats.admin_count >= RED_FLAGS_THRESHOLDS.ADMIN_WITH_VIOLATIONS) {
            flags.push({
                code: 'ADMIN_WITH_VIOLATIONS',
                severity: 'critical',
                icon: 'fa-crown',
                color: '#dc2626',
                title: 'Руководитель с системными нарушениями',
                description: `Зафиксировано ${roleAnalysis.stats.admin_count} нарушений в роли администрации ПВЗ. Это указывает на системные проблемы управления.`
            });
        }

        // 2. Мигрирующий нарушитель
        const pvzCount = pvzHistory?.length || 0;
        if (pvzCount >= RED_FLAGS_THRESHOLDS.MIGRATING_VIOLATOR) {
            flags.push({
                code: 'MIGRATING_VIOLATOR',
                severity: 'high',
                icon: 'fa-route',
                color: '#ea580c',
                title: 'Мигрирующий нарушитель',
                description: `Нарушения зафиксированы на ${pvzCount} разных ПВЗ. Возможна систематическая смена мест работы.`
            });
        }

        // 3. Повторяющиеся причины (рецидив)
        const reasonCounts = {};
        for (const inc of allIncidents) {
            if (inc.reason_name) reasonCounts[inc.reason_name] = (reasonCounts[inc.reason_name] || 0) + 1;
        }
        for (const [reason, count] of Object.entries(reasonCounts)) {
            if (count >= RED_FLAGS_THRESHOLDS.RECIDIVISM) {
                flags.push({
                    code: 'RECIDIVISM',
                    severity: 'high',
                    icon: 'fa-repeat',
                    color: '#d97706',
                    title: 'Повторяющиеся нарушения',
                    description: `Причина «${reason}» повторялась ${count} раз. Это указывает на устойчивый паттерн поведения.`
                });
            }
        }

        // 4. Эскалация роли (сотрудник → администрация с продолжением нарушений)
        const adminDates = roleAnalysis.asAdministration.map(i => new Date(i.date_add).getTime()).filter(Boolean);
        const empDates = roleAnalysis.asEmployee.map(i => new Date(i.date_add).getTime()).filter(Boolean);
        if (adminDates.length > 0 && empDates.length > 0) {
            const earliestAdmin = Math.min(...adminDates);
            const hasEmpAfterAdmin = empDates.some(d => d >= earliestAdmin);
            if (hasEmpAfterAdmin) {
                flags.push({
                    code: 'ROLE_ESCALATION',
                    severity: 'medium',
                    icon: 'fa-arrow-trend-up',
                    color: '#ca8a04',
                    title: 'Эскалация роли с продолжением нарушений',
                    description: 'Человек начинал как сотрудник, получил руководящую должность, но продолжил нарушать.'
                });
            }
        }

        // 5. Критический риск
        if (allIncidents.length >= 5) {
            flags.push({
                code: 'HIGH_ACTIVITY',
                severity: 'medium',
                icon: 'fa-fire',
                color: '#dc2626',
                title: 'Высокая активность нарушений',
                description: `Зафиксировано ${allIncidents.length} подтверждённых инцидентов.`
            });
        }
        // 6. Подтверждённый критический инцидент
        const hasCriticalConfirmed = allIncidents.some(inc => {
            const a = this._parseAssessment(inc.admin_assessment);
            return a.severity === 'Критическая' && a.confidence === 'Высокая';
        });
        if (hasCriticalConfirmed) {
            flags.push({
                code: 'CRITICAL_CONFIRMED',
                severity: 'critical',
                icon: 'fa-circle-exclamation',
                color: '#dc2626',
                title: 'Подтверждённый критический инцидент',
                description: 'Зафиксирован инцидент с критической серьёзностью и высокой уверенностью модератора.'
            });
        }

        return flags;
    }

    // =========================
    // ОСНОВНЫЕ МЕТОДЫ ПОИСКА
    // =========================
    async searchPersone(client, email, string, options = {}, current_user = null) {
        const startTime = Date.now();
        let resultStatus = 'found';
        let resultSummary = {};
        try {
            const requestIp = options.request_ip || null;
            const deviceId = options.device_id || null;

            const { include_incidents = true, include_score_calculation = true, include_merge_details = true } = options;
            const classified = this._parseSearchString(string);
            const totalTokens = Object.values(classified).flat().length;
            if (totalTokens < MIN_SEARCH_PARAMS) throw apiError.BadRequest('MIN_PARAMS_REQUIRED', `Требуется минимум ${MIN_SEARCH_PARAMS} параметр. Получено: ${totalTokens}`);

            await statisticService.track('search:get', 'persone');

            const hasValid = classified.fio.length > 0 || classified.phone.length > 0 || classified.tg_username.length > 0 || classified.tg_id.length > 0 || classified.ambiguous.length > 0;
            if (!hasValid) {
                resultStatus = 'not_found';
                resultSummary = { exists: false, found_count: 0, total_groups: 0, reason: 'no_valid_tokens' };
                const response = this._formatResponse({ exists: false, found_count: 0, total_groups: 0, returned_groups: 0, truncated: false, search_params: [], graph_traversal: { direct_matches: 0, linked_matches: 0, total_after_traversal: 0, merge_events: 0, merge_threshold: MIN_SHARED_PARAMS_FOR_MERGE }, groups: [] }, startTime);
                await this._saveSearchHistory(client, { email, user_id: current_user?.user_id, search_type: 'person', search_params: { string, tokens_count: totalTokens }, result_status: resultStatus, result_summary: resultSummary, request_ip: requestIp, device_id: deviceId, execution_time_ms: Date.now() - startTime });
                return response;
            }

            if (!PROPERSONE) {
                const r = await this._searchPersoneBasic(client, classified);
                resultStatus = r.exists ? 'found' : 'not_found';
                resultSummary = { exists: r.exists, found_count: r.found_count, mode: 'basic' };
                const response = this._formatResponse(r, startTime);
                await this._saveSearchHistory(client, { email, user_id: current_user?.user_id, search_type: 'person', search_params: { string, tokens_count: totalTokens }, result_status: resultStatus, result_summary: resultSummary, request_ip: requestIp, device_id: deviceId, execution_time_ms: Date.now() - startTime });
                return response;
            }

            const r = await this._searchPersonePro(client, classified, { include_incidents, include_score_calculation, include_merge_details });
            resultStatus = r.exists ? 'found' : 'not_found';
            resultSummary = {
                exists: r.exists, found_count: r.found_count, total_groups: r.total_groups, returned_groups: r.returned_groups, truncated: r.truncated,
                risk_levels: [...new Set(r.groups?.map(g => g.risk_level) || [])],
                max_risk_level: r.groups?.length > 0 ? this._getMaxRiskLevel(r.groups) : null,
                has_detailed_results: r.groups?.length > 0, mode: 'pro'
            };
            const response = this._formatResponse(r, startTime);
            await this._saveSearchHistory(client, { email, user_id: current_user?.user_id, search_type: 'person', search_params: { string, tokens_count: totalTokens }, result_status: resultStatus, result_summary: resultSummary, request_ip: requestIp, device_id: deviceId, execution_time_ms: Date.now() - startTime });
            return response;
        } catch (error) {
            resultStatus = error.code?.startsWith('RATE_LIMIT') ? 'rate_limited' : 'error';
            resultSummary = { exists: false, error_code: error.code || 'UNKNOWN', error_message: error.message };
            await this._saveSearchHistory(client, { email, user_id: current_user?.user_id, search_type: 'person', search_params: { string }, result_status: resultStatus, result_summary: resultSummary, request_ip: options.request_ip, device_id: options.device_id, execution_time_ms: Date.now() - startTime });
            throw error;
        }
    }

    _formatResponse(data, startTime) {
        const executionTime = Date.now() - startTime;

        // Генерируем HMAC-подписи для групп/ПВЗ
        let signedData = data;
        if (data && data.groups && Array.isArray(data.groups)) {
            signedData = {
                ...data,
                groups: data.groups.map(group => ({
                    ...group,
                    _signature: hmacService.sign(hmacService.extractPersonSignData(group))
                }))
            };
        } else if (data && data.pvz_list && Array.isArray(data.pvz_list)) {
            signedData = {
                ...data,
                pvz_list: data.pvz_list.map(pvz => ({
                    ...pvz,
                    _signature: hmacService.sign(hmacService.extractPvzSignData(pvz))
                }))
            };
        }

        return {
            success: true,
            data: signedData,
            meta: {
                execution_time_ms: executionTime,
                timestamp: new Date().toISOString()
            }
        };
    }

    async _searchPersoneBasic(client, classified) {
        const { orConditions, params } = await this._buildPersonSearchConditions(classified);
        if (orConditions.length === 0) return { exists: false, found_count: 0 };
        const r = await client.query(`SELECT COUNT(DISTINCT ip.person_id) as count FROM incident_persones ip INNER JOIN incident_persone_connector ipc_active ON ip.person_id = ipc_active.person_id AND ipc_active.active = true WHERE ${orConditions.join(' OR ')}`, params);
        const count = parseInt(r.rows[0].count);
        return { exists: count > 0, found_count: count };
    }

    async _searchPersonePro(client, classified, options) {
        const resolvedStatusId = await this._getResolvedStatusId(client);
        const { orConditions, params, searchParams } = await this._buildPersonSearchConditions(classified);
        if (orConditions.length === 0) {
            return { exists: false, found_count: 0, total_groups: 0, returned_groups: 0, truncated: false, search_params: searchParams, graph_traversal: { direct_matches: 0, linked_matches: 0, total_after_traversal: 0, merge_events: 0, merge_threshold: MIN_SHARED_PARAMS_FOR_MERGE }, groups: [] };
        }
        const r = await client.query(`SELECT DISTINCT ip.person_id FROM incident_persones ip INNER JOIN incident_persone_connector ipc_active ON ip.person_id = ipc_active.person_id AND ipc_active.active = true WHERE ${orConditions.join(' OR ')}`, params);
        if (r.rowCount === 0) {
            return { exists: false, found_count: 0, total_groups: 0, returned_groups: 0, truncated: false, search_params: searchParams, graph_traversal: { direct_matches: 0, linked_matches: 0, total_after_traversal: 0, merge_events: 0, merge_threshold: MIN_SHARED_PARAMS_FOR_MERGE }, groups: [] };
        }
        const allPersonIds = r.rows.map(r => r.person_id);
        const scoresMap = await this._calculateMatchScores(client, allPersonIds, classified);

        let linkedPersonIds = allPersonIds, groups = [], mergeDetails = [];
        try {
            const gr = await this._findLinkedPersons(client, allPersonIds);
            linkedPersonIds = gr.linkedPersonIds; groups = gr.groups; mergeDetails = gr.mergeDetails;
        } catch (err) { console.error('[Search] Graph error:', err.message); }

        const allFoundPersonIds = [...new Set([...allPersonIds, ...linkedPersonIds])];
        const canGetFull = !DISABLE_MASKING;
        const [namesMap, phonesMap, tgMap, incidentsMap, pvzHistoryMap] = await Promise.all([
            this._getNamesByPersonIds(client, allFoundPersonIds, canGetFull),
            this._getPhonesByPersonIds(client, allFoundPersonIds, canGetFull),
            this._getTgByPersonIds(client, allFoundPersonIds, canGetFull),
            this._getIncidentsByPersonIds(client, allFoundPersonIds, resolvedStatusId),
            this._getPersonPvzHistory(client, allFoundPersonIds, resolvedStatusId)
        ]);

        const outputGroups = await this._buildOutputGroups(client, allFoundPersonIds, groups, mergeDetails, scoresMap, namesMap, phonesMap, tgMap, incidentsMap, pvzHistoryMap, options);
        outputGroups.sort((a, b) => b.group_score - a.group_score);
        const topGroups = outputGroups.slice(0, MAX_GROUPS_IN_RESPONSE);
        const truncated = outputGroups.length > MAX_GROUPS_IN_RESPONSE;

        return {
            exists: true, found_count: allFoundPersonIds.length,
            total_groups: outputGroups.length, returned_groups: topGroups.length, truncated,
            search_params: searchParams,
            graph_traversal: { direct_matches: allPersonIds.length, linked_matches: linkedPersonIds.length - allPersonIds.length, total_after_traversal: allFoundPersonIds.length, merge_events: mergeDetails.length, merge_threshold: MIN_SHARED_PARAMS_FOR_MERGE },
            groups: topGroups
        };
    }

    async _buildOutputGroups(client, allPersonIds, groups, mergeDetails, scoresMap, namesMap, phonesMap, tgMap, incidentsMap, pvzHistoryMap, options) {
        const personToGroup = new Map();
        groups.forEach((g, idx) => g.forEach(pid => personToGroup.set(pid, idx)));
        const soloGroups = [];
        for (const pid of allPersonIds) if (!personToGroup.has(pid)) soloGroups.push([pid]);
        const allGroups = [...groups, ...soloGroups];
        const outputGroups = [];
        const shouldMask = !DISABLE_MASKING;

        for (let gIdx = 0; gIdx < allGroups.length; gIdx++) {
            const group = allGroups[gIdx];
            const groupScore = group.reduce((s, pid) => s + (scoresMap.get(pid)?.score || 0), 0);

            const allIncidents = [];
            const seenIds = new Set();
            const positionsMap = new Map();
            const birthDatesSet = new Set();

            for (const pid of group) {
                const incidents = incidentsMap.get(pid) || [];
                for (const inc of incidents) {
                    if (!seenIds.has(inc.incident_id)) {
                        seenIds.add(inc.incident_id);
                        allIncidents.push({ ...inc, person_id: pid });
                    }
                    if (inc.post_id && !positionsMap.has(inc.post_id)) positionsMap.set(inc.post_id, { post_id: inc.post_id, onPvz: inc.post_onPvz });
                    if (inc.birth_date) { const d = this._normalizeDate(inc.birth_date); if (d) birthDatesSet.add(d); }
                }
            }

            // Ролевой анализ
            const roleAnalysis = this._analyzeIncidentsByRole(allIncidents);
            const trends = this._calculateTrends(allIncidents);

            // Cross-reference PVZ
            const allPvzHistory = [];
            for (const pid of group) {
                const pvzs = pvzHistoryMap.get(pid) || [];
                for (const pvz of pvzs) allPvzHistory.push({ ...pvz, person_id: pid });
            }

            // Red flags
            const redFlags = this._detectRedFlags(roleAnalysis, trends, allPvzHistory);

            const positions = [];
            for (const [postId, pos] of positionsMap) {
                positions.push({ post_id: postId, post_name: pos.post_name || 'Неизвестная должность', onPvz: pos.onPvz === true, role: pos.onPvz ? 'administration' : 'employee' });
            }

            const rawBirthDates = [...birthDatesSet];
            const birthDates = shouldMask ? rawBirthDates.map(d => maskBirthDate(d) || d) : rawBirthDates;

            const totalViolationBalls = roleAnalysis.totalDeduction;
            const reliabilityScore = Math.max(0, BASE_RELIABILITY_SCORE - totalViolationBalls);
            const riskLevel = this._getRiskLevel(reliabilityScore);

            // Описание с учётом ролей
            let scoreDescription = `Анализ группы (${group.length} шт.). `;
            if (group.length > 1) scoreDescription += `Персоны объединены по совпадающим параметрам. `;
            scoreDescription += `Match score: ${groupScore}. `;
            if (allIncidents.length === 0) {
                scoreDescription += `Подтверждённых инцидентов не найдено. Балл надёжности: ${BASE_RELIABILITY_SCORE}. Уровень риска: ${riskLevel}.`;
            } else {
                scoreDescription += `Найдено инцидентов: ${allIncidents.length}. `;
                if (roleAnalysis.stats.admin_count > 0) scoreDescription += `Как администрация ПВЗ: ${roleAnalysis.stats.admin_count}. `;
                if (roleAnalysis.stats.employee_count > 0) scoreDescription += `Как сотрудник: ${roleAnalysis.stats.employee_count}. `;
                scoreDescription += `Сумма штрафов (с учётом роли): -${totalViolationBalls} баллов. Балл надёжности: ${reliabilityScore}. Уровень риска: ${riskLevel}.`;
            }

            const persons = group.map(pid => {
                const s = scoresMap.get(pid) || { score: 0, matchedParams: [] };
                const names = namesMap.get(pid) || [];
                const phones = phonesMap.get(pid) || [];
                const tgAccounts = tgMap.get(pid) || [];
                return {
                    person_id: pid, match_score: s.score, matched_params: s.matchedParams,
                    data: {
                        names: shouldMask ? names.map(n => ({ ...n, name: maskFIO(n.name) })) : names,
                        phones: shouldMask ? phones.map(p => ({ ...p, phone: maskPhone(p.phone) })) : phones,
                        tg_accounts: shouldMask ? tgAccounts.map(t => ({ ...t, username: maskTgName(t.username), tg_id: maskTgId(t.tg_id) })) : tgAccounts
                    }
                };
            });

            // Агрегация экспертных оценок
            const assessmentSummary = this._aggregateAssessments(allIncidents);

            outputGroups.push({
                group_id: gIdx + 1, person_ids: group,
                group_score: groupScore, reliability_score: reliabilityScore, risk_level: riskLevel,
                score_description: scoreDescription,
                admin_assessment_summary: assessmentSummary,
                score_calculation: {
                    base_score: BASE_RELIABILITY_SCORE,
                    deductions: roleAnalysis.deductions,
                    total_deductions: -totalViolationBalls,
                    final_score: reliabilityScore,
                    role_multiplier_applied: true
                },
                stats: {
                    total_incidents: allIncidents.length,
                    total_violation_balls: totalViolationBalls,
                    persons_count: group.length,
                    last_incident_date: allIncidents.length > 0 ? allIncidents[0].date_add : null,
                    as_administration: roleAnalysis.stats.admin_count,
                    as_employee: roleAnalysis.stats.employee_count
                },
                role_analysis: {
                    as_administration: roleAnalysis.asAdministration.map(i => ({ incident_id: i.incident_id, date: i.date_add, reason_name: i.reason_name, post_name: i.post_name, base_ball: i.base_ball, role_multiplier: i.role_multiplier, final_ball: i.final_ball })),
                    as_employee: roleAnalysis.asEmployee.map(i => ({ incident_id: i.incident_id, date: i.date_add, reason_name: i.reason_name, post_name: i.post_name, base_ball: i.base_ball, role_multiplier: i.role_multiplier, final_ball: i.final_ball })),
                    stats: roleAnalysis.stats
                },
                trends: trends,
                red_flags: redFlags,
                pvz_history: allPvzHistory.map(p => ({ pvz_id: p.pvz_id, address: p.address, type_id: p.type_id, incident_count: p.incident_count, last_incident_date: p.last_incident_date })),
                positions: positions,
                birth_dates: birthDates,
                persons: persons,
                incidents: options.include_incidents ? allIncidents.map(i => ({ incident_id: i.incident_id, date_add: i.date_add, reason_name: i.reason_name, post_name: i.post_name, reason_ball: i.reason_ball, post_ball: i.post_ball, total_ball: i.reason_ball + i.post_ball, role: i.post_onPvz ? 'administration' : 'employee', admin_assessment: i.admin_assessment })) : undefined,
                merge_details: options.include_merge_details ? mergeDetails.filter(md => group.includes(md.person_a) && group.includes(md.person_b)) : undefined
            });
        }
        return outputGroups;
    }

    // =========================
    // ПОИСК ПВЗ
    // =========================
    async searchPVZ(client, email, city, street, home, options = {}, current_user = null) {
        const startTime = Date.now();
        let resultStatus = 'found';
        let resultSummary = {};
        try {
            const requestIp = options.request_ip || null;
            const deviceId = options.device_id || null;
            if (!city || !street || !home) throw apiError.BadRequest('INVALID_INPUT', 'Все параметры (city, street, home) обязательны');
            await statisticService.track('search:get', 'pvz');
            const resolvedStatusId = await this._getResolvedStatusId(client);
            // Добавили p.is_verified в SELECT
            const query = `SELECT p.pvz_id, p.type_id, p.addr_city, p.addr_street, p.addr_home, p.is_verified FROM incident_pvz p WHERE p.addr_city ILIKE $1 AND p.addr_street ILIKE $2 AND p.addr_home ILIKE $3 AND EXISTS (SELECT 1 FROM incident_pvz_connector ipc WHERE ipc.pvz_id = p.pvz_id AND ipc.active = true)`;
            const params = [`%${city.trim().toLowerCase()}%`, `%${street.trim().toLowerCase()}%`, `%${home.trim().toLowerCase()}%`];
            const r = await client.query(query, params);
            if (r.rowCount === 0) {
                resultStatus = 'not_found';
                resultSummary = { exists: false, found_count: 0, address: `${city}, ${street}, ${home}` };
                const data = PROPVZ ? { exists: false, found_count: 0, pvz_list: [] } : { exists: false, found_count: 0 };
                const response = this._formatResponse(data, startTime);
                await this._saveSearchHistory(client, { email, user_id: current_user?.user_id, search_type: 'pvz', search_params: { city, street, home }, result_status: resultStatus, result_summary: resultSummary, request_ip: requestIp, device_id: deviceId, execution_time_ms: Date.now() - startTime });
                return response;
            }
            if (!PROPVZ) {
                resultStatus = 'found';
                resultSummary = { exists: true, found_count: r.rowCount, mode: 'basic' };
                const response = this._formatResponse({ exists: true, found_count: r.rowCount }, startTime);
                await this._saveSearchHistory(client, { email, user_id: current_user?.user_id, search_type: 'pvz', search_params: { city, street, home }, result_status: resultStatus, result_summary: resultSummary, request_ip: requestIp, device_id: deviceId, execution_time_ms: Date.now() - startTime });
                return response;
            }
            const pvzList = await this._processPvzList(client, r.rows, resolvedStatusId);
            resultStatus = 'found';
            resultSummary = {
                exists: true, found_count: pvzList.length,
                risk_levels: [...new Set(pvzList.map(p => p.risk_level) || [])],
                max_risk_level: pvzList.length > 0 ? this._getMaxRiskLevel(pvzList) : null,
                has_detailed_results: true, mode: 'pro'
            };
            const response = this._formatResponse({ exists: true, found_count: pvzList.length, pvz_list: pvzList }, startTime);
            await this._saveSearchHistory(client, { email, user_id: current_user?.user_id, search_type: 'pvz', search_params: { city, street, home }, result_status: resultStatus, result_summary: resultSummary, request_ip: requestIp, device_id: deviceId, execution_time_ms: Date.now() - startTime });
            return response;
        } catch (error) {
            resultStatus = error.code?.startsWith('RATE_LIMIT') ? 'rate_limited' : 'error';
            resultSummary = { exists: false, error_code: error.code || 'UNKNOWN', error_message: error.message };
            await this._saveSearchHistory(client, { email, user_id: current_user?.user_id, search_type: 'pvz', search_params: { city, street, home }, result_status: resultStatus, result_summary: resultSummary, request_ip: options.request_ip, device_id: options.device_id, execution_time_ms: Date.now() - startTime });
            throw error;
        }
    }

    async _saveSearchHistory(client, data) {
        try { await searchHistoryService.addToHistory(client, data); } catch (e) { console.error('[SearchService] History save error:', e.message); }
    }

    _getMaxRiskLevel(items) {
        const order = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        let max = 'low', maxO = 0;
        for (const it of items) { const l = it.risk_level || 'low'; const o = order[l] || 0; if (o > maxO) { maxO = o; max = l; } }
        return max;
    }

    async _processPvzList(client, rows, resolvedStatusId) {
        const pvzIds = rows.map(r => r.pvz_id);
        const personnelMap = await this._getPvzPersonnelHistory(client, pvzIds, resolvedStatusId);

        return Promise.all(rows.map(async (row) => {
            const pvzId = row.pvz_id;
            const typeId = row.type_id;
            const typeName = await dictionaryService.getElementNameById(client, typeId);
            const incidentsQuery = `
                SELECT
                    imf.incident_id,
                    imf.add_reason_id,
                    imf.date_add,
                    imf.admin_assessment,
                    reason_dict.addon_data AS reason_addon_data,
                    reason_dict.name AS reason_name_raw,
                    reason_dict.ball AS reason_ball
                FROM incident_pvz_connector ipc
                INNER JOIN incidents_main_info imf ON ipc.incident_id = imf.incident_id
                LEFT JOIN incidents_data_dictionary reason_dict ON imf.add_reason_id = reason_dict.element_id
                WHERE ipc.pvz_id = $1
                  AND ipc.active = true
                  AND imf.condition_id = $2
                  AND imf.deleted = false
                ORDER BY imf.date_add DESC
            `;
            const incRes = await client.query(incidentsQuery, [pvzId, resolvedStatusId]);
            const incidents = incRes.rows;

            const typeBall = await this._getElementBall(client, typeId);
            let totalViolationBalls = typeBall;
            const violationDetails = [];
            const scoreDeductions = [];
            const typeDisplay = this._capitalizeWords(typeName) || 'Неизвестный тип';
            scoreDeductions.push({ type: 'pvz_type', description: `Тип ПВЗ: ${typeDisplay}`, deduction: -typeBall });

            // Распределение нарушений по вине (admin vs employee)
            let adminFaultCount = 0, employeeFaultCount = 0;

            for (const inc of incidents) {
                let rAddon = inc.reason_addon_data;
                if (typeof rAddon === 'string') try { rAddon = JSON.parse(rAddon); } catch { rAddon = {}; }

                const reasonBall = parseInt(inc.reason_ball) || 0;
                const reasonOnPvz = rAddon?.onPvz === true;
                const reasonName = inc.reason_name_raw || 'Неизвестная причина';

                // Множители оценок
                const assessment = this._parseAssessment(inc.admin_assessment);
                const sevMult = this._getSeverityMultiplier(assessment.severity);
                const confMult = this._getConfidenceMultiplier(assessment.confidence);
                const finalReasonBall = Math.round(reasonBall * sevMult * confMult);

                if (reasonOnPvz) adminFaultCount++;
                else employeeFaultCount++;

                totalViolationBalls += finalReasonBall; // Было: += reasonBall
                violationDetails.push({
                    incident_id: inc.incident_id,
                    date: inc.date_add,
                    reason: reasonName,
                    reason_ball: reasonBall,
                    final_ball: finalReasonBall,
                    severity_multiplier: sevMult,
                    confidence_multiplier: confMult,
                    total_ball: finalReasonBall,
                    is_admin_fault: reasonOnPvz,
                    fault_role: reasonOnPvz ? 'administration' : 'employee'
                });
                scoreDeductions.push({
                    type: 'incident',
                    incident_id: inc.incident_id,
                    date: inc.date_add,
                    reason: reasonName,
                    deduction: -finalReasonBall,
                    severity_multiplier: sevMult,
                    confidence_multiplier: confMult
                });
            }

            const reliabilityScore = Math.max(0, BASE_RELIABILITY_SCORE - totalViolationBalls);
            const riskLevel = this._getRiskLevel(reliabilityScore);

            const cityD = this._capitalizeWords(row.addr_city) || '';
            const streetD = this._capitalizeWords(row.addr_street) || '';
            const homeD = row.addr_home || '';
            const address = `г. ${cityD}, ул. ${streetD}, д. ${homeD}`;

            // Профиль риска администрации
            const totalCount = incidents.length;
            const adminPercent = totalCount > 0 ? Math.round((adminFaultCount / totalCount) * 100) : 0;
            const employeePercent = totalCount > 0 ? Math.round((employeeFaultCount / totalCount) * 100) : 0;

            // Red flags для ПВЗ
            const pvzRedFlags = [];
            if (adminPercent >= 50 && totalCount >= 3) {
                pvzRedFlags.push({
                    code: 'TOXIC_ADMINISTRATION',
                    severity: 'critical',
                    icon: 'fa-crown',
                    color: '#dc2626',
                    title: 'Токсичная администрация',
                    description: `${adminPercent}% нарушений по вине руководителей. Системные проблемы управления.`
                });
            }
            // Red flag: Подтверждённый критический инцидент на ПВЗ
            const hasCriticalConfirmedPvz = incidents.some(inc => {
                const a = this._parseAssessment(inc.admin_assessment);
                return a.severity === 'Критическая' && a.confidence === 'Высокая';
            });
            if (hasCriticalConfirmedPvz) {
                pvzRedFlags.push({
                    code: 'PVZ_CRITICAL_CONFIRMED',
                    severity: 'critical',
                    icon: 'fa-circle-exclamation',
                    color: '#dc2626',
                    title: 'Подтверждённый критический инцидент',
                    description: 'На этом ПВЗ зафиксирован инцидент с критической серьёзностью и высокой уверенностью модератора.'
                });
            }
            // Повторяющиеся причины на этом ПВЗ
            const pvzReasonCounts = {};
            for (const v of violationDetails) if (v.reason) pvzReasonCounts[v.reason] = (pvzReasonCounts[v.reason] || 0) + 1;
            for (const [reason, count] of Object.entries(pvzReasonCounts)) {
                if (count >= 3) {
                    pvzRedFlags.push({
                        code: 'RECURRING_ISSUES',
                        severity: 'high',
                        icon: 'fa-repeat',
                        color: '#ea580c',
                        title: 'Системная проблема',
                        description: `Причина «${reason}» повторялась ${count} раз на этом ПВЗ.`
                    });
                }
            }

            let scoreDescription = `ПВЗ: ${address}. Тип: ${typeDisplay}. Базовый балл: ${BASE_RELIABILITY_SCORE}. `;
            if (typeBall > 0) scoreDescription += `Штраф за тип ПВЗ: -${typeBall}. `;
            if (incidents.length > 0) {
                scoreDescription += `Подтверждённых инцидентов: ${incidents.length}. `;
                scoreDescription += `Распределение: администрация ${adminPercent}%, сотрудники ${employeePercent}%. `;
            }
            scoreDescription += `Балл надёжности: ${reliabilityScore}. Уровень риска: ${riskLevel}.`;

            const personnel = personnelMap.get(pvzId) || [];

            return {
                pvz_id: pvzId,
                address, type: typeDisplay,
                is_verified: row.is_verified || false,
                reliability_score: reliabilityScore,
                risk_level: riskLevel,
                admin_assessment_summary: this._aggregateAssessments(incidents),
                score_calculation: { base_score: BASE_RELIABILITY_SCORE, deductions: scoreDeductions, total_deductions: -totalViolationBalls, final_score: reliabilityScore },
                score_description: scoreDescription,
                stats: {
                    total_incidents: incidents.length,
                    total_violation_balls: totalViolationBalls,
                    type_ball: typeBall,
                    last_incident_date: incidents.length > 0 ? incidents[0].date_add : null,
                    admin_fault_count: adminFaultCount,
                    employee_fault_count: employeeFaultCount,
                    admin_fault_percent: adminPercent,
                    employee_fault_percent: employeePercent
                },
                fault_distribution: {
                    administration: { count: adminFaultCount, percent: adminPercent, label: 'По вине администрации' },
                    employee: { count: employeeFaultCount, percent: employeePercent, label: 'По вине сотрудников' }
                },
                personnel: personnel.map(p => ({
                    person_id: p.person_id,
                    post_name: p.post_name,
                    role: p.role,
                    incident_count: p.incident_count,
                    last_incident_date: p.last_incident_date
                })),
                red_flags: pvzRedFlags,
                violations: violationDetails
            };
        }));
    }
}

module.exports = new searchService();