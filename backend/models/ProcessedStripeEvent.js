const mongoose = require('mongoose');

/**
 * Tracks Stripe webhook event IDs so duplicate deliveries are ignored.
 * Record is created before handling; removed if handling throws so Stripe retries can replay.
 */
const processedStripeEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
    collection: 'processed_stripe_events',
  }
);

module.exports = mongoose.model('ProcessedStripeEvent', processedStripeEventSchema);
