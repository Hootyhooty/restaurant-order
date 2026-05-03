const { before, after, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const ProcessedStripeEvent = require('../models/ProcessedStripeEvent');
const Customer = require('../models/Customer');
const BookingIntent = require('../models/BookingIntent');
const Booking = require('../models/Booking');
const Message = require('../models/Message');
const {
  handleBookingCheckoutCompleted,
  claimStripeWebhookEvent,
} = require('../controllers/stripeController');

let mongoServer;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'restaurant_db',
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

after(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Stripe webhook idempotency', () => {
  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
    await ProcessedStripeEvent.syncIndexes();
    await Booking.syncIndexes();
  });

  async function seedCustomersForMessages() {
    await Customer.create({
      username: 'admin_wh',
      email: 'admin_wh@test.local',
      password: 'password12',
      role: 'ADMIN',
    });
    return Customer.create({
      username: 'user_wh',
      email: 'user_wh@test.local',
      password: 'password12',
      role: 'USER',
    });
  }

  test('claimStripeWebhookEvent is false on duplicate Stripe event.id', async () => {
    const event = { id: 'evt_dup_1', type: 'checkout.session.completed' };
    assert.equal(await claimStripeWebhookEvent(event), true);
    assert.equal(await claimStripeWebhookEvent(event), false);
  });

  test('after claim delete, same event.id can be claimed again (retry path)', async () => {
    const event = { id: 'evt_retry_1', type: 'checkout.session.completed' };
    assert.equal(await claimStripeWebhookEvent(event), true);
    await ProcessedStripeEvent.deleteOne({ eventId: event.id });
    assert.equal(await claimStripeWebhookEvent(event), true);
  });

  test('duplicate handleBookingCheckoutCompleted does not create second booking', async () => {
    const user = await seedCustomersForMessages();
    const intent = await BookingIntent.create({
      userId: user._id.toString(),
      tableId: 6,
      date: '2099-07-20',
      timeSlot: '17:00-19:00',
      guestCount: 4,
      reservationFee: 100,
      reservationCost: 500,
      preOrderTotal: 0,
      amountTotal: 600,
      status: 'pending',
    });

    const event = { id: 'evt_booking_handler_1' };
    const session = {
      id: 'cs_wh_1',
      metadata: { bookingIntentId: intent._id },
      payment_intent: 'pi_wh_1',
    };

    await handleBookingCheckoutCompleted({ event, session });
    await handleBookingCheckoutCompleted({ event, session });

    assert.equal(await Booking.countDocuments(), 1);
    const updated = await BookingIntent.findById(intent._id).lean();
    assert.equal(updated.status, 'paid');
    assert.equal(await Message.countDocuments({ recipientId: user._id.toString() }), 1);
  });

  test('simulated replay: duplicate claim skips second logical delivery', async () => {
    const user = await seedCustomersForMessages();
    const intent = await BookingIntent.create({
      userId: user._id.toString(),
      tableId: 7,
      date: '2099-07-21',
      timeSlot: '17:00-19:00',
      guestCount: 4,
      reservationFee: 100,
      reservationCost: 500,
      preOrderTotal: 0,
      amountTotal: 600,
      status: 'pending',
    });

    const event = { id: 'evt_webhook_sim_1', type: 'checkout.session.completed' };
    const session = {
      id: 'cs_wh_2',
      metadata: { bookingIntentId: intent._id },
      payment_intent: 'pi_wh_2',
    };

    assert.equal(await claimStripeWebhookEvent(event), true);
    await handleBookingCheckoutCompleted({ event, session });

    assert.equal(await claimStripeWebhookEvent(event), false);

    assert.equal(await Booking.countDocuments(), 1);
  });
});
