const { generatePDF } = require('./pdfService');
const dayjs = require('dayjs');

async function generateSearchReportPDF(data, type, options = {}) {
    const {
        link = `${process.env.REACT_APP_FRONTEND_URL || process.env.REACT_APP_API_URL || 'https://blpvz.ru'}/verify`,
        requesterEmail = 'unknown',
        verifyCode = null,
        dataFingerprint = null,
        verifyLink = null,
        expiresAt = null
    } = options;

    if (type === 'person') return await generatePersonReportPDF(data, link, requesterEmail, verifyCode, dataFingerprint, verifyLink, expiresAt);
    if (type === 'pvz') return await generatePvzReportPDF(data, link, requesterEmail, verifyCode, dataFingerprint, verifyLink, expiresAt);
    throw new Error('Unknown report type');
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    try { return dayjs(dateStr).format('DD.MM.YYYY'); } catch { return dateStr; }
}

function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    try { return dayjs(dateStr).format('DD.MM.YYYY HH:mm'); } catch { return dateStr; }
}

function getAssessmentColor(type, value) {
    if (!value) return '#6b7280';
    if (type === 'severity') {
        if (value === 'Критическая') return '#dc2626';
        if (value === 'Высокая') return '#ea580c';
        if (value === 'Средняя') return '#ca8a04';
        if (value === 'Низкая') return '#059669';
    }
    if (type === 'confidence') {
        if (value === 'Высокая') return '#059669';
        if (value === 'Средняя') return '#ca8a04';
        if (value === 'Низкая') return '#dc2626';
    }
    return '#6b7280';
}

function renderFlags(flags) {
    if (!flags || flags.length === 0) return '<p style="color: #10b981;">Критических предупреждений не обнаружено.</p>';
    return flags.map(f => `
        <div style="margin-bottom: 10px; padding: 10px; background: #fef2f2; border-left: 3px solid ${f.color}; border-radius: 4px;">
            <div style="font-weight: 700; color: ${f.color}; font-size: 13px;">⚠ ${f.title}</div>
            <div style="font-size: 12px; color: #7f1d1d; margin-top: 4px;">${f.description}</div>
        </div>
    `).join('');
}

function renderTrends(trends) {
    if (!trends) return '';
    const trendLabel = { up: '↑ Рост', down: '↓ Снижение', stable: '→ Стабильно', insufficient_data: '—' };
    return `
        <h3>📊 Динамика инцидентов</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 15px;">
            <tr style="background: #f3f4f6;">
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Месяц</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Всего</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Администрация</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Сотрудники</th>
            </tr>
            ${Object.entries(trends.by_month || {}).map(([month, data]) => `
                <tr>
                    <td style="padding: 6px 8px; border: 1px solid #ddd;">${month}</td>
                    <td style="padding: 6px 8px; text-align: center; border: 1px solid #ddd;"><strong>${data.count}</strong></td>
                    <td style="padding: 6px 8px; text-align: center; border: 1px solid #ddd; color: #ea580c;">${data.admin}</td>
                    <td style="padding: 6px 8px; text-align: center; border: 1px solid #ddd; color: #7c3aed;">${data.employee}</td>
                </tr>
            `).join('')}
        </table>
        <p style="font-size: 12px; color: #4b5563;">
            <strong>Тренд:</strong> ${trendLabel[trends.trend] || '—'}
            ${trends.first_incident ? ` | Первый инцидент: ${formatDate(trends.first_incident)}` : ''}
            ${trends.last_incident ? ` | Последний: ${formatDate(trends.last_incident)}` : ''}
        </p>
    `;
}

