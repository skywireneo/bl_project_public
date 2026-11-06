const crypto = require('crypto');

//  В продакшене обязательно вынесите в .env (process.env.OWNER_TOKEN_SECRET)
const SECRET = process.env.CRYPTO_KEY_IDENTITY_KEY || 'super_secret_key_for_owner_token_2024';

class OwnerTokenService {
    /**
     * Генерирует HMAC-токен на основе ID инцидента и email
     */
    generateOwnerToken(incidentId, email) {
        const hmac = crypto.createHmac('sha256', SECRET);
        hmac.update(`${incidentId}:${email.toLowerCase().trim()}`);
        return hmac.digest('hex');
    }

    /**
     * Проверяет валидность токена (используем timingSafeEqual для защиты от timing-атак)
     */
    verifyOwnerToken(incidentId, email, token) {
        if (!token || !email) return false;
        const expected = this.generateOwnerToken(incidentId, email);

        const expectedBuf = Buffer.from(expected, 'hex');
        const tokenBuf = Buffer.from(token, 'hex');

        if (expectedBuf.length !== tokenBuf.length) return false;
        return crypto.timingSafeEqual(expectedBuf, tokenBuf);
    }
}

module.exports = new OwnerTokenService();