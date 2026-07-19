const { before, after, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  setStripeClientForTest,
  clearStripeClientForTest,
} = require('../utils/stripeClient');
const Customer = require('../models/Customer');
const Booking = require('../models/Booking');
const AdminAuditLog = require('../models/AdminAuditLog');
const { seedOpsUser, staffToken: makeStaffToken } = require('./helpers/opsUsers');

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

  app = require('../index');
});

after(async () => {
  clearStripeClientForTest();
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Admin audit trail', () => {
  beforeEach(async () => {
    clearStripeClientForTest();
    await mongoose.connection.dropDatabase();
  });

  async function seedAdminAndBooking() {
    const { staff: admin } = await seedOpsUser({
      username: 'admin_audit',
      email: 'admin_audit@test.local',
      password: 'password12',
      role: 'ADMIN',
      withCustomer: false,
    });
    const user = await Customer.create({
      username: 'user_audit',
      email: 'user_audit@test.local',
      password: 'password12',
      role: 'USER',
    });
    const booking = await Booking.create({
      userId: user._id.toString(),
      tableId: 3,
      date: '2099-07-01',
      timeSlot: '17:00-19:00',
      guestCount: 4,
      reservationFee: 100,
      reservationCost: 200,
      preOrderTotal: 0,
      amountTotal: 300,
      status: 'confirmed',
      stripePaymentIntentId: 'pi_audit_test',
    });
    const adminToken = makeStaffToken(jwt, admin._id);
    return { admin, booking, adminToken };
  }

  test('no-show creates audit log queryable via GET /api/admin/audit-logs', async () => {
    setStripeClientForTest({
      refunds: { create: async () => ({ id: 're_test' }) },
    });

    const { booking, adminToken } = await seedAdminAndBooking();

    const actionRes = await request(app)
      .post(`/api/admin/bookings/${booking._id}/no-show`)
      .set('Cookie', `access_token=${adminToken}`);
    assert.equal(actionRes.status, 200);

    const auditRes = await request(app)
      .get('/api/admin/audit-logs')
      .set('Cookie', `access_token=${adminToken}`);
    assert.equal(auditRes.status, 200);
    assert.ok(auditRes.body.items.length >= 1);

    const entry = auditRes.body.items.find((x) => x.action === 'booking.no_show');
    assert.ok(entry);
    assert.equal(entry.bookingId, booking._id.toString());
    assert.equal(entry.previousStatus, 'confirmed');
    assert.equal(entry.newStatus, 'no_show');
    assert.equal(entry.adminUsername, 'admin_audit');
  });

  test('invalid bookingId param returns 400 before controller', async () => {
    const { adminToken } = await seedAdminAndBooking();
    const res = await request(app)
      .post('/api/admin/bookings/not-a-uuid/no-show')
      .set('Cookie', `access_token=${adminToken}`);
    assert.equal(res.status, 400);
    const count = await AdminAuditLog.countDocuments();
    assert.equal(count, 0);
  });
});
