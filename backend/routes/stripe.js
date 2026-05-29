const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../controllers/authController');
const { createCheckoutSession } = require('../controllers/stripeController');
const { writeLimiter } = require('../utils/security');
const { validateStripeCheckoutBody } = require('../utils/validation');

router.post(
  '/create-checkout-session',
  writeLimiter,
  authMiddleware,
  validateStripeCheckoutBody,
  createCheckoutSession,
);

module.exports = router;

