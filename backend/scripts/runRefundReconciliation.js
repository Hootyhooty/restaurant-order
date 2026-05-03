/**
 * Manual trigger: retry Stripe refunds for refund_pending bookings / intents.
 * Usage (from backend/): node scripts/runRefundReconciliation.js
 * Requires MONGODB_URI, STRIPE_SECRET_KEY, and ADMIN user for optional customer messages.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { runRefundReconciliation } = require('../jobs/refundReconciliationJob');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_db';

async function main() {
  await mongoose.connect(mongoUri, {
    dbName: 'restaurant_db',
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  try {
    const summary = await runRefundReconciliation();
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode = summary.bookings.failed.length || summary.intents.failed.length ? 1 : 0;
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
