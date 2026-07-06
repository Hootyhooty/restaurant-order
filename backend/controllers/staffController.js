const Booking = require('../models/Booking');
const BookingIntent = require('../models/BookingIntent');
const Customer = require('../models/Customer');
const KitchenOrder = require('../models/KitchenOrder');
const AppError = require('../utils/appError');
const { getBangkokDateString } = require('../utils/bangkokDate');
const { performBookingCheckIn } = require('../services/bookingCheckIn');
const { createStaffTableOrder } = require('../services/createStaffTableOrder');
const { mapKitchenOrder } = require('./kitchenController');
const { emitKitchenEvent } = require('../utils/kitchenEventHub');
const crypto = require('crypto');
const { categories } = require('../data/meals');
const { getMealsData } = require('../utils/mealsData');

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

// GET /api/staff/bookings/:bookingId
const getStaffBookingDetail = async (req, res) => {
  try {
    const bookingId = String(req.params.bookingId || '').trim();
    const booking = await Booking.findById(bookingId).lean();
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const customer = await Customer.findById(booking.userId)
      .select('username first_name last_name email phone')
      .lean();

    return res.json({
      success: true,
      item: {
        id: booking._id,
        source: 'booking',
        userId: booking.userId,
        customerName: formatCustomerName(customer),
        customerEmail: customer?.email || '',
        customerPhone: customer?.phone || '',
        tableId: booking.tableId,
        date: booking.date,
        timeSlot: booking.timeSlot,
        guestCount: booking.guestCount,
        status: booking.status,
        reservationFee: booking.reservationFee,
        reservationCost: booking.reservationCost,
        preOrderItems: booking.preOrderItems || [],
        preOrderTotal: booking.preOrderTotal,
        amountTotal: booking.amountTotal,
        createdAt: booking.createdAt,
        canCheckIn: booking.status === 'confirmed',
      },
    });
  } catch (error) {
    console.error('Staff get booking detail error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to load booking' });
  }
};

// GET /api/staff/menu
const getStaffMenu = async (req, res) => {
  try {
    const meals = getMealsData();
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const items = meals.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      price: m.price,
      category: m.category,
      description: m.description || '',
      image: m.image && m.image.startsWith('/') ? baseUrl + m.image : (m.image || ''),
    }));

    return res.json({ success: true, items, categories });
  } catch (error) {
    console.error('Staff get menu error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to load menu' });
  }
};

// POST /api/staff/orders
const createStaffOrder = async (req, res) => {
  try {
    const { tableId, customerName, items } = req.body || {};
    const order = await createStaffTableOrder({
      tableId,
      customerName,
      items,
      staffUserId: req.user?.accountType === 'staff' ? req.user._id?.toString?.() : null,
    });
    emitKitchenEvent('orders_updated', { orderId: order._id.toString(), date: order.serviceDate });
    return res.status(201).json({ success: true, item: mapKitchenOrder(order.toObject()) });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Staff create order error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create order' });
  }
};

// GET /api/staff/orders?date=&tableId=&q=
const getStaffOrders = async (req, res) => {
  try {
    const date = String(req.query.date || getBangkokDateString()).trim();
    const tableId = req.query.tableId != null && req.query.tableId !== ''
      ? Number(req.query.tableId)
      : null;
    const q = String(req.query.q || '').trim().toLowerCase();

    const filter = { serviceDate: date };
    if (Number.isInteger(tableId) && tableId >= 1 && tableId <= 12) {
      filter.tableId = tableId;
    }

    const orders = await KitchenOrder.find(filter)
      .sort({ ticketNumber: 1 })
      .lean();

    let items = orders.map(mapKitchenOrder);
    if (q) {
      items = items.filter((row) => {
        const haystack = [
          row.customerName,
          String(row.tableId || ''),
          row.sourceLabel,
          row.status,
          String(row.ticketNumber),
          ...(row.lines || []).map((l) => l.name),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    const etagSource = items.map((o) => `${o.id}:${o.updatedAt || ''}`).join('|');
    const etag = `"${crypto.createHash('md5').update(etagSource).digest('hex')}"`;
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    return res.json({ success: true, date, items });
  } catch (error) {
    console.error('Staff get orders error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to load orders' });
  }
};

module.exports = {
  getStaffBookings,
  getStaffBookingDetail,
  checkInStaffBooking,
  getStaffMenu,
  createStaffOrder,
  getStaffOrders,
};
