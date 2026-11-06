const pgdb = require('../pgdb');
const searchHistoryService = require('../services/search/searchHistoryService');
const hmacService = require('../services/systemServices/hmacService');
const { generateSearchReportPDF } = require('../services/pdf/incidentReportPdfService');
const tokenService = require('../services/systemServices/tokenService');
const apiError = require('../exceptions/apiError');

const EXPIRE_DAYS = 10;

class reportController {

    async generatePersonReport(req, res, next) {
        const client = await pgdb.connect();
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) throw apiError.Unauthorized();
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;
            if (!current_user) throw apiError.Unauthorized();

            const { group_data, signature } = req.body;
            if (!group_data) throw apiError.BadRequest('NO_DATA', 'Не переданы данные для отчёта');

            if (!signature) {
                throw apiError.BadRequest('MISSING_SIGNATURE', 'Отсутствует подпись данных.');
            }
            const signData = hmacService.extractPersonSignData(group_data);
            if (!hmacService.verify(signData, signature)) {
                throw apiError.Forbidden('INVALID_SIGNATURE', 'Подпись данных недействительна.');
            }

            const requestIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                || req.ip || req.socket.remoteAddress;
            const deviceId = req.headers['x-device-id'] || null;

            const expiresAt = new Date(Date.now() + EXPIRE_DAYS * 24 * 60 * 60 * 1000).toISOString();

            const historyData = await searchHistoryService.addToHistoryWithReturn(client, {
                email: current_user.email || 'unknown',
                user_id: current_user.user_id || current_user.id || null,
                search_type: 'person',
                search_params: {
                    source: 'pdf_export',
                    group_id: group_data.group_id || null
                },
                result_status: 'found',
                report_data: group_data,
                request_ip: requestIp,
                device_id: deviceId,
                expires_at: expiresAt
            });

            const frontendUrl = process.env.REACT_APP_FRONTEND_URL || process.env.REACT_APP_API_URL || 'https://blpvz.ru';
            const verifyLink = `${frontendUrl}/verify/${historyData.id}`;

            const pdfBuffer = await generateSearchReportPDF(group_data, 'person', {
                link: verifyLink,
                requesterEmail: current_user.email || 'unknown',
                verifyCode: historyData.verify_code,
                dataFingerprint: historyData.data_fingerprint,
                verifyLink: verifyLink,
                expiresAt: expiresAt
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="person_report_${group_data.group_id || Date.now()}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.send(pdfBuffer);
        } catch (error) {
            next(error);
        } finally {
            client.release();
        }
    }

    async generatePvzReport(req, res, next) {
        const client = await pgdb.connect();
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) throw apiError.Unauthorized();
            const decoded = tokenService.validateToken(token);
            const current_user = decoded?.data;
            if (!current_user) throw apiError.Unauthorized();

            const { pvz_data, signature } = req.body;
            if (!pvz_data) throw apiError.BadRequest('NO_DATA', 'Не переданы данные для отчёта');

            if (!signature) {
                throw apiError.BadRequest('MISSING_SIGNATURE', 'Отсутствует подпись данных.');
            }
            const signData = hmacService.extractPvzSignData(pvz_data);
            if (!hmacService.verify(signData, signature)) {
                throw apiError.Forbidden('INVALID_SIGNATURE', 'Подпись данных недействительна.');
            }

            const requestIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                || req.ip || req.socket.remoteAddress;
            const deviceId = req.headers['x-device-id'] || null;

            const expiresAt = new Date(Date.now() + EXPIRE_DAYS * 24 * 60 * 60 * 1000).toISOString();

            const historyData = await searchHistoryService.addToHistoryWithReturn(client, {
                email: current_user.email || 'unknown',
                user_id: current_user.user_id || current_user.id || null,
                search_type: 'pvz',
                search_params: {
                    source: 'pdf_export',
                    pvz_id: pvz_data.pvz_id || null
                },
                result_status: 'found',
                report_data: pvz_data,
                request_ip: requestIp,
                device_id: deviceId,
                expires_at: expiresAt
            });

            const frontendUrl = process.env.REACT_APP_FRONTEND_URL || process.env.REACT_APP_API_URL || 'https://blpvz.ru';
            const verifyLink = `${frontendUrl}/verify/${historyData.id}`;

            const pdfBuffer = await generateSearchReportPDF(pvz_data, 'pvz', {
                link: verifyLink,
                requesterEmail: current_user.email || 'unknown',
                verifyCode: historyData.verify_code,
                dataFingerprint: historyData.data_fingerprint,
                verifyLink: verifyLink,
                expiresAt: expiresAt
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="pvz_report_${pvz_data.pvz_id?.substring(0, 8) || Date.now()}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.send(pdfBuffer);
        } catch (error) {
            next(error);
        } finally {
            client.release();
        }
    }
}

module.exports = new reportController();