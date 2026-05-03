const Stripe = require('stripe');

const TEST_UNSET = Symbol('stripe_test_unset');
let testClientOverride = TEST_UNSET;

/** Integration tests only: replace Stripe instance (or null). Cleared via clearStripeClientForTest. */
function setStripeClientForTest(client) {
  testClientOverride = client;
}

function clearStripeClientForTest() {
  testClientOverride = TEST_UNSET;
}

function getStripe() {
  if (testClientOverride !== TEST_UNSET) {
    return testClientOverride;
  }
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  return stripeSecretKey ? new Stripe(stripeSecretKey) : null;
}

module.exports = {
  getStripe,
  setStripeClientForTest,
  clearStripeClientForTest,
};
