const apiError = require('../../exceptions/apiError');

class DonationPerkService {

    async getAllPerks(client) {
        const result = await client.query(`
            SELECT * FROM donation_perks ORDER BY sort_order ASC
        `);
        return { perks: result.rows };
    }

    async createPerk(client, data, current_user) {
        const { code_name, display_name, description, icon, color, sort_order } = data;

        if (!code_name || !display_name) {
            throw apiError.BadRequest('MISSING_DATA', 'code_name и display_name обязательны');
        }

        const result = await client.query(`
            INSERT INTO donation_perks 
                (code_name, display_name, description, icon, color, sort_order)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [code_name, display_name, description, icon, color, sort_order || 0]);

        return {
            success: true,
            message: 'Плюшка создана',
            perk: result.rows[0]
        };
    }

    async updatePerk(client, perkId, data, current_user) {
        const { code_name, display_name, description, icon, color, sort_order, is_active } = data;

        const result = await client.query(`
            UPDATE donation_perks 
            SET 
                code_name = COALESCE($1, code_name),
                display_name = COALESCE($2, display_name),
                description = COALESCE($3, description),
                icon = COALESCE($4, icon),
                color = COALESCE($5, color),
                sort_order = COALESCE($6, sort_order),
                is_active = COALESCE($7, is_active),
                updated_at = NOW() AT TIME ZONE 'UTC'
            WHERE perk_id = $8
            RETURNING *
        `, [code_name, display_name, description, icon, color, sort_order, is_active, perkId]);

        if (result.rowCount === 0) {
            throw apiError.NotFound('PERK_NOT_FOUND', 'Плюшка не найдена');
        }

        return {
            success: true,
            message: 'Плюшка обновлена',
            perk: result.rows[0]
        };
    }

    async deletePerk(client, perkId, current_user) {
        // Проверяем что плюшка не используется
        const usageResult = await client.query(`
            SELECT COUNT(*) as count 
            FROM donation_active_perks 
            WHERE perk_id = $1
        `, [perkId]);

        if (parseInt(usageResult.rows[0].count) > 0) {
            throw apiError.BadRequest(
                'PERK_IN_USE',
                'Плюшка активна у пользователей. Отключите её вместо удаления (is_active = false).'
            );
        }

        const result = await client.query(`
            DELETE FROM donation_perks WHERE perk_id = $1 RETURNING *
        `, [perkId]);

        if (result.rowCount === 0) {
            throw apiError.NotFound('PERK_NOT_FOUND', 'Плюшка не найдена');
        }

        return {
            success: true,
            message: 'Плюшка удалена',
            perk: result.rows[0]
        };
    }
}

module.exports = new DonationPerkService();