// const apiError = require('../exceptions/apiError');
// const tokenService = require('./systemServices/tokenService');
// const settingsService = require('./settingsService');
// const { tgNotificationSend } = require('../grpc/handlers/notificationSendHandler');
// const queryService = require('./systemServices/queryService');
// const notificationsService = require('./notificationsService');
// const { getUserStatuses } = require('./userService');
// const logService = require('./logService');

const { generatePolicyPDF } = require("../pdf/policyPdfService");

class policyPdfService {

    async getPDFPolicy(client, policyType, current_user) {
        const result = await client.query('SELECT * FROM policy WHERE type = $1', [policyType]);
        if (result.rowCount === 0) {
            //                 this._createLogger('PL009', null, null, {
            //                     subsegment: 'INDIRECT_ACTIONS',
            //                     type_of_action: 'GET'
            //                 }).inaccessible(`Запрос PDF несуществующей политики "${policyType}"`);
            return 'err';
        }

        const policy = result.rows[0];
        const pdfBuffer = await generatePolicyPDF(policy.text, {
            version: policy.version,
            title: policy.name,
            link: process.env.SITE_HOST + "/policy/" + policy.type
        });

        //             this._createLogger('PL010', null, policy.id, {
        //                 subsegment: 'DIRECT_ACTIONS',
        //                 type_of_action: 'GET'
        //             }).action(`Сгенерирован и получен PDF для политики "${policyType}"`);

        return pdfBuffer;
    }
}

module.exports = new policyPdfService();