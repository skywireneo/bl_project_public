// middleware/apiKeyMiddleware.js
// const queryService = require('../services/systemServices/queryService');
// const { decrypt, hashData } = require('../services/systemServices/cryptoService');
// const apiError = require('../exceptions/apiError');
// const logService = require('../services/logService'); // <-- добавлено

const apiKeyMiddleware = async (req, res, next) => {
  // const apiKey = req.headers['x-api-key'];

  // if (!apiKey) {
  //   logService.forContext({
  //     log_meta_id: 'AC020',
  //     segment: 'API_CONTROL',
  //     type_of_action: 'GET',
  //     subsegment: 'INDIRECT_ACTIONS'
  //   })
  //       .inaccessible(`Попытка доступа без API-ключа`);
  //   return next(apiError.BadRequest('API_KEY_REQUIRED', 'Требуется x-api-key'));
  // }

  // try {
  //   const hash = hashData(apiKey, "API_KEY");

  //   // 1. Быстрый поиск по хэшу
  //   const result = await queryService.query(
  //     `SELECT 
  //       id, key_encrypted, key_iv, key_auth_tag, 
  //       name, user_id, tier, is_active, expires_at, 
  //       usage_count, usage_limit 
  //     FROM api_keys 
  //     WHERE key_hash_sha256 = $1 
  //       AND is_active = true 
  //       AND (expires_at IS NULL OR expires_at > NOW())`,
  //     [hash]
  //   );

  //   if (result.rows.length === 0) {
  //     logService.forContext({
  //       log_meta_id: 'AC021',
  //       segment: 'API_CONTROL',
  //       type_of_action: 'GET',
  //       subsegment: 'INDIRECT_ACTIONS'
  //     })
  //         .inaccessible(`Попытка использования недействительного или неактивного API-ключа (хэш: ${hash.substring(0, 16)}...)`);
  //     return next(apiError.BadRequest('API_KEY_INVALID', 'Ключ не найден или неактивен'));
  //   }

  //   const row = result.rows[0];

  //   // 2. Расшифровываем и проверяем (защита от коллизий)
  //   let decrypted;
  //   try {
  //     decrypted = decrypt({
  //       encrypted: row.key_encrypted,
  //       iv: row.key_iv,
  //       authTag: row.key_auth_tag,
  //     }, "API_KEY");
  //   } catch (e) {
  //     logService.forContext({
  //       log_meta_id: 'AC022',
  //       segment: 'API_CONTROL',
  //       type_of_action: 'GET',
  //       subsegment: 'INDIRECT_ACTIONS',
  //       record_id: row.id
  //     })
  //         .systemError(`Ошибка расшифровки API-ключа ID ${row.id}: ${e.message || e}`);
  //     return next(apiError.BadRequest('API_KEY_DECRYPT_ERROR', 'Ошибка расшифровки'));
  //   }

  //   if (decrypted !== apiKey) {
  //     logService.forContext({
  //       log_meta_id: 'AC023',
  //       segment: 'API_CONTROL',
  //       type_of_action: 'GET',
  //       subsegment: 'INDIRECT_ACTIONS',
  //       record_id: row.id
  //     })
  //         .inaccessible(`Попытка использования поддельного API-ключа (ID: ${row.id}, хэш: ${hash.substring(0, 16)}...)`);
  //     return next(apiError.BadRequest('API_KEY_MISMATCH', 'Ключ не прошёл проверку'));
  //   }

  //   // 3. Проверка лимита
  //   const usageCount = Number(row.usage_count);
  //   const usageLimit = Number(row.usage_limit);

  //   if (!isNaN(usageLimit) && usageCount >= usageLimit) {
  //     logService.forContext({
  //       log_meta_id: 'AC024',
  //       segment: 'API_CONTROL',
  //       type_of_action: 'GET',
  //       subsegment: 'INDIRECT_ACTIONS',
  //       record_id: row.id
  //     })
  //         .inaccessible(`Попытка использования API-ключа ID ${row.id} после превышения лимита (использовано: ${usageCount}, лимит: ${usageLimit})`);
  //     return next(apiError.BadRequest('API_KEY_LIMIT_EXCEEDED', 'Превышен лимит запросов'));
  //   }

  //   // 4. Обновляем счётчик
  //   await queryService.query(
  //     `UPDATE api_keys 
  //      SET usage_count = usage_count + 1, last_used_at = NOW() 
  //      WHERE id = $1`,
  //     [row.id]
  //   );

  //   // 5. Добавляем в req
  //   req.apiKey = {
  //     id: row.id,
  //     name: row.name,
  //     user_id: row.user_id,
  //     tier: row.tier,
  //     usage_count: row.usage_count + 1,
  //   };

  next();
  // } catch (e) {
  //   logService.forContext({
  //     log_meta_id: 'AC025',
  //     segment: 'API_CONTROL',
  //     type_of_action: 'GET',
  //     subsegment: 'INDIRECT_ACTIONS'
  //   })
  //       .systemError(`Необработанная ошибка в apiKeyMiddleware: ${e.message || e}`);
  //   console.error('API Key Middleware Error:', e);
  //   return next(apiError.BadRequest('API_KEY_ERROR', 'Ошибка при проверке ключа'));
  // }
};

module.exports = apiKeyMiddleware;