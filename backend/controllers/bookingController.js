const Booking = require('../models/Booking');
const {
  guestAllowedForTable,
  TIME_SLOTS,
  TABLES,
  BOOKING_BLOCKING_STATUSES,
} = require('../utils/bookingRules');

const isISODate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

// GET /api/bookings/availability?date=YYYY-MM-DD&timeSlot=HH:MM-HH:MM&guestCount=2|4|6|8
const getAvailability = async (req, res) => {
  try {
    const date = String(req.query.date || '').trim();
    const timeSlot = String(req.query.timeSlot || '').trim();
    const guestCount = Number(req.query.guestCount);

    if (!isISODate(date)) {
      return res.status(400).json({ success: false, message: 'Invalid date. Expected YYYY-MM-DD.' });
    }
    if (!TIME_SLOTS.has(timeSlot)) {
      return res.status(400).json({ success: false, message: 'Invalid time slot.' });
    }
    if (![2, 4, 6, 8].includes(guestCount)) {
      return res.status(400).json({ success: false, message: 'Invalid guest count.' });
    }

    const eligible = TABLES.filter((t) => guestAllowedForTable(guestCount, t.tableId)).map((t) => t.tableId);

    const existing = await Booking.find({
      date,
      timeSlot,
      tableId: { $in: eligible },
      status: { $in: BOOKING_BLOCKING_STATUSES },
    })
      .select('tableId')
      .lean();

    const booked = new Set(existing.map((b) => Number(b.tableId)));
    const availability = {};
    for (const t of eligible) {
      availability[String(t)] = !booked.has(Number(t));
    }

    return res.json({ success: true, availability });
  } catch (error) {
    console.error('Get availability error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to get availability' });
  }
};

module.exports = {
  getAvailability,
  guestAllowedForTable,
  TIME_SLOTS,
  TABLES,
};
