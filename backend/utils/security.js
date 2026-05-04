const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

function envNumber(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function jsonError(message) {
  return {
    success: false,
    message,
  };
}

const helmetMiddleware = helmet({
  crossOriginResourcePolicy: false,
});

const authLimiter = rateLimit({
  windowMs: envNumber('RATE_LIMIT_AUTH_WINDOW_MS', 15 * 60 * 1000),
  limit: envNumber('RATE_LIMIT_AUTH_MAX', 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonError('Too many authentication attempts. Please try again later.'),
});

const writeLimiter = rateLimit({
  windowMs: envNumber('RATE_LIMIT_WRITE_WINDOW_MS', 60 * 1000),
  limit: envNumber('RATE_LIMIT_WRITE_MAX', 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonError('Too many write requests. Please slow down and try again.'),
});

const publicLimiter = rateLimit({
  windowMs: envNumber('RATE_LIMIT_PUBLIC_WINDOW_MS', 60 * 1000),
  limit: envNumber('RATE_LIMIT_PUBLIC_MAX', 240),
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonError('Too many requests. Please try again in a moment.'),
});

module.exports = {
  helmetMiddleware,
  authLimiter,
  writeLimiter,
  publicLimiter,
};
