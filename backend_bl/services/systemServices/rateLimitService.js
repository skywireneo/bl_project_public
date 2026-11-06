class rateLimitService {
    /**
     * Очистка протухших записей лимитов из PostgreSQL.
     * Должен вызываться периодически (например, по крону раз в час/сутки).
     * @returns {Promise<number>} Количество удаленных записей
     */
    async cleanupExpiredLimits(client) {
        try {
            // Удаляем все записи, время жизни которых истекло
            const result = await client.query(
                'DELETE FROM rate_limits WHERE expire < (EXTRACT(EPOCH FROM NOW()) * 1000)'
            );
            return result.rowCount;
        } catch (error) {
            console.error('[RateLimitService] Cleanup error:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new rateLimitService();