const jwt = require('jsonwebtoken')
const { hashData } = require('./cryptoService')
const crypto = require('crypto');

const TOKEN_EXPIRY = process.env.GRPC_TOKEN_EXPIRY * 60 * 1000;
class tokenService {

    generateTokens(payload, tokenType = 'access') {
        const payloadString = JSON.stringify(payload);
        payload = {
            data: payload,
            verify: hashData(payloadString, "VERIFY_TOKEN_STRING"),
            type: tokenType
        }

        if (tokenType === 'refresh') {
            return jwt.sign(payload, process.env.BACKEND_ACCESS_TOKEN_SECRET_KEY, { expiresIn: '30d' })
        } else {
            return jwt.sign(payload, process.env.BACKEND_ACCESS_TOKEN_SECRET_KEY, { expiresIn: '30m' })
        }
    }

    validateToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.BACKEND_ACCESS_TOKEN_SECRET_KEY)

            // Валидация по строке payload
            const originalPayloadString = JSON.stringify(decoded.data);
            const expectedVerify = hashData(originalPayloadString, "VERIFY_TOKEN_STRING");

            if (decoded.verify !== expectedVerify) {
                console.log('Token verification failed: hash mismatch');
                return null;
            }

            return decoded;
        } catch (e) {
            console.log('Token validation error:', e.message);
            return null;
        }
    }

    /**
     * Валидирует токен
     * 
     * @param {string} token - токен для проверки
     * @param {Object} [expectedData] - ожидаемые данные (опционально)
     * @returns {Object} { valid: boolean, error?: string, decoded?: Object }
     */
    validateServiceToken(token, expectedData = null) {
        try {
            const parts = token.split(':');
            if (parts.length !== 4) {
                return { valid: false, error: 'Неверный формат токена' };
            }

            const [timestamp, expiry, dataHash, signature] = parts;
            const now = Date.now();
            const expiryTime = parseInt(expiry, 10);

            // Проверяем срок действия
            if (now > expiryTime) {
                return { valid: false, error: 'Токен истёк' };
            }

            // Проверяем, что timestamp не из будущего (допуск 1 минута)
            const timestampNum = parseInt(timestamp, 10);
            if (timestampNum > now + 60000) {
                return { valid: false, error: 'Токен из будущего' };
            }

            // Восстанавливаем подпись и проверяем
            const signatureInput = `${timestamp}.${expiry}.${dataHash}`;
            const expectedSignature = hashData(signatureInput, 'VERIFY_TOKEN_STRING');

            if (signature !== expectedSignature) {
                return { valid: false, error: 'Неверная подпись токена' };
            }

            // Проверяем данные если переданы
            if (expectedData) {
                const expectedHash = hashData(JSON.stringify(expectedData), 'VERIFY_TOKEN_STRING');
                if (dataHash !== expectedHash) {
                    return { valid: false, error: 'Данные не соответствуют токену' };
                }
            }

            return {
                valid: true,
                decoded: { timestamp: timestampNum, expiry: expiryTime, dataHash }
            };
        } catch (error) {
            return { valid: false, error: `Ошибка валидации: ${error.message}` };
        }
    }

    /**
     * Извлекает и валидирует токен из gRPC метаданных
     * 
     * @param {Object} metadata - gRPC metadata
     * @returns {Object} { valid: boolean, decoded?: Object, error?: string }
     */
    validateMetadataToken(metadata) {
        try {
            const metadataMap = metadata.getMap ? metadata.getMap() : metadata;

            if (!metadataMap || !metadataMap['authorization']) {
                return { valid: false, error: 'Нет токена в метаданных' };
            }

            const authHeader = metadataMap['authorization'];
            const token = authHeader.toString().replace('Bearer ', '').trim();

            if (!token) {
                return { valid: false, error: 'Пустой токен' };
            }

            return this.validateServiceToken(token);
        } catch (error) {
            return { valid: false, error: `Ошибка извлечения токена: ${error.message}` };
        }
    }

    validateRefreshToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, process.env.BACKEND_ACCESS_TOKEN_SECRET_KEY);

            // Валидация по строке payload
            const originalPayloadString = JSON.stringify(decoded.data);
            const expectedVerify = hashData(originalPayloadString, "VERIFY_TOKEN_STRING");

            if (decoded.verify !== expectedVerify) {
                console.log('Refresh token verification failed: hash mismatch');
                return null;
            }

            // Проверяем тип токена
            if (decoded.type !== 'refresh') {
                console.log('Invalid token type for refresh');
                return null;
            }

            return decoded;
        } catch (e) {
            console.log('Refresh token validation error:', e.message);
            return null;
        }
    }

    generateAccessToken(payload) {
        return this.generateTokens(payload, 'access');
    }

    generateRefreshToken(payload) {
        return this.generateTokens(payload, 'refresh');
    }

    /**
     * Генерирует простой токен на основе данных и времени
     * Формат: timestamp:expiry:dataHash:signature
     * 
     * @param {Object} data - данные для токена
     * @returns {string} токен
     */
    generateServiceToken() {
        const timestamp = Date.now().toString();
        const expiry = (Date.now() + TOKEN_EXPIRY).toString();

        // Генерируем рандомное число (16 байт = 32 hex символа)
        const nonce = crypto.randomBytes(16).toString('hex');

        // Создаем подпись: timestamp + expiry + nonce + secret
        const signatureInput = `${timestamp}.${expiry}.${nonce}`;
        const signature = hashData(signatureInput, 'VERIFY_TOKEN_STRING');

        // Формат: timestamp:expiry:nonce:signature
        return `${timestamp}:${expiry}:${nonce}:${signature}`;
    }

    refreshTokens(refreshToken) {
        try {
            const decoded = this.validateRefreshToken(refreshToken);
            if (!decoded) {
                return null;
            }

            // Генерируем новые токены на основе данных из refresh токена
            const newAccessToken = this.generateAccessToken(decoded.data);
            const newRefreshToken = this.generateRefreshToken(decoded.data);

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            };
        } catch (error) {
            console.log('Token refresh error:', error.message);
            return null;
        }
    }

}

module.exports = new tokenService();