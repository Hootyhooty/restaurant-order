// src/backend/routes/auth.js
const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  authMiddleware,
} = require('../controllers/authController');
const {
  verifyMfaLogin,
  getMfaStatus,
  setupMfa,
  confirmMfaSetup,
  disableMfa,
} = require('../controllers/mfaController');
const {
  validateRegisterBody,
  validateLoginBody,
  validateVerifyEmailBody,
  validateResendVerificationBody,
  validateForgotPasswordBody,
  validateResetPasswordBody,
  validateMfaCodeBody,
  validateMfaVerifyLoginBody,
  validateMfaPasswordBody,
  validateMfaDisableBody,
} = require('../utils/validation');

router.post('/register', validateRegisterBody, register);
router.post('/login', validateLoginBody, login);
router.post('/logout', logout);
router.post('/mfa/verify', validateMfaVerifyLoginBody, verifyMfaLogin);
router.get('/mfa/status', authMiddleware, getMfaStatus);
router.post('/mfa/setup', authMiddleware, validateMfaPasswordBody, setupMfa);
router.post('/mfa/confirm-setup', authMiddleware, validateMfaCodeBody, confirmMfaSetup);
router.post('/mfa/disable', authMiddleware, validateMfaDisableBody, disableMfa);
router.post('/verify-email', validateVerifyEmailBody, verifyEmail);
router.post('/resend-verification', validateResendVerificationBody, resendVerification);
router.post('/forgot-password', validateForgotPasswordBody, forgotPassword);
router.post('/reset-password', validateResetPasswordBody, resetPassword);

module.exports = router;