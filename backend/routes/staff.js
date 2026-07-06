const express = require('express');
const router = express.Router();
const { rolesRequired } = require('../controllers/authController');
const {
  getStaffBookings,
  getStaffBookingDetail,
  checkInStaffBooking,
  getStaffMenu,
  createStaffOrder,
  getStaffOrders,
} = require('../controllers/staffController');
const {
  validateStaffBookingsQuery,
  validateStaffOrdersQuery,
  validateStaffCreateOrderBody,
  validateMongoIdParam,
} = require('../utils/validation');

router.get('/bookings', rolesRequired('STAFF'), validateStaffBookingsQuery, getStaffBookings);
router.get(
  '/bookings/:bookingId',
  rolesRequired('STAFF'),
  validateMongoIdParam('bookingId'),
  getStaffBookingDetail,
);
router.post(
  '/bookings/:bookingId/check-in',
  rolesRequired('STAFF'),
  validateMongoIdParam('bookingId'),
  checkInStaffBooking,
);
router.get('/menu', rolesRequired('STAFF'), getStaffMenu);
router.get('/orders', rolesRequired('STAFF'), validateStaffOrdersQuery, getStaffOrders);
router.post('/orders', rolesRequired('STAFF'), validateStaffCreateOrderBody, createStaffOrder);

module.exports = router;
