const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generateUUID } = require('../utils/uuid');

const OPS_ROLES = ['ADMIN', 'STAFF', 'KITCHEN'];

const staffSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: generateUUID,
    },
    customerId: {
      type: String,
      ref: 'Customer',
      sparse: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
    },
    first_name: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    last_name: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    photo: {
      type: String,
      default: 'other_img/default.jpg',
    },
    role: {
      type: String,
      enum: OPS_ROLES,
      required: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    password_changed_at: {
      type: Date,
    },
    active: {
      type: Boolean,
      default: true,
    },
    email_verified: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'staffs',
  },
);

staffSchema.pre('save', async function preSave(next) {
  if (!this._id) {
    this._id = generateUUID();
  }
  if (this.isModified('password') && !this.$locals.skipPasswordHash) {
    this.password = await bcrypt.hash(this.password, 10);
    this.password_changed_at = new Date();
  }
  next();
});

staffSchema.methods.comparePassword = async function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Staff', staffSchema);
module.exports.OPS_ROLES = OPS_ROLES;
