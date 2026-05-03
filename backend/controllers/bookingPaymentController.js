const Booking = require('../models/Booking');
const BookingIntent = require('../models/BookingIntent');
const Message = require('../models/Message');
const Customer = require('../models/Customer');
const { getMealsData } = require('../utils/mealsData');
const {
  guestAllowedForTable,
  TIME_SLOTS,
  RESERVATION_FEE,
  reservationCostForGuests,
  parseDateTimeFromSlot,
  getUserCancellationCutoff,
} = require('../utils/bookingRules');
const { getStripe } = require('../utils/stripeClient');

const isISODate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

const normalizePreOrderItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((i) => ({
      id: Number(i?.id ?? i?.mealId),
      quantity: Number(i?.quantity),
    }))
    .filter((i) => Number.isFinite(i.id) && Number.isFinite(i.quantity) && i.quantity > 0);
};

const getAdminUserId = async () => {
  const admin = await Customer.findOne({ role: 'ADMIN' }).select('_id').lean();
  return admin?._id?.toString() || null;
};

// POST /api/bookings/create-checkout-session
// Body: { date, timeSlot, guestCount, tableId, redeemCode?, preOrderItems?: [{id, quantity}] }
const createBookingCheckoutSession = async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({ success: false, message: 'Stripe is not configured (missing STRIPE_SECRET_KEY).' });
    }

    const user = req.user;
    const date = String(req.body?.date || '').trim();
    const timeSlot = String(req.body?.timeSlot || '').trim();
    const guestCount = Number(req.body?.guestCount);
    const tableId = Number(req.body?.tableId);
    const redeemCode = String(req.body?.redeemCode || '').trim();

    if (!isISODate(date)) return res.status(400).json({ success: false, message: 'Invalid date.' });
    if (!TIME_SLOTS.has(timeSlot)) return res.status(400).json({ success: false, message: 'Invalid time slot.' });
    if (![2, 4, 6, 8].includes(guestCount)) return res.status(400).json({ success: false, message: 'Invalid guest count.' });
    if (!Number.isFinite(tableId) || tableId < 1 || tableId > 12) return res.status(400).json({ success: false, message: 'Invalid table.' });
    if (!guestAllowedForTable(guestCount, tableId)) {
      return res.status(400).json({ success: false, message: 'This table is not available for this guest count.' });
    }

    // One user per one reservation (per slot)
    const existingForUser = await Booking.findOne({
      userId: user._id.toString(),
      date,
      timeSlot,
      status: { $in: ['confirmed', 'checked_in', 'no_show'] },
    }).select('_id').lean();
    if (existingForUser) {
      return res.status(409).json({ success: false, message: 'You already have a reservation for this date/time.' });
    }

    // Check table is still available at time of starting payment
    const existingForTable = await Booking.findOne({
      tableId,
      date,
      timeSlot,
      status: { $in: ['confirmed', 'checked_in', 'no_show'] },
    }).select('_id').lean();
    if (existingForTable) {
      return res.status(409).json({ success: false, message: 'This table is already booked. Please pick another table.' });
    }

    const reservationCost = reservationCostForGuests(guestCount);
    const reservationFee = RESERVATION_FEE;

    const meals = getMealsData();
    const mealById = new Map(meals.map((m) => [Number(m.id), m]));
    const preOrderReq = normalizePreOrderItems(req.body?.preOrderItems);
    const preOrderItems = [];
    for (const pi of preOrderReq) {
      const meal = mealById.get(pi.id);
      if (!meal) return res.status(400).json({ success: false, message: `Invalid meal id: ${pi.id}` });
      preOrderItems.push({
        mealId: pi.id,
        name: meal.name,
        unitPrice: Number(meal.price) || 0,
        quantity: pi.quantity,
      });
    }
    const preOrderTotal = preOrderItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    // Redeem codes (placeholder: no discount rules defined yet)
    const discountAmount = 0;

    const amountTotal = Math.max(0, reservationFee + reservationCost + preOrderTotal - discountAmount);

    const origin = req.get('origin') || (process.env.FRONTEND_ORIGIN || '').split(',')[0].trim();
    if (!origin) {
      return res.status(400).json({ success: false, message: 'Missing request origin. Set FRONTEND_ORIGIN on the server.' });
    }

    const intent = await BookingIntent.create({
      userId: user._id.toString(),
      tableId,
      date,
      timeSlot,
      guestCount,
      reservationFee,
      reservationCost,
      preOrderItems,
      preOrderTotal,
      redeemCode,
      discountAmount,
      amountTotal,
      status: 'pending',
    });

    const line_items = [];
    line_items.push({
      price_data: {
        currency: 'thb',
        unit_amount: Math.round(reservationFee * 100),
        product_data: { name: 'Reservation fee' },
      },
      quantity: 1,
    });
    line_items.push({
      price_data: {
        currency: 'thb',
        unit_amount: Math.round(reservationCost * 100),
        product_data: { name: `Reservation cost (${guestCount} guests)` },
      },
      quantity: 1,
    });
    for (const item of preOrderItems) {
      line_items.push({
        price_data: {
          currency: 'thb',
          unit_amount: Math.round(item.unitPrice * 100),
          product_data: { name: item.name },
        },
        quantity: item.quantity,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${origin}/booking/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/booking/payment/cancel`,
      customer_email: user.email || undefined,
      metadata: {
        bookingIntentId: intent._id,
        userId: user._id.toString(),
        tableId: String(tableId),
        date,
        timeSlot,
      },
    });

    intent.stripeCheckoutSessionId = session.id;
    await intent.save();

    return res.json({ success: true, url: session.url, sessionId: session.id, bookingIntentId: intent._id });
  } catch (error) {
    console.error('Create booking checkout session error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create booking checkout session' });
  }
};

// GET /api/bookings/my
const getMyBookings = async (req, res) => {
  try {
    const user = req.user;
    const items = await Booking.find({ userId: user._id.toString() })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({
      success: true,
      items: items.map((b) => ({
        id: b._id,
        tableId: b.tableId,
        date: b.date,
        timeSlot: b.timeSlot,
        guestCount: b.guestCount,
        status: b.status,
        amountTotal: b.amountTotal,
        createdAt: b.createdAt,
        reservationFee: b.reservationFee,
        reservationCost: b.reservationCost,
        preOrderTotal: b.preOrderTotal,
      })),
    });
  } catch (error) {
    console.error('Get my bookings error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to load bookings' });
  }
};

// POST /api/bookings/:bookingId/cancel
const cancelMyBooking = async (req, res) => {
  try {
    const user = req.user;
    const bookingId = String(req.params.bookingId || '').trim();
    const b = await Booking.findById(bookingId);
    if (!b) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (b.userId !== user._id.toString()) return res.status(403).json({ success: false, message: 'Forbidden.' });
    if (b.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'This booking cannot be cancelled.' });
    }

    const cancelCutoff = getUserCancellationCutoff(b.date, b.timeSlot);
    if (Date.now() > cancelCutoff.getTime()) {
      return res.status(400).json({ success: false, message: 'Cancellation is only allowed until 3 hours before the reservation time.' });
    }

    if (!req.body?.confirm) {
      return res.status(400).json({ success: false, message: 'Missing confirmation.' });
    }

    b.status = 'cancelled';
    await b.save();

    // Notify user via admin message (no refund)
    const adminId = await getAdminUserId();
    if (adminId) {
      await Message.create({
        senderId: adminId,
        recipientId: user._id.toString(),
        subject: 'Reservation Cancelled',
        body:
          `Your reservation was cancelled.\n\n` +
          `Table: ${b.tableId}\n` +
          `Date: ${b.date}\n` +
          `Time: ${b.timeSlot.replace('-', '–')}\n` +
          `Guests: ${b.guestCount}\n\n` +
          `Note: Reservation fee and cost are non-refundable for user cancellations.`,
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Cancel booking error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to cancel booking' });
  }
};

module.exports = {
  createBookingCheckoutSession,
  getMyBookings,
  cancelMyBooking,
  reservationCostForGuests,
  parseDateTimeFromSlot,
  getAdminUserId,
};

