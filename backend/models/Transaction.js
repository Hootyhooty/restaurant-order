const mongoose = require('mongoose');

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
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },

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

module.exports = mongoose.model('Transaction', transactionSchema);

