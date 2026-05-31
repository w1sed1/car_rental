const { query } = require('../db');
const analytics = require('../services/analyticsService');
const { runDailyJob } = require('../cron/dailyBanCheck');

async function dashboard(req, res) {
    const [overview, byDay, popular, byCity, maintenance, risk] = await Promise.all([
        analytics.getOverview(),
        analytics.getBookingsByDay(30),
        analytics.getPopularCars(8),
        analytics.getBookingsByCity(),
        analytics.getCarsNeedingMaintenance(),
        analytics.getRiskUsers(),
    ]);
    res.json({ overview, byDay, popular, byCity, maintenance, risk });
}

async function listBookings(req, res) {
    const { status, limit = 100 } = req.query;
    const where = [];
    const params = [];
    if (status) {
        params.push(status);
        where.push(`b.status = $${params.length}`);
    }
    params.push(limit);
    const sql = `
        SELECT b.*, u.full_name, u.email, u.phone,
               c.brand, c.model, c.license_plate
        FROM bookings b
        JOIN users u ON u.id = b.user_id
        JOIN cars c ON c.id = b.car_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY b.created_at DESC
        LIMIT $${params.length}
    `;
    const { rows } = await query(sql, params);
    res.json({ bookings: rows });
}

async function listUsers(req, res) {
    const { rows } = await query(`
        SELECT id, email, phone, full_name, role,
               total_bookings, cancelled_bookings,
               cancel_rate, is_banned, banned_at, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 200
    `);
    res.json({ users: rows });
}

async function toggleBan(req, res) {
    const { rows } = await query(`
        UPDATE users
        SET is_banned  = NOT is_banned,
            banned_at  = CASE WHEN NOT is_banned THEN NOW() ELSE NULL END,
            ban_reason = CASE WHEN NOT is_banned THEN 'Ручний бан адміністратором' ELSE NULL END
        WHERE id = $1
        RETURNING is_banned
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Користувача не знайдено' });
    res.json({ is_banned: rows[0].is_banned });
}

async function runMaintenance(req, res) {
    await runDailyJob();
    res.json({ ok: true });
}

async function addMaintenanceLog(req, res) {
    const { car_id, type, description, mileage_at, cost } = req.body;
    const { rows } = await query(`
        INSERT INTO maintenance (car_id, type, description, mileage_at, cost)
        VALUES ($1,$2,$3,$4,$5)
        RETURNING *
    `, [car_id, type, description, mileage_at, cost]);
    if (type === 'oil_change') {
        await query(
            'UPDATE cars SET last_oil_change_km=$1 WHERE id=$2',
            [mileage_at, car_id]
        );
    }
    res.status(201).json({ log: rows[0] });
}

module.exports = {
    dashboard, listBookings, listUsers,
    toggleBan, runMaintenance, addMaintenanceLog,
};