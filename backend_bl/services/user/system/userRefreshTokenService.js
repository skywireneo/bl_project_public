const apiError = require("../../../exceptions/apiError");

class userRefreshTokenService {

    /**
     * Сохранение refreshToken в БД
     * Обновлено: принимает device_id вместо userAgent и clientIp
     */
    async saveRefreshToken(client, userId, tokenHash, deviceId, expiresAt) {
        try {
            const rt = await client.query(`
                    INSERT INTO user_refresh_tokens (user_id, token_hash, device_id, expires_at, revoked)
                    VALUES ($1, $2, $3, $4, FALSE) RETURNING token_id
                `, [userId, tokenHash, deviceId, expiresAt]);
            return rt.rows[0].token_id;
        } catch (error) {
            throw apiError.Internal('Ошибка сохранения токена: ' + error.message);
        }
    }

    /**
     * Поиск refreshToken в БД
     */
    async findRefreshToken(client, tokenHash) {
        try {
            const result = await client.query(`
                    SELECT * FROM user_refresh_tokens
                    WHERE token_hash = $1 AND revoked = FALSE AND expires_at > NOW()
                `, [tokenHash]);
            return result.rows[0] || null;
        } catch (error) {
            throw apiError.Internal('Ошибка проверки токена: ' + error.message);
        }
    }

    /**
     * Отзыв refreshToken по token_id
     */
    async revokeRefreshTokenById(client, tokenId) {
        try {
            await client.query(`
                UPDATE user_refresh_tokens
                SET revoked = TRUE, revoked_at = NOW()
                WHERE token_id = $1 AND revoked = FALSE
            `, [tokenId]);
        } catch (error) {
            throw apiError.Internal('Ошибка отзыва токена: ' + error.message);
        }
    }

    /**
     * Отзыв всех refresh токенов пользователя
     */
    async revokeAllUserRefreshTokens(client, userId) {
        try {
            await client.query(
                `UPDATE public.user_refresh_tokens SET revoked = true, revoked_at = NOW() WHERE user_id = $1`,
                [userId]
            );
        } catch (error) {
            throw apiError.Internal('Ошибка массового отзыва токенов: ' + error.message);
        }
    }

    /**
     * Отзыв всех refresh токенов, привязанных к конкретному устройству
     * (Используется при удалении устройства)
     */
    async revokeTokensByDeviceId(client, deviceId) {
        try {
            await client.query(`
                UPDATE user_refresh_tokens
                SET revoked = TRUE, revoked_at = NOW()
                WHERE device_id = $1 AND revoked = FALSE
            `, [deviceId]);
        } catch (error) {
            throw apiError.Internal('Ошибка отзыва токенов устройства: ' + error.message);
        }
    }

    /**
     * Обновление времени последнего использования токена
     * (Вызывается при успешном refresh или check)
     */
    async updateLastUsed(client, tokenHash) {
        try {
            await client.query(`
                UPDATE user_refresh_tokens
                SET last_used = NOW()
                WHERE token_hash = $1
            `, [tokenHash]);
        } catch (error) {
            // Не критичная ошибка, просто логируем, не прерывая поток авторизации
            console.error('[WARN] Не удалось обновить last_used для токена:', error.message);
        }
    }

    /**
     * Отзыв refreshToken по хешу
     */
    async revokeRefreshToken(client, tokenHash) {
        try {
            await client.query(`
                UPDATE user_refresh_tokens
                SET revoked = TRUE, revoked_at = NOW()
                WHERE token_hash = $1
            `, [tokenHash]);
        } catch (error) {
            throw apiError.Internal('Ошибка отзыва токена: ' + error.message);
        }
    }

    /**
     * Удаление всех отозванных (revoked) токенов старше 3 дней
     * @param {Object} client - Клиент базы данных (pg)
     * @returns {Promise<number>} Количество удаленных записей
     */
    async deleteOldRevokedTokens(client) {
        try {
            const result = await client.query(`
                DELETE FROM user_refresh_tokens
                WHERE revoked = TRUE 
                  AND revoked_at < NOW() - INTERVAL '3 days'
            `);
            return result.rowCount; // Возвращаем количество удаленных строк для возможного логирования
        } catch (error) {
            throw apiError.Internal('Ошибка удаления устаревших отозванных токенов: ' + error.message);
        }
    }
}

module.exports = new userRefreshTokenService();