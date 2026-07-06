const express = require('express');
const router = express.Router();
const { rolesRequired } = require('../controllers/authController');
const { getStaffBookings, checkInStaffBooking } = require('../controllers/staffController');
const { validateStaffBookingsQuery, validateMongoIdParam } = require('../utils/validation');

router.get('/bookings', rolesRequired('STAFF'), validateStaffBookingsQuery, getStaffBookings);
router.post(
  '/bookings/:bookingId/check-in',
  rolesRequired('STAFF'),
  validateMongoIdParam('bookingId'),
  checkInStaffBooking,
);

module.exports = router;
