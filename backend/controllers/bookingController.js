const Booking = require('../models/Booking');

const TIME_SLOTS = new Set([
  '09:00-11:00',
  '11:00-13:00',
  '13:00-15:00',
  '15:00-17:00',
  '17:00-19:00',
  '19:00-21:00',
]);

const TABLES = [
  { tableId: 1, capacity: 8 },
  { tableId: 2, capacity: 4 },
  { tableId: 3, capacity: 4 },
  { tableId: 4, capacity: 4 },
  { tableId: 5, capacity: 4 },
  { tableId: 6, capacity: 4 },
  { tableId: 7, capacity: 4 },
  { tableId: 8, capacity: 4 },
  { tableId: 9, capacity: 4 },
  { tableId: 10, capacity: 6 },
  { tableId: 11, capacity: 6 },
  { tableId: 12, capacity: 6 },
];

const guestAllowedForTable = (guestCount, tableId) => {
  if (![2, 4, 6, 8].includes(guestCount)) return false;
  if (tableId === 1) return guestCount === 8;
  if (tableId >= 10 && tableId <= 12) return guestCount === 6;
  return guestCount === 2 || guestCount === 4;
};

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

    // Only tables with an existing paid booking are unavailable
    const blockingStatuses = ['confirmed', 'checked_in', 'no_show'];

    const existing = await Booking.find({
      date,
      timeSlot,
      tableId: { $in: eligible },
      status: { $in: blockingStatuses },
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

