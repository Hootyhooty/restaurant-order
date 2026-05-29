const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  recordBookingMetric,
  recordWebhookMetric,
  getOpsSnapshot,
} = require('../utils/opsMetricsStore');
const { evaluateAlerts } = require('../utils/alertRules');

describe('ops metrics store', () => {
  test('aggregates booking attempts/success/fail/conflict', () => {
    recordBookingMetric({ outcome: 'attempt' });
    recordBookingMetric({ outcome: 'attempt' });
    recordBookingMetric({ outcome: 'success' });
    recordBookingMetric({ outcome: 'fail' });
    recordBookingMetric({ outcome: 'conflict' });

    const snap = getOpsSnapshot('day');
    assert.equal(snap.bookings.attempts, 2);
    assert.equal(snap.bookings.success, 1);
    assert.equal(snap.bookings.fail, 1);
    assert.equal(snap.bookings.conflict, 1);
    assert.equal(snap.bookings.checkoutOutcomes, 3);
  });

  test('aggregates webhook duration percentiles', () => {
    recordWebhookMetric({ durationMs: 100, eventType: 'checkout.session.completed', outcome: 'success' });
    recordWebhookMetric({ durationMs: 500, eventType: 'checkout.session.completed', outcome: 'success' });
    recordWebhookMetric({ durationMs: 2000, eventType: 'checkout.session.completed', outcome: 'success' });

    const snap = getOpsSnapshot('day');
    assert.equal(snap.webhooks.count, 3);
    assert.ok(snap.webhooks.p95 >= 500);
  });
});

describe('alert rules', () => {
  test('fires refund backlog and booking fail rate alerts', () => {
    const { alerts } = evaluateAlerts({
      bookings: {
        checkoutOutcomes: 10,
        failRatePct: 30,
        conflictRatePct: 2,
        successRatePct: 70,
      },
      webhooks: { count: 5, fail: 0, p95: 100 },
      refundBacklog: 8,
      apiLatency: { count: 100, p95: 120 },
    });

    const ids = alerts.map((a) => a.id);
    assert.ok(ids.includes('booking_fail_rate'));
    assert.ok(ids.includes('refund_backlog'));
    assert.equal(ids.includes('api_latency'), false);
  });
});
