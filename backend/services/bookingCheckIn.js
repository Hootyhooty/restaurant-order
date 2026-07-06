const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const Message = require('../models/Message');
const AppError = require('../utils/appError');
const { refundPaymentIntentAmount } = require('../utils/stripeRefundPayment');
const { recordAdminAudit } = require('../utils/auditLog');
const { createKitchenOrderFromBooking } = require('./kitchenOrderFromBooking');

const getAdminUserId = async () => {
  const admin = await Customer.findOne({ role: 'ADMIN' }).select('_id').lean();
  return admin?._id?.toString() || null;
};

const sendAdminMessage = async ({ recipientId, subject, body }) => {
  const adminId = await getAdminUserId();
  if (!adminId) return;
  await Message.create({
    senderId: adminId,
    recipientId,
    subject,
    body,
  });
};

const formatCustomerName = (customer) => {
  const full = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim();
  return full || customer?.username || 'Guest';
};

async function performBookingCheckIn(bookingId, req) {
  const id = String(bookingId || '').trim();
  const b = await Booking.findById(id);
  if (!b) {
    throw new AppError('Booking not found.', 404);
  }
  if (b.status !== 'confirmed') {
    throw new AppError('Only confirmed bookings can be checked in.', 400);
  }

  const previousStatus = b.status;

  try {
    await refundPaymentIntentAmount({
      paymentIntentId: b.stripePaymentIntentId,
      amountMajor: b.reservationCost,
    });
    b.refundedAmount = Number(b.refundedAmount || 0) + Number(b.reservationCost || 0);
    b.refundReason = 'Checked in: refund reservation cost';
    b.status = 'checked_in';
    await b.save();

    await recordAdminAudit(req, {
      action: 'booking.check_in',
      bookingId: b._id.toString(),
      previousStatus,
      newStatus: b.status,
      metadata: {
        refundAmount: b.reservationCost,
        refundStatus: 'processed',
      },
    });

    await sendAdminMessage({
      recipientId: b.userId,
      subject: 'Reservation Check-in (Refund)',
      body:
        `Checked in confirmed.\n\n` +
        `Table: ${b.tableId}\n` +
        `Date: ${b.date}\n` +
        `Time: ${String(b.timeSlot || '').replace('-', '–')}\n\n` +
        `Refund processed: reservation cost ฿${b.reservationCost}`,
    });
  } catch (refundErr) {
    b.status = 'refund_pending';
    b.refundReason = `Check-in refund failed: ${refundErr.message || 'unknown error'}`;
    await b.save();

    await recordAdminAudit(req, {
      action: 'booking.check_in_refund_pending',
      bookingId: b._id.toString(),
      previousStatus,
      newStatus: b.status,
      metadata: {
        refundAmount: b.reservationCost,
        refundStatus: 'pending',
        error: refundErr.message || 'unknown',
      },
    });

    await sendAdminMessage({
      recipientId: b.userId,
      subject: 'Reservation Check-in (Refund Pending)',
      body:
        `Checked in confirmed.\n\n` +
        `Refund is pending. Admin will process it manually.\n\n` +
        `Table: ${b.tableId}\nDate: ${b.date}\nTime: ${String(b.timeSlot || '').replace('-', '–')}\n`,
    });
  }

  const customer = await Customer.findById(b.userId)
    .select('username first_name last_name')
    .lean();
  await createKitchenOrderFromBooking(b, formatCustomerName(customer));

  return { success: true };
}

module.exports = { performBookingCheckIn };
