const Booking = require('../models/Booking');
const BookingIntent = require('../models/BookingIntent');
const Customer = require('../models/Customer');
const Message = require('../models/Message');
const { refundPaymentIntentAmount } = require('../utils/stripeRefundPayment');
const { info, warn } = require('../utils/logger');
const { recordAdminAudit } = require('../utils/auditLog');
const { getAdminActorId } = require('../utils/adminLookup');

const sendAdminMessage = async ({ recipientId, subject, body }) => {
  const adminId = await getAdminActorId();
  if (!adminId) return;
  await Message.create({
    senderId: adminId,
    recipientId,
    subject,
    body,
  });
};

/**
 * Retry Stripe refunds for Booking / BookingIntent stuck in refund_pending.
 * @returns {Promise<{ bookings: object, intents: object }>}
 */
async function runRefundReconciliation() {
  const summary = {
    bookings: { succeeded: [], failed: [], skipped: [] },
    intents: { succeeded: [], failed: [] },
  };

  const bookingDocs = await Booking.find({ status: 'refund_pending' });

  for (const b of bookingDocs) {
    const reason = String(b.refundReason || '');
    try {
      if (reason.startsWith('Check-in refund failed')) {
        await refundPaymentIntentAmount({
          paymentIntentId: b.stripePaymentIntentId,
          amountMajor: b.reservationCost,
        });
        b.refundedAmount = Number(b.refundedAmount || 0) + Number(b.reservationCost || 0);
        b.refundReason = 'Checked in: refund reservation cost (reconciled)';
        b.status = 'checked_in';
        await b.save();
        await sendAdminMessage({
          recipientId: b.userId,
          subject: 'Reservation Refund Completed',
          body:
            `Your check-in refund has been processed successfully.\n\n` +
            `Table: ${b.tableId}\n` +
            `Date: ${b.date}\n` +
            `Time: ${String(b.timeSlot || '').replace('-', '–')}\n\n` +
            `Refund: reservation cost ฿${b.reservationCost}`,
        });
        summary.bookings.succeeded.push({ id: b._id, kind: 'check_in_refund' });
        await recordAdminAudit(null, {
          action: 'refund.reconciled',
          bookingId: b._id.toString(),
          previousStatus: 'refund_pending',
          newStatus: b.status,
          metadata: { kind: 'check_in_refund', refundAmount: b.reservationCost },
          actorId: 'system',
          actorUsername: 'system',
        });
      } else if (reason.startsWith('Admin cancel refund failed')) {
        const refundAmount = Number(b.preOrderTotal || 0);
        await refundPaymentIntentAmount({
          paymentIntentId: b.stripePaymentIntentId,
          amountMajor: refundAmount,
        });
        b.refundedAmount = Number(b.refundedAmount || 0) + refundAmount;
        b.refundReason = 'Admin cancelled: refund preorder only (reconciled)';
        b.status = 'refunded';
        await b.save();
        await sendAdminMessage({
          recipientId: b.userId,
          subject: 'Reservation Refund Completed',
          body:
            `Your preorder refund has been processed successfully.\n\n` +
            `Table: ${b.tableId}\n` +
            `Date: ${b.date}\n` +
            `Time: ${String(b.timeSlot || '').replace('-', '–')}\n\n` +
            `Refund: preorder ฿${refundAmount}`,
        });
        summary.bookings.succeeded.push({ id: b._id, kind: 'admin_cancel_preorder' });
        await recordAdminAudit(null, {
          action: 'refund.reconciled',
          bookingId: b._id.toString(),
          previousStatus: 'refund_pending',
          newStatus: b.status,
          metadata: { kind: 'admin_cancel_preorder', refundAmount },
          actorId: 'system',
          actorUsername: 'system',
        });
      } else {
        summary.bookings.skipped.push({
          id: b._id,
          reason: reason || 'unknown_refund_pending',
        });
      }
    } catch (err) {
      summary.bookings.failed.push({
        id: b._id,
        message: err.message || String(err),
      });
    }
  }

  const intents = await BookingIntent.find({ status: 'refund_pending' });

  for (const intent of intents) {
    try {
      await refundPaymentIntentAmount({
        paymentIntentId: intent.stripePaymentIntentId,
        amountMajor: intent.amountTotal,
      });
      intent.status = 'refunded';
      intent.refundedAmount = intent.amountTotal;
      intent.refundReason = `${String(intent.refundReason || '').trim()} (reconciled)`.trim();
      await intent.save();
      await sendAdminMessage({
        recipientId: intent.userId,
        subject: 'Reservation Refund Completed',
        body:
          `Your payment refund has been completed.\n\n` +
          `Table: ${intent.tableId}\n` +
          `Date: ${intent.date}\n` +
          `Time: ${String(intent.timeSlot || '').replace('-', '–')}\n\n` +
          `Refund total: ฿${intent.amountTotal}`,
      });
      summary.intents.succeeded.push({ id: intent._id });
      await recordAdminAudit(null, {
        action: 'refund.reconciled',
        resourceType: 'booking_intent',
        resourceId: intent._id.toString(),
        bookingId: intent._id.toString(),
        previousStatus: 'refund_pending',
        newStatus: intent.status,
        metadata: { kind: 'intent_conflict_refund', refundAmount: intent.amountTotal },
        actorId: 'system',
        actorUsername: 'system',
      });
    } catch (err) {
      summary.intents.failed.push({
        id: intent._id,
        message: err.message || String(err),
      });
    }
  }

  info('refund_reconciliation_complete', {
    bookingsSucceeded: summary.bookings.succeeded.length,
    bookingsFailed: summary.bookings.failed.length,
    intentsSucceeded: summary.intents.succeeded.length,
    intentsFailed: summary.intents.failed.length,
  });

  if (summary.bookings.failed.length || summary.intents.failed.length) {
    warn('refund_reconciliation_partial_failure', {
      bookingsFailed: summary.bookings.failed.length,
      intentsFailed: summary.intents.failed.length,
    });
  }

  return summary;
}

module.exports = {
  runRefundReconciliation,
};
