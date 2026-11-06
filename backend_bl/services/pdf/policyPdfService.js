// // policyPDFService.js
const { generatePDF } = require('./pdfService');

/**
 * Генерация PDF для политик
 * @param {string} htmlContent - HTML-содержимое политики
 * @param {Object} options
 * @param {string} options.version - Версия политики
 * @param {string} options.title - Заголовок документа
 * @param {string} [options.company='BLPVZ'] - Организация
 * @param {string} [options.link=`${process.env.REACT_APP_API_URL}/policy`] - Ссылка на онлайн-версию
 * @returns {Promise<Buffer>}
 */
async function generatePolicyPDF(htmlContent, { version, title, link = `${process.env.REACT_APP_API_URL}/policy` }) {
    const policyContent = `
        <div class="policy-content">
        ${htmlContent}
        </div>
    `;

    return generatePDF({
        title,
        docType: 'Политика',
        link,
        content: policyContent,
        metaFields: {
            'Версия': version
        },
        // 🟡 Фраза под QR-кодом — своя для политик
        qrCaption: 'Сканируйте для перехода по ссылке',

        //  Фраза внизу — своя
        footerNote: `
            Документ сгенерирован автоматически по запросу пользователя. Документ действителен при условии неизменности содержания.<br> Документ имеет силу только до обновления версии политики, актуальная версия доступна на сайте.
        `
    });
}

module.exports = { generatePolicyPDF };