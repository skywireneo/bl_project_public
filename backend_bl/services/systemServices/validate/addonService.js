class addonService {

    validateString(str, characteristics, limits) {
        const [minLength, maxLength] = limits;
        if (minLength > maxLength) {
            throw new Error('Административная ошибка лимитов, обратитесь к администратору');
        }
        const patterns = {
            'E': { regex: 'A-Z', description: 'английские заглавные буквы (A-Z)' },
            'R': { regex: 'А-Я', description: 'русские заглавные буквы (А-Я)' },
            'e': { regex: 'a-z', description: 'английские строчные буквы (a-z)' },
            'r': { regex: 'а-я', description: 'русские строчные буквы (а-я)' },
            'n': { regex: '0-9', description: 'цифры (0-9)' },
            's': { regex: '\\/!?+=:\\-*. _,', description: 'спецсимволы (/!?+=:-*. _,)' },
            'z': { regex: '\\*', description: 'спецсимволы (*)' },
            'p': { regex: '\\s', description: 'пробелы' },
        };
        let regexParts = characteristics.map(char => patterns[char]?.regex).join('');
        let regexStr = `^[${regexParts}]{${minLength},${maxLength}}$`;
        if (characteristics.includes('n') && characteristics.length === 1) {
            regexStr = `^[0-9]{${minLength},${maxLength}}$`;
        }
        let regex = new RegExp(regexStr);
        const isValid = regex.test(str);
        if (!isValid) {
            const descriptions = characteristics
                .map(char => patterns[char]?.description)
                .filter(Boolean);
            const requirements = descriptions.join(', ');
            const lengthRange = minLength === maxLength
                ? `ровно ${minLength} символа(ов)`
                : `от ${minLength} до ${maxLength} символов`;
            const errorMessage = ` (${str}): Разрешено использовать: ${requirements}. Длина строки должна быть ${lengthRange}.`;
            return { isValid: false, error: errorMessage };
        }
        return { isValid: true };
    }

    validateBoolean(value) {
        if (value !== "true" && value !== "false" && value !== true && value !== false) {
            return {
                isValid: false,
                error: 'Значение должно быть "true" или "false"'
            };
        }
        return { isValid: true, value: value === "true" || value === true };
    }
}

module.exports = new addonService();