const Booking = require('../models/Booking');
const BookingIntent = require('../models/BookingIntent');
const Customer = require('../models/Customer');
const AppError = require('../utils/appError');
const { getBangkokDateString } = require('../utils/bangkokDate');
const { performBookingCheckIn } = require('../services/bookingCheckIn');

const formatCustomerName = (customer) => {
  const full = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim();
  return full || customer?.username || 'Guest';
};

const buildPreOrderSummary = (items) => {
  if (!items?.length) return '';
  return items.map((item) => `${item.name} x${item.quantity}`).join(', ');
};

const bookingSlotKey = (row) =>
  `${row.userId}|${row.tableId}|${row.date}|${row.timeSlot}`;

const mapBookingRow = (b, customerMap) => {
  const preOrderItems = b.preOrderItems || [];
  return {
    id: b._id,
    source: 'booking',
    userId: b.userId,
    customerName: formatCustomerName(customerMap[b.userId]),
    tableId: b.tableId,
    date: b.date,
    timeSlot: b.timeSlot,
    guestCount: b.guestCount,
    status: b.status,
    reservationCost: b.reservationCost,
    hasPreOrder: preOrderItems.length > 0,
    preOrderSummary: buildPreOrderSummary(preOrderItems),
    preOrderTotal: b.preOrderTotal,
    createdAt: b.createdAt,
    canCheckIn: b.status === 'confirmed',
  };
};

const mapIntentRow = (intent, customerMap) => {
  const preOrderItems = intent.preOrderItems || [];
  const displayStatus =
    intent.status === 'pending' ? 'payment_pending' : 'payment_processing';
  return {
    id: intent._id,
    source: 'intent',
    userId: intent.userId,
    customerName: formatCustomerName(customerMap[intent.userId]),
    tableId: intent.tableId,
    date: intent.date,
    timeSlot: intent.timeSlot,
    guestCount: intent.guestCount,
    status: displayStatus,
    reservationCost: intent.reservationCost,
    hasPreOrder: preOrderItems.length > 0,
    preOrderSummary: buildPreOrderSummary(preOrderItems),
    preOrderTotal: intent.preOrderTotal,
    createdAt: intent.createdAt,
    canCheckIn: false,
  };
};

// GET /api/staff/bookings?date=YYYY-MM-DD&status=confirmed
// Lists confirmed rows from `booking` plus in-flight rows from `booking_intent` (pending/paid).
const getStaffBookings = async (req, res) => {
  try {
    const date = String(req.query.date || getBangkokDateString()).trim();
    const status = String(req.query.status || 'confirmed').trim();
    const q = String(req.query.q || '').trim().toLowerCase();

    const bookings = await Booking.find({ date, status })
      .sort({ timeSlot: 1, tableId: 1 })
      .lean();

    const confirmedKeys = new Set(bookings.map(bookingSlotKey));

    const intents = await BookingIntent.find({
      date,
      status: { $in: ['pending', 'paid'] },
    })
      .sort({ timeSlot: 1, tableId: 1 })
      .lean();

    const visibleIntents = intents.filter((intent) => !confirmedKeys.has(bookingSlotKey(intent)));

    const userIds = [
      ...new Set([
        ...bookings.map((b) => b.userId),
        ...visibleIntents.map((i) => i.userId),
      ]),
    ];
    const customers = await Customer.find({ _id: { $in: userIds } })
      .select('username first_name last_name')
      .lean();
    const customerMap = Object.fromEntries(customers.map((c) => [c._id.toString(), c]));

    let items = [
      ...bookings.map((b) => mapBookingRow(b, customerMap)),
      ...visibleIntents.map((i) => mapIntentRow(i, customerMap)),
    ].sort((a, b) => {
      const slotCmp = String(a.timeSlot).localeCompare(String(b.timeSlot));
      if (slotCmp !== 0) return slotCmp;
      return a.tableId - b.tableId;
    });

    if (q) {
      items = items.filter((row) => {
        const haystack = [
          row.customerName,
          String(row.tableId),
          row.timeSlot,
          row.status,
          row.preOrderSummary,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return res.json({
      success: true,
      date,
      status,
      items,
    });
  } catch (error) {
    console.error('Staff get bookings error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to load bookings' });
  }
};

// POST /api/staff/bookings/:bookingId/check-in
const checkInStaffBooking = async (req, res) => {
  try {
    const bookingId = String(req.params.bookingId || '').trim();
    await performBookingCheckIn(bookingId, req);
    return res.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Staff check-in booking error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to check in booking' });
  }
};

module.exports = {
  getStaffBookings,
  checkInStaffBooking,
};
