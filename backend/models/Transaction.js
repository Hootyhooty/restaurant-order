const mongoose = require('mongoose');
const { generateUUID } = require('../utils/uuid');
const { generateOrderId } = require('../utils/orderId');

const transactionItemSchema = new mongoose.Schema(
  {
    mealId: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    unitPrice: { type: Number, required: true, min: 0 }, // major currency units (e.g. 89 THB)
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: generateUUID,
    },
    orderId: { type: String, unique: true, index: true }, // ORD-yyyy-nnnnn format
    userId: { type: String, ref: 'Customer', required: true },

    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'canceled'],
      default: 'pending',
      index: true,
    },

    currency: { type: String, default: 'thb' },
    amountTotal: { type: Number, required: true, min: 0 }, // major currency units (e.g. 199 THB)
    items: { type: [transactionItemSchema], default: [] },

    stripeCheckoutSessionId: { type: String, index: true },
    stripePaymentIntentId: { type: String, index: true },
    stripeEventId: { type: String, index: true },

    customerEmail: { type: String, default: '', trim: true },
  },
  {
    timestamps: true,
    collection: 'transaction', // force exact collection name requested
  }
);

// Generate orderId before saving
transactionSchema.pre('save', async function (next) {
  if (!this._id) {
    this._id = generateUUID();
  }
  if (!this.orderId) {
    this.orderId = await generateOrderId();
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);

