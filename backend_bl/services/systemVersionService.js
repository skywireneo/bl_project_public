const apiError = require('../exceptions/apiError');

class SystemVersionService {
    // Получить все версии (с базовой фильтрацией для админов)
    async getAllVersions(client, filters = {}) {
        const { is_active = null, change_type = null, is_major = null, limit = 100, offset = 0 } = filters;

        let query = `
            SELECT 
                sv.*,
                u1.login as created_by_login,
                u2.login as updated_by_login
            FROM system_versions sv
            LEFT JOIN users u1 ON sv.created_by = u1.user_id
            LEFT JOIN users u2 ON sv.updated_by = u2.user_id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (is_active !== null) {
            query += ` AND sv.is_active = $${paramIndex}`;
            params.push(is_active);
            paramIndex++;
        }
        if (change_type) {
            query += ` AND sv.change_type = $${paramIndex}`;
            params.push(change_type);
            paramIndex++;
        }
        if (is_major !== null) {
            query += ` AND sv.is_major = $${paramIndex}`;
            params.push(is_major);
            paramIndex++;
        }

        query += ` ORDER BY sv.created_at DESC, sv.version DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        try {
            const result = await client.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('[SYSTEM_VERSIONS] Error fetching all versions:', error);
            throw apiError.Internal('Не удалось получить список версий', 'SV001');
        }
    }

