const {
  generateVerificationToken,
  hashVerificationToken,
} = require('./emailVerification');

const DEFAULT_EXPIRES_HOURS = 1;

function envNumber(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getPasswordResetExpiryDate() {
  const hours = envNumber('PASSWORD_RESET_EXPIRES_HOURS', DEFAULT_EXPIRES_HOURS);
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function buildPasswordResetUrl(rawToken) {
  const base = (process.env.FRONTEND_URL || process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
    .split(',')[0]
    .trim()
    .replace(/\/$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;
}

module.exports = {
  generateVerificationToken,
  hashVerificationToken,
  getPasswordResetExpiryDate,
  buildPasswordResetUrl,
};
