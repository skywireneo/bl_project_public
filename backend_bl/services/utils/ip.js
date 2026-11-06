// вариант 1: присвоение функции в exports
module.exports.getClientIp = function (req) {
    if (!req) return null;
    const xff = req.headers['x-forwarded-for'] || '';
    if (xff) {
        const ip = xff.split(',')[0].trim();
        if (ip) return ip;
    }
    if (req.headers['x-real-ip']) return req.headers['x-real-ip'];
    return req.socket?.remoteAddress || null;
};
