const { query } = require('../db');

async function getOverview() {
    const { rows } = await query(`
        SELECT
            (SELECT COUNT(*) FROM users WHERE role='user')                          AS total_users,
            (SELECT COUNT(*) FROM users WHERE is_banned=TRUE)                       AS banned_users,
            (SELECT COUNT(*) FROM cars)                                             AS total_cars,
            (SELECT COUNT(*) FROM cars WHERE status='available')                    AS available_cars,
            (SELECT COUNT(*) FROM cars WHERE status='rented')                       AS rented_cars,
            (SELECT COUNT(*) FROM bookings WHERE status IN ('active','confirmed'))  AS active_bookings,
            (SELECT COALESCE(SUM(total_price),0) FROM bookings
                WHERE status='completed'
                AND created_at > NOW() - INTERVAL '30 days')                        AS revenue_30d,
            (SELECT COUNT(*) FROM bookings
                WHERE created_at > NOW() - INTERVAL '30 days')                      AS bookings_30d
    `);
    return rows[0];
}

async function getBookingsByDay(days = 30) {
    const { rows } = await query(`
        SELECT
            DATE(created_at)                                    AS date,
            COUNT(*)                                            AS total,
            COUNT(*) FILTER (WHERE status='completed')          AS completed,
            COUNT(*) FILTER (WHERE status='cancelled')          AS cancelled,
            COALESCE(SUM(total_price) FILTER
                (WHERE status='completed'), 0)                  AS revenue
        FROM bookings
        WHERE created_at > NOW() - INTERVAL '1 day' * $1
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    `, [days]);
    return rows;
}

async function getPopularCars(limit = 10) {
    const { rows } = await query(`
        SELECT id, brand, model, year, image_url,
               price_per_day, bookings_count, total_revenue
        FROM popular_cars
        ORDER BY bookings_count DESC NULLS LAST
        LIMIT $1
    `, [limit]);
    return rows;
}

async function getBookingsByCity() {
    const { rows } = await query(`
        SELECT l.city,
               COUNT(b.id)                     AS bookings,
               COALESCE(SUM(b.total_price), 0) AS revenue
        FROM locations l
        LEFT JOIN bookings b ON b.pickup_location = l.id
            AND b.status IN ('completed','active','confirmed')
        GROUP BY l.city
        ORDER BY bookings DESC
    `);
    return rows;
}

async function getCarsNeedingMaintenance() {
    const { rows } = await query(`
        SELECT id, brand, model, license_plate, mileage_km,
               last_oil_change_km, oil_change_interval,
               (mileage_km - last_oil_change_km) AS km_since_oil,
               (oil_change_interval - (mileage_km - last_oil_change_km)) AS km_remaining
        FROM cars
        WHERE (mileage_km - last_oil_change_km) >= (oil_change_interval - 1000)
          AND status != 'retired'
        ORDER BY km_remaining ASC
    `);
    return rows;
}

async function getRiskUsers() {
    const { rows } = await query(`
        SELECT id, email, full_name, total_bookings,
               cancelled_bookings, cancel_rate, is_banned
        FROM users
        WHERE total_bookings >= 3 AND cancel_rate >= 30
        ORDER BY cancel_rate DESC
        LIMIT 50
    `);
    return rows;
}

module.exports = {
    getOverview, getBookingsByDay, getPopularCars,
    getBookingsByCity, getCarsNeedingMaintenance, getRiskUsers,
};