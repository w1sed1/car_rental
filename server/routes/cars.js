const router = require('express').Router();
const ctrl = require('../controllers/carController');
const { authRequired, adminOnly } = require('../middleware/auth');

router.get('/',          ctrl.listCars);      // каталог
router.get('/nearby',    ctrl.nearby);        // геопошук
router.get('/locations', ctrl.listLocations); // список локацій
router.get('/live-gps',  ctrl.liveGps);       // GPS позиції
router.get('/:id',       ctrl.getCar);        // одне авто



router.post('/',      authRequired, adminOnly, ctrl.adminCreateCar);
router.put('/:id',    authRequired, adminOnly, ctrl.adminUpdateCar);
router.delete('/:id', authRequired, adminOnly, ctrl.adminDeleteCar);

module.exports = router;