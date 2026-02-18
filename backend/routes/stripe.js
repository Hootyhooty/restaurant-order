const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../controllers/authController');
const { createCheckoutSession } = require('../controllers/stripeController');

router.post('/create-checkout-session', authMiddleware, createCheckoutSession);

module.exports = router;

