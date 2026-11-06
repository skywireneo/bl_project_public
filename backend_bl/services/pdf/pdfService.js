// pdfService.js
const wkhtmltopdf = require('wkhtmltopdf');
const dayjs = require('dayjs');
const QRCode = require('qrcode');
const pgdb = require('../../pgdb');
const settingsService = require('../systemSettings/settingsService');
// const settingsService = require('../settingsService');

async function generatePDF({
    title,
    docType,
    link = process.env.REACT_APP_API_URL,
    content,
    metaFields = {},
    qrCaption = 'Сканируйте для проверки подлинности',
    footerNote = 'Подлинность документа подтверждается на <strong>blpvz.ru/verify</strong>.<br>Любые изменения контента аннулируют его действительность.'
}) {
    const date = dayjs().format('DD.MM.YYYY');
    const qrBase64 = await QRCode.toDataURL(link);

    const fullMeta = {
        'Дата генерации документа': date,
        ...metaFields,
        'Актуальная версия': link
    };

    const client = await pgdb.connect();

    const metaHtml = Object.entries(fullMeta)
        .map(([key, value]) => `
      <div class="meta-item">
        <span class="meta-label">${key}:</span>
        <span class="meta-value">${value}</span>
      </div>
    `)
        .join('');

    const fullHtml = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <style>
            @page {
                margin: 15mm 12mm;
                @bottom-center {
                    content: "Страница " counter(page) " из " counter(pages);
                    font-size: 9pt;
                    color: #6c757d;
                }
            }
            body {
                font-family: 'Segoe UI', Arial, sans-serif;
                margin: 0;
                padding: 0;
                color: #333;
                line-height: 1.5;
                background: white;
            }

            .container {
                max-width: 210mm;
                margin: 0 auto;
                padding: 15px 20px;
                box-sizing: border-box;
            }

            .header-bar {
                background: #002244;
                color: white;
                padding: 10px 20px;
                border-radius: 8px 8px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 13px;
                font-weight: 500;
                margin: -15px -20px 20px -20px;
            }

            .title {
                text-align: center;
                font-size: 22px;
                font-weight: 600;
                color: #003366;
                margin: 0 0 15px;
                padding-bottom: 8px;
            }

            .title-underline {
                width: 100%;
                height: 2px;
                background: #007BFF;
                margin: 0 0 20px 0;
            }

            .meta-container {
                display: flex;
                gap: 20px;
                margin: 0 0 15px 0;
                align-items: flex-start;
            }
            .meta-item {
                flex: 1 1 300px;
                margin-bottom: 6px;
            }
            .meta-label {
                font-weight: 600;
                color: #003366;
                font-size: 13px;
            }
            .meta-value {
                display: block;
                margin-top: 3px;
                font-size: 13px;
                color: #444;
                line-height: 1.4;
            }

            .qr-container {
                flex: 0 0 auto;
                margin-left: auto;
            }
            .qr-code {
                background: white;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                box-shadow: 0 1px 4px rgba(0,0,0,0.1);
            }
            .qr-code img {
                width: 150px;
                height: 150px;
            }
            .qr-code-caption {
                font-size: 11px;
                color: #6c757d;
                margin-top: 5px;
                text-align: center;
                width: 150px;
            }

            .direct-link {
                font-size: 12px;
                color: #007BFF;
                word-break: break-all;
                margin: 8px 0 15px 0;
                text-align: left;
            }

            .section-divider {
                width: 100%;
                height: 1px;
                background: #ccc;
                border: none;
                margin: 20px 0;
            }

            .content {
                margin-top: 15px;
                font-size: 13px;
                color: #333;
            }
            .content h2, .content h3 {
                color: #003366;
                margin-top: 1em;
            }
            .content p, .content ul, .content ol {
                margin-bottom: 0.7em;
            }

            .footer-note {
                margin-top: 30px;
                font-size: 11px;
                color: #6c757d;
                text-align: center;
                border-top: 1px dashed #ccc;
                padding-top: 8px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header-bar">
                <div>${await settingsService.selectSetting(client, "pdf_title_company")}</div>
                <div>${docType}</div>
            </div>

            <h1 class="title">${title}</h1>
            <div class="title-underline"></div>

            <div class="meta-container">
                <div>
                    ${metaHtml}
                </div>
                <div class="qr-container">
                    <div class="qr-code">
                        <img src="${qrBase64}" alt="QR Code" />
                    </div>
                    <div class="qr-code-caption">${qrCaption}</div>
                </div>
            </div>
            <hr class="section-divider">

            <div class="content">
                ${content}
            </div>

            <div class="footer-note">${footerNote}</div>
        </div>
    </body>
    </html>
  `;

    return new Promise((resolve, reject) => {
        const chunks = [];
        const stream = wkhtmltopdf(fullHtml, {
            pageSize: 'A4',
            printMediaType: true,
            marginTop: 10,
            marginBottom: 15,
            marginLeft: 12,
            marginRight: 12,
            encoding: 'UTF-8'
        });

        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}

module.exports = { generatePDF };