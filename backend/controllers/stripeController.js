const Stripe = require('stripe');
const Transaction = require('../models/Transaction');
const { getMealsData } = require('../utils/mealsData');
const Booking = require('../models/Booking');
const BookingIntent = require('../models/BookingIntent');
const Message = require('../models/Message');
const Customer = require('../models/Customer');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

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

const handleBookingCheckoutCompleted = async ({ event, session }) => {
  const bookingIntentId = session?.metadata?.bookingIntentId;
  if (!bookingIntentId) return;

  const intent = await BookingIntent.findById(bookingIntentId);
  if (!intent) {
    console.warn('Webhook: booking intent not found', bookingIntentId);
    return;
  }

  // Idempotency: if already processed, do nothing
  if (intent.status === 'paid' || intent.status === 'refunded' || intent.status === 'conflict') {
    return;
  }

  intent.status = 'paid';
  intent.stripeEventId = event.id;
  intent.stripeCheckoutSessionId = session.id;
  intent.stripePaymentIntentId = session.payment_intent || intent.stripePaymentIntentId;
  await intent.save();

  try {
    const booking = await Booking.create({
      userId: intent.userId,
      tableId: intent.tableId,
      date: intent.date,
      timeSlot: intent.timeSlot,
      guestCount: intent.guestCount,
      reservationFee: intent.reservationFee,
      reservationCost: intent.reservationCost,
      preOrderItems: intent.preOrderItems,
      preOrderTotal: intent.preOrderTotal,
      amountTotal: intent.amountTotal,
      redeemCode: intent.redeemCode || '',
      discountAmount: intent.discountAmount || 0,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.payment_intent || undefined,
      status: 'confirmed',
    });

    await sendAdminMessage({
      recipientId: intent.userId,
      subject: 'Reservation Confirmed',
      body:
        `Reservation Confirmed\n\n` +
        `Table: ${booking.tableId}\n` +
        `Date: ${booking.date}\n` +
        `Time: ${String(booking.timeSlot || '').replace('-', '–')}\n` +
        `Guests: ${booking.guestCount}\n\n` +
        `Reservation fee: ฿${booking.reservationFee}\n` +
        `Reservation cost: ฿${booking.reservationCost}\n` +
        `Pre-order total: ฿${booking.preOrderTotal}\n` +
        `Total paid: ฿${booking.amountTotal}\n\n` +
        `You can cancel in your Profile → Booking until 3 hours before your reservation time.`,
    });
  } catch (err) {
    // If two users pay at the same time, unique index blocks duplicates
    if (err && (err.code === 11000 || String(err.message || '').includes('duplicate key'))) {
      intent.status = 'conflict';
      intent.refundReason = 'Table already booked (payment conflict)';
      await intent.save();

      try {
        if (stripe && session.payment_intent) {
          await stripe.refunds.create({
            payment_intent: session.payment_intent,
          });
          intent.status = 'refunded';
          intent.refundedAmount = intent.amountTotal;
          await intent.save();
        }
      } catch (refundErr) {
        intent.status = 'refund_pending';
        intent.refundReason = `Refund failed: ${refundErr.message || 'unknown error'}`;
        await intent.save();
      }

      await sendAdminMessage({
        recipientId: intent.userId,
        subject: 'Reservation Failed (Refund)',
        body:
          `Reservation Failed\n\n` +
          `Unfortunately, this table was already booked for that date/time.\n` +
          `We will refund your payment automatically.\n\n` +
          `Table: ${intent.tableId}\n` +
          `Date: ${intent.date}\n` +
          `Time: ${String(intent.timeSlot || '').replace('-', '–')}\n` +
          `Guests: ${intent.guestCount}\n`,
      });
      return;
    }

    console.error('Webhook: booking creation error:', err);
    throw err;
  }
};

const normalizeCartItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((i) => ({
      id: Number(i?.id),
      quantity: Number(i?.quantity),
    }))
    .filter((i) => Number.isFinite(i.id) && Number.isFinite(i.quantity) && i.quantity > 0);
};

