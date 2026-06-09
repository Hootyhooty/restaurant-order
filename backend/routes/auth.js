// src/backend/routes/auth.js
const express = require('express');
const router = express.Router();
const {
  register,
  login,
  verifyEmail,
  resendVerification,
} = require('../controllers/authController');
const {
  validateRegisterBody,
  validateLoginBody,
  validateVerifyEmailBody,
  validateResendVerificationBody,
} = require('../utils/validation');

router.post('/register', validateRegisterBody, register);
router.post('/login', validateLoginBody, login);
router.post('/verify-email', validateVerifyEmailBody, verifyEmail);
router.post('/resend-verification', validateResendVerificationBody, resendVerification);

module.exports = router;