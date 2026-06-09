const crypto = require('crypto');

const DEFAULT_EXPIRES_HOURS = 24;

function envNumber(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashVerificationToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function getVerificationExpiryDate() {
  const hours = envNumber('EMAIL_VERIFICATION_EXPIRES_HOURS', DEFAULT_EXPIRES_HOURS);
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function buildVerificationUrl(rawToken) {
  const base = (process.env.FRONTEND_URL || process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
    .split(',')[0]
    .trim()
    .replace(/\/$/, '');
  return `${base}/verify-email?token=${encodeURIComponent(rawToken)}`;
}

module.exports = {
  generateVerificationToken,
  hashVerificationToken,
  getVerificationExpiryDate,
  buildVerificationUrl,
};
