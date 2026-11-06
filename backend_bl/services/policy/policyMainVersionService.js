// const apiError = require('../exceptions/apiError');
// const tokenService = require('./systemServices/tokenService');
// const settingsService = require('./settingsService');
// const { tgNotificationSend } = require('../grpc/handlers/notificationSendHandler');
// const { generatePolicyPDF } = require('./pdf/policyPdfService');
// const queryService = require('./systemServices/queryService');
// const notificationsService = require('./notificationsService');
// const { getUserStatuses } = require('./userService');
// const logService = require('./logService');

class policyMainVersionService {

    async getPolicy(client, policyType, current_user) {
        let exit;
        if (policyType === "all") {
            // При запросе всех политик исключаем поле text для уменьшения объема данных
            exit = await client.query('SELECT id, type, name, version, created_at, updated_at FROM policy ORDER BY id DESC');
        } else {
            // При запросе конкретной политики получаем все поля, включая text
            exit = await client.query('SELECT * FROM policy WHERE type = $1', [policyType]);
            if (exit.rowCount < 1) {
                return 'err';
            }
        }


        // Проверяем, является ли пользователь разработчиком
        const isDeveloper = current_user && ['DEVELOPER', 'TOP_LEVEL_DEVELOPER'].includes(current_user.status);

        return exit.rows.map(row => {
            // Базовый объект с общими полями для всех пользователей
            const basePolicy = {
                id: row.id,
                type: row.type,
                name: row.name,
                version: row.version,
                // can_download: row.can_download,
                // very_important: row.very_important,
                // requires_acknowledgment: row.requires_acknowledgment,
                // acknowledgment_text: row.acknowledgment_text,
                // re_acknowledge_after_days: row.re_acknowledge_after_days,
                updated_at: row.updated_at,
            };

            // Все пользователи получают текст при запросе конкретной политики
            if (policyType !== "all" && row.text) {
                basePolicy.text = row.text;
            }

            // Только разработчики получают доступ к дате создания
            if (isDeveloper) {
                return {
                    ...basePolicy,
                    created_at: row.created_at, // Только для разработчиков
                };
            } else {
                // Обычные пользователи не получают created_at
                return basePolicy;
            }
        });
    }
}

module.exports = new policyMainVersionService();