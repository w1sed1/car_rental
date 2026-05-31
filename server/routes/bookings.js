const router = require('express').Router();
const ctrl = require('../controllers/bookingController');
const { authRequired, notBanned } = require('../middleware/auth');

router.post('/',           authRequired, notBanned, ctrl.createBooking);
router.get('/my',          authRequired, ctrl.listMyBookings);
router.post('/:id/cancel', authRequired, ctrl.cancelBooking);

router.post('/twiml/:id',        ctrl.twimlForBooking);
router.post('/confirm-call/:id', ctrl.handleConfirmCall);

module.exports = router;