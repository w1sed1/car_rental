DROP TABLE IF EXISTS gps_logs CASCADE;

DROP TABLE IF EXISTS maintenance CASCADE;

DROP TABLE IF EXISTS bookings CASCADE;

DROP TABLE IF EXISTS cars CASCADE;

DROP TABLE IF EXISTS locations CASCADE;

DROP TABLE IF EXISTS users CASCADE;

DROP MATERIALIZED VIEW IF EXISTS popular_cars;

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