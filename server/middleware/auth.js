const jwt   = require('jsonwebtoken');
const { query } = require('../db');


const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';


function signToken(user) {
    return jwt.sign(
        { id: user.id, role: user.role }, // що кладемо в токен
        JWT_SECRET,                        // чим підписуємо
        { expiresIn: '7d' }               // токен живе 7 днів
    );
}


async function authRequired(req, res, next) {
    // Шукаємо токен в cookies АБО в заголовку Authorization
    // cookies — для браузера, заголовок — для Postman/мобільних
    const token = req.cookies?.token ||
                  req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Не автентифіковано' });
    }

    try {
        
        const payload = jwt.verify(token, JWT_SECRET);

        
        const { rows } = await query(
            'SELECT id, email, full_name, role, is_banned FROM users WHERE id=$1',
            [payload.id]
        );

        if (!rows[0]) {
            return res.status(401).json({ error: 'Користувача не знайдено' });
        }

        
        req.user = rows[0];
        next(); 
    } catch (e) {
        res.status(401).json({ error: 'Невалідний токен' });
    }
}


function adminOnly(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Тільки для адміністратора' });
    }
    next();
}

function notBanned(req, res, next) {
    if (req.user?.is_banned) {
        return res.status(403).json({
            error: 'Ваш акаунт обмежено через часті скасування.'
        });
    }
    next();
}

module.exports = { signToken, authRequired, adminOnly, notBanned };