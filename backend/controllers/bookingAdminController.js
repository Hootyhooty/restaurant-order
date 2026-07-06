const Booking = require('../models/Booking');
const Message = require('../models/Message');
const Customer = require('../models/Customer');
const { refundPaymentIntentAmount } = require('../utils/stripeRefundPayment');
const { recordAdminAudit } = require('../utils/auditLog');
const AppError = require('../utils/appError');
const { performBookingCheckIn } = require('../services/bookingCheckIn');
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

// GET /api/admin/bookings?page=1&limit=20&q=...
const getBookings = async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const q = String(req.query.q || '').trim();

    const filter = {};
    if (q) {
      const or = [
        { status: { $regex: q, $options: 'i' } },
        { date: { $regex: q, $options: 'i' } },
        { timeSlot: { $regex: q, $options: 'i' } },
        { userId: { $regex: q, $options: 'i' } },
      ];
      const maybeNum = Number(q);
      if (Number.isFinite(maybeNum)) {
        or.push({ tableId: maybeNum });
        or.push({ guestCount: maybeNum });
        or.push({ amountTotal: maybeNum });
      }
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q)) {
        or.push({ _id: q });
      }
      filter.$or = or;
    }

    const total = await Booking.countDocuments(filter);
    const items = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      page,
      limit,
      total,
      items: items.map((b) => ({
        id: b._id,
        userId: b.userId,
        tableId: b.tableId,
        date: b.date,
        timeSlot: b.timeSlot,
        guestCount: b.guestCount,
        status: b.status,
        reservationFee: b.reservationFee,
        reservationCost: b.reservationCost,
        preOrderTotal: b.preOrderTotal,
        amountTotal: b.amountTotal,
        refundedAmount: b.refundedAmount,
        stripePaymentIntentId: b.stripePaymentIntentId || '',
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Admin get bookings error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to load bookings' });
  }
};

// POST /api/admin/bookings/:bookingId/check-in
const checkInBooking = async (req, res) => {
  try {
    const bookingId = String(req.params.bookingId || '').trim();
    await performBookingCheckIn(bookingId, req);
    return res.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Admin check-in booking error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to check in booking' });
  }
};

// POST /api/admin/bookings/:bookingId/no-show
const noShowBooking = async (req, res) => {
  try {
    const bookingId = String(req.params.bookingId || '').trim();
    const b = await Booking.findById(bookingId);
    if (!b) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (b.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Only confirmed bookings can be marked as no-show.' });
    }

    const previousStatus = b.status;
    b.status = 'no_show';
    await b.save();

    await recordAdminAudit(req, {
      action: 'booking.no_show',
      bookingId: b._id.toString(),
      previousStatus,
      newStatus: b.status,
    });

    await sendAdminMessage({
      recipientId: b.userId,
      subject: 'Reservation No Show',
      body:
        `Your reservation was marked as No Show.\n\n` +
        `Table: ${b.tableId}\n` +
        `Date: ${b.date}\n` +
        `Time: ${String(b.timeSlot || '').replace('-', '–')}\n\n` +
        `No refund will be provided.`,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Admin no-show booking error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to mark no-show' });
  }
};

// POST /api/admin/bookings/:bookingId/cancel
// Refund preorder food only (if any)
const cancelBooking = async (req, res) => {
  try {
    const bookingId = String(req.params.bookingId || '').trim();
    const b = await Booking.findById(bookingId);
    if (!b) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (b.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Only confirmed bookings can be cancelled.' });
    }

    const previousStatus = b.status;
    const refundAmount = Number(b.preOrderTotal || 0);

    if (refundAmount > 0) {
      try {
        await refundPaymentIntentAmount({
          paymentIntentId: b.stripePaymentIntentId,
          amountMajor: refundAmount,
        });
        b.refundedAmount = Number(b.refundedAmount || 0) + refundAmount;
        b.refundReason = 'Admin cancelled: refund preorder only';
        b.status = 'refunded';
      } catch (refundErr) {
        b.status = 'refund_pending';
        b.refundReason = `Admin cancel refund failed: ${refundErr.message || 'unknown error'}`;
      }
    } else {
      b.status = 'cancelled';
      b.refundReason = 'Admin cancelled (no preorder refund)';
    }

    await b.save();

    const auditAction =
      b.status === 'refund_pending' ? 'booking.cancel_refund_pending' : 'booking.cancel';
    await recordAdminAudit(req, {
      action: auditAction,
      bookingId: b._id.toString(),
      previousStatus,
      newStatus: b.status,
      metadata: {
        refundAmount,
        refundStatus: b.status === 'refund_pending' ? 'pending' : refundAmount > 0 ? 'processed' : 'none',
      },
    });

    await sendAdminMessage({
      recipientId: b.userId,
      subject: 'Reservation Cancelled by Admin',
      body:
        `Your reservation was cancelled by Admin.\n\n` +
        `Table: ${b.tableId}\n` +
        `Date: ${b.date}\n` +
        `Time: ${String(b.timeSlot || '').replace('-', '–')}\n\n` +
        (refundAmount > 0
          ? `Refund: preorder food cost ฿${refundAmount} (${b.status === 'refund_pending' ? 'pending' : 'processed'})`
          : `Refund: none`),
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Admin cancel booking error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to cancel booking' });
  }
};

module.exports = {
  getBookings,
  checkInBooking,
  noShowBooking,
  cancelBooking,
};
