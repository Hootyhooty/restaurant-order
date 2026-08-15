const { info, warn } = require('../utils/logger');
const { runRefundReconciliation } = require('./refundReconciliationJob');

let timer = null;
let running = false;

function envNumber(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Fallback in-process refund reconciler for a single backend instance.
 * Prefer a Render Cron Job (`npm run refund:reconcile`) and leave this unset
 * on the web service. Enable with REFUND_RECONCILE_INTERVAL_MS (e.g. 900000).
 */
function startRefundReconciliationScheduler() {
  const intervalMs = envNumber('REFUND_RECONCILE_INTERVAL_MS', 0);
  if (!intervalMs) {
    info('refund_reconcile_scheduler_disabled', {
      hint: 'Set REFUND_RECONCILE_INTERVAL_MS (ms) to enable, or run npm run refund:reconcile manually',
    });
    return;
  }

  if (timer) return;

  const tick = async () => {
    if (running) {
      warn('refund_reconcile_skipped_overlap', {});
      return;
    }
    running = true;
    try {
      const summary = await runRefundReconciliation();
      info('refund_reconcile_scheduled_run', {
        bookingsSucceeded: summary.bookings?.succeeded?.length || 0,
        bookingsFailed: summary.bookings?.failed?.length || 0,
        intentsSucceeded: summary.intents?.succeeded?.length || 0,
        intentsFailed: summary.intents?.failed?.length || 0,
      });
    } catch (err) {
      warn('refund_reconcile_scheduled_error', { error: err.message });
    } finally {
      running = false;
    }
  };

  timer = setInterval(tick, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  info('refund_reconcile_scheduler_started', { intervalMs });
}

function stopRefundReconciliationScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  startRefundReconciliationScheduler,
  stopRefundReconciliationScheduler,
};
