// // selfCheckPDFService.js
// const { generatePDF } = require('./pdfService');
// const dayjs = require('dayjs');

// /**
//  * Генерация PDF для результатов самопроверки
//  * @param {Object} data - Данные из self_check
//  * @param {string} data.inBL - Находится ли пользователь в чёрном списке
//  * @param {Object} data.input_data - Введённые пользователем данные
//  * @param {number} data.collaborationScore - Оценка сотрудничества
//  * @param {string} data.collaborationType - Тип (warning, danger и т.д.)
//  * @param {string} data.collaborationMessage - Сообщение (например, "Опасная зона")
//  * @param {string} data.explanation - Подробное объяснение расчёта
//  * @param {string} data.checkDate - Дата проведения самопроверки (ISO строка или Date)
//  * @param {string} link - Ссылка для QR-кода и проверки
//  * @returns {Promise<Buffer>} PDF в виде буфера
//  */
// async function generateSelfCheckPDF({
//   inBL,
//   input_data,
//   collaborationScore,
//   collaborationType,
//   collaborationMessage,
//   explanation,
//   checkDate, // Добавлено: дата из БД
//   link = `${process.env.SITE_HOST}/searchMe/results/id`
// }) {
//   // Форматируем дату: например, "15.04.2025 14:30"
//   const formattedDate = checkDate;

//   // Определяем статус и цветовую метку
//   const isBlacklisted = !!inBL;
//   const statusLabel = isBlacklisted ? 'В ЧЁРНОМ СПИСКЕ' : 'НЕ В ЧЁРНОМ СПИСКЕ';
//   const statusColor = isBlacklisted ? '#dc3545' : '#28a745'; // красный / зелёный
//   const statusIcon = isBlacklisted ? '' : '';

//   // Карта типов для отображения цветов
//   const typeStyles = {
//     warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404', label: 'ПРЕДУПРЕЖДЕНИЕ' },
//     danger: { bg: '#f8d7da', border: '#f1b6ba', text: '#721c24', label: 'ОПАСНО' },
//     safe: { bg: '#d4edda', border: '#c3e6cb', text: '#155724', label: 'ОТНОСИТЕЛЬНО БЕЗОПАСНО' },
//     info: { bg: '#d1ecf1', border: '#bae6fd', text: '#0c5460', label: 'ИНФО' }
//   };

//   const { bg, border, text, label: typeLabel } = typeStyles[collaborationType] || typeStyles.info;

//   // Формируем HTML-содержимое
//   let content = `
//     <div class="self-check-content">
//       <!-- Дата проверки -->
//       <div style="font-size: 13px; color: #6c757d; margin-bottom: 15px; text-align: right;">
//         Дата проверки по МСК: <strong>${formattedDate}</strong>
//       </div>

//       <!-- Статус в ЧС -->
//       <div style="text-align: center; margin-bottom: 20px;">
//         <div style="
//           display: inline-block;
//           padding: 8px 16px;
//           font-size: 16px;
//           font-weight: bold;
//           color: white;
//           background: ${statusColor};
//           border-radius: 6px;
//           box-shadow: 0 2px 4px rgba(0,0,0,0.2);
//         ">
//           ${statusIcon} ${statusLabel}
//         </div>
//       </div>

//       <!-- Введённые данные -->
//       <h2>Введённые пользователем данные для поиска</h2>
//       <ul>
//         <li><strong>ФИО:</strong> ${input_data.fio || '—'}</li>
//         <li><strong>Telegram ID:</strong> ${input_data.tgIds?.join(', ') || '—'}</li>
//         <li><strong>Telegram ник:</strong> ${input_data.tgNicks?.join(', ') || '—'}</li>
//         <li><strong>Телефоны (последние 6 цифр):</strong> ${input_data.phones?.join(', ') || '—'}</li>
//         <li><strong>Дата рождения:</strong> ${input_data.birthdate || '—'}</li>
//       </ul>
//   `;

//   // Добавляем оценку и объяснение ТОЛЬКО если пользователь в ЧС
//   if (isBlacklisted) {
//     content += `
//       <!-- Оценка репутации -->
//       <h2>Оценка репутации</h2>
//       <div style="
//         padding: 15px;
//         background: ${bg};
//         border: 1px solid ${border};
//         border-radius: 8px;
//         margin-bottom: 20px;
//       ">
//         <p style="margin: 0; font-size: 15px;">
//           <strong style="color: ${text};">${typeLabel}</strong><br>
//           <span style="color: #555;">Сообщение: <em>${collaborationMessage}</em></span><br>
//           <strong>Оценка: ${collaborationScore} / 100</strong>
//         </p>
//       </div>

//       <!-- Объяснение расчёта -->
//       <h2>Как рассчитана оценка?</h2>
//       <div style="
//         background: #f8f9fa;
//         border-left: 4px solid #007BFF;
//         padding: 12px 16px;
//         font-family: monospace;
//         font-size: 13px;
//         white-space: pre-wrap;
//         line-height: 1.5;
//         border-radius: 0 4px 4px 0;
//         color: #495057;
//       ">
//         ${explanation}
//       </div>
//     `;
//   }

//   // Примечание
//   content += `
//       <!-- Примечание -->
//       <div style="margin-top: 30px; font-size: 12px; color: #6c757d; line-height: 1.5;">
//         ${ isBlacklisted ? `<p><strong>Данные представлены только в ознакомительных целях! Сам факт наличия в чёрном списке не может являться причиной отказа в приёме на работу!</strong></p>` : ``}
//         <p><strong>Примечание:</strong> Этот отчёт сгенерирован автоматически на основе результатов самопроверки.</p>
//   `;

//   if (isBlacklisted) {
//     content += `
//         <p><strong>Интерпретация оценки:</strong></p>
//         <ul style="margin: 0; padding-left: 16px;">
//           <li><strong>Относительно безопасно</strong>: Низкий уровень риска. Подозрительная активность есть, но она мала.</li>
//           <li><strong>Предупреждение</strong>: Средний риск. Есть признаки, требующие внимания.</li>
//           <li><strong>Опасно</strong>: Высокий риск. Высока вероятность потенциальных нарушений.</li>
//         </ul>
//         <p style="margin-top: 8px;">
//           Оценка формируется на основе количества и типа инцидентов, участия в групповых нарушениях и повторяющихся причинах.
//         </p>
//     `;
//   }

//   content += `
//       </div>
//     </div>
//   `;

//   // Мета-поля — дата всегда присутствует
//   const metaFields = {
//     'Дата проверки по МСК': formattedDate,
//     'Статус': "Результат проверки"
//   };

//   if (isBlacklisted) {
//     metaFields['Тип риска'] = typeLabel;
//   }

//   return generatePDF({
//     title: 'Отчёт самопроверки',
//     docType: 'Самопроверка',
//     link,
//     content,
//     metaFields,
//     qrCaption: 'Сканируйте для подтверждения в онлайн версии',
//     footerNote: `
//         Подлинность документа подтверждается по QR-коду. Любые изменения контента аннулируют его действительность.<br>
//         Документ сгенерирован автоматически.
//     `
//   });
// }

// module.exports = { generateSelfCheckPDF };