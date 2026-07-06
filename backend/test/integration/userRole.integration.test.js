const { before, after, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Customer = require('../../models/Customer');
const Staff = require('../../models/Staff');
const { seedOpsUser, staffToken: makeStaffToken, customerToken: makeCustomerToken } = require('../helpers/opsUsers');

let app;
let mongoServer;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = 'integration-test-jwt-secret-key-min-length-32';
  process.env.FRONTEND_ORIGIN = 'http://localhost:3000';

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'restaurant_db',
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  app = require('../../index');
});

after(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('User role management', () => {
  let adminToken;
  let adminStaff;

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
    const seeded = await seedOpsUser({
      username: 'admin_role_test',
      email: 'admin_role_test@test.local',
      password: 'password12',
      role: 'ADMIN',
      withCustomer: false,
    });
    adminStaff = seeded.staff;
    adminToken = makeStaffToken(jwt, adminStaff._id);
  });

  test('promote USER to STAFF creates staffs row and staff login works', async () => {
    const user = await Customer.create({
      username: 'promote_me',
      email: 'promote_me@test.local',
      password: 'password12',
      role: 'USER',
      email_verified: true,
    });

    const patchRes = await request(app)
      .patch(`/api/admin/users/${user._id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'STAFF' });
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.role, 'STAFF');

    const staffRow = await Staff.findOne({ customerId: user._id.toString() }).lean();
    assert.ok(staffRow);
    assert.equal(staffRow.role, 'STAFF');

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: user.username, password: 'password12' });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.user.role, 'STAFF');
    assert.equal(loginRes.body.user.accountType, 'staff');
  });

  test('demote STAFF to USER removes staffs row', async () => {
    const user = await Customer.create({
      username: 'demote_me',
      email: 'demote_me@test.local',
      password: 'password12',
      role: 'USER',
      email_verified: true,
    });
    await request(app)
      .patch(`/api/admin/users/${user._id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'STAFF' });

    const demoteRes = await request(app)
      .patch(`/api/admin/users/${user._id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'USER' });
    assert.equal(demoteRes.status, 200);

    const staffRow = await Staff.findOne({ customerId: user._id.toString() }).lean();
    assert.equal(staffRow, null);

    const staffRoutes = await request(app)
      .get('/api/staff/bookings')
      .set('Authorization', `Bearer ${makeCustomerToken(jwt, user._id)}`);
    assert.equal(staffRoutes.status, 403);
  });

  test('cannot demote the last active admin', async () => {
    const { changeUserRole } = require('../../services/userRoleService');
    await assert.rejects(
      () => changeUserRole(
        { userId: adminStaff._id.toString(), newRole: 'USER', actorId: 'other-actor' },
        null,
      ),
      (err) => err.message.includes('last active admin'),
    );
  });
});
