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
const { seedOpsUser, staffToken: makeStaffToken, customerToken: makeCustomerToken } = require('../helpers/opsUsers');

const FIXTURE_DATE = '2099-06-15';
const FIXTURE_SLOT = '17:00-19:00';

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

describe('Booking API integration', () => {
  beforeEach(async () => {
    clearStripeClientForTest();
    await mongoose.connection.dropDatabase();
  });

  async function seedAdminAndUser() {
    const { staff: admin } = await seedOpsUser({
      username: 'admin_int',
      email: 'admin_int@test.local',
      password: 'password12',
      role: 'ADMIN',
      withCustomer: false,
    });
    const user = await Customer.create({
      username: 'user_int',
      email: 'user_int@test.local',
      password: 'password12',
      role: 'USER',
    });
    const adminToken = makeStaffToken(jwt, admin._id);
    const userToken = makeCustomerToken(jwt, user._id);
    return { admin, user, adminToken, userToken };
  }

  test('GET /api/bookings/availability rejects invalid date', async () => {
    const res = await request(app)
      .get('/api/bookings/availability')
      .query({ date: 'not-a-date', timeSlot: FIXTURE_SLOT, guestCount: 4 });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('GET /api/bookings/availability returns open tables for guest count', async () => {
    const res = await request(app)
      .get('/api/bookings/availability')
      .query({ date: FIXTURE_DATE, timeSlot: FIXTURE_SLOT, guestCount: 4 });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.availability['5'], true);
    assert.equal(res.body.availability['10'], undefined);
  });

  test('GET /api/bookings/availability marks booked table unavailable', async () => {
    const { user } = await seedAdminAndUser();
    await Booking.create({
      userId: user._id.toString(),
      tableId: 5,
      date: FIXTURE_DATE,
      timeSlot: FIXTURE_SLOT,
      guestCount: 4,
      reservationFee: 100,
      reservationCost: 500,
      preOrderTotal: 0,
      amountTotal: 600,
      status: 'confirmed',
    });

    const res = await request(app)
      .get('/api/bookings/availability')
      .query({ date: FIXTURE_DATE, timeSlot: FIXTURE_SLOT, guestCount: 4 });
    assert.equal(res.status, 200);
    assert.equal(res.body.availability['5'], false);
  });

  test('POST /api/bookings/create-checkout-session returns 401 without auth', async () => {
    const res = await request(app).post('/api/bookings/create-checkout-session').send({
      date: FIXTURE_DATE,
      timeSlot: FIXTURE_SLOT,
      guestCount: 4,
      tableId: 5,
    });
    assert.equal(res.status, 401);
  });

  test('POST /api/bookings/create-checkout-session returns 400 for invalid payload', async () => {
    const { userToken } = await seedAdminAndUser();
    const res = await request(app)
      .post('/api/bookings/create-checkout-session')
      .set('Cookie', `access_token=${userToken}`)
      .send({
        date: 'bad',
        timeSlot: FIXTURE_SLOT,
        guestCount: 4,
        tableId: 5,
      });
    assert.equal(res.status, 400);
  });

  test('POST /api/bookings/create-checkout-session returns 409 when table is taken', async () => {
    const { user: blocker } = await seedAdminAndUser();
    await Booking.create({
      userId: blocker._id.toString(),
      tableId: 5,
      date: FIXTURE_DATE,
      timeSlot: FIXTURE_SLOT,
      guestCount: 4,
      reservationFee: 100,
      reservationCost: 500,
      preOrderTotal: 0,
      amountTotal: 600,
      status: 'confirmed',
    });

    const second = await Customer.create({
      username: 'user_two',
      email: 'user_two@test.local',
      password: 'password12',
      role: 'USER',
    });
    const secondToken = jwt.sign({ id: second._id }, process.env.JWT_SECRET);

    const res = await request(app)
      .post('/api/bookings/create-checkout-session')
      .set('Cookie', `access_token=${secondToken}`)
      .send({
        date: FIXTURE_DATE,
        timeSlot: FIXTURE_SLOT,
        guestCount: 4,
        tableId: 5,
      });
    assert.equal(res.status, 409);
    assert.match(res.body.message || '', /already booked/i);
  });

  test('POST /api/bookings/create-checkout-session creates intent with mocked Stripe', async () => {
    setStripeClientForTest({
      checkout: {
        sessions: {
          create: async () => ({
            id: 'cs_test_integration',
            url: 'https://checkout.stripe.test/session',
          }),
        },
      },
    });

    const { userToken } = await seedAdminAndUser();
    const res = await request(app)
      .post('/api/bookings/create-checkout-session')
      .set('Cookie', `access_token=${userToken}`)
      .set('Origin', 'http://localhost:3000')
      .send({
        date: FIXTURE_DATE,
        timeSlot: FIXTURE_SLOT,
        guestCount: 4,
        tableId: 5,
        preOrderItems: [],
      });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.bookingIntentId);
    assert.ok(res.body.sessionId);
  });

  test('POST /api/bookings/:id/cancel requires confirm body', async () => {
    const { user, userToken } = await seedAdminAndUser();
    const booking = await Booking.create({
      userId: user._id.toString(),
      tableId: 5,
      date: FIXTURE_DATE,
      timeSlot: FIXTURE_SLOT,
      guestCount: 4,
      reservationFee: 100,
      reservationCost: 500,
      preOrderTotal: 0,
      amountTotal: 600,
      status: 'confirmed',
    });

    const res = await request(app)
      .post(`/api/bookings/${booking._id}/cancel`)
      .set('Cookie', `access_token=${userToken}`)
      .send({});
    assert.equal(res.status, 400);
  });

  test('POST /api/bookings/:id/cancel succeeds before cutoff', async () => {
    const { user, userToken } = await seedAdminAndUser();
    const booking = await Booking.create({
      userId: user._id.toString(),
      tableId: 5,
      date: FIXTURE_DATE,
      timeSlot: FIXTURE_SLOT,
      guestCount: 4,
      reservationFee: 100,
      reservationCost: 500,
      preOrderTotal: 0,
      amountTotal: 600,
      status: 'confirmed',
    });

    const res = await request(app)
      .post(`/api/bookings/${booking._id}/cancel`)
      .set('Cookie', `access_token=${userToken}`)
      .send({ confirm: true });
    assert.equal(res.status, 200);
    const updated = await Booking.findById(booking._id).lean();
    assert.equal(updated.status, 'cancelled');
  });

  test('POST /api/admin/bookings/:id/no-show updates status', async () => {
    const { adminToken } = await seedAdminAndUser();
    const user = await Customer.findOne({ email: 'user_int@test.local' });
    const booking = await Booking.create({
      userId: user._id.toString(),
      tableId: 5,
      date: FIXTURE_DATE,
      timeSlot: FIXTURE_SLOT,
      guestCount: 4,
      reservationFee: 100,
      reservationCost: 500,
      preOrderTotal: 0,
      amountTotal: 600,
      status: 'confirmed',
    });

    const res = await request(app)
      .post(`/api/admin/bookings/${booking._id}/no-show`)
      .set('Cookie', `access_token=${adminToken}`)
      .send({});
    assert.equal(res.status, 200);
    const updated = await Booking.findById(booking._id).lean();
    assert.equal(updated.status, 'no_show');
  });

  test('POST /api/admin/bookings/:id/cancel with no preorder sets cancelled', async () => {
    const { adminToken } = await seedAdminAndUser();
    const user = await Customer.findOne({ email: 'user_int@test.local' });
    const booking = await Booking.create({
      userId: user._id.toString(),
      tableId: 5,
      date: FIXTURE_DATE,
      timeSlot: FIXTURE_SLOT,
      guestCount: 4,
      reservationFee: 100,
      reservationCost: 500,
      preOrderTotal: 0,
      amountTotal: 600,
      status: 'confirmed',
    });

    const res = await request(app)
      .post(`/api/admin/bookings/${booking._id}/cancel`)
      .set('Cookie', `access_token=${adminToken}`)
      .send({});
    assert.equal(res.status, 200);
    const updated = await Booking.findById(booking._id).lean();
    assert.equal(updated.status, 'cancelled');
  });

  test('POST /api/admin/bookings/:id/check-in refunds reservation cost with mocked Stripe', async () => {
    setStripeClientForTest({
      refunds: {
        create: async () => ({ id: 're_test_integration' }),
      },
    });

    const { adminToken } = await seedAdminAndUser();
    const user = await Customer.findOne({ email: 'user_int@test.local' });
    const booking = await Booking.create({
      userId: user._id.toString(),
      tableId: 5,
      date: FIXTURE_DATE,
      timeSlot: FIXTURE_SLOT,
      guestCount: 4,
      reservationFee: 100,
      reservationCost: 500,
      preOrderTotal: 0,
      amountTotal: 600,
      stripePaymentIntentId: 'pi_test_integration',
      status: 'confirmed',
    });

    const res = await request(app)
      .post(`/api/admin/bookings/${booking._id}/check-in`)
      .set('Cookie', `access_token=${adminToken}`)
      .send({});
    assert.equal(res.status, 200);
    const updated = await Booking.findById(booking._id).lean();
    assert.equal(updated.status, 'checked_in');
    assert.equal(updated.refundedAmount, 500);
  });

  test('unique constraint prevents duplicate table/date/slot in DB', async () => {
    const { user } = await seedAdminAndUser();
    await Booking.syncIndexes();
    const payload = {
      userId: user._id.toString(),
      tableId: 7,
      date: FIXTURE_DATE,
      timeSlot: FIXTURE_SLOT,
      guestCount: 4,
      reservationFee: 100,
      reservationCost: 500,
      preOrderTotal: 0,
      amountTotal: 600,
      status: 'confirmed',
    };
    await Booking.create(payload);
    await assert.rejects(
      Booking.create({
        ...payload,
        userId: '01900000-0000-7000-8000-000000000099',
      }),
      (err) =>
        err.code === 11000 ||
        (typeof err.message === 'string' && err.message.includes('duplicate key'))
    );
  });
});
