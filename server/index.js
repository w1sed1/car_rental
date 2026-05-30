
require('dotenv').config();

const express    = require('express');
const cookieParser = require('cookie-parser');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const path       = require('path'); // вбудований модуль Node.js для роботи з шляхами

const app  = express(); // створюємо екземпляр Express додатку
const PORT = process.env.PORT || 3000; // беремо порт з .env або 3000 за замовчуванням

app.use(cors({ origin: true, credentials: true }));


app.use(express.json({ limit: '1mb' }));

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());


const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 хвилин в мілісекундах
    max: 10,                   // максимум 10 спроб
    message: { error: 'Забагато спроб. Спробуйте пізніше.' }
});

app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);


app.use(express.static(path.join(__dirname, '..', 'client')));


app.use('/api/auth',     require('./routes/auth'));
app.use('/api/cars',     require('./routes/cars'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin',    require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({ ok: true }));


app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});



app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
});

// ── ЗАПУСК ────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✓ Сервер запущено: http://localhost:${PORT}`);
});