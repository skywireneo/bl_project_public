/**
 * Продвинутый сервис маскирования персональных данных (ПДн).
 * Реализует пропорциональное и структурное скрытие данных для защиты от утечек,
 * сохраняя при этом узнаваемость для операторов поддержки.
 */

/**
 * Маскирует телефон.
 * Оставляет видимыми первые 4 символа (например, "+799" или "8916") 
 * и последние 2 символа, маскируя середину.
 * @param {string|number} phone - полный телефон.
 * @returns {string|null} - замаскированный телефон или null.
 */
function maskPhone(phone) {
    if (phone === null || phone === undefined || phone === '') return null;

    const str = String(phone).trim();
    // Если номер слишком короткий (например, внутренний добавочный), не маскируем или возвращаем как есть
    if (str.length < 6) return str;

    const visibleStart = 4;
    const visibleEnd = 2;
    const maskedLen = str.length - visibleStart - visibleEnd;

    // Дополнительная защита от отрицательного значения repeat
    if (maskedLen <= 0) return str;

    return str.slice(0, visibleStart) + '*'.repeat(maskedLen) + str.slice(-visibleEnd);
}

/**
 * Маскирует числовой Telegram ID.
 * Оставляет первые 2 символа, остальные заменяет на '*'.
 * @param {string|number} tgId - числовой ID Telegram.
 * @returns {string|null}
 */
function maskTgId(tgId) {
    if (tgId === null || tgId === undefined || tgId === '') return null;

    const str = String(tgId).trim();
    if (str.length <= 2) return str; // Защита для очень коротких ID

    return str.slice(0, 2) + '*'.repeat(str.length - 2);
}

/**
 * Маскирует имя пользователя Telegram (username).
 * Гарантированно сохраняет символ '@' в начале, если он есть.
 * Применяет пропорциональное маскирование: оставляет ~40% имени, но не менее 2 символов.
 * @param {string} tgName - username (с '@' или без).
 * @returns {string|null}
 */
function maskTgName(tgName) {
    if (!tgName || typeof tgName !== 'string') return null;

    let str = tgName.trim();
    const hasAt = str.startsWith('@');
    const namePart = hasAt ? str.slice(1) : str;

    // Если имя слишком короткое (1-2 символа после @), не маскируем его полностью
    if (namePart.length <= 2) return str;

    // Оставляем минимум 2 символа или 40% от длины, округляя вниз
    const visibleCount = Math.max(2, Math.floor(namePart.length * 0.4));
    const maskedCount = namePart.length - visibleCount;

    const maskedName = namePart.slice(0, visibleCount) + '*'.repeat(maskedCount);
    return hasAt ? '@' + maskedName : maskedName;
}

/**
 * Маскирует ФИО.
 * Каждое слово обрабатывается пропорционально:
 * - Инициалы (типа "И.") остаются без изменений.
 * - Короткие имена (2-3 буквы, например "Ян", "Ева"): маскируется всё, кроме первой буквы ("Я*", "Е**").
 * - Средние и длинные слова: маскируется 50% символов в конце (но видно минимум 2 символа).
 * @param {string} rawName - полное ФИО (например, "Иванов Иван Иванович").
 * @param {number} maskPercent - доля маскируемой части (по умолчанию 0.5 = 50%).
 * @returns {string|null}
 */
function maskFIO(rawName, maskPercent = 0.5) {
    if (!rawName || typeof rawName !== 'string') return null;

    return rawName
        .trim()
        .split(/\s+/)
        .map(word => {
            if (word.length === 0) return word;

            // Если это инициал (1-2 символа и заканчивается на точку), не трогаем
            if (word.length <= 2 && word.endsWith('.')) return word;

            // Для очень коротких слов (2-3 буквы) оставляем только первую букву
            if (word.length <= 3) {
                return word[0] + '*'.repeat(word.length - 1);
            }

            // Для нормальных слов: вычисляем количество видимых символов
            const visibleCount = Math.max(2, Math.floor(word.length * (1 - maskPercent)));
            const maskedCount = word.length - visibleCount;

            return word.slice(0, visibleCount) + '*'.repeat(maskedCount);
        })
        .join(' ');
}

/**
 * Маскирует дату рождения.
 * Оставляет только год, месяц и день заменяет на '**'.
 * Поддерживает форматы: YYYY-MM-DD, DD-MM-YYYY, DD.MM.YYYY и объекты Date.
 * @param {string|Date|null} birthDate - дата рождения.
 * @returns {string|null} - строка в формате "YYYY-**-**" или null при невалидных данных.
 */
function maskBirthDate(birthDate) {
    if (birthDate === null || birthDate === undefined) return null;

    let yyyy, mm, dd;

    if (birthDate instanceof Date) {
        if (isNaN(birthDate.getTime())) return null;
        yyyy = birthDate.getFullYear(); // Используем локальный год, или getUTCFullYear() если даты в UTC
        mm = String(birthDate.getMonth() + 1).padStart(2, '0');
        dd = String(birthDate.getDate()).padStart(2, '0');
    } else if (typeof birthDate === 'string') {
        const trimmed = birthDate.trim();
        if (!trimmed) return null;

        // Поддерживаем YYYY-MM-DD, YYYY/MM/DD, DD-MM-YYYY, DD.MM.YYYY
        const match = trimmed.match(
            /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$|^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/
        );

        if (!match) return null; // Нераспознанный формат

        if (match[1]) {
            // Формат YYYY-MM-DD
            yyyy = parseInt(match[1], 10);
            mm = parseInt(match[2], 10);
            dd = parseInt(match[3], 10);
        } else {
            // Формат DD-MM-YYYY
            dd = parseInt(match[4], 10);
            mm = parseInt(match[5], 10);
            yyyy = parseInt(match[6], 10);
        }
    } else {
        return null;
    }

    // Базовая валидация (защита от мусорных данных вроде года 9999 или месяца 13)
    const currentYear = new Date().getFullYear();
    if (yyyy < 1900 || yyyy > currentYear + 1) return null;
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

    // Возвращаем стандартизированный замаскированный формат
    return `${String(yyyy).padStart(4, '0')}-**-**`;
}

module.exports = {
    maskPhone,
    maskTgId,
    maskTgName,
    maskFIO,
    maskBirthDate
};