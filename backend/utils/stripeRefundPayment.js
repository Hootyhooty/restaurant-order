const { getStripe } = require('./stripeClient');

/**
 * Partial (or full) refund against a PaymentIntent. amountMajor is in major currency units (e.g. THB).
 */
async function refundPaymentIntentAmount({ paymentIntentId, amountMajor }) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured.');
  if (!paymentIntentId) throw new Error('Missing payment intent id.');
  const amount = Math.max(0, Math.round(Number(amountMajor || 0) * 100));
  if (amount <= 0) return null;
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount,
  });
}

module.exports = { refundPaymentIntentAmount };
