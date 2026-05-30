const bcrypt = require('bcrypt');
const { query } = require('../db');
const { signToken } = require('../middleware/auth');


const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isPhone = (s) => /^\+\d{10,15}$/.test(s);

// ── РЕЄСТРАЦІЯ 
async function register(req, res) {
    // Деструктуризація — витягуємо поля з тіла запиту
    const { email, phone, password, full_name } = req.body;

    // Перевіряємо що всі поля заповнені
    if (!email || !phone || !password || !full_name) {
        return res.status(400).json({ error: 'Заповніть усі поля' });
    }
    if (!isEmail(email)) {
        return res.status(400).json({ error: 'Некоректний email' });
    }
    if (!isPhone(phone)) {
        return res.status(400).json({ error: 'Телефон у форматі +380...' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Пароль мінімум 6 символів' });
    }

    try {
        
        const hash = await bcrypt.hash(password, 10);

        
        const { rows } = await query(
            `INSERT INTO users (email, phone, password_hash, full_name)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, full_name, role`,
            [email, phone, hash, full_name]
        );

        const user  = rows[0];
        const token = signToken(user);

     
        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 днів в мілісекундах
        });

        res.json({ user });
    } catch (e) {
        
        if (e.code === '23505') {
            return res.status(409).json({ error: 'Email або телефон вже зареєстровані' });
        }
        console.error(e);
        res.status(500).json({ error: 'Помилка сервера' });
    }
}

// ── ЛОГІН ─────────────────────────────────────────────
async function login(req, res) {
    const { email, password } = req.body;

    // Шукаємо юзера по email
    const { rows } = await query(
        'SELECT id, email, full_name, role, password_hash, is_banned FROM users WHERE email=$1',
        [email]
    );
    const user = rows[0];


    if (!user) {
        return res.status(401).json({ error: 'Неправильний email або пароль' });
    }

    // bcrypt.compare порівнює введений пароль з хешем
    // Повертає true/false
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
        return res.status(401).json({ error: 'Неправильний email або пароль' });
    }

    // Не відправляємо хеш паролю на фронт
    delete user.password_hash;

    const token = signToken(user);
    res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ user });
}

// ── ВИХІД 
function logout(req, res) {
    
    res.clearCookie('token');
    res.json({ ok: true });
}


function me(req, res) {
    res.json({ user: req.user });
}

module.exports = { register, login, logout, me };