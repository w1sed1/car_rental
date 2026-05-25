DROP TABLE IF EXISTS gps_logs CASCADE;

DROP TABLE IF EXISTS maintenance CASCADE;

DROP TABLE IF EXISTS bookings CASCADE;

DROP TABLE IF EXISTS cars CASCADE;

DROP TABLE IF EXISTS locations CASCADE;

DROP TABLE IF EXISTS users CASCADE;

DROP MATERIALIZED VIEW IF EXISTS popular_cars;
--USERS
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    total_bookings INTEGER NOT NULL DEFAULT 0,
    cancelled_bookings INTEGER NOT NULL DEFAULT 0,
    cancel_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    banned_at TIMESTAMP,
    ban_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users (role);

CREATE INDEX idx_users_is_banned ON users (is_banned)
WHERE
    is_banned = TRUE;

CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    adress VARCHAR(255) NOT NULL,
    city VARCHAR(80) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_geo ON locations (lat, lng);

CREATE INDEX idx_locations_city ON locations (city);

CREATE TABLE cars (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(50) NOT NULL, --toyota
    model VARCHAR(80) NOT NULL, --camry
    year INTEGER NOT NULL, --2023
    license_plate VARCHAR(15) UNIQUE NOT NULL,
    body_type VARCHAR(30) NOT NULL,
    transmission VARCHAR(20) NOT NULL CHECK (
        transmission IN (
            'manual',
            'auto',
            'cvt',
            'robot'
        )
    ),
    fuel_type VARCHAR(20) NOT NULL,
    seats INTEGER NOT NULL,
    price_per_day NUMERIC(10, 2) NOT NULL,
    image_url VARCHAR(255),
    location_id INTEGER REFERENCES locations (id) ON DELETE SET NULL,
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (
        status IN (
            'available',
            'rented',
            'maintenance',
            'retired'
        )
    ),
    mileage_km INTEGER NOT NULL DEFAULT 0,
    last_oil_change_km INTEGER NOT NULL DEFAULT 0,
    oil_change_interval INTEGER NOT NULL DEFAULT 10000,
    total_rentals INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cars_status ON cars (status);

CREATE INDEX idx_cars_location ON cars (location_id);

CREATE INDEX idx_cars_price ON cars (price_per_day);

CREATE INDEX idx_cars_available ON cars (location_id, price_per_day)
WHERE
    status = 'available';

CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    car_id INTEGER NOT NULL REFERENCES cars (id) ON DELETE CASCADE,
    pickup_location INTEGER REFERENCES locations (id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'confirmed',
            'active',
            'completed',
            'cancelled'
        )
    ),
    phone_confirmed BOOLEAN NOT NULL DEFAULT FALSE, -- чи підтвердив по телефону
    call_sid VARCHAR(100), -- ID дзвінка від Twilio
    cancelled_at TIMESTAMP, -- коли скасували
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_bookings_user ON bookings (user_id);

CREATE INDEX idx_bookings_car ON bookings (car_id);

CREATE INDEX idx_bookings_status ON bookings (status);

CREATE INDEX idx_bookings_created ON bookings (created_at DESC);

CREATE INDEX idx_bookings_active ON bookings (car_id, start_date, end_date)
WHERE
    status IN ('confirmed', 'active');

CREATE TABLE maintenance (
    id SERIAL PRIMARY KEY,
    car_id INTEGER NOT NULL REFERENCES cars (id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, --oil change,tire rotation,...
    description TEXT,
    mileage_at INTEGER,
    cost NUMERIC(10, 2),
    done_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maintenance_car ON maintenance (car_id, done_at DESC);

--LOGS
CREATE TABLE gps_logs (
    id BIGSERIAL PRIMARY KEY,
    car_id INTEGER NOT NULL REFERENCES cars (id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    speed_kmh NUMERIC(5, 2),
    logged_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gps_car_time ON gps_logs (car_id, logged_at DESC);

CREATE MATERIALIZED VIEW popular_cars AS
SELECT
    c.id,
    c.brand,
    c.model,
    c.year,
    c.image_url,
    c.price_per_day,
    COUNT(b.id) AS bookings_count,
    SUM(b.total_price) AS total_revenue,
    AVG(b.end_date - b.start_date) AS avg_rental_days
FROM cars c
    LEFT JOIN bookings b ON b.car_id = c.id
    AND b.status IN (
        'completed', 'active', 'confirmed'
    )
    AND b.created_at > NOW() - interval '90 days'
GROUP BY
    c.id --групую по авто( одна строка на авто)
ORDER BY bookings_count DESC;

CREATE UNIQUE INDEX idx_popular_cars_id ON popular_cars (id);