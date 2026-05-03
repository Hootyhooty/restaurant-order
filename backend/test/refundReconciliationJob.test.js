const { before, after, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Booking = require('../models/Booking');
const BookingIntent = require('../models/BookingIntent');
const Customer = require('../models/Customer');
const Message = require('../models/Message');
const { runRefundReconciliation } = require('../jobs/refundReconciliationJob');
const {
  setStripeClientForTest,
  clearStripeClientForTest,
} = require('../utils/stripeClient');

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
  clearStripeClientForTest();
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('refund reconciliation job', () => {
  beforeEach(async () => {
    clearStripeClientForTest();
    await mongoose.connection.dropDatabase();
  });

  async function seedAdmin() {
    await Customer.create({
      username: 'admin_rc',
      email: 'admin_rc@test.local',
      password: 'password12',
      role: 'ADMIN',
    });
  }

  test('reconciles Booking check-in refund_pending → checked_in', async () => {
    await seedAdmin();
    const user = await Customer.create({
      username: 'user_rc',
      email: 'user_rc@test.local',
      password: 'password12',
      role: 'USER',
    });

    let refundCalls = 0;
    setStripeClientForTest({
      refunds: {
        create: async () => {
          refundCalls += 1;
          return { id: 're_rc_1' };
        },
      },
    });

    const booking = await Booking.create({
      userId: user._id.toString(),
      tableId: 5,
      date: '2099-08-01',
      timeSlot: '17:00-19:00',
      guestCount: 4,
      reservationFee: 100,
      reservationCost: 500,
      preOrderTotal: 0,
      amountTotal: 600,
      stripePaymentIntentId: 'pi_rc_checkin',
      status: 'refund_pending',
      refundReason: 'Check-in refund failed: network',
    });

    const summary = await runRefundReconciliation();
    assert.equal(summary.bookings.failed.length, 0);
    assert.equal(summary.bookings.skipped.length, 0);
    assert.equal(summary.bookings.succeeded.length, 1);

    const updated = await Booking.findById(booking._id).lean();
    assert.equal(updated.status, 'checked_in');
    assert.equal(updated.refundedAmount, 500);
    assert.equal(refundCalls, 1);
    assert.equal(await Message.countDocuments({ recipientId: user._id.toString() }), 1);
  });

  test('reconciles BookingIntent refund_pending → refunded', async () => {
    await seedAdmin();
    const user = await Customer.create({
      username: 'user_rc2',
      email: 'user_rc2@test.local',
      password: 'password12',
      role: 'USER',
    });

    setStripeClientForTest({
      refunds: {
        create: async () => ({ id: 're_rc_2' }),
      },
    });

    const intent = await BookingIntent.create({
      userId: user._id.toString(),
      tableId: 6,
      date: '2099-08-02',
      timeSlot: '17:00-19:00',
      guestCount: 4,
      reservationFee: 100,
      reservationCost: 500,
      preOrderTotal: 0,
      amountTotal: 600,
      stripePaymentIntentId: 'pi_rc_intent',
      status: 'refund_pending',
      refundReason: 'Refund failed: timeout',
    });

    const summary = await runRefundReconciliation();
    assert.equal(summary.intents.failed.length, 0);
    assert.equal(summary.intents.succeeded.length, 1);

    const updated = await BookingIntent.findById(intent._id).lean();
    assert.equal(updated.status, 'refunded');
    assert.equal(updated.refundedAmount, 600);
  });

  test('reconciles Booking admin-cancel refund_pending → refunded', async () => {
    await seedAdmin();
    const user = await Customer.create({
      username: 'user_rc_ac',
      email: 'user_rc_ac@test.local',
      password: 'password12',
      role: 'USER',
    });

    setStripeClientForTest({
      refunds: {
        create: async () => ({ id: 're_rc_admin' }),
      },
    });

    const booking = await Booking.create({
      userId: user._id.toString(),
      tableId: 5,
      date: '2099-08-04',
      timeSlot: '17:00-19:00',
      guestCount: 4,
      reservationFee: 100,
      reservationCost: 500,
      preOrderTotal: 200,
      amountTotal: 800,
      stripePaymentIntentId: 'pi_rc_admin_cancel',
      status: 'refund_pending',
      refundReason: 'Admin cancel refund failed: timeout',
    });

    const summary = await runRefundReconciliation();
    assert.equal(summary.bookings.failed.length, 0);
    assert.equal(summary.bookings.succeeded.length, 1);

    const updated = await Booking.findById(booking._id).lean();
    assert.equal(updated.status, 'refunded');
    assert.equal(updated.refundedAmount, 200);
  });

  test('skips Booking refund_pending with unknown refundReason', async () => {
    await seedAdmin();
    const user = await Customer.create({
      username: 'user_rc3',
      email: 'user_rc3@test.local',
      password: 'password12',
      role: 'USER',
    });

    setStripeClientForTest({
      refunds: {
        create: async () => ({ id: 're_skip' }),
      },
    });

    await Booking.create({
      userId: user._id.toString(),
      tableId: 5,
      date: '2099-08-03',
      timeSlot: '17:00-19:00',
      guestCount: 4,
      reservationFee: 100,
      reservationCost: 500,
      preOrderTotal: 0,
      amountTotal: 600,
      stripePaymentIntentId: 'pi_rc_unknown',
      status: 'refund_pending',
      refundReason: 'Manual flag',
    });

    const summary = await runRefundReconciliation();
    assert.equal(summary.bookings.skipped.length, 1);
    assert.equal(summary.bookings.succeeded.length, 0);
  });
});
