const apiError = require('../../../exceptions/apiError');
// const addonService = require('./addonService');
const { validateString } = require('./addonService');
const ValidateIncService = require('./validateIncService');
// const ValidatePostService = require('./validatePostService');
const ValidatePVZService = require('./validatePVZService');
// const ValidateReasonService = require('./validateReasonService');
// const ValidateStatusService = require('./validateStatusService');
// const validateAccessService = require('./validateAccessService');
const ValidateUserService = require('./validateUserService');
// const validateDialogService = require('./validateDialogService');
// const validateMessageService = require('./validateMessageService');
// const validateChatReasonService = require('./validateChatReasonService');
const validatePersoneService = require('./validatePersoneService');
// const validateContestationService = require('./validateContestationService');

class ValidateService {
    constructor() {
        this.validateTgUsername = this._validateTgUsername;
        //         this.validateTgId = this._validateTgId;
        //         this.validateActive = this._validateTrueFalse;
        //         this.validateIncidentId = this._validateIncidentId;
        //         this.validatePegablePage = this._validatePegablePage;
        //         this.validatePegableCount = this._validatePegableLimit;
        //         this.validateNumber = this._validateNumber;
        //         this.validateSearchStr = this._validateSearchStr;
        this.validateEmail = this._validateEmail;
        this.getTrustedEmailProviders = this._getTrustedEmailProviders;

        this.incidentValidation = new ValidateIncService();
        //         this.reasonValidation = new ValidateReasonService();
        this.pvzValidation = new ValidatePVZService();
        //         this.postValidation = new ValidatePostService();
        this.userValidation = new ValidateUserService();
        //         this.statusValidation = new ValidateStatusService();
        //         this.accessValidation = new validateAccessService();
        //         this.messageValidation = new validateMessageService();
        //         this.dialogValidation = new validateDialogService();
        //         this.chatReasonService = new validateChatReasonService();
        this.personeValidation = new validatePersoneService();
        //         this.contestationValidation = new validateContestationService();
    }

    _validateTgUsername(username) {
        const validation = validateString(username, ['E', 'e', 's', 'n'], [1, 35]);
        if (!validation.isValid) {
            throw apiError.BadRequest('VALIDATE_ERROR', `Неправильный формат tg username пользователя` + validation.error);
        }
    }

    //     _validateTgId(id) {
    //         const validation = validateString(id, ['n'], [1, 12]);
    //         if (!validation.isValid) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', `Неправильный формат tg id пользователя` + validation.error);
    //         }
    //     }

    //     _validateTrueFalse(active) {
    //         const validation = addonService.validateBoolean(active);
    //         if (!validation.isValid) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', `Неверное значение параметра: ${validation.error}`);
    //         }
    //         return validation.value;
    //     }

    //     _validateTrueFalseOrAll(active) {
    //         if (active != 'all') {
    //             const validation = addonService.validateBoolean(active);
    //             if (!validation.isValid) {
    //                 throw apiError.BadRequest('VALIDATE_ERROR', `Неверное значение параметра: ${validation.error}`);
    //             }
    //         }
    //         return validation.value;
    //     }

    //     _validateIncidentId(incidentId) {
    //         //////////////////TODO Добавить валидацию
    //     }

    //     _validatePegablePage(page) {
    //         const validation = validateString(page, ['n'], [1, 12]);
    //         if (!validation.isValid) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', `Неверное значение параметра page: ${validation.error}`);
    //         }
    //     }

    //     _validatePegableLimit(count) {
    //         const validation = validateString(count, ['n'], [1, 12]);
    //         if (!validation.isValid) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', `Неверное значение параметра count: ${validation.error}`);
    //         }
    //     }

    //     _validateNumber(number) {
    //         const validation = validateString(number, ['n'], [1, 12]);
    //         if (!validation.isValid) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', `Неверное значение параметра числа: ${validation.error}`);
    //         }
    //     }

    //     _validateSearchStr(str) {
    //         const validation = validateString(str, ['E', 'e', 'R', 'r', 's', 'n', 'p'], [0, 100]);
    //         if (!validation.isValid) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', `Неправильный формат строки поиска` + validation.error);
    //         }
    //     }

    //     _validateContestationId(contestationId) {
    //         const validation = validateString(contestationId, ['n'], [1, 12]);
    //         if (!validation.isValid) {
    //             throw apiError.BadRequest('VALIDATE_ERROR', `Неверное значение параметра contestationId: ${validation.error}`);
    //         }
    //     }

    /**
     * Валидация email: проверка формата и вхождение домена в список доверенных провайдеров
     * @param {string} email 
     */
    _validateEmail(email) {
        if (!email || typeof email !== 'string') {
            throw apiError.BadRequest('VALIDATE_ERROR', 'Email не указан или имеет неверный тип');
        }

        // Базовая проверка синтаксиса email
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            throw apiError.BadRequest('VALIDATE_ERROR', 'Неправильный формат email');
        }

        // Извлекаем домен и проверяем по списку доверенных
        const domain = email.split('@')[1].toLowerCase();
        const trustedProviders = this._getTrustedEmailProviders();

        if (!trustedProviders.includes(domain)) {
            throw apiError.BadRequest('VALIDATE_ERROR', `Провайдер email "${domain}" не входит в список доверенных`);
        }
    }

    /**
     * Возвращает массив доверенных email-провайдеров
     * @returns {string[]}
     */
    _getTrustedEmailProviders() {
        return [
            // Google
            'gmail.com',
            'googlemail.com',

            // Microsoft
            'outlook.com',
            'hotmail.com',
            'live.com',
            'msn.com',

            // Yahoo
            'yahoo.com',
            'yahoo.co.uk',
            'yahoo.fr',
            'yahoo.de',
            'yahoo.it',
            'yahoo.es',
            'ymail.com',
            'rocketmail.com',

            // Apple
            'icloud.com',
            'me.com',
            'mac.com',

            // Mail.ru Group
            'mail.ru',
            'inbox.ru',
            'list.ru',
            'bk.ru',

            // Yandex
            'yandex.ru',
            'yandex.com',
            'yandex.by',
            'yandex.kz',
            'ya.ru',

            // Rambler
            'rambler.ru',
            'lenta.ru',
            'autorambler.ru',
            'myrambler.ru',
            'ro.ru',

            // Безопасные / Приватные сервисы
            'protonmail.com',
            'proton.me',
            'pm.me',
            'tutanota.com',
            'tutanota.de',
            'tutamail.com',

            // Другие популярные международные
            'aol.com',
            'zoho.com',
            'zohomail.com',
            'mail.com',
            'gmx.com',
            'gmx.net',
            'web.de',
            'freenet.de',
            'fastmail.com',
            'hushmail.com',

            // Для импорта
            'nonemail.nonemail'
        ];
    }
}

module.exports = ValidateService;