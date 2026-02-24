const mongoose = require('mongoose');
const { generateUUID } = require('../utils/uuid');

const messageSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: generateUUID,
    },
    senderId: {
      type: String,
      required: true,
      ref: 'Customer',
    },
    recipientId: {
      type: String,
      required: true,
      ref: 'Customer',
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    read: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'messages',
  }
);

messageSchema.index({ recipientId: 1, deletedAt: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