    // Получить одну версию по ID
    async getVersionById(client, id, userRole = null) {
        try {
            const result = await client.query(`
                SELECT 
                    sv.*,
                    u1.login as created_by_login,
                    u2.login as updated_by_login
                FROM system_versions sv
                LEFT JOIN users u1 ON sv.created_by = u1.user_id
                LEFT JOIN users u2 ON sv.updated_by = u2.user_id
                WHERE sv.version_id = $1
            `, [id]);

            if (result.rowCount === 0) {
                throw apiError.NotFound(`Версия с ID ${id} не найдена`, 'SV002');
            }

            let version = result.rows[0];

            // Скрываем внутренние заметки от обычных пользователей
            if (userRole && !['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(userRole)) {
                version.internal_notes = null;
            }

            return version;
        } catch (error) {
            if (error instanceof apiError.ApiError) throw error;
            console.error('[SYSTEM_VERSIONS] Error fetching version by id:', error);
            throw apiError.Internal('Не удалось получить версию', 'SV003');
        }
    }

    // Получить активные версии для обычных пользователей
    async getActiveVersionsForUser(client) {
        try {
            // Выбираем только публичные поля, internal_notes намеренно исключен из SELECT
            const result = await client.query(`
                SELECT 
                    sv.version_id, sv.version, sv.title, sv.description, sv.changes_jsonb, 
                    sv.change_type, sv.is_major, sv.is_active, sv.created_at, sv.updated_at,
                    u.login as created_by_login
                FROM system_versions sv
                LEFT JOIN users u ON sv.created_by = u.user_id
                WHERE sv.is_active = true
                ORDER BY sv.created_at DESC
                LIMIT 50
            `);
            return result.rows;
        } catch (error) {
            console.error('[SYSTEM_VERSIONS] Error fetching active versions:', error);
            throw apiError.Internal('Не удалось получить активные версии', 'SV004');
        }
    }

    // Создать новую версию
    async createVersion(client, data, token) {
        const decoded = require('./systemServices/tokenService').validateToken(token);

        const {
            version, title, description, changes_jsonb,
            change_type = 'update', is_major = false, internal_notes
        } = data;

        // Базовая валидация
        const validationErrors = [];
        if (!version || version.trim() === '') validationErrors.push({ field: 'version', message: 'Версия не может быть пустой' });
        if (!title || title.trim() === '') validationErrors.push({ field: 'title', message: 'Заголовок не может быть пустым' });
        if (!changes_jsonb || typeof changes_jsonb !== 'object') validationErrors.push({ field: 'changes_jsonb', message: 'Данные изменений (JSON) обязательны' });

        if (validationErrors.length > 0) {
            throw apiError.ValidationError(validationErrors, 'SV006');
        }

        try {
            const result = await client.query(`
                INSERT INTO system_versions (
                    version, title, description, changes_jsonb, change_type, is_major, is_active,
                    created_by, updated_by, internal_notes, created_at, updated_at
                ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, true, $7, $7, $8, NOW(), NOW())
                RETURNING *
            `, [
                version.trim(),
                title.trim(),
                description || null,
                JSON.stringify(changes_jsonb),
                change_type,
                is_major,
                decoded.data.id,
                internal_notes || null
            ]);

            return result.rows[0];
        } catch (error) {
            console.error('[SYSTEM_VERSIONS] Error creating version:', error);
            throw apiError.Internal('Не удалось создать версию', 'SV007');
        }
    }

    // Обновить версию
    async updateVersion(client, id, data, token) {
        const decoded = require('./systemServices/tokenService').validateToken(token);

        // Проверяем существование
        const existing = await client.query('SELECT version_id FROM system_versions WHERE version_id = $1', [id]);
        if (existing.rowCount === 0) {
            throw apiError.NotFound(`Версия с ID ${id} не найдена`, 'SV008');
        }

        const {
            version, title, description, changes_jsonb, change_type,
            is_major, is_active, internal_notes
        } = data;

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (version !== undefined) { updates.push(`version = $${paramIndex}`); params.push(version.trim()); paramIndex++; }
        if (title !== undefined) { updates.push(`title = $${paramIndex}`); params.push(title.trim()); paramIndex++; }
        if (description !== undefined) { updates.push(`description = $${paramIndex}`); params.push(description || null); paramIndex++; }
        if (changes_jsonb !== undefined) { updates.push(`changes_jsonb = $${paramIndex}::jsonb`); params.push(JSON.stringify(changes_jsonb)); paramIndex++; }
        if (change_type !== undefined) { updates.push(`change_type = $${paramIndex}`); params.push(change_type); paramIndex++; }
        if (is_major !== undefined) { updates.push(`is_major = $${paramIndex}`); params.push(is_major); paramIndex++; }
        if (is_active !== undefined) { updates.push(`is_active = $${paramIndex}`); params.push(is_active); paramIndex++; }
        if (internal_notes !== undefined) { updates.push(`internal_notes = $${paramIndex}`); params.push(internal_notes || null); paramIndex++; }

        // Всегда обновляем апдейтера и время
        updates.push(`updated_by = $${paramIndex}`, `updated_at = NOW()`);
        params.push(decoded.data.id);
        paramIndex++;

        if (updates.length <= 2) { // Только updated_by и updated_at
            throw apiError.ValidationError([{ field: 'general', message: 'Нет данных для обновления' }], 'SV009');
        }

        params.push(id);
        const query = `
            UPDATE system_versions 
            SET ${updates.join(', ')}
            WHERE version_id = $${paramIndex}
            RETURNING *
        `;

        try {
            const result = await client.query(query, params);
            return result.rows[0];
        } catch (error) {
            console.error('[SYSTEM_VERSIONS] Error updating version:', error);
            throw apiError.Internal('Не удалось обновить версию', 'SV010');
        }
    }

    // Удалить версию (мягкое удаление: is_active = false)
    async deleteVersion(client, id, token) {
        const decoded = require('./systemServices/tokenService').validateToken(token);

        try {
            const result = await client.query(
                'UPDATE system_versions SET is_active = false, updated_by = $1, updated_at = NOW() WHERE version_id = $2 RETURNING version_id',
                [decoded.data.id, id]
            );

            if (result.rowCount === 0) {
                throw apiError.NotFound(`Версия с ID ${id} не найдена`, 'SV011');
            }

            return { message: 'Версия деактивирована', id };
        } catch (error) {
            if (error instanceof apiError.ApiError) throw error;
            console.error('[SYSTEM_VERSIONS] Error deleting version:', error);
            throw apiError.Internal('Не удалось удалить версию', 'SV012');
        }
    }
}

module.exports = new SystemVersionService();