const apiError = require('../../exceptions/apiError');

class DonationPackageService {

    async getActivePackagesWithPerks(client) {
        const packages = await client.query(`
            SELECT * FROM donation_packages 
            WHERE is_active = true 
            ORDER BY sort_order ASC
        `);

        // Для каждого пакета получаем плюшки
        const result = [];
        for (const pkg of packages.rows) {
            const perks = await client.query(`
                SELECT p.perk_id, p.code_name, p.display_name, p.description, p.icon, p.color
                FROM donation_perks p
                INNER JOIN donation_package_perks pp ON p.perk_id = pp.perk_id
                WHERE pp.package_id = $1 AND p.is_active = true
                ORDER BY p.sort_order
            `, [pkg.package_id]);

            result.push({
                ...pkg,
                min_amount: parseFloat(pkg.min_amount),
                max_amount: pkg.max_amount ? parseFloat(pkg.max_amount) : null,
                perks: perks.rows
            });
        }

        return { packages: result };
    }

    async getAllPackagesWithPerks(client) {
        const packages = await client.query(`
            SELECT * FROM donation_packages ORDER BY sort_order ASC
        `);

        const result = [];
        for (const pkg of packages.rows) {
            const perks = await client.query(`
                SELECT p.perk_id, p.code_name, p.display_name, p.icon, p.color
                FROM donation_perks p
                INNER JOIN donation_package_perks pp ON p.perk_id = pp.perk_id
                WHERE pp.package_id = $1
                ORDER BY p.sort_order
            `, [pkg.package_id]);

            result.push({
                ...pkg,
                min_amount: parseFloat(pkg.min_amount),
                max_amount: pkg.max_amount ? parseFloat(pkg.max_amount) : null,
                perk_ids: perks.rows.map(p => p.perk_id),
                perks: perks.rows
            });
        }

        return { packages: result };
    }

    async createPackage(client, data, current_user) {
        const { code_name, display_name, description, min_amount, max_amount,
            checks_granted, duration_days, sort_order, icon, color, perk_ids = [] } = data;

        // Валидация
        if (!code_name || !display_name || !min_amount || !checks_granted || !duration_days) {
            throw apiError.BadRequest('MISSING_DATA', 'Заполните обязательные поля');
        }

        const result = await client.query(`
            INSERT INTO donation_packages 
                (code_name, display_name, description, min_amount, max_amount, 
                 checks_granted, duration_days, sort_order, icon, color)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            code_name, display_name, description, min_amount, max_amount,
            checks_granted, duration_days, sort_order || 0, icon, color
        ]);

        const newPackage = result.rows[0];

        // Привязываем плюшки
        if (perk_ids.length > 0) {
            for (const perkId of perk_ids) {
                await client.query(`
                    INSERT INTO donation_package_perks (package_id, perk_id)
                    VALUES ($1, $2)
                    ON CONFLICT DO NOTHING
                `, [newPackage.package_id, perkId]);
            }
        }

        return {
            success: true,
            message: 'Пакет создан',
            package: newPackage
        };
    }

    async updatePackage(client, packageId, data, current_user) {
        const { code_name, display_name, description, min_amount, max_amount,
            checks_granted, duration_days, sort_order, icon, color,
            is_active, perk_ids } = data;

        // Обновляем пакет
        const result = await client.query(`
            UPDATE donation_packages 
            SET 
                code_name = COALESCE($1, code_name),
                display_name = COALESCE($2, display_name),
                description = COALESCE($3, description),
                min_amount = COALESCE($4, min_amount),
                max_amount = $5,
                checks_granted = COALESCE($6, checks_granted),
                duration_days = COALESCE($7, duration_days),
                sort_order = COALESCE($8, sort_order),
                icon = COALESCE($9, icon),
                color = COALESCE($10, color),
                is_active = COALESCE($11, is_active),
                updated_at = NOW() AT TIME ZONE 'UTC'
            WHERE package_id = $12
            RETURNING *
        `, [
            code_name, display_name, description, min_amount, max_amount,
            checks_granted, duration_days, sort_order, icon, color, is_active,
            packageId
        ]);

        if (result.rowCount === 0) {
            throw apiError.NotFound('PACKAGE_NOT_FOUND', 'Пакет не найден');
        }

        // Обновляем плюшки если переданы
        if (perk_ids !== undefined) {
            await client.query(`
                DELETE FROM donation_package_perks WHERE package_id = $1
            `, [packageId]);

            for (const perkId of perk_ids) {
                await client.query(`
                    INSERT INTO donation_package_perks (package_id, perk_id)
                    VALUES ($1, $2)
                `, [packageId, perkId]);
            }
        }

        return {
            success: true,
            message: 'Пакет обновлён',
            package: result.rows[0]
        };
    }

    async deletePackage(client, packageId, current_user) {
        // Проверяем что пакет не используется
        const usageResult = await client.query(`
            SELECT COUNT(*) as count 
            FROM donation_requests 
            WHERE package_id = $1
        `, [packageId]);

        if (parseInt(usageResult.rows[0].count) > 0) {
            throw apiError.BadRequest(
                'PACKAGE_IN_USE',
                'Пакет используется в заявках. Отключите его вместо удаления (is_active = false).'
            );
        }

        const result = await client.query(`
            DELETE FROM donation_packages WHERE package_id = $1 RETURNING *
        `, [packageId]);

        if (result.rowCount === 0) {
            throw apiError.NotFound('PACKAGE_NOT_FOUND', 'Пакет не найден');
        }

        return {
            success: true,
            message: 'Пакет удалён',
            package: result.rows[0]
        };
    }
}

module.exports = new DonationPackageService();