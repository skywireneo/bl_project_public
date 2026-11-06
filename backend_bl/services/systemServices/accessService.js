// // services/accessService.js
// const apiError = require('../../exceptions/apiError');
// const queryService = require('./queryService');

// class accessService {
//     /**
//      * Получить сырые доступы пользователя из БД
//      * @param {number} userId
//      * @returns {Promise<any[]>} массив raw-access
//      */
//     static async getRawUserAccesses(userId) {
//         const res = await queryService.query(
//             `SELECT access FROM users WHERE user_id = $1`,
//             [userId]
//         );
//         return res.rows[0]?.access || [];
//     }

//     /**
//      * Получить нормализованные доступы пользователя (массив строк)
//      * @param {number} userId
//      * @returns {Promise<string[]>}
//      */
//     static async getUserAccesses(userId) {
//         const raw = await accessService.getRawUserAccesses(userId);
//         return Array.isArray(raw)
//             ? raw.map(item => {
//                 if (!item && item !== 0) return '';
//                 if (typeof item === 'string') return item;
//                 if (typeof item === 'number') return String(item);
//                 if (typeof item === 'object') return item.code_name || item.codeName || item.code || item.name || item.access || '';
//                 return String(item);
//             }).filter(Boolean)
//             : [];
//     }

//     /**
//      * Проверка, есть ли нужные доступы
//      * @param {string[]} userAccesses - массив доступов пользователя
//      * @param {string[]} requiredAccesses - массив требуемых доступов
//      * @param {'all'|'any'} mode - проверять все или хотя бы один
//      */
//     static checkAccess(userAccesses, requiredAccesses, mode = 'all') {
//         if (!requiredAccesses.length) return true;

//         if (mode === 'any') {
//             return requiredAccesses.some(acc => userAccesses.includes(acc));
//         } else {
//             return requiredAccesses.every(acc => userAccesses.includes(acc));
//         }
//     }

//     /**
//      * Проверка доступа с выбросом ошибки
//      * @param {number} userId
//      * @param {string[]} requiredAccesses
//      * @param {'all'|'any'} mode
//      */
//     static async requireAccess(userId, requiredAccesses = [], mode = 'all') {
//         const accesses = await this.getUserAccesses(userId);
//         const ok = this.checkAccess(accesses, requiredAccesses, mode);
//         if (!ok) {
//             throw apiError.BadRequest('NO_ACCESS', 'Доступ запрещён');
//         }
//         return accesses;
//     }
// }

// module.exports = accessService;
