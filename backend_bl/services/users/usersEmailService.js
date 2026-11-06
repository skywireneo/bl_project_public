// const apiError = require('../exceptions/apiError');
// const tokenService = require('./systemServices/tokenService');
// const queryService = require('./systemServices/queryService');
// const personService = require('./incidentSubServices/personService');
// const pvzService = require('./incidentSubServices/pvzService');
// const { hashData } = require('./systemServices/cryptoService');

const apiError = require("../../exceptions/apiError");
const userEncriptionService = require("../systemServices/userEncriptionService");
const ValidateService = require("../systemServices/validate/validateService");

const validateService = new ValidateService();

class usersEmailService {
    async checkEmailExist(client, email_hesh, errExit = true) {
        let name_db = await client.query('SELECT email_id FROM users_emails WHERE email_hesh = $1', [email_hesh])
        if (name_db.rowCount > 0) {
            if (errExit) {
                throw apiError.BadRequest('INCIDENT_NOT_EXIST', `Email уже существует`)
            } else {
                return name_db.rows[0].email_id
            }
        }
        if (!errExit) {
            return false
        }
    }

    async createEmail(client, email, userId = null, errorExistExit = true) {
        if (!email || email == "" || email == null) {
            throw apiError.BadRequest('NOT_EMAIL', `Отсутствует email`)
        }
        validateService.validateEmail(email)
        const emailEnc = await userEncriptionService.getEmailDataEncrypted(email);
        let emailId = null
        if (errorExistExit) {
            await this.checkEmailExist(client, emailEnc.heshEmail)
        } else {
            emailId = await this.checkEmailExist(client, emailEnc.heshEmail, false)
        }
        if (!emailId) {
            const incidentResult = await client.query(
                `INSERT INTO users_emails (
                                        user_id,
                                        email_hesh,
                                        email_encrypted,
                                        email_iv,
                                        email_auth_tag,
                                        is_confirm,
                                        first_add
                                    ) VALUES ($1, $2, $3, $4, $5, $6, (NOW() AT TIME ZONE 'UTC')) RETURNING email_id`,
                [
                    userId,
                    emailEnc.heshEmail,
                    emailEnc.encryptedDataEmailEncrypted,
                    emailEnc.encryptedDataEmailIv,
                    emailEnc.encryptedDataEmailAuthTag,
                    false
                ]
            );
            emailId = incidentResult.rows[0].email_id
        }
        return emailId;
    }

    async updateEmail(client, emailId, email, errorExistExit = true) {
        if (!emailId) {
            throw apiError.BadRequest('NOT_EMAIL_ID', `Отсутствует ID email-а для обновления`)
        }
        if (!email || email == "" || email == null) {
            throw apiError.BadRequest('NOT_EMAIL', `Отсутствует email`)
        }

        validateService.validateEmail(email);
        const emailEnc = await userEncriptionService.getEmailDataEncrypted(email);

        // Проверяем, существует ли уже такой email_hesh в базе. 
        // ВАЖНО: передаем errExit = false, чтобы не получить ошибку, если обновляется та же самая запись (тот же хеш).
        const existingEmailId = await this.checkEmailExist(client, emailEnc.heshEmail, false);

        // Если email уже существует и это НЕ та запись, которую мы обновляем (защита от дублей UNIQUE constraint)
        if (existingEmailId && existingEmailId != emailId) {
            if (errorExistExit) {
                throw apiError.BadRequest('EMAIL_ALREADY_EXIST', `Email уже существует`)
            } else {
                // Если по бизнес-логике не нужно кидать ошибку, возвращаем ID уже существующего email-а
                return existingEmailId;
            }
        }

        // Выполняем обновление записи
        const updateResult = await client.query(
            `UPDATE users_emails 
                SET email_hesh = $1, 
                    email_encrypted = $2, 
                    email_iv = $3, 
                    email_auth_tag = $4, 
                    is_confirm = false 
                WHERE email_id = $5 
             RETURNING email_id`,
            [
                emailEnc.heshEmail,
                emailEnc.encryptedDataEmailEncrypted,
                emailEnc.encryptedDataEmailIv,
                emailEnc.encryptedDataEmailAuthTag,
                emailId
            ]
        );

        if (updateResult.rowCount === 0) {
            throw apiError.BadRequest('EMAIL_NOT_EXIST', `Email с указанным ID не найден`)
        }

        return updateResult.rows[0].email_id;
    }

    async deleteEmailById(client, emailId) {
        if (!emailId) {
            throw apiError.BadRequest('NOT_EMAIL_ID', `Отсутствует ID email-а для удаления`)
        }

        // Выполняем обновление записи
        const updateResult = await client.query(
            `DELETE FROM users_emails
                WHERE email_id = $1`,
            [
                emailId
            ]
        );

        return;
    }

    async getCleanEmailById(client, email_id) {
        let name_db = await client.query('SELECT email_encrypted, email_iv, email_auth_tag FROM users_emails WHERE email_id = $1', [email_id])
        if (name_db.rowCount == 0) {
            throw apiError.BadRequest('INCIDENT_NOT_EXIST', `Email не существует`)
        }
        return {
            email_encrypted: name_db.rows[0].email_encrypted,
            email_iv: name_db.rows[0].email_iv,
            email_auth_tag: name_db.rows[0].email_auth_tag
        }
    }

    async getDecryptedEmailById(client, email_id) {
        if (!email_id || email_id == "" || email_id == null) {
            throw apiError.BadRequest('NOT_EMAIL', `Отсутствует email_id`)
        }
        const cleanEmail = await this.getCleanEmailById(client, email_id)
        return await userEncriptionService.getEmailDataDecrypted(cleanEmail.email_encrypted, cleanEmail.email_iv, cleanEmail.email_auth_tag);
    }

    async getEmailHash(client, email) {
        if (!email) return null;
        const normalized = String(email).trim().toLowerCase();
        const hash = await userEncriptionService.getEmailDataEncrypted(normalized); // или как у вас называется
        console.log(hash)
        const result = await client.query(
            `SELECT email_id FROM users_emails WHERE email_hesh = $1 LIMIT 1`,
            [hash.heshEmail]
        );
        return result.rows[0]?.email_id || null;
    }
}

module.exports = new usersEmailService();
