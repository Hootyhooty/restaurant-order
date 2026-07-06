const Booking = require('../models/Booking');
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

// GET /api/staff/bookings?date=YYYY-MM-DD&status=confirmed
const getStaffBookings = async (req, res) => {
  try {
    const date = String(req.query.date || getBangkokDateString()).trim();
    const status = String(req.query.status || 'confirmed').trim();

    const bookings = await Booking.find({ date, status })
      .sort({ timeSlot: 1, tableId: 1 })
      .lean();

    const userIds = [...new Set(bookings.map((b) => b.userId))];
    const customers = await Customer.find({ _id: { $in: userIds } })
      .select('username first_name last_name')
      .lean();
    const customerMap = Object.fromEntries(customers.map((c) => [c._id.toString(), c]));

    return res.json({
      success: true,
      date,
      status,
      items: bookings.map((b) => {
        const preOrderItems = b.preOrderItems || [];
        return {
          id: b._id,
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
        };
      }),
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
