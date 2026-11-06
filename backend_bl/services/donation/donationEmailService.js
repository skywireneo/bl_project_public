const apiError = require('../../exceptions/apiError');
const cryptoService = require('../systemServices/cryptoService');

class DonationEmailService {

    /**
     * Генерация предпросмотра письма для заявки
     */
    async generateEmailPreview(client, requestId, current_user) {
        // Получаем заявку с пакетом
        const requestResult = await client.query(`
            SELECT 
                r.*,
                p.code_name as package_code,
                p.display_name as package_name,
                p.checks_granted,
                p.duration_days
            FROM donation_requests r
            LEFT JOIN donation_packages p ON r.package_id = p.package_id
            WHERE r.request_id = $1 AND r.status = 'approved'
        `, [requestId]);

        if (requestResult.rowCount === 0) {
            throw apiError.NotFound('REQUEST_NOT_FOUND', 'Одобренная заявка не найдена');
        }

        const request = requestResult.rows[0];

        // Расшифровываем email
        const email = cryptoService.decrypt(
            {
                encrypted: request.email_encrypted,
                iv: request.email_iv,
                authTag: request.email_auth_tag
            },
            'USER_EMAIL'
        );

        // Получаем активацию
        const activationResult = await client.query(`
            SELECT * FROM donation_activations 
            WHERE request_id = $1
        `, [requestId]);

        const activation = activationResult.rows[0];

        // Получаем плюшки
        const perksResult = await client.query(`
            SELECT p.display_name, p.description, p.icon
            FROM donation_perks p
            INNER JOIN donation_active_perks ap ON p.perk_id = ap.perk_id
            WHERE ap.activation_id = $1 AND p.is_active = true
            ORDER BY p.sort_order
        `, [activation.activation_id]);

        // Генерируем токен для ссылки
        const crypto = require('crypto');
        const token = crypto.randomBytes(16).toString('hex');
        const link = `${process.env.FRONTEND_URL || 'https://site.com'}/donation/my?token=${token}`;

        //  В реальности токен должен совпадать с access_token_hash из заявки
        // Для предпросмотра мы просто показываем "здесь будет ссылка"
        const realLink = request.access_token_hash
            ? '[ССЫЛКА ИЗ СИСТЕМЫ - возьмите из данных заявки]'
            : '[Токен не сгенерирован]';

        // Для предпросмотра используем существующий токен если есть
        const previewLink = request.access_token_hash
            ? `https://site.com/donation/my?token=`
            : realLink;

        // Формируем текст письма
        const expiresAt = new Date(activation.expires_at);
        const expiresFormatted = expiresAt.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        // Определяем был ли повторный донат
        const wasExtended = activation.checks_remaining > activation.checks_granted;

        const emailText = `Здравствуйте!

Ваш донат подтверждён. Спасибо за поддержку проекта! 🎉

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Пакет: ${request.package_name}
💰 Сумма: ${request.actual_amount}₽
Проверок начислено: ${activation.checks_granted}${wasExtended ? `\n💰 Всего на балансе: ${activation.checks_remaining}` : ''}
📅 Действуют до: ${expiresFormatted} (включительно)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ Ваши плюшки:
${perksResult.rows.map(p => `• ${p.icon ? p.icon + ' ' : ''}${p.display_name} — ${p.description}`).join('\n')}

🔑 Персональный доступ:
${previewLink}

🗝️ Код доступа (если ссылка не работает):
[ВОЗЬМИТЕ ИЗ ДАННЫХ ЗАЯВКИ В АДМИНКЕ]

 Важно:
• Проверки и плюшки действуют до ${expiresFormatted} включительно
• После этой даты неиспользованные проверки сгорят
• При повторном донате проверки складываются, срок продлевается

💬 Поддержка: ${process.env.SUPPORT_EMAIL || '***'}

С уважением,
Команда BlacklistPVZ`;

        return {
            success: true,
            request_id: requestId,
            email: email,
            email_masked: email.replace(/^(.{2})(.*)(@.*)$/, (m, p1, p2, p3) =>
                p1 + '*'.repeat(Math.min(p2.length, 3)) + p3.replace(/(.{1})(.*)(\..*)$/, '$1***$3')
            ),
            subject: 'Ваш донат подтверждён! 🎉',
            body: emailText,
            package: {
                code: request.package_code,
                name: request.package_name,
                checks: activation.checks_granted,
                total_balance: activation.checks_remaining,
                duration_days: request.duration_days
            },
            perks: perksResult.rows,
            expires_at: activation.expires_at,
            was_extended: wasExtended,
            token_available: !!request.access_token_hash,
            code_available: !!request.access_code_hash,
            email_sent: request.email_sent,
            email_sent_at: request.email_sent_at
        };
    }
}

module.exports = new DonationEmailService();