// systemServices/translitService.js

// Подключаем metaphone через динамический импорт
let metaphone;

// Асинхронная инициализация
async function loadMetaphone() {
    if (!metaphone) {
        const module = await import('metaphone');
        metaphone = module.metaphone; //  Правильно: module.metaphone
    }
    return metaphone;
}

const rusToEng = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
    'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i',
    'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
    'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
    'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch',
    'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '',
    'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D',
    'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh', 'З': 'Z', 'И': 'I',
    'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N',
    'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T',
    'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch',
    'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '', 'Ы': 'Y', 'Ь': '',
    'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
};

function translit(str) {
    return str.split('').map(char => rusToEng[char] || char).join('');
}

function normalizeForSearch(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .trim()
        .replace(/[ё]/g, 'е')
        .replace(/[ъь]/g, '')
        .replace(/\s+/g, ' ');
}

// Асинхронная функция генерации фонетических хешей
async function getPhoneticTokenHashes(fio) {
    const metaphone = await loadMetaphone(); //  Теперь это функция
    const tokens = normalizeForSearch(fio).split(' ').filter(Boolean);
    return tokens.map(token => {
        const transliterated = translit(token);
        return metaphone(transliterated); //  Теперь работает
    });
}

module.exports = { getPhoneticTokenHashes, normalizeForSearch, translit };