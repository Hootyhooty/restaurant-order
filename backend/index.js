// backend/index.js
const path = require('path');
const fs = require('fs');
const express = require('express');
const { randomUUID } = require('crypto');
const { recordApiLatency } = require('./utils/apiLatencyStore');
const { info, warn } = require('./utils/logger');

[path.join(__dirname, 'public', 'food_img'), path.join(__dirname, 'public', 'display')].forEach((dir) => {
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { /* ignore */ }
});
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const mealsRoutes = require('./routes/meals');
const souvenirsRoutes = require('./routes/souvenirs');
const stripeRoutes = require('./routes/stripe');
const reviewRoutes = require('./routes/reviews');
const messageRoutes = require('./routes/messages');
const bookingRoutes = require('./routes/bookings');
const contactRoutes = require('./routes/contact');
const staffRoutes = require('./routes/staff');
const kitchenRoutes = require('./routes/kitchen');
const promotionRoutes = require('./routes/promotions');
const { webhookHandler } = require('./controllers/stripeController');
const { createCsrfProtection } = require('./utils/csrfProtection');
const {
  helmetMiddleware,
  authLimiter,
  publicLimiter,
  operationalLimiter,
  webhookLimiter,
} = require('./utils/security');

const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.warn('Warning: MONGODB_URI or JWT_SECRET is not set. Create backend/.env based on backend/.env.example');
}
if (isProduction && !process.env.FRONTEND_ORIGIN) {
  console.error('FRONTEND_ORIGIN is required in production. Use comma-separated origins if needed.');
  process.exit(1);
}
if (isProduction && String(process.env.JWT_SECRET || '').length < 32) {
  console.error('JWT_SECRET is too short for production. Use at least 32 characters.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmetMiddleware);
app.use((req, res, next) => {
  if (!isProduction) return next();
  const proto = req.get('x-forwarded-proto');
  if (req.secure || proto === 'https') return next();
  return res.status(400).json({
    success: false,
    message: 'HTTPS is required.',
  });
});

// Request ID + API latency structured logging
app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const requestId = req.get('x-request-id') || randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    // Log only API traffic for cleaner KPI analysis
    if (!req.originalUrl.startsWith('/api/')) return;

    const endedAt = process.hrtime.bigint();
    const durationMs = Number(endedAt - startedAt) / 1_000_000;

    recordApiLatency({
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
    });

    info(
      'api_request',
      {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration_ms: Number(durationMs.toFixed(2)),
      },
      req,
    );

    if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 429 || req.validationError) {
      warn(
        'security_event',
        {
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          validationError: req.validationError || null,
        },
        req,
      );
    }
  });

  next();
});

// Allow frontend origins and handle preflight (localhost + deployed frontends)
const localOrigins = [
  'http://localhost:5000', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002',
  'http://127.0.0.1:5000', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:3002'
];

// Optionally allow extra origins via FRONTEND_ORIGIN env (comma separated)
const extraOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = isProduction ? extraOrigins : [...localOrigins, ...extraOrigins];

// CORS configuration:
// - production: only allow local+explicit FRONTEND_ORIGIN values
// - non-production: if FRONTEND_ORIGIN is unset, allow all origins for easier local development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // If FRONTEND_ORIGIN is set, only allow those origins
    if (extraOrigins.length > 0) {
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`CORS blocked origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
      return callback(new Error('Not allowed by CORS'));
    }
    
    if (isProduction) {
      console.warn(`CORS blocked origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
      return callback(new Error('Not allowed by CORS'));
    }

    // Local/dev fallback when FRONTEND_ORIGIN is unset
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: isProduction ? 600 : 0,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Stripe webhook must be registered before JSON body parsing
app.post('/api/stripe/webhook', webhookLimiter, express.raw({ type: 'application/json' }), webhookHandler);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(createCsrfProtection({ allowedOrigins, isProduction }));

// Enhanced MongoDB connection logging
// Force database name to be restaurant_db
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_db';
const { syncSouvenirsDbToFile } = require('./utils/syncSouvenirs');

app.use('/food_img', express.static(path.join(__dirname, 'public', 'food_img')));
app.use('/display', express.static(path.join(__dirname, 'public', 'display')));

// Liveness / readiness (staging & production deploy checks)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    service: 'restaurant-backend',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/ready', (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  if (!dbReady) {
    return res.status(503).json({
      success: false,
      status: 'not_ready',
      db: mongoose.connection.readyState,
    });
  }
  return res.json({
    success: true,
    status: 'ready',
    db: 'restaurant_db',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/meals', publicLimiter, mealsRoutes);
app.use('/api/souvenirs', publicLimiter, souvenirsRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/staff', operationalLimiter, staffRoutes);
app.use('/api/kitchen', operationalLimiter, kitchenRoutes);
app.use('/api/promotions', publicLimiter, promotionRoutes);
app.use('/api/contact', publicLimiter, contactRoutes);

const PORT = process.env.PORT || 5000;

module.exports = app;

if (require.main === module) {
  mongoose
    .connect(mongoUri, {
      dbName: 'restaurant_db',
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(async () => {
      console.log('Connected to MongoDB database: restaurant_db');
      await syncSouvenirsDbToFile();
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err.message);
    });

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    const emailMode = (process.env.EMAIL_MODE || 'sandbox').toLowerCase();
    console.log(
      `Email config: mode=${emailMode} from="${process.env.EMAIL_FROM || '(default)'}" ` +
        `skipSend=${process.env.EMAIL_SKIP_SEND === 'true'} ` +
        (emailMode === 'production'
          ? `transport=resend-http-api apiKey=${process.env.RESEND_API_KEY || process.env.SMTP_PASS ? 'set' : '(unset)'}`
          : 'using Mailtrap sandbox (emails do NOT reach real inboxes)'),
    );
  });
}