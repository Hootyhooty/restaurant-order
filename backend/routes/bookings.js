const express = require('express');
const router = express.Router();

const { getAvailability } = require('../controllers/bookingController');
const { authMiddleware } = require('../controllers/authController');
const {
  createBookingCheckoutSession,
  getMyBookings,
  cancelMyBooking,
} = require('../controllers/bookingPaymentController');

router.get('/availability', getAvailability);
router.post('/create-checkout-session', authMiddleware, createBookingCheckoutSession);
router.get('/my', authMiddleware, getMyBookings);
router.post('/:bookingId/cancel', authMiddleware, cancelMyBooking);

module.exports = router;

