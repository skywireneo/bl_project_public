const { getIo } = require('./socket/socketServer');
const cron = require('node-cron');
const pool = require('../../pgdb');
const criticalActionsService = require('../criticalActionsService');

class MaintenanceService {
    constructor() {
        this.initCron();
    }

    initCron() {
        cron.schedule('* * * * *', async () => {
            console.log('[Cron] ⏰ Проверка запланированных задач...');
            let client;
            try {
                client = await pool.connect();

                // Ищем задачи, время которых пришло
                const result = await client.query(`
                    SELECT * FROM public.system_scheduled_tasks 
                    WHERE task_type = 'maintenance' AND status = 'scheduled' AND scheduled_at <= NOW()
                    FOR UPDATE SKIP LOCKED
                `);

                for (const task of result.rows) {
                    console.log(`[Cron] Запуск техработ: ${task.message}`);

                    // 1. Меняем статус, чтобы задача не выполнилась дважды
                    await client.query(`UPDATE public.system_scheduled_tasks SET status = 'active' WHERE id = $1`, [task.id]);

                    // 2. ВЫЗЫВАЕМ ЕДИНЫЙ МЕТОД ЗАКРЫТИЯ САЙТА
                    // Он сам сделает: gRPC, сокеты, отзыв токенов и добавит системный лог
                    await criticalActionsService.executeScheduledCloseSite(client, task.message);

                    // 3. Помечаем задачу как выполненную
                    await client.query(`UPDATE public.system_scheduled_tasks SET status = 'completed' WHERE id = $1`, [task.id]);
                    console.log(`[Cron]  Техработы успешно инициированы и завершены в очереди.`);
                }
            } catch (error) {
                console.error('[Cron] Ошибка при выполнении запланированных задач:', error);
            } finally {
                if (client) client.release();
            }
        });
    }

    async getScheduledMaintenance(client) {
        const result = await client.query(`
            SELECT id, scheduled_at, expected_open_at, message, status 
            FROM public.system_scheduled_tasks 
            WHERE task_type = 'maintenance' AND status IN ('scheduled', 'active')
            ORDER BY scheduled_at ASC LIMIT 1
        `);
        return result.rows[0] || null;
    }

    async scheduleMaintenance(client, scheduledAtISO, expectedOpenAtISO, message, userId) {
        await client.query(`
            UPDATE public.system_scheduled_tasks 
            SET status = 'cancelled' 
            WHERE task_type = 'maintenance' AND status = 'scheduled'
        `);

        const result = await client.query(`
            INSERT INTO public.system_scheduled_tasks 
            (task_type, scheduled_at, expected_open_at, message, created_by, status)
            VALUES ('maintenance', $1, $2, $3, $4, 'scheduled')
            RETURNING id, scheduled_at, expected_open_at, message, status
        `, [scheduledAtISO, expectedOpenAtISO || null, message, userId]);

        const newTask = result.rows[0];
        const io = getIo();
        if (io) {
            console.log(`[Maintenance] Отправка сокета system:maintenance_scheduled`);
            io.emit('system:maintenance_scheduled', {
                scheduledAtUTC: newTask.scheduled_at,
                expectedOpenAtUTC: newTask.expected_open_at,
                message: newTask.message
            });
        } else {
            console.error(`[Maintenance] ❌ ОШИБКА: io не инициализирован!`);
        }
        return newTask;
    }

    async cancelMaintenance(client) {
        const result = await client.query(`
            UPDATE public.system_scheduled_tasks 
            SET status = 'cancelled' 
            WHERE task_type = 'maintenance' AND status = 'scheduled'
            RETURNING id
        `);

        if (result.rows.length > 0) {
            const io = getIo();
            if (io) {
                console.log(`[Maintenance] Отправка сокета system:maintenance_cancelled`);
                io.emit('system:maintenance_cancelled');
            }
            return true;
        }
        return false;
    }

    /**
 * Получить историю техработ с пагинацией
 */
    async getMaintenanceHistory(client, page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        // 1. Общее количество записей
        const countResult = await client.query(`
            SELECT COUNT(*) as total 
            FROM public.system_scheduled_tasks 
            WHERE task_type = 'maintenance'
        `);
        const total = parseInt(countResult.rows[0].total);

        // 2. Получаем записи с пагинацией и джойном логина создателя
        const result = await client.query(`
            SELECT 
                t.id, 
                t.scheduled_at, 
                t.expected_open_at, 
                t.message, 
                t.status,
                t.created_at,
                u.login as created_by_login
            FROM public.system_scheduled_tasks t
            LEFT JOIN users u ON t.created_by = u.user_id
            WHERE t.task_type = 'maintenance'
            ORDER BY t.scheduled_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        return {
            data: result.rows,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Очистка старых записей (для крона или ручного вызова)
     * Удаляет записи старше 30 дней, которые не 'scheduled' и не 'active'
     */
    async cleanupOldMaintenanceTasks(client) {
        const result = await client.query(`
            DELETE FROM public.system_scheduled_tasks 
            WHERE task_type = 'maintenance'
            AND status NOT IN ('scheduled', 'active')
            AND scheduled_at < NOW() - INTERVAL '30 days'
            RETURNING id
        `);

        return {
            success: true,
            deletedCount: result.rowCount,
            message: `Удалено записей: ${result.rowCount}`
        };
    }
}

module.exports = new MaintenanceService();