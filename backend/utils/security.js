const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const isProduction = process.env.NODE_ENV === 'production';

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

const helmetMiddleware = isProduction
  ? helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:', 'http:'],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  : helmet({
      crossOriginResourcePolicy: false,
    });

const authLimiter = rateLimit({
  windowMs: envNumber('RATE_LIMIT_AUTH_WINDOW_MS', 15 * 60 * 1000),
  limit: envNumber('RATE_LIMIT_AUTH_MAX', 20),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/logout',
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

/** Stricter limit for booking checkout / cancel (abuse-prone). */
const bookingLimiter = rateLimit({
  windowMs: envNumber('RATE_LIMIT_BOOKING_WINDOW_MS', 60 * 1000),
  limit: envNumber('RATE_LIMIT_BOOKING_MAX', 15),
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonError('Too many booking requests. Please try again in a moment.'),
});

/** Staff/kitchen dashboards — polling + SSE; looser than auth, tighter than anonymous public reads. */
const operationalLimiter = rateLimit({
  windowMs: envNumber('RATE_LIMIT_OPERATIONAL_WINDOW_MS', 60 * 1000),
  limit: envNumber('RATE_LIMIT_OPERATIONAL_MAX', 180),
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonError('Too many requests. Please slow down and try again.'),
});

/** Stripe webhook — allow bursts but block floods. */
const webhookLimiter = rateLimit({
  windowMs: envNumber('RATE_LIMIT_WEBHOOK_WINDOW_MS', 60 * 1000),
  limit: envNumber('RATE_LIMIT_WEBHOOK_MAX', 120),
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonError('Too many webhook requests.'),
});

module.exports = {
  helmetMiddleware,
  authLimiter,
  writeLimiter,
  publicLimiter,
  bookingLimiter,
  operationalLimiter,
  webhookLimiter,
};
