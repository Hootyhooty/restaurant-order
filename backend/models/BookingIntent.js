const mongoose = require('mongoose');
const { generateUUID } = require('../utils/uuid');

const preOrderItemSchema = new mongoose.Schema(
  {
    mealId: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const bookingIntentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateUUID },

    userId: { type: String, ref: 'Customer', required: true, index: true },

    tableId: { type: Number, required: true, min: 1, max: 12, index: true },
    date: { type: String, required: true, trim: true, index: true },
    timeSlot: { type: String, required: true, trim: true, index: true },
    guestCount: { type: Number, required: true, enum: [2, 4, 6, 8] },

    reservationFee: { type: Number, required: true, default: 100, min: 0 },
    reservationCost: { type: Number, required: true, min: 0 },
    preOrderItems: { type: [preOrderItemSchema], default: [] },
    preOrderTotal: { type: Number, required: true, default: 0, min: 0 },

    redeemCode: { type: String, default: '', trim: true },
    discountAmount: { type: Number, required: true, default: 0, min: 0 },
    amountTotal: { type: Number, required: true, min: 0 },

    stripeCheckoutSessionId: { type: String, index: true },
    stripePaymentIntentId: { type: String, index: true },
    stripeEventId: { type: String, index: true },

    status: {
      type: String,
      enum: [
        'pending',
        'paid',
        'conflict',
        'refund_pending',
        'refunded',
        'canceled',
        'failed',
      ],
      default: 'pending',
      index: true,
    },

    refundedAmount: { type: Number, required: true, default: 0, min: 0 },
    refundReason: { type: String, default: '', trim: true },
  },
  {
    timestamps: true,
    collection: 'booking_intent',
  }
);

bookingIntentSchema.index({ userId: 1, date: 1, timeSlot: 1, status: 1 });

module.exports = mongoose.model('BookingIntent', bookingIntentSchema);

