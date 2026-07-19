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
const KitchenOrder = require('../../models/KitchenOrder');
const { getBangkokDateString } = require('../../utils/bangkokDate');
const { seedOpsUser, staffToken: makeStaffToken, customerToken: makeCustomerToken } = require('../helpers/opsUsers');

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

describe('Kitchen reservations API', () => {
  let kitchenToken;
  let adminToken;
  let userToken;
  let staffToken;
  let booking;
  let today;

  beforeEach(async () => {
    clearStripeClientForTest();
    await mongoose.connection.dropDatabase();
    setStripeClientForTest({
      refunds: { create: async () => ({ id: 're_kitchen_res_test' }) },
    });

    today = getBangkokDateString();

    const { staff: kitchenAccount } = await seedOpsUser({
      username: 'kitchen_res_test',
      email: 'kitchen_res_test@test.local',
      password: 'password12',
      role: 'KITCHEN',
      withCustomer: false,
    });
    const { staff: adminAccount } = await seedOpsUser({
      username: 'admin_kitchen_res',
      email: 'admin_kitchen_res@test.local',
      password: 'password12',
      role: 'ADMIN',
      withCustomer: false,
    });
    const { staff: staffAccount } = await seedOpsUser({
      username: 'staff_kitchen_res',
      email: 'staff_kitchen_res@test.local',
      password: 'password12',
      role: 'STAFF',
      withCustomer: false,
    });
    const user = await Customer.create({
      username: 'user_kitchen_res',
      email: 'user_kitchen_res@test.local',
      password: 'password12',
      role: 'USER',
      first_name: 'Alex',
      last_name: 'River',
    });

    kitchenToken = makeStaffToken(jwt, kitchenAccount._id);
    adminToken = makeStaffToken(jwt, adminAccount._id);
    staffToken = makeStaffToken(jwt, staffAccount._id);
    userToken = makeCustomerToken(jwt, user._id);

    booking = await Booking.create({
      userId: user._id.toString(),
      tableId: 4,
      date: today,
      timeSlot: '17:00-19:00',
      guestCount: 4,
      reservationFee: 100,
      reservationCost: 200,
      preOrderItems: [{ mealId: 1, name: 'Pad Thai', unitPrice: 120, quantity: 2 }],
      preOrderTotal: 240,
      amountTotal: 440,
      status: 'confirmed',
      stripePaymentIntentId: 'pi_kitchen_res_test',
    });

    await KitchenOrder.create({
      ticketNumber: 1,
      serviceDate: today,
      source: 'staff_table',
      tableId: 2,
      customerName: 'Walk-in table 2',
      lines: [{ mealId: 3, name: 'Soup', unitPrice: 80, quantity: 1, lineStatus: 'pending' }],
      status: 'pending',
      createdAt: new Date(Date.now() - 60000),
      updatedAt: new Date(Date.now() - 60000),
    });
  });

  test('kitchen lists upcoming reservation pre-orders before show up', async () => {
    const res = await request(app)
      .get(`/api/kitchen/reservations?date=${today}`)
      .set('Cookie', `access_token=${kitchenToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 1);
    assert.equal(res.body.items[0].id, booking._id.toString());
    assert.equal(res.body.items[0].customerName, 'Alex River');
    assert.equal(res.body.items[0].timeSlot, '17:00-19:00');
    assert.equal(res.body.items[0].preOrderLines.length, 1);
  });

  test('admin can list kitchen reservations', async () => {
    const res = await request(app)
      .get(`/api/admin/kitchen/reservations?date=${today}`)
      .set('Cookie', `access_token=${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 1);
  });

  test('customer cannot access kitchen reservations', async () => {
    const res = await request(app)
      .get(`/api/kitchen/reservations?date=${today}`)
      .set('Cookie', `access_token=${userToken}`);

    assert.equal(res.status, 403);
  });

  test('show up assigns reserved ticket number independent of walk-in sequence', async () => {
    const checkInRes = await request(app)
      .post(`/api/staff/bookings/${booking._id}/check-in`)
      .set('Cookie', `access_token=${staffToken}`);
    assert.equal(checkInRes.status, 200);

    const kitchenOrder = await KitchenOrder.findOne({ bookingId: booking._id.toString() }).lean();
    assert.ok(kitchenOrder);
    assert.equal(kitchenOrder.reservedTicketNumber, 1);
    assert.equal(kitchenOrder.visitTimeSlot, '17:00-19:00');
    assert.equal(kitchenOrder.ticketNumber, undefined);

    const walkIn = await KitchenOrder.findOne({ source: 'staff_table' }).lean();
    assert.equal(walkIn.ticketNumber, 1);

    const reservationsRes = await request(app)
      .get(`/api/kitchen/reservations?date=${today}`)
      .set('Cookie', `access_token=${kitchenToken}`);
    assert.equal(reservationsRes.body.items.length, 0);

    const ordersRes = await request(app)
      .get(`/api/kitchen/orders?date=${today}`)
      .set('Cookie', `access_token=${kitchenToken}`);
    assert.equal(ordersRes.status, 200);
    assert.equal(ordersRes.body.items.length, 2);

    const reservationItem = ordersRes.body.items.find((row) => row.source === 'booking_preorder');
    assert.ok(reservationItem);
    assert.equal(reservationItem.displayNumber, 1);
    assert.equal(reservationItem.displayNumberLabel, 'Reserved');
    assert.equal(reservationItem.visitTimeSlot, '17:00-19:00');
  });

  test('kitchen orders are sorted by createdAt ascending', async () => {
    await request(app)
      .post(`/api/staff/bookings/${booking._id}/check-in`)
      .set('Cookie', `access_token=${staffToken}`);

    const res = await request(app)
      .get(`/api/kitchen/orders?date=${today}`)
      .set('Cookie', `access_token=${kitchenToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 2);
    assert.equal(res.body.items[0].source, 'staff_table');
    assert.equal(res.body.items[1].source, 'booking_preorder');
  });
});
