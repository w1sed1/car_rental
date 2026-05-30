
const router = require('express').Router();
const ctrl   = require('../controllers/authController');
const { authRequired } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', ctrl.register);

// POST /api/auth/login
router.post('/login', ctrl.login);

// POST /api/auth/logout
router.post('/logout', ctrl.logout);


router.get('/me', authRequired, ctrl.me);

module.exports = router;