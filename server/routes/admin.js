const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { authRequired, adminOnly } = require('../middleware/auth');

router.use(authRequired, adminOnly);

router.get('/dashboard',      ctrl.dashboard);
router.get('/bookings',       ctrl.listBookings);
router.get('/users',          ctrl.listUsers);
router.post('/users/:id/ban', ctrl.toggleBan);
router.post('/maintenance',   ctrl.addMaintenanceLog);
router.post('/run-cron',      ctrl.runMaintenance);

module.exports = router;