// const rateLimit = require('express-rate-limit');
// const { ipKeyGenerator } = require('express-rate-limit');
// // const logService = require('../services/logService'); // <-- добавлено

// // Дефолтный лимит для публичных запросов (без API-ключа)
// const DEFAULT_PUBLIC_LIMIT = {
//   windowMs: 60 * 1000, // 1 минута
//   max: 10,
// };

// // Лимиты по тарифу (для API-ключей)
// const API_LIMITS = {
//   free: { max: 100, windowMs: 60 * 1000 },
//   pro: { max: 1000, windowMs: 60 * 1000 },
//   enterprise: { max: 5000, windowMs: 60 * 1000 },
// };

// /**
//  * 1. Публичный лимит — можно переопределить на уровне роута
//  */
// const createPublicRateLimiter = (options = {}) => {
//   const { windowMs, max } = {
//     windowMs: options.windowMs || DEFAULT_PUBLIC_LIMIT.windowMs,
//     max: options.max || DEFAULT_PUBLIC_LIMIT.max,
//   };

//   return rateLimit({
//     windowMs,
//     max,
//     message: {
//       error: 'RATE_LIMIT_EXCEEDED',
//       message: `Слишком много запросов. Лимит: ${max} за ${windowMs / 1000} сек.`,
//     },
//     keyGenerator: (req, res) => ipKeyGenerator(req),
//     standardHeaders: true,
//     legacyHeaders: false,
//     skip: (req) => req.apiKey,
//     handler: (req, res, next, options) => {
//       // Логируем превышение публичного лимита
//       const ip = req.ip || req.connection.remoteAddress;
//       logService.forContext({
//         log_meta_id: 'AC040',
//         segment: 'API_CONTROL',
//         type_of_action: 'GET',
//         subsegment: 'INDIRECT_ACTIONS'
//       })
//           .inaccessible(`Превышен публичный лимит запросов с IP: ${ip} (лимит: ${max}/${windowMs / 1000}с)`);
      
//       res.status(options.statusCode).send(options.message);
//     }
//   });
// };

// /**
//  * 2. Лимит для API-ключей (по tier)
//  */
// const apiRateLimiter = rateLimit({
//   windowMs: (req) => {
//     const tier = req.apiKey?.tier || 'free';
//     return API_LIMITS[tier]?.windowMs || API_LIMITS.free.windowMs;
//   },
//   max: (req) => {
//     const tier = req.apiKey?.tier || 'free';
//     return API_LIMITS[tier]?.max || API_LIMITS.free.max;
//   },
//   message: (req) => {
//     const tier = req.apiKey?.tier || 'free';
//     return {
//       error: 'RATE_LIMIT_EXCEEDED',
//       message: `Превышен лимит запросов для тарифа "${tier}".`,
//     };
//   },
//   keyGenerator: (req, res) => {
//     if (req.apiKey) return `api_${req.apiKey.id}`;
//     return ipKeyGenerator(req);
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   skip: (req) => !req.apiKey,
//   handler: (req, res, next, options) => {
//     // Логируем превышение лимита API-ключа
//     if (req.apiKey) {
//       logService.forContext({
//         log_meta_id: 'AC041',
//         segment: 'API_CONTROL',
//         type_of_action: 'GET',
//         subsegment: 'INDIRECT_ACTIONS',
//         record_id: req.apiKey.id
//       })
//           .inaccessible(`Превышен лимит API-ключа ID ${req.apiKey.id} (тариф: ${req.apiKey.tier})`);
//     } else {
//       const ip = req.ip || req.connection.remoteAddress;
//       logService.forContext({
//         log_meta_id: 'AC042',
//         segment: 'API_CONTROL',
//         type_of_action: 'GET',
//         subsegment: 'INDIRECT_ACTIONS'
//       })
//           .inaccessible(`Превышен лимит запросов с IP: ${ip} (без API-ключа)`);
//     }
    
//     res.status(options.statusCode).send(options.message);
//   }
// });

// module.exports = {
//   createPublicRateLimiter,
//   apiRateLimiter,
//   DEFAULT_PUBLIC_LIMIT,
//   API_LIMITS,
// };