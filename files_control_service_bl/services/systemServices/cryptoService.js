// services/systemServices/cryptoService.js
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

// =========================
//  Загрузка и проверка ключей
// =========================
const KEYS = {
  USER_NAME: process.env.CRYPTO_KEY_USER_NAME,
  USER_TG: process.env.CRYPTO_KEY_USER_TG,
  USER_PHONE: process.env.CRYPTO_KEY_USER_PHONE,
  USER_EMAIL: process.env.CRYPTO_KEY_USER_EMAIL,
  INCIDENT_NAME: process.env.CRYPTO_KEY_INCIDENT_NAME,
  INCIDENT_PHONE: process.env.CRYPTO_KEY_INCIDENT_PHONE,
  INCIDENT_TG: process.env.CRYPTO_KEY_INCIDENT_TG,
  API_KEY: process.env.CRYPTO_KEY_API_KEY,
  IDENTITY_KEY: process.env.CRYPTO_KEY_IDENTITY_KEY,
  // PASS_RESET_TOKEN: process.env.CRYPTO_KEY_PASS_RESET_TOKEN,
  // BACKUP_EMAIL: process.env.CRYPTO_KEY_BACKUP_EMAIL,
  FRONT_KEY_1: process.env.REACT_APP_BACKEND_SECRET_KEY,
  VERIFY_TOKEN_STRING: process.env.VERIFY_TOKEN_STRING,
};

// Проверка ключей
for (const [name, keyBase64] of Object.entries(KEYS)) {
  if (!keyBase64) {
    console.error(`🛑 ${name} ключ не установлен в .env!`);
    process.exit(1);
  }
  const keyBuf = Buffer.from(keyBase64, 'base64');
  if (keyBuf.length !== 32) {
    console.error(`🛑 ${name} ключ должен быть 32 байта после декодирования. Сейчас: ${keyBuf.length}`);
    process.exit(1);
  }
  KEYS[name] = keyBuf;
}

// =========================
//  Генерация API-ключа
// =========================
exports.generateApiKey = () => {
  return `api_${crypto.randomBytes(30).toString('hex')}`;
};

// =========================
//  Универсальное шифрование/дешифрование
// =========================
exports.encrypt = (text, type) => {
  const key = KEYS[type];
  if (!key) throw new Error(`Неизвестный тип данных для шифрования: ${type}`);

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

exports.decrypt = ({ encrypted, iv, authTag }, type) => {
  const key = KEYS[type];
  if (!key) throw new Error(`Неизвестный тип данных для дешифрования: ${type}`);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  try {
    return decipher.update(Buffer.from(encrypted, 'hex'), null, 'utf8') + decipher.final('utf8');
  } catch (e) {
    console.error('Decryption failed:', e.message);
    throw new Error('Не удалось расшифровать данные (неверный тег или повреждённые данные)');
  }
};

// =========================
//  Базовые хеш-функции
// =========================
const hashSha256 = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');
const hashSha512 = (text) => crypto.createHash('sha512').update(text, 'utf8').digest('hex');
const hmacSha256 = (text, key) => crypto.createHmac('sha256', key).update(text, 'utf8').digest('hex');

// Комбинированный хеш для большей безопасности
const combinedHash1 = (text, key) => hashSha256(hashSha512(hmacSha256(text, key)) + hmacSha256(text, key));
const combinedHash2 = (text, key) => hashSha512(hashSha256(hmacSha256(text, key)) + hmacSha256(text, key));
const combinedHash3 = (text, key) => hmacSha256(hashSha512(text) + hashSha256(text), key);
const combinedHash4 = (text, key) => hmacSha256(hashSha512(hashSha256(text) + hashSha512(text) + hashSha256(text)), key);

// =========================
//  Настройки хеширования по типам данных
// =========================
const HASH_CONFIG = {
  USER_NAME: (text) => combinedHash1(text, KEYS.USER_NAME),
  USER_TG: (text) => combinedHash2(text, KEYS.USER_TG),
  USER_PHONE: (text) => combinedHash3(text, KEYS.USER_PHONE),
  USER_EMAIL: (text) => combinedHash2(text, KEYS.USER_EMAIL),
  INCIDENT_NAME: (text) => combinedHash1(text, KEYS.INCIDENT_NAME),
  VERIFY_TOKEN_STRING: (text) => combinedHash3(text, KEYS.VERIFY_TOKEN_STRING),
  INCIDENT_PHONE: (text) => combinedHash2(text, KEYS.INCIDENT_PHONE),
  INCIDENT_TG: (text) => combinedHash3(text, KEYS.INCIDENT_TG),
  API_KEY: (text) => combinedHash4(text, KEYS.API_KEY),
  IDENTITY_KEY: (text) => combinedHash2(text, KEYS.IDENTITY_KEY),
  // PASS_RESET_TOKEN: (text) => combinedHash2(text, KEYS.PASS_RESET_TOKEN),
  // BACKUP_EMAIL: (text) => combinedHash2(text, KEYS.BACKUP_EMAIL)
};

// =========================
//  Универсальная функция хеширования
// =========================
exports.hashData = (text, type = "IDENTITY_KEY") => {
  const fn = HASH_CONFIG[type];
  if (!fn) throw new Error(`Неизвестный тип данных для хеширования: ${type}`);
  return fn(text);
};

// =========================
//  Экспорт отдельных функций (если нужно для совместимости)
exports.hashSha256 = hashSha256;
exports.hashSha512 = hashSha512;
exports.hmacSha256 = hmacSha256;
exports.combinedHash1 = combinedHash1;
exports.combinedHash2 = combinedHash2;
exports.combinedHash3 = combinedHash3;


/**
 * Расшифровка данных с фронта, зашифрованных AES-CBC
 * Формат данных: { encrypted, iv } — обе строки hex
 * @param {Object} param0
 * @param {string} param0.encrypted - зашифрованный текст в hex
 * @param {string} param0.iv - вектор инициализации в hex
 * @param {string} type - ключ из KEYS, например "FRONT_KEY_1"
 * @returns {Object} - распарсенный JSON объект
 */
exports.decryptFrontCBC = ({ encrypted, iv }, type = "FRONT_KEY_1") => {
  const key = KEYS[type];
  if (!key) throw new Error(`Неизвестный тип данных для расшифровки: ${type}`);

  try {
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, Buffer.from(iv, "hex"));
    let decrypted = decipher.update(Buffer.from(encrypted, "hex"));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return JSON.parse(decrypted.toString("utf8"));
  } catch (e) {
    console.error("[ERROR] decryptFrontCBC failed:", e.message);
    throw new Error("Не удалось расшифровать данные с фронта (CBC)");
  }
};
