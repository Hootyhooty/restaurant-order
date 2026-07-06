const { before, after, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  setStripeClientForTest,
  clearStripeClientForTest,
} = require('../../utils/stripeClient');
const Customer = require('../../models/Customer');
const Booking = require('../../models/Booking');
const BookingIntent = require('../../models/BookingIntent');
const KitchenOrder = require('../../models/KitchenOrder');
const { getBangkokDateString } = require('../../utils/bangkokDate');

let app;
let mongoServer;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = 'integration-test-jwt-secret-key-min-length-32';
  process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
  process.env.STRIPE_SECRET_KEY = 'sk_test_integration_placeholder';

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'restaurant_db',
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  app = require('../../index');
});

after(async () => {
  clearStripeClientForTest();
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Staff bookings API', () => {
  beforeEach(async () => {
    clearStripeClientForTest();
    await mongoose.connection.dropDatabase();
    setStripeClientForTest({
      refunds: { create: async () => ({ id: 're_staff_test' }) },
    });
  });

  async function seedStaffScenario() {
    const admin = await Customer.create({
      username: 'admin_staff_test',
      email: 'admin_staff_test@test.local',
      password: 'password12',
      role: 'ADMIN',
    });
    const staff = await Customer.create({
      username: 'staff_test',
      email: 'staff_test@test.local',
      password: 'password12',
      role: 'STAFF',
    });
    const user = await Customer.create({
      username: 'customer_staff_test',
      email: 'customer_staff_test@test.local',
      password: 'password12',
      role: 'USER',
      first_name: 'Jane',
      last_name: 'Doe',
    });
    const today = getBangkokDateString();
    const booking = await Booking.create({
      userId: user._id.toString(),
      tableId: 5,
      date: today,
      timeSlot: '17:00-19:00',
      guestCount: 4,
      reservationFee: 100,
      reservationCost: 200,
      preOrderItems: [
        { mealId: 1, name: 'Pad Thai', unitPrice: 120, quantity: 3 },
        { mealId: 2, name: 'Spring Rolls', unitPrice: 80, quantity: 1 },
      ],
      preOrderTotal: 440,
      amountTotal: 640,
      status: 'confirmed',
      stripePaymentIntentId: 'pi_staff_test',
    });

    const staffToken = jwt.sign({ user_id: staff._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const userToken = jwt.sign({ user_id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    return { admin, staff, user, booking, staffToken, userToken, today };
  }

  test('staff can list bookings for today with pre-order summary', async () => {
    const { booking, staffToken, today } = await seedStaffScenario();

    const res = await request(app)
      .get('/api/staff/bookings')
      .set('Authorization', `Bearer ${staffToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.date, today);
    assert.equal(res.body.status, 'confirmed');
    assert.equal(res.body.items.length, 1);

    const item = res.body.items[0];
    assert.equal(item.id, booking._id.toString());
    assert.equal(item.source, 'booking');
    assert.equal(item.customerName, 'Jane Doe');
    assert.equal(item.reservationCost, 200);
    assert.equal(item.hasPreOrder, true);
    assert.equal(item.preOrderSummary, 'Pad Thai x3, Spring Rolls x1');
    assert.equal(item.canCheckIn, true);
  });

  test('staff list includes pending booking_intent rows for the same date', async () => {
    const { user, staffToken, today } = await seedStaffScenario();

    const intent = await BookingIntent.create({
      userId: user._id.toString(),
      tableId: 3,
      date: today,
      timeSlot: '19:00-21:00',
      guestCount: 2,
      reservationFee: 100,
      reservationCost: 200,
      preOrderItems: [],
      preOrderTotal: 0,
      amountTotal: 200,
      status: 'pending',
      stripeCheckoutSessionId: 'cs_test_pending_intent',
    });

    const res = await request(app)
      .get(`/api/staff/bookings?date=${today}`)
      .set('Authorization', `Bearer ${staffToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 2);

    const intentRow = res.body.items.find((row) => row.id === intent._id.toString());
    assert.ok(intentRow);
    assert.equal(intentRow.source, 'intent');
    assert.equal(intentRow.status, 'payment_pending');
    assert.equal(intentRow.canCheckIn, false);
    assert.equal(intentRow.tableId, 3);
  });

  test('staff check-in creates KitchenOrder with expanded lines', async () => {
    const { booking, staffToken } = await seedStaffScenario();

    const checkInRes = await request(app)
      .post(`/api/staff/bookings/${booking._id}/check-in`)
      .set('Authorization', `Bearer ${staffToken}`);
    assert.equal(checkInRes.status, 200);
    assert.equal(checkInRes.body.success, true);

    const updatedBooking = await Booking.findById(booking._id).lean();
    assert.equal(updatedBooking.status, 'checked_in');

    const kitchenOrder = await KitchenOrder.findOne({ bookingId: booking._id.toString() }).lean();
    assert.ok(kitchenOrder);
    assert.equal(kitchenOrder.source, 'booking_preorder');
    assert.equal(kitchenOrder.customerName, 'Jane Doe');
    assert.equal(kitchenOrder.tableId, 5);
    assert.equal(kitchenOrder.lines.length, 4);
    assert.ok(kitchenOrder.lines.every((line) => line.quantity === 1));
    assert.equal(kitchenOrder.lines.filter((line) => line.mealId === 1).length, 3);
    assert.equal(kitchenOrder.lines.filter((line) => line.mealId === 2).length, 1);
    assert.equal(kitchenOrder.ticketNumber, 1);
  });

  test('duplicate check-in returns 400', async () => {
    const { booking, staffToken } = await seedStaffScenario();

    const first = await request(app)
      .post(`/api/staff/bookings/${booking._id}/check-in`)
      .set('Authorization', `Bearer ${staffToken}`);
    assert.equal(first.status, 200);

    const second = await request(app)
      .post(`/api/staff/bookings/${booking._id}/check-in`)
      .set('Authorization', `Bearer ${staffToken}`);
    assert.equal(second.status, 400);
    assert.match(second.body.message, /confirmed/i);

    const count = await KitchenOrder.countDocuments({ bookingId: booking._id.toString() });
    assert.equal(count, 1);
  });

  test('USER role gets 403 on staff routes', async () => {
    const { booking, userToken } = await seedStaffScenario();

    const listRes = await request(app)
      .get('/api/staff/bookings')
      .set('Authorization', `Bearer ${userToken}`);
    assert.equal(listRes.status, 403);

    const checkInRes = await request(app)
      .post(`/api/staff/bookings/${booking._id}/check-in`)
      .set('Authorization', `Bearer ${userToken}`);
    assert.equal(checkInRes.status, 403);
  });
});
