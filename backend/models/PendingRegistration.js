// src/backend/models/PendingRegistration.js
// Holds a registration attempt until the user verifies their email.
// No real Customer account exists until verification succeeds.
const mongoose = require('mongoose');
const { generateUUID } = require('../utils/uuid');

const pendingRegistrationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: generateUUID,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    // Already bcrypt-hashed in the controller; never store plaintext.
    password_hash: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    verification_token: {
      type: String,
      required: true,
      index: true,
    },
    verification_expires: {
      type: Date,
      required: true,
    },
    // TTL: Mongo auto-removes the pending record once this time passes.
    expires_at: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'pending_registrations',
  },
);

pendingRegistrationSchema.index({ username: 1 });
pendingRegistrationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PendingRegistration', pendingRegistrationSchema);
