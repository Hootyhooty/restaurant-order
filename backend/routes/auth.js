// src/backend/routes/auth.js
const express = require('express');
const router = express.Router();
const {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const {
  validateRegisterBody,
  validateLoginBody,
  validateVerifyEmailBody,
  validateResendVerificationBody,
  validateForgotPasswordBody,
  validateResetPasswordBody,
} = require('../utils/validation');

router.post('/register', validateRegisterBody, register);
router.post('/login', validateLoginBody, login);
router.post('/verify-email', validateVerifyEmailBody, verifyEmail);
router.post('/resend-verification', validateResendVerificationBody, resendVerification);
router.post('/forgot-password', validateForgotPasswordBody, forgotPassword);
router.post('/reset-password', validateResetPasswordBody, resetPassword);

module.exports = router;