const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const getThresholds = () => ({
  bookingFailRatePct: num(process.env.ALERT_BOOKING_FAIL_RATE_PCT, 20),
  bookingConflictRatePct: num(process.env.ALERT_BOOKING_CONFLICT_RATE_PCT, 10),
  webhookP95Ms: num(process.env.ALERT_WEBHOOK_P95_MS, 3000),
  refundBacklogMax: num(process.env.ALERT_REFUND_BACKLOG_MAX, 5),
  apiP95Ms: num(process.env.ALERT_API_P95_MS, 500),
  webhookFailCount: num(process.env.ALERT_WEBHOOK_FAIL_COUNT, 3),
});

/**
 * Evaluate operational alerts from live metrics and DB backlog counts.
 * @returns {{ alerts: Array, thresholds: object }}
 */
const evaluateAlerts = ({ bookings, webhooks, refundBacklog, apiLatency }) => {
  const thresholds = getThresholds();
  const alerts = [];
  const now = new Date().toISOString();

  const b = bookings || {};
  const w = webhooks || {};
  const latency = apiLatency || {};

  if (b.checkoutOutcomes > 0 && b.failRatePct >= thresholds.bookingFailRatePct) {
    alerts.push({
      id: 'booking_fail_rate',
      severity: 'warning',
      message: `Booking checkout fail rate ${b.failRatePct}% exceeds ${thresholds.bookingFailRatePct}%`,
      value: b.failRatePct,
      threshold: thresholds.bookingFailRatePct,
      since: now,
    });
  }

  if (b.checkoutOutcomes > 0 && b.conflictRatePct >= thresholds.bookingConflictRatePct) {
    alerts.push({
      id: 'booking_conflict_rate',
      severity: 'warning',
      message: `Booking conflict rate ${b.conflictRatePct}% exceeds ${thresholds.bookingConflictRatePct}%`,
      value: b.conflictRatePct,
      threshold: thresholds.bookingConflictRatePct,
      since: now,
    });
  }

  if (w.count > 0 && w.p95 >= thresholds.webhookP95Ms) {
    alerts.push({
      id: 'webhook_latency',
      severity: 'warning',
      message: `Webhook processing p95 ${w.p95}ms exceeds ${thresholds.webhookP95Ms}ms`,
      value: w.p95,
      threshold: thresholds.webhookP95Ms,
      since: now,
    });
  }

  if (w.fail >= thresholds.webhookFailCount) {
    alerts.push({
      id: 'webhook_failures',
      severity: 'critical',
      message: `Webhook failures (${w.fail}) reached alert threshold (${thresholds.webhookFailCount})`,
      value: w.fail,
      threshold: thresholds.webhookFailCount,
      since: now,
    });
  }

  if (Number(refundBacklog || 0) >= thresholds.refundBacklogMax) {
    alerts.push({
      id: 'refund_backlog',
      severity: 'critical',
      message: `refund_pending backlog (${refundBacklog}) exceeds ${thresholds.refundBacklogMax}`,
      value: refundBacklog,
      threshold: thresholds.refundBacklogMax,
      since: now,
    });
  }

  if (latency.count > 0 && latency.p95 >= thresholds.apiP95Ms) {
    alerts.push({
      id: 'api_latency',
      severity: 'warning',
      message: `API latency p95 ${latency.p95}ms exceeds ${thresholds.apiP95Ms}ms`,
      value: latency.p95,
      threshold: thresholds.apiP95Ms,
      since: now,
    });
  }

  return { alerts, thresholds };
};

module.exports = {
  getThresholds,
  evaluateAlerts,
};
