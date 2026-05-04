const express = require('express');
const router = express.Router();

const { getAvailability } = require('../controllers/bookingController');
const { authMiddleware } = require('../controllers/authController');
const {
  createBookingCheckoutSession,
  getMyBookings,
  cancelMyBooking,
} = require('../controllers/bookingPaymentController');
const { publicLimiter, writeLimiter } = require('../utils/security');
const {
  validateBookingAvailabilityQuery,
  validateBookingCheckoutBody,
  validateBookingCancelBody,
} = require('../utils/validation');

router.get('/availability', publicLimiter, validateBookingAvailabilityQuery, getAvailability);
router.post(
  '/create-checkout-session',
  writeLimiter,
  authMiddleware,
  validateBookingCheckoutBody,
  createBookingCheckoutSession,
);
router.get('/my', authMiddleware, getMyBookings);
router.post('/:bookingId/cancel', writeLimiter, authMiddleware, validateBookingCancelBody, cancelMyBooking);

module.exports = router;

