const { pool, query } = require('../db');
const { makeConfirmationCall, buildConfirmationTwiML } = require('../services/twilioService');

async function createBooking(req, res) {
    const userId = req.user.id;
    const { car_id, start_date, end_date, pickup_location } = req.body;

    if (!car_id || !start_date || !end_date) {
        return res.status(400).json({ error: 'Заповніть car_id, start_date, end_date' });
    }
    if (new Date(end_date) < new Date(start_date)) {
        return res.status(400).json({ error: 'Дата завершення не може бути раніше за початок' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const carQ = await client.query(
            `SELECT id, price_per_day, status, location_id FROM cars WHERE id=$1 FOR UPDATE`,
            [car_id]
        );
        if (!carQ.rows[0]) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Авто не знайдено' });
        }
        const car = carQ.rows[0];

        const conflictQ = await client.query(`
            SELECT 1 FROM bookings
            WHERE car_id = $1
              AND status IN ('confirmed','active')
              AND start_date <= $3
              AND end_date >= $2
            LIMIT 1
        `, [car_id, start_date, end_date]);

        if (conflictQ.rows.length) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Авто вже заброньоване на ці дати' });
        }

        const days = Math.max(1, Math.ceil(
            (new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)
        ) + 1);
        const total = parseFloat(car.price_per_day) * days;

        const ins = await client.query(`
            INSERT INTO bookings
              (user_id, car_id, pickup_location, start_date, end_date, total_price, status)
            VALUES ($1,$2,$3,$4,$5,$6,'pending')
            RETURNING *
        `, [userId, car_id, pickup_location || car.location_id, start_date, end_date, total]);

        await client.query(
            'UPDATE users SET total_bookings = total_bookings + 1 WHERE id=$1',
            [userId]
        );

        await client.query('COMMIT');

        const booking = ins.rows[0];

        const userQ = await query('SELECT phone FROM users WHERE id=$1', [userId]);
        makeConfirmationCall(userQ.rows[0].phone, booking.id)
            .then(sid => query('UPDATE bookings SET call_sid=$1 WHERE id=$2', [sid, booking.id]))
            .catch(err => console.error('Twilio помилка:', err));

        res.status(201).json({ booking });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: 'Помилка створення бронювання' });
    } finally {
        client.release();
    }
}

async function listMyBookings(req, res) {
    const { rows } = await query(`
        SELECT b.*, c.brand, c.model, c.image_url, c.license_plate,
               l.name AS pickup_name, l.city
        FROM bookings b
        JOIN cars c ON c.id = b.car_id
        LEFT JOIN locations l ON l.id = b.pickup_location
        WHERE b.user_id = $1
        ORDER BY b.created_at DESC
    `, [req.user.id]);
    res.json({ bookings: rows });
}

async function cancelBooking(req, res) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const r = await client.query(
            `SELECT * FROM bookings WHERE id=$1 AND user_id=$2 FOR UPDATE`,
            [req.params.id, req.user.id]
        );
        if (!r.rows[0]) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Бронювання не знайдено' });
        }
        if (['cancelled','completed'].includes(r.rows[0].status)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Бронювання вже завершено або скасовано' });
        }

        await client.query(
            `UPDATE bookings SET status='cancelled', cancelled_at=NOW() WHERE id=$1`,
            [req.params.id]
        );
        await client.query(`
            UPDATE users SET
                cancelled_bookings = cancelled_bookings + 1,
                cancel_rate = ROUND(
                    (cancelled_bookings + 1)::NUMERIC / NULLIF(total_bookings, 0) * 100, 2
                )
            WHERE id=$1
        `, [req.user.id]);

        await client.query('COMMIT');
        res.json({ ok: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: 'Помилка скасування' });
    } finally {
        client.release();
    }
}

function twimlForBooking(req, res) {
    res.type('text/xml').send(buildConfirmationTwiML(req.params.id));
}

async function handleConfirmCall(req, res) {
    const id = req.params.id;
    const digit = req.body.Digits;
    if (digit === '1') {
        await query(
            `UPDATE bookings SET status='confirmed', phone_confirmed=TRUE WHERE id=$1`,
            [id]
        );
        res.type('text/xml').send(
            `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="uk-UA">Бронювання підтверджено. Дякуємо.</Say></Response>`
        );
    } else {
        await query(
            `UPDATE bookings SET status='cancelled', cancelled_at=NOW() WHERE id=$1`,
            [id]
        );
        res.type('text/xml').send(
            `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="uk-UA">Бронювання скасовано.</Say></Response>`
        );
    }
}

module.exports = {
    createBooking, listMyBookings, cancelBooking,
    twimlForBooking, handleConfirmCall,
};