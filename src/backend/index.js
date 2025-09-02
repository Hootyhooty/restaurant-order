// src/backend/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/auth');

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.warn('Warning: MONGODB_URI or JWT_SECRET is not set. Create src/backend/.env based on src/backend/.env.example');
}

const app = express();

// Allow frontend origins and handle preflight
const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
}));
app.options('*', cors());
app.use(express.json());

// Enhanced MongoDB connection logging
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB at', process.env.MONGODB_URI.replace(/\/\/.*@/, '//<hidden>@'));
}).catch((err) => {
  console.error('MongoDB connection error:', err.message);
});

app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});