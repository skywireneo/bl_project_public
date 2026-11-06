const apiError = require("../../exceptions/apiError");
const userEncriptionService = require("../systemServices/userEncriptionService");
const ValidateService = require("../systemServices/validate/validateService");

const validateService = new ValidateService();

class userTgService {
    // Метод для очистки tg от @ в начале
    sanitizeTgUsername(tg) {
        if (!tg || typeof tg !== 'string') {
            return tg;
        }
        // Убираем @ в начале, если он есть
        return tg.startsWith('@') ? tg.substring(1) : tg;
    }

    async checkTgExist(client, tg_hesh, errExit = true) {
        let name_db = await client.query('SELECT tg_id FROM users_tgs WHERE tg_hesh = $1', [tg_hesh])
        if (name_db.rowCount > 0) {
            if (errExit) {
                throw apiError.BadRequest('TG_ALREADY_EXIST', `tg уже существует`) // Поправил код ошибки на более логичный
            } else {
                return name_db.rows[0].tg_id
            }
        }
        if (!errExit) {
            return false
        }
    }

    async createTg(client, tg, userId = null, errorExistExit = true) {
        if (!tg || tg == "" || tg == null) {
            throw apiError.BadRequest('NOT_TG', `Отсутствует tg`) // Исправлено с NOT_EMAIL на NOT_TG
        }

        // Очищаем tg от @ в начале
        const sanitizedTg = this.sanitizeTgUsername(tg);

        validateService.validateTgUsername(sanitizedTg)
        const tgEnc = await userEncriptionService.getTgUsernameDataEncrypted(sanitizedTg);
        let tgId = null
        if (errorExistExit) {
            await this.checkTgExist(client, tgEnc.heshTg)
        } else {
            tgId = await this.checkTgExist(client, tgEnc.heshTg, false)
        }
        if (!tgId) {
            const incidentResult = await client.query(
                `INSERT INTO users_tgs (
                                        user_id,
                                        tg_hesh,
                                        tg_encrypted,
                                        tg_iv,
                                        tg_auth_tag,
                                        first_add
                                    ) VALUES ($1, $2, $3, $4, $5, (NOW() AT TIME ZONE 'UTC')) RETURNING tg_id`,
                [
                    userId,
                    tgEnc.heshTg,
                    tgEnc.encryptedDataTgEncrypted,
                    tgEnc.encryptedDataTgIv,
                    tgEnc.encryptedDataTgAuthTag
                ]
            );
            tgId = incidentResult.rows[0].tg_id
        }
        return tgId;
    }

    async updateTg(client, tgId, tg, errorExistExit = true) {
        if (!tgId) {
            throw apiError.BadRequest('NOT_TG_ID', `Отсутствует ID tg для обновления`)
        }
        if (!tg || tg == "" || tg == null) {
            throw apiError.BadRequest('NOT_TG', `Отсутствует tg`)
        }

        // Очищаем tg от @ в начале
        const sanitizedTg = this.sanitizeTgUsername(tg);
        validateService.validateTgUsername(sanitizedTg);

        const tgEnc = await userEncriptionService.getTgUsernameDataEncrypted(sanitizedTg);

        // Проверяем, существует ли уже такой tg_hesh в базе
        // ВАЖНО: передаем errExit = false, чтобы не получить ошибку, если обновляется та же самая запись.
        const existingTgId = await this.checkTgExist(client, tgEnc.heshTg, false);

        // Если tg уже существует и это НЕ та запись, которую мы обновляем (защита от дублей)
        if (existingTgId && existingTgId != tgId) {
            if (errorExistExit) {
                throw apiError.BadRequest('TG_ALREADY_EXIST', `Tg уже существует`)
            } else {
                // Если по бизнес-логике не нужно кидать ошибку, возвращаем ID уже существующего tg
                return existingTgId;
            }
        }

        // Выполняем обновление записи
        const updateResult = await client.query(
            `UPDATE users_tgs 
             SET tg_hesh = $1, 
                 tg_encrypted = $2, 
                 tg_iv = $3, 
                 tg_auth_tag = $4
             WHERE tg_id = $5 
             RETURNING tg_id`,
            [
                tgEnc.heshTg,
                tgEnc.encryptedDataTgEncrypted,
                tgEnc.encryptedDataTgIv,
                tgEnc.encryptedDataTgAuthTag,
                tgId
            ]
        );

        if (updateResult.rowCount === 0) {
            throw apiError.BadRequest('TG_NOT_EXIST', `Tg с указанным ID не найден`)
        }

        return updateResult.rows[0].tg_id;
    }

    async deleteTgById(client, tgId) {
        if (!tgId) {
            throw apiError.BadRequest('NOT_TG_ID', `Отсутствует ID tg для обновления`)
        }

        // Выполняем обновление записи
        const updateResult = await client.query(
            `DELETE FROM users_tgs 
            WHERE tg_id = $1`,
            [
                tgId
            ]
        );

        return;
    }

    async getCleanTgById(client, tg_id) {
        let name_db = await client.query('SELECT tg_encrypted, tg_iv, tg_auth_tag FROM users_tgs WHERE tg_id = $1', [tg_id])
        if (name_db.rowCount == 0) {
            throw apiError.BadRequest('TG_NOT_EXIST', `Tg не существует`)
        }
        return {
            tg_encrypted: name_db.rows[0].tg_encrypted,
            tg_iv: name_db.rows[0].tg_iv,
            tg_auth_tag: name_db.rows[0].tg_auth_tag
        }
    }

    async getDecryptedTgById(client, tg_id) {
        if (!tg_id || tg_id == "" || tg_id == null) {
            throw apiError.BadRequest('NOT_TG', `Отсутствует tg_id`)
        }
        const cleanTg = await this.getCleanTgById(client, tg_id)
        return await userEncriptionService.getTgUsernameDataDecrypted(cleanTg.tg_encrypted, cleanTg.tg_iv, cleanTg.tg_auth_tag);
    }
}

module.exports = new userTgService();