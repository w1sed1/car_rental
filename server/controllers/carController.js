// Контролер автомобілів:
// listCars — каталог з фільтрами
// getCar — одне авто
// nearby — найближчі локації з авто
// listLocations — всі локації
// liveGps — поточні GPS координати авто
// + CRUD для адміна
const { query } = require('../db');
const { findNearestLocations } = require('../services/geoService');

// ── КАТАЛОГ

async function listCars(req, res) {
    const {
        city, body_type, transmission, fuel_type,
        price_min, price_max, sort = 'price_asc'
    } = req.query;

    // Починаємо з обов'язкової умови — тільки вільні авто
    const where = [`c.status = 'available'`];
    const params = [];

    // Для кожного фільтру: якщо передано — додаємо умову
    // params.length після push = індекс нового параметра
    if (city) {
        params.push(city);
        where.push(`l.city = $${params.length}`);
    }
    if (body_type) {
        params.push(body_type);
        where.push(`c.body_type = $${params.length}`);
    }
    if (transmission) {
        params.push(transmission);
        where.push(`c.transmission = $${params.length}`);
    }
    if (fuel_type) {
        params.push(fuel_type);
        where.push(`c.fuel_type = $${params.length}`);
    }
    if (price_min) {
        params.push(price_min);
        where.push(`c.price_per_day >= $${params.length}`);
    }
    if (price_max) {
        params.push(price_max);
        where.push(`c.price_per_day <= $${params.length}`);
    }

    
    const orderBy = {
        price_asc:  'c.price_per_day ASC',
        price_desc: 'c.price_per_day DESC',
        popular:    'c.total_rentals DESC',
        year_desc:  'c.year DESC',
    }[sort] || 'c.price_per_day ASC';

  
    const sql = `
        SELECT c.id, c.brand, c.model, c.year, c.body_type,
               c.transmission, c.fuel_type, c.seats,
               c.price_per_day, c.image_url, c.total_rentals,
               l.name AS location_name, l.city, l.lat, l.lng
        FROM cars c
        LEFT JOIN locations l ON l.id = c.location_id
        WHERE ${where.join(' AND ')}
        ORDER BY ${orderBy}
        LIMIT 100
    `;

    const { rows } = await query(sql, params);
    res.json({ cars: rows });
}

// ── ОДНЕ АВТО 
async function getCar(req, res) {
    
    const { rows } = await query(`
        SELECT c.*, l.name AS location_name, l.address,
               l.city, l.lat AS loc_lat, l.lng AS loc_lng
        FROM cars c
        LEFT JOIN locations l ON l.id = c.location_id
        WHERE c.id = $1
    `, [req.params.id]);

    if (!rows[0]) {
        return res.status(404).json({ error: 'Авто не знайдено' });
    }
    res.json({ car: rows[0] });
}

// ── НАЙБЛИЖЧІ ЛОКАЦІЇ + АВТО
async function nearby(req, res) {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    
    if (!isFinite(lat) || !isFinite(lng)) {
        return res.status(400).json({ error: 'Передайте lat та lng' });
    }

    // Знаходимо 5 найближчих локацій через geoService
    const locations = await findNearestLocations(lat, lng, 5, 1000);
    const locIds = locations.map(l => l.id);

    if (!locIds.length) {
        return res.json({ locations: [], cars: [] });
    }

    // ANY($1) з масивом = WHERE location_id IN (1,2,3...)
    const { rows: cars } = await query(`
        SELECT c.id, c.brand, c.model, c.year,
               c.price_per_day, c.image_url, c.location_id,
               c.current_lat, c.current_lng
        FROM cars c
        WHERE c.status = 'available'
          AND c.location_id = ANY($1)
        ORDER BY c.price_per_day ASC
    `, [locIds]);

    res.json({ locations, cars });
}

// ── ВСІ ЛОКАЦІЇ 
async function listLocations(req, res) {
    const { rows } = await query(
        'SELECT * FROM locations ORDER BY city, name'
    );
    res.json({ locations: rows });
}

// ── ЖИВА GPS-ПОЗИЦІЯ ─────────────────────────────────

async function liveGps(req, res) {
    const { rows } = await query(`
        SELECT id, brand, model, license_plate,
               current_lat, current_lng, status
        FROM cars
        WHERE current_lat IS NOT NULL
          AND current_lng IS NOT NULL
    `);
    res.json({ cars: rows });
}

// ── ADMIN: СТВОРЕННЯ АВТО 
async function adminCreateCar(req, res) {
    const f = req.body; // f = fields, всі поля з тіла запиту
    const { rows } = await query(`
        INSERT INTO cars
          (brand, model, year, license_plate, body_type,
           transmission, fuel_type, seats, price_per_day,
           image_url, location_id, mileage_km)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING *
    `, [f.brand, f.model, f.year, f.license_plate, f.body_type,
        f.transmission, f.fuel_type, f.seats, f.price_per_day,
        f.image_url, f.location_id, f.mileage_km || 0]);

    res.status(201).json({ car: rows[0] });
}

// ── ADMIN: ОНОВЛЕННЯ АВТО 
async function adminUpdateCar(req, res) {
    const f = req.body;
    const { rows } = await query(`
        UPDATE cars SET
            brand=$1, model=$2, price_per_day=$3,
            status=$4, location_id=$5,
            mileage_km=$6, last_oil_change_km=$7
        WHERE id=$8
        RETURNING *
    `, [f.brand, f.model, f.price_per_day, f.status,
        f.location_id, f.mileage_km, f.last_oil_change_km,
        req.params.id]);

    if (!rows[0]) {
        return res.status(404).json({ error: 'Авто не знайдено' });
    }
    res.json({ car: rows[0] });
}

// ── ADMIN: ВИДАЛЕННЯ АВТО
async function adminDeleteCar(req, res) {
    await query('DELETE FROM cars WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
}

module.exports = {
    listCars, getCar, nearby, listLocations, liveGps,
    adminCreateCar, adminUpdateCar, adminDeleteCar,
};