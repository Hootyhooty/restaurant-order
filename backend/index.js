// backend/index.js
const path = require('path');
const fs = require('fs');
const express = require('express');

[path.join(__dirname, 'public', 'food_img'), path.join(__dirname, 'public', 'display')].forEach((dir) => {
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { /* ignore */ }
});
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const mealsRoutes = require('./routes/meals');
const souvenirsRoutes = require('./routes/souvenirs');
const stripeRoutes = require('./routes/stripe');
const reviewRoutes = require('./routes/reviews');
const messageRoutes = require('./routes/messages');
const { webhookHandler } = require('./controllers/stripeController');

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.warn('Warning: MONGODB_URI or JWT_SECRET is not set. Create backend/.env based on backend/.env.example');
}

const app = express();

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

const allowedOrigins = [...localOrigins, ...extraOrigins];

// CORS configuration - allow all origins if FRONTEND_ORIGIN is not set (for easier deployment)
// Otherwise, only allow explicitly listed origins
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
    
    // If FRONTEND_ORIGIN is not set, allow all origins (for easier initial deployment)
    // You should set FRONTEND_ORIGIN in production for security
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors());

// Stripe webhook must be registered before JSON body parsing
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), webhookHandler);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced MongoDB connection logging
// Force database name to be restaurant_db
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_db';
const { syncSouvenirsDbToFile } = require('./utils/syncSouvenirs');

mongoose.connect(mongoUri, {
  dbName: 'restaurant_db',  // Explicitly set database name
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB database: restaurant_db');
  await syncSouvenirsDbToFile();
}).catch((err) => {
  console.error('MongoDB connection error:', err.message);
});

app.use('/food_img', express.static(path.join(__dirname, 'public', 'food_img')));
app.use('/display', express.static(path.join(__dirname, 'public', 'display')));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/meals', mealsRoutes);
app.use('/api/souvenirs', souvenirsRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/messages', messageRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});