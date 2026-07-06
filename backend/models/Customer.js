// src/backend/models/Customer.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { generateUUID } = require('../utils/uuid');

const customerSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: generateUUID,
    },
    // Core identity fields (keep existing username for compatibility)
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: 3,
      maxlength: 50
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true
    },
    alternate_email: {
      type: String,
      trim: true,
      lowercase: true
    },

    first_name: {
      type: String,
      trim: true,
      maxlength: 50
    },
    last_name: {
      type: String,
      trim: true,
      maxlength: 50
    },

    // Profile image with default
    photo: {
      type: String,
      default: 'other_img/default.jpg' // maps to public/other_img/default.jpg
    },

    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    },
    display_phone: {
      type: Boolean,
      default: false
    },

    role: {
      type: String,
      enum: ['USER'],
      default: 'USER'
    },

    password: {
      type: String,
      required: true,
      minlength: 8
    },
    password_changed_at: {
      type: Date
    },
    password_reset_token: {
      type: String
    },
    password_reset_expires: {
      type: Date
    },
    email_verification_token: {
      type: String
    },
    email_verification_expires: {
      type: Date
    },

    active: {
      type: Boolean,
      default: true
    },

    // Address fields
    address_line1: {
      type: String,
      maxlength: 200
    },
    address_line2: {
      type: String,
      maxlength: 200
    },
    city: {
      type: String,
      maxlength: 100
    },
    state: {
      type: String,
      maxlength: 100
    },
    zipcode: {
      type: String,
      maxlength: 20
    },
    country: {
      type: String,
      maxlength: 100,
      default: 'United States'
    },
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    },

    // Social media
    facebook: String,
    instagram: String,
    twitter: String,
    description: {
      type: String,
      maxlength: 500
    },
    profile_slug: {
      type: String,
      unique: true,
      sparse: true
    },

    // Verification / reputation
    email_verified: {
      type: Boolean,
      default: false
    },
    phone_verified: {
      type: Boolean,
      default: false
    },

    // Soft delete / status flags
    deleted_at: {
      type: Date
    },
    is_deleted: {
      type: Boolean,
      default: false
    },
    is_active: {
      type: Boolean,
      default: true
    },
    is_verified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'customers'
  }
);

customerSchema.pre('save', async function (next) {
  // Generate UUID if _id is not set
  if (!this._id) {
    this._id = generateUUID();
  }
  // Allow callers to store an already-hashed password (e.g. activating a verified
  // PendingRegistration) by setting doc.$locals.skipPasswordHash = true.
  if (this.isModified('password') && !this.$locals.skipPasswordHash) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

customerSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Customer', customerSchema);