const donationRequestService = require('./donationRequestService');
const donationActivationService = require('./donationActivationService');
const donationPackageService = require('./donationPackageService');
const donationPerkService = require('./donationPerkService');
const donationAccessService = require('./donationAccessService');
const donationStatsService = require('./donationStatsService');
const donationEmailService = require('./donationEmailService');

class DonationService {
    // ========================================================================
    // ПУБЛИЧНЫЕ МЕТОДЫ
    // ========================================================================

    async getPackages(client) {
        try {
            return await donationPackageService.getActivePackagesWithPerks(client);
        } catch (error) {
            throw error;
        } finally {
            client.release();
        }
    }

    async createRequest(client, email, ipAddress, userAgent) {
        try {
            return await donationRequestService.createRequest(client, email, ipAddress, userAgent);
        } catch (error) {
            throw error;
        } finally {
            client.release();
        }
    }

    async getMyDonation(client, token, ipAddress, userAgent) {
        try {
            return await donationAccessService.getMyDonation(client, token, ipAddress, userAgent);
        } catch (error) {
            throw error;
        } finally {
            client.release();
        }
    }

    async loginWithCode(client, email, code, ipAddress, userAgent) {
        try {
            return await donationAccessService.loginWithCode(client, email, code, ipAddress, userAgent);
        } catch (error) {
            throw error;
        } finally {
            client.release();
        }
    }

    // ========================================================================
    // АДМИН МЕТОДЫ - Заявки
    // ========================================================================

    async getRequests(client, params, current_user) {
        try {
            return await donationRequestService.getRequests(client, params, current_user);
        } catch (error) {
            throw error;
        } finally {
            client.release();
        }
    }

    async getRequestDetail(client, requestId, current_user) {
        try {
            return await donationRequestService.getRequestDetail(client, requestId, current_user);
        } catch (error) {
            throw error;
        } finally {
            client.release();
        }
    }

    async approveRequest(client, requestId, actualAmount, notes, current_user) {
        try {
            await client.query('BEGIN');
            const result = await donationActivationService.approveRequest(
                client,
                requestId,
                actualAmount,
                notes,
                current_user
            );
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async rejectRequest(client, requestId, reason, current_user) {
        try {
            return await donationRequestService.rejectRequest(client, requestId, reason, current_user);
        } catch (error) {
            throw error;
        } finally {
            client.release();
        }
    }

    async cancelApproval(client, requestId, reason, current_user) {
        try {
            await client.query('BEGIN');
            const result = await donationActivationService.cancelApproval(
                client,
                requestId,
                reason,
                current_user
            );
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async markEmailSent(client, requestId, current_user) {
        try {
            return await donationRequestService.markEmailSent(client, requestId, current_user);
        } catch (error) {
            throw error;
        } finally {
            client.release();
        }
    }

    async getEmailPreview(client, requestId, current_user) {
        try {
            return await donationEmailService.generateEmailPreview(client, requestId, current_user);
        } catch (error) {
            throw error;
        } finally {
            client.release();
        }
    }

    // ========================================================================
    // АДМИН МЕТОДЫ - История и пользователи
    // ========================================================================

    async getPayments(client, params, current_user) {
        try {
            return await donationStatsService.getPayments(client, params, current_user);
        } catch (error) {
            throw error;
        } finally {
            client.release();
        }
    }

    async getUserInfo(client, emailHesh, current_user) {
        try {
            return await donationAccessService.getUserInfo(client, emailHesh, current_user);
        } catch (error) {
            throw error;
        } finally {
            client.release();
        }
    }

    async regenerateAccess(client, emailHesh, type, current_user) {
        try {
            await client.query('BEGIN');
            const result = await donationAccessService.regenerateAccess(
                client,
                emailHesh,
                type,
                current_user
            );
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async revokeAccess(client, emailHesh, reason, current_user) {
        try {
            await client.query('BEGIN');
            const result = await donationAccessService.revokeAccess(
                client,
                emailHesh,
                reason,
                current_user
            );
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getStats(client, period, current_user) {
        try {
            return await donationStatsService.getStats(client, period, current_user);
        } catch (error) {
            throw error;
        } finally {
            client.release();
        }
    }

    // ========================================================================
    // УПРАВЛЕНИЕ ПАКЕТАМИ
    // ========================================================================

    async getPackagesAdmin(client) {
        try {
            return await donationPackageService.getAllPackagesWithPerks(client);
        } catch (error) {
            throw error;
        } finally {
            client.release();
        }
    }

    async createPackage(client, packageData, current_user) {
        try {
            await client.query('BEGIN');
            const result = await donationPackageService.createPackage(client, packageData, current_user);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async updatePackage(client, packageId, packageData, current_user) {
        try {
            await client.query('BEGIN');
            const result = await donationPackageService.updatePackage(
                client,
                packageId,
                packageData,
                current_user
            );
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async deletePackage(client, packageId, current_user) {
        try {
            await client.query('BEGIN');
            const result = await donationPackageService.deletePackage(client, packageId, current_user);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ========================================================================
    // УПРАВЛЕНИЕ ПЛЮШКАМИ
    // ========================================================================

    async getPerksAdmin(client) {
        try {
            return await donationPerkService.getAllPerks(client);
        } catch (error) {
            throw error;
        } finally {
            client.release();
        }
    }

    async createPerk(client, perkData, current_user) {
        try {
            return await donationPerkService.createPerk(client, perkData, current_user);
        } catch (error) {
            throw error;
        } finally {
            client.release();
        }
    }

    async updatePerk(client, perkId, perkData, current_user) {
        try {
            return await donationPerkService.updatePerk(client, perkId, perkData, current_user);
        } catch (error) {
            throw error;
        } finally {
            client.release();
        }
    }

    async deletePerk(client, perkId, current_user) {
        try {
            return await donationPerkService.deletePerk(client, perkId, current_user);
        } catch (error) {
            throw error;
        } finally {
            client.release();
        }
    }

    // ========================================================================
    // НАСТРОЙКИ
    // ========================================================================

    async getSettings(client) {
        try {
            return await donationStatsService.getSettings(client);
        } catch (error) {
            throw error;
        } finally {
            client.release();
        }
    }

    async updateSettings(client, settings, current_user) {
        try {
            await client.query('BEGIN');
            const result = await donationStatsService.updateSettings(client, settings, current_user);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new DonationService();