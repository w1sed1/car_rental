const cron = require('node-cron');
const { query } = require('../db');

const MIN_BOOKINGS = parseInt(process.env.BAN_CHECK_MIN_BOOKINGS || '5');
const THRESHOLD    = parseFloat(process.env.BAN_THRESHOLD_PERCENT || '50');

async function recalcCancelRates() {
    await query(`
        UPDATE users u SET
            total_bookings     = COALESCE(sub.total, 0),
            cancelled_bookings = COALESCE(sub.cancelled, 0),
            cancel_rate        = CASE WHEN COALESCE(sub.total, 0) > 0
                                      THEN ROUND(sub.cancelled::NUMERIC / sub.total * 100, 2)
                                      ELSE 0 END
        FROM (
            SELECT user_id,
                   COUNT(*)                                   AS total,
                   COUNT(*) FILTER (WHERE status='cancelled') AS cancelled
            FROM bookings
            GROUP BY user_id
        ) sub
        WHERE u.id = sub.user_id
    `);
}

async function banAbusers() {
    const { rowCount } = await query(`
        UPDATE users
        SET is_banned  = TRUE,
            banned_at  = NOW(),
            ban_reason = 'Перевищено допустимий відсоток відмов (' || cancel_rate || '%)'
        WHERE is_banned = FALSE
          AND role = 'user'
          AND total_bookings >= $1
          AND cancel_rate >= $2
    `, [MIN_BOOKINGS, THRESHOLD]);
    return rowCount;
}

async function refreshMatViews() {
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY popular_cars');
}

async function runDailyJob() {
    console.log(`[CRON ${new Date().toISOString()}] Запуск...`);
    try {
        await recalcCancelRates();
        const banned = await banAbusers();
        await refreshMatViews();
        console.log(`[CRON] Готово. Забанено нових: ${banned}`);
    } catch (e) {
        console.error('[CRON] Помилка:', e);
    }
}

function start() {
    cron.schedule('0 3 * * *', runDailyJob, { timezone: 'Europe/Kiev' });
    console.log('Cron заплановано (щодня о 03:00).');
}

module.exports = { start, runDailyJob };