function renderVerifyBlock(verifyCode, dataFingerprint, verifyLink, expiresAt) {
    if (!verifyCode) return '';
    return `
        <div style="margin-bottom: 20px; padding: 16px; background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 2px solid #3b82f6; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 12px;">
                <div style="font-size: 11px; color: #1e40af; text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">
                    🔐 Верификационный код документа
                </div>
                <div style="font-size: 28px; font-weight: 800; color: #1e3a8a; letter-spacing: 4px; font-family: monospace;">
                    ${verifyCode}
                </div>
            </div>
            ${expiresAt ? `
                <div style="text-align: center; margin-bottom: 10px; padding: 8px; background: rgba(251,191,36,0.15); border-radius: 6px;">
                    <div style="font-size: 11px; color: #92400e; font-weight: 700;">
                        ⏱ ДЕЙСТВИТЕЛЕН ДО: ${formatDateTime(expiresAt)}
                    </div>
                </div>
            ` : ''}
            ${dataFingerprint ? `
                <div style="font-size: 10px; color: #475569; margin-bottom: 8px; text-align: center;">
                    <strong>Хэш данных:</strong>
                    <span style="font-family: monospace; word-break: break-all;">${dataFingerprint}</span>
                </div>
            ` : ''}
            ${verifyLink ? `
                <div style="font-size: 10px; color: #475569; text-align: center;">
                    <strong>Ссылка проверки:</strong> ${verifyLink}
                </div>
            ` : ''}
            <div style="font-size: 10px; color: #1e40af; margin-top: 8px; text-align: center; font-style: italic;">
                Отсканируйте QR-код или перейдите по ссылке, чтобы убедиться в подлинности документа и сверить данные
            </div>
        </div>
    `;
}

function renderExpiresBlock(expiresAt) {
    if (!expiresAt) return '';
    return `
        <div style="margin-bottom: 16px; padding: 12px 16px; background: linear-gradient(135deg, #fef3c7, #fde68a); border: 1px solid #f59e0b; border-radius: 8px; text-align: center;">
            <div style="font-size: 11px; color: #92400e; text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">
                ⏱ Срок действия отчёта
            </div>
            <div style="font-size: 16px; font-weight: 800; color: #78350f; font-family: monospace;">
                Действителен до: ${formatDateTime(expiresAt)}
            </div>
            <div style="font-size: 10px; color: #92400e; margin-top: 4px;">
                По истечении срока отчёт требует перепроверки
            </div>
        </div>
    `;
}

//  ИСПРАВЛЕНО: добавлен expiresAt как 7-й параметр
async function generatePersonReportPDF(data, link, requesterEmail, verifyCode, dataFingerprint, verifyLink, expiresAt) {
    const group = data;
    const persons = group.persons || [];
    const roleAnalysis = group.role_analysis || { as_administration: [], as_employee: [], stats: {} };
    const redFlags = group.red_flags || [];
    const trends = group.trends;
    const pvzHistory = group.pvz_history || [];

    const allNames = [], allPhones = [], allTg = [];
    persons.forEach(p => {
        (p.data.names || []).forEach(n => { if (n.name && !allNames.includes(n.name)) allNames.push(n.name); });
        (p.data.phones || []).forEach(ph => { if (ph.phone && !allPhones.includes(ph.phone)) allPhones.push(ph.phone); });
        (p.data.tg_accounts || []).forEach(tg => { if (tg.username && !allTg.find(t => t.username === tg.username)) allTg.push(tg); });
    });

    const content = `
        ${renderExpiresBlock(expiresAt)}
        ${renderVerifyBlock(verifyCode, dataFingerprint, verifyLink, expiresAt)}
        <h2>📋 Краткое резюме</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="padding: 8px; background: #f3f4f6; width: 50%; border: 1px solid #ddd;"><strong>Рейтинг надёжности:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd; font-size: 16px; font-weight: 700; color: ${group.risk_level === 'critical' ? '#dc2626' : group.risk_level === 'high' ? '#ea580c' : group.risk_level === 'medium' ? '#ca8a04' : '#059669'};">${group.reliability_score} / 100 (${(group.risk_level || 'low').toUpperCase()})</td></tr>
            <tr><td style="padding: 8px; background: #f3f4f6; border: 1px solid #ddd;"><strong>Всего инцидентов:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${group.stats?.total_incidents || 0}</td></tr>
            <tr><td style="padding: 8px; background: #f3f4f6; border: 1px solid #ddd;"><strong>Как администрация ПВЗ:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd; color: #ea580c;">${roleAnalysis.stats?.admin_count || 0}</td></tr>
            <tr><td style="padding: 8px; background: #f3f4f6; border: 1px solid #ddd;"><strong>Как сотрудник:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd; color: #7c3aed;">${roleAnalysis.stats?.employee_count || 0}</td></tr>
            <tr><td style="padding: 8px; background: #f3f4f6; border: 1px solid #ddd;"><strong>Сумма штрафов:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd; color: #dc2626;">-${group.stats?.total_violation_balls || 0} баллов</td></tr>
            <tr><td style="padding: 8px; background: #f3f4f6; border: 1px solid #ddd;"><strong>ПВЗ в истории:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${pvzHistory.length}</td></tr>
        </table>

        <h2>🎯 Экспертная оценка модерации</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
                <td style="padding: 8px; background: #f3f4f6; width: 50%; border: 1px solid #ddd;"><strong>Максимальная серьёзность:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: 700; color: ${getAssessmentColor('severity', group.admin_assessment_summary?.max_severity)};">
                    ${group.admin_assessment_summary?.max_severity || 'Не оценено'}
                </td>
            </tr>
            <tr>
                <td style="padding: 8px; background: #f3f4f6; border: 1px solid #ddd;"><strong>Минимальная уверенность:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: 700; color: ${getAssessmentColor('confidence', group.admin_assessment_summary?.min_confidence)};">
                    ${group.admin_assessment_summary?.min_confidence || 'Не оценено'}
                </td>
            </tr>
        </table>

        <h2>Критические предупреждения</h2>
        ${renderFlags(redFlags)}

        <h2>👤 Известные данные</h2>
        ${allNames.length > 0 ? `<p><strong>ФИО:</strong> ${allNames.join(', ')}</p>` : ''}
        ${allPhones.length > 0 ? `<p><strong>Телефоны:</strong> ${allPhones.join(', ')}</p>` : ''}
        ${allTg.length > 0 ? `<p><strong>Telegram:</strong> ${allTg.map(t => '@' + t.username).join(', ')}</p>` : ''}
        ${group.birth_dates?.length > 0 ? `<p><strong>Даты рождения:</strong> ${group.birth_dates.map(formatDate).join(', ')}</p>` : ''}
        ${group.positions?.length > 0 ? `<p><strong>Должности:</strong> ${group.positions.map(p => `${p.post_name} (${p.role === 'administration' ? 'администрация' : 'сотрудник'})`).join(', ')}</p>` : ''}

        ${renderTrends(trends)}

        <h2>🏢 История работы на ПВЗ</h2>
        ${pvzHistory.length === 0 ? '<p>Связей с ПВЗ не обнаружено.</p>' : `
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 15px;">
            <tr style="background: #f3f4f6;">
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Адрес ПВЗ</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Инцидентов</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Последний</th>
            </tr>
            ${pvzHistory.map(p => `
                <tr>
                    <td style="padding: 6px 8px; border: 1px solid #ddd;">${p.address}</td>
                    <td style="padding: 6px 8px; text-align: center; border: 1px solid #ddd;">${p.incident_count}</td>
                    <td style="padding: 6px 8px; text-align: center; border: 1px solid #ddd;">${formatDate(p.last_incident_date)}</td>
                </tr>
            `).join('')}
        </table>`}

        <h2>📜 История нарушений по ролям</h2>
        ${roleAnalysis.stats?.admin_count > 0 ? `
        <h3 style="color: #ea580c;">🟠 Как администрация ПВЗ (${roleAnalysis.stats.admin_count})</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px;">
            <tr style="background: #fef3c7;">
                <th style="padding: 6px; border: 1px solid #ddd;">Дата</th>
                <th style="padding: 6px; border: 1px solid #ddd;">Причина</th>
                <th style="padding: 6px; border: 1px solid #ddd;">Должность</th>
                <th style="padding: 6px; text-align: center; border: 1px solid #ddd;">Штраф</th>
            </tr>
            ${roleAnalysis.as_administration.map(i => `
                <tr>
                    <td style="padding: 5px 6px; border: 1px solid #ddd;">${formatDate(i.date)}</td>
                    <td style="padding: 5px 6px; border: 1px solid #ddd;">${i.reason_name || '—'}</td>
                    <td style="padding: 5px 6px; border: 1px solid #ddd;">${i.post_name || '—'}</td>
                    <td style="padding: 5px 6px; text-align: center; border: 1px solid #ddd; color: #dc2626; font-size: 10px;">
                        -${i.final_ball}<br>
                        <span style="color: #6b7280; font-weight: 400;">(×${i.role_multiplier} ×${i.severity_multiplier} ×${i.confidence_multiplier})</span>
                    </td>
                </tr>
            `).join('')}
        </table>` : ''}

        ${roleAnalysis.stats?.employee_count > 0 ? `
        <h3 style="color: #7c3aed;">🟣 Как сотрудник (${roleAnalysis.stats.employee_count})</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px;">
            <tr style="background: #ede9fe;">
                <th style="padding: 6px; border: 1px solid #ddd;">Дата</th>
                <th style="padding: 6px; border: 1px solid #ddd;">Причина</th>
                <th style="padding: 6px; border: 1px solid #ddd;">Должность</th>
                <th style="padding: 6px; text-align: center; border: 1px solid #ddd;">Штраф</th>
            </tr>
            ${roleAnalysis.as_employee.map(i => `
                <tr>
                    <td style="padding: 5px 6px; border: 1px solid #ddd;">${formatDate(i.date)}</td>
                    <td style="padding: 5px 6px; border: 1px solid #ddd;">${i.reason_name || '—'}</td>
                    <td style="padding: 5px 6px; border: 1px solid #ddd;">${i.post_name || '—'}</td>
                    <td style="padding: 5px 6px; text-align: center; border: 1px solid #ddd; color: #dc2626;">-${i.final_ball}</td>
                </tr>
            `).join('')}
        </table>` : ''}

        <h2>⚖️ Дисклеймер</h2>
        <p style="font-size: 11px; color: #6b7280; line-height: 1.6; background: #f9fafb; padding: 12px; border-radius: 6px; border-left: 3px solid #fbbf24;">
            Информация публикуется «как есть» на основании обращений участников.
            Она <strong>не является</strong> официальным обвинением. Наличие записей <strong>не является основанием</strong> для отказа в сотрудничестве.
        </p>
    `;

    return generatePDF({
        title: 'Отчёт о проверке персоны',
        docType: 'Аналитический отчёт',
        link,
        content,
        metaFields: {
            'Запрашивающий': requesterEmail,
            'Рейтинг надёжности': `${group.reliability_score} / 100`,
            'Уровень риска': (group.risk_level || 'low').toUpperCase(),
            'Всего инцидентов': String(group.stats?.total_incidents || 0),
            'ID группы': `#${group.group_id || 'N/A'}`,
            ...(verifyCode ? { 'Код верификации': verifyCode } : {}),
            ...(expiresAt ? { 'Действителен до': formatDateTime(expiresAt) } : {})
        },
        qrCaption: 'Сканируйте для проверки подлинности',
        footerNote: `Отчёт сгенерирован автоматически. Документ носит справочный характер.<br>
Подлинность: <strong>${verifyLink || `${process.env.REACT_APP_API_URL || 'blpvz.ru'}/verify`}</strong>${verifyCode ? ` | Код: <strong>${verifyCode}</strong>` : ''}<br>
<strong style="color:#b45309;">Срок действия: ${expiresAt ? formatDateTime(expiresAt) : '—'}</strong>`
    });
}

//  ИСПРАВЛЕНО: добавлен expiresAt как 7-й параметр
async function generatePvzReportPDF(data, link, requesterEmail, verifyCode, dataFingerprint, verifyLink, expiresAt) {
    const pvz = data;
    const redFlags = pvz.red_flags || [];
    const personnel = pvz.personnel || [];
    const violations = pvz.violations || [];
    const stats = pvz.stats || {};

    const content = `
        ${renderExpiresBlock(expiresAt)}
        ${renderVerifyBlock(verifyCode, dataFingerprint, verifyLink, expiresAt)}
        <h2>📋 Основная информация</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="padding: 8px; background: #f3f4f6; width: 40%; border: 1px solid #ddd;"><strong>Адрес:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${pvz.address}</td></tr>
            <tr><td style="padding: 8px; background: #f3f4f6; border: 1px solid #ddd;"><strong>Статус адреса:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd; color: ${pvz.is_verified ? '#059669' : '#6b7280'}; font-weight: 600;">
                ${pvz.is_verified ? ' Подтверждён модератором' : '⏳ Не проверен'}
                </td></tr>
            <tr><td style="padding: 8px; background: #f3f4f6; border: 1px solid #ddd;"><strong>Тип ПВЗ:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${pvz.type}</td></tr>
            <tr><td style="padding: 8px; background: #f3f4f6; border: 1px solid #ddd;"><strong>Рейтинг надёжности:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd; font-size: 16px; font-weight: 700; color: ${pvz.risk_level === 'critical' ? '#dc2626' : pvz.risk_level === 'high' ? '#ea580c' : pvz.risk_level === 'medium' ? '#ca8a04' : '#059669'};">${pvz.reliability_score} / 100 (${(pvz.risk_level || 'low').toUpperCase()})</td></tr>
            <tr><td style="padding: 8px; background: #f3f4f6; border: 1px solid #ddd;"><strong>Всего инцидентов:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${stats.total_incidents || 0}</td></tr>
            <tr><td style="padding: 8px; background: #f3f4f6; border: 1px solid #ddd;"><strong>Последний инцидент:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(stats.last_incident_date)}</td></tr>
        </table>

        <h2>🎯 Экспертная оценка модерации</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
                <td style="padding: 8px; background: #f3f4f6; width: 50%; border: 1px solid #ddd;"><strong>Максимальная серьёзность:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: 700; color: ${getAssessmentColor('severity', pvz.admin_assessment_summary?.max_severity)};">
                    ${pvz.admin_assessment_summary?.max_severity || 'Не оценено'}
                </td>
            </tr>
            <tr>
                <td style="padding: 8px; background: #f3f4f6; border: 1px solid #ddd;"><strong>Минимальная уверенность:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: 700; color: ${getAssessmentColor('confidence', pvz.admin_assessment_summary?.min_confidence)};">
                    ${pvz.admin_assessment_summary?.min_confidence || 'Не оценено'}
                </td>
            </tr>
        </table>

        <h2>Критические предупреждения</h2>
        ${renderFlags(redFlags)}

        <h2>📊 Распределение нарушений по вине</h2>
        ${stats.total_incidents > 0 ? `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="background: #f3f4f6;">
                <th style="padding: 10px; border: 1px solid #ddd;">Роль</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Количество</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Доля</th>
            </tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; color: #ea580c;">🟠 По вине администрации</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #ddd; font-weight: 700;">${stats.admin_fault_count || 0}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${stats.admin_fault_percent || 0}%</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; color: #7c3aed;">🟣 По вине сотрудников</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #ddd; font-weight: 700;">${stats.employee_fault_count || 0}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${stats.employee_fault_percent || 0}%</td></tr>
        </table>` : '<p>Инцидентов не зафиксировано.</p>'}

        ${personnel.length > 0 ? `
        <h2>👥 Персонал с нарушениями</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 15px;">
            <tr style="background: #f3f4f6;">
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Должность</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Роль</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Инцидентов</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Последний</th>
            </tr>
            ${personnel.map(p => `
                <tr>
                    <td style="padding: 6px 8px; border: 1px solid #ddd;">${p.post_name}</td>
                    <td style="padding: 6px 8px; text-align: center; border: 1px solid #ddd; color: ${p.role === 'administration' ? '#ea580c' : '#7c3aed'};">${p.role === 'administration' ? 'Администрация' : 'Сотрудник'}</td>
                    <td style="padding: 6px 8px; text-align: center; border: 1px solid #ddd; font-weight: 700;">${p.incident_count}</td>
                    <td style="padding: 6px 8px; text-align: center; border: 1px solid #ddd;">${formatDate(p.last_incident_date)}</td>
                </tr>
            `).join('')}
        </table>` : ''}

        ${violations.length > 0 ? `
        <h2>📜 История нарушений (${violations.length})</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px;">
            <tr style="background: #f3f4f6;">
                <th style="padding: 6px; border: 1px solid #ddd;">ID</th>
                <th style="padding: 6px; border: 1px solid #ddd;">Дата</th>
                <th style="padding: 6px; border: 1px solid #ddd;">Причина</th>
                <th style="padding: 6px; text-align: center; border: 1px solid #ddd;">Вина</th>
                <th style="padding: 6px; text-align: center; border: 1px solid #ddd;">Штраф</th>
            </tr>
            ${violations.map(v => `
                <tr>
                    <td style="padding: 5px 6px; border: 1px solid #ddd; font-family: monospace;">${v.incident_id?.substring(0, 12) || '—'}</td>
                    <td style="padding: 5px 6px; border: 1px solid #ddd;">${formatDate(v.date)}</td>
                    <td style="padding: 5px 6px; border: 1px solid #ddd;">${v.reason || '—'}</td>
                    <td style="padding: 5px 6px; text-align: center; border: 1px solid #ddd; color: ${v.is_admin_fault ? '#ea580c' : '#7c3aed'};">${v.is_admin_fault ? 'Админ.' : 'Сотр.'}</td>
                    <td style="padding: 5px 6px; text-align: center; border: 1px solid #ddd; color: #dc2626;">-${v.total_ball || 0}</td>
                </tr>
            `).join('')}
        </table>` : ''}

        <h2>⚖️ Дисклеймер</h2>
        <p style="font-size: 11px; color: #6b7280; line-height: 1.6; background: #f9fafb; padding: 12px; border-radius: 6px; border-left: 3px solid #fbbf24;">
            Информация публикуется «как есть» и <strong>не является</strong> официальным обвинением.
            Наличие записей <strong>не является основанием</strong> для отказа в сотрудничестве.
        </p>
    `;

    return generatePDF({
        title: `Отчёт по ПВЗ: ${pvz.address}`,
        docType: 'Аналитический отчёт ПВЗ',
        link,
        content,
        metaFields: {
            'Запрашивающий': requesterEmail,
            'Адрес': pvz.address,
            'Тип ПВЗ': pvz.type,
            'Рейтинг надёжности': `${pvz.reliability_score} / 100`,
            'Уровень риска': (pvz.risk_level || 'low').toUpperCase(),
            ...(verifyCode ? { 'Код верификации': verifyCode } : {}),
            ...(expiresAt ? { 'Действителен до': formatDateTime(expiresAt) } : {})
        },
        qrCaption: 'Сканируйте для проверки подлинности',
        footerNote: `Отчёт сгенерирован автоматически. Документ носит справочный характер.<br>
Подлинность: <strong>${verifyLink || `${process.env.REACT_APP_API_URL || 'blpvz.ru'}/verify`}</strong>${verifyCode ? ` | Код: <strong>${verifyCode}</strong>` : ''}<br>
<strong style="color:#b45309;">Срок действия: ${expiresAt ? formatDateTime(expiresAt) : '—'}</strong>`
    });
}

module.exports = { generateSearchReportPDF };