const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_EVENTS = 20000;

const bookingEvents = [];
const webhookEvents = [];

const prune = (list, now = Date.now()) => {
  while (list.length > 0 && now - list[0].timestamp > MAX_AGE_MS) {
    list.shift();
  }
  if (list.length > MAX_EVENTS) {
    list.splice(0, list.length - MAX_EVENTS);
  }
};

const rangeWindowMs = (range) => {
  if (range === 'week') return 7 * 24 * 60 * 60 * 1000;
  if (range === 'month') return 30 * 24 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
};

const percentile = (arr, p) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
};

const recordBookingMetric = ({ outcome, reason, timestamp = Date.now() }) => {
  bookingEvents.push({
    outcome: String(outcome || 'attempt'),
    reason: reason ? String(reason) : undefined,
    timestamp,
  });
  prune(bookingEvents, timestamp);
};

const recordWebhookMetric = ({ durationMs, eventType, outcome, timestamp = Date.now() }) => {
  webhookEvents.push({
    durationMs: Number(durationMs || 0),
    eventType: String(eventType || 'unknown'),
    outcome: String(outcome || 'success'),
    timestamp,
  });
  prune(webhookEvents, timestamp);
};

const getOpsSnapshot = (range = 'day') => {
  const now = Date.now();
  const windowMs = rangeWindowMs(range);
  prune(bookingEvents, now);
  prune(webhookEvents, now);

  const windowBookings = bookingEvents.filter((e) => now - e.timestamp <= windowMs);
  const windowWebhooks = webhookEvents.filter((e) => now - e.timestamp <= windowMs);

  const attempts = windowBookings.filter((e) => e.outcome === 'attempt').length;
  const success = windowBookings.filter((e) => e.outcome === 'success').length;
  const fail = windowBookings.filter((e) => e.outcome === 'fail').length;
  const conflict = windowBookings.filter((e) => e.outcome === 'conflict').length;
  const checkoutOutcomes = success + fail + conflict;
  const failRatePct =
    checkoutOutcomes > 0 ? Number(((fail / checkoutOutcomes) * 100).toFixed(2)) : 0;
  const conflictRatePct =
    checkoutOutcomes > 0 ? Number(((conflict / checkoutOutcomes) * 100).toFixed(2)) : 0;
  const successRatePct =
    checkoutOutcomes > 0 ? Number(((success / checkoutOutcomes) * 100).toFixed(2)) : 0;

  const webhookDurations = windowWebhooks
    .map((e) => e.durationMs)
    .filter((n) => Number.isFinite(n) && n >= 0);
  const webhookFail = windowWebhooks.filter((e) => e.outcome === 'fail').length;

  return {
    windowHours: Math.round(windowMs / (60 * 60 * 1000)),
    bookings: {
      attempts,
      success,
      fail,
      conflict,
      checkoutOutcomes,
      successRatePct,
      failRatePct,
      conflictRatePct,
    },
    webhooks: {
      count: windowWebhooks.length,
      fail: webhookFail,
      p50: Number(percentile(webhookDurations, 50).toFixed(2)),
      p95: Number(percentile(webhookDurations, 95).toFixed(2)),
      p99: Number(percentile(webhookDurations, 99).toFixed(2)),
    },
  };
};

module.exports = {
  recordBookingMetric,
  recordWebhookMetric,
  getOpsSnapshot,
};