// POST /api/stripe/create-checkout-session
// Body: { items: [{ id, quantity }] }
const createCheckoutSession = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ success: false, message: 'Stripe is not configured (missing STRIPE_SECRET_KEY).' });
    }

    const user = req.user;
    const cartItems = normalizeCartItems(req.body?.items);
    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty.' });
    }

    const meals = getMealsData();
    const mealById = new Map(meals.map((m) => [Number(m.id), m]));

    const items = [];
    for (const ci of cartItems) {
      const meal = mealById.get(ci.id);
      if (!meal) {
        return res.status(400).json({ success: false, message: `Invalid meal id: ${ci.id}` });
      }
      items.push({
        mealId: ci.id,
        name: meal.name,
        unitPrice: Number(meal.price) || 0,
        quantity: ci.quantity,
      });
    }

    const amountTotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    if (!Number.isFinite(amountTotal) || amountTotal <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid cart total.' });
    }

    const origin = req.get('origin') || (process.env.FRONTEND_ORIGIN || '').split(',')[0].trim();
    if (!origin) {
      return res.status(400).json({ success: false, message: 'Missing request origin. Set FRONTEND_ORIGIN on the server.' });
    }

    // Create a pending transaction first (source of truth for webhook updates)
    // orderId will be auto-generated by pre-save hook
    const tx = await Transaction.create({
      userId: user._id.toString(),
      status: 'pending',
      currency: 'thb',
      amountTotal,
      items,
      customerEmail: user.email || '',
    });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const line_items = items.map((i) => {
      const meal = mealById.get(i.mealId);
      const img = meal?.image && String(meal.image).startsWith('/') ? `${baseUrl}${meal.image}` : undefined;

      return {
        price_data: {
          currency: 'thb',
          unit_amount: Math.round(i.unitPrice * 100),
          product_data: {
            name: i.name,
            ...(img ? { images: [img] } : {}),
          },
        },
        quantity: i.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment/cancel`,
      customer_email: user.email || undefined,
      metadata: {
        transactionId: tx._id,
        orderId: tx.orderId,
        userId: user._id.toString(),
      },
    });

    tx.stripeCheckoutSessionId = session.id;
    await tx.save();

    return res.json({ success: true, url: session.url, sessionId: session.id, transactionId: tx._id, orderId: tx.orderId });
  } catch (error) {
    console.error('Create checkout session error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create checkout session' });
  }
};

// POST /api/stripe/webhook
// Stripe requires the raw body to verify signature.
const webhookHandler = async (req, res) => {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !webhookSecret) {
      return res.status(500).send('Stripe webhook not configured.');
    }

    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const transactionId = session?.metadata?.transactionId;
      const orderId = session?.metadata?.orderId;

      // Booking flow
      if (session?.metadata?.bookingIntentId) {
        await handleBookingCheckoutCompleted({ event, session });
        return res.json({ received: true });
      }

      const update = {
        status: 'paid',
        stripeEventId: event.id,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: session.payment_intent || undefined,
        customerEmail: session.customer_details?.email || session.customer_email || '',
        currency: session.currency || 'thb',
        amountTotal: session.amount_total != null ? session.amount_total / 100 : undefined,
      };

      let tx = null;
      if (transactionId) {
        tx = await Transaction.findByIdAndUpdate(transactionId, { $set: update }, { new: true });
      } else if (orderId) {
        tx = await Transaction.findOneAndUpdate({ orderId }, { $set: update }, { new: true });
      }
      if (!tx) {
        tx = await Transaction.findOneAndUpdate({ stripeCheckoutSessionId: session.id }, { $set: update }, { new: true });
      }

      if (!tx) {
        console.warn('Webhook: transaction not found for session', session.id);
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).send('Webhook handler error');
  }
};

module.exports = {
  createCheckoutSession,
  webhookHandler,
};

