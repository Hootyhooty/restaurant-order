const { before, after, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { generateSync } = require('otplib');

const Staff = require('../../models/Staff');
const { encryptSecret } = require('../../utils/mfaCrypto');
const { generateTotpSecret } = require('../../utils/mfa');
const { seedOpsUser } = require('../helpers/opsUsers');

let app;
let mongoServer;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = 'integration-test-jwt-secret-key-min-length-32';
  process.env.MFA_ENCRYPTION_KEY = 'integration-test-mfa-encryption-key-32chars';
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

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

describe('Admin MFA login', () => {
  test('admin with MFA enabled requires a second step', async () => {
    const secret = generateTotpSecret();
    const { staff } = await seedOpsUser({
      username: 'mfa_admin',
      email: 'mfa_admin@test.local',
      password: 'password12',
      role: 'ADMIN',
      withCustomer: false,
    });
    staff.mfa_enabled = true;
    staff.mfa_secret_enc = encryptSecret(secret);
    await staff.save();

    const agent = request.agent(app);
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ username: 'mfa_admin', password: 'password12' });

    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.mfaRequired, true);
    assert.equal(loginRes.body.user, undefined);
    assert.match(loginRes.headers['set-cookie']?.join(';'), /mfa_pending=/);

    const meRes = await agent.get('/api/users/me');
    assert.equal(meRes.status, 401);

    const code = generateSync({ secret });
    const verifyRes = await agent
      .post('/api/auth/mfa/verify')
      .set('Origin', 'http://localhost:3000')
      .send({ code });

    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.user.role, 'ADMIN');
    assert.match(verifyRes.headers['set-cookie']?.join(';'), /access_token=/);

    const meAfter = await agent.get('/api/users/me');
    assert.equal(meAfter.status, 200);
    assert.equal(meAfter.body.user.username, 'mfa_admin');
  });

  test('staff login without MFA still works in one step', async () => {
    await seedOpsUser({
      username: 'staff_user',
      email: 'staff_user@test.local',
      password: 'password12',
      role: 'STAFF',
      withCustomer: false,
    });

    const agent = request.agent(app);
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ username: 'staff_user', password: 'password12' });

    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.user.role, 'STAFF');
    assert.equal(loginRes.body.mfaRequired, undefined);
  });
});

describe('Admin MFA enrollment', () => {
  test('setup and confirm enables MFA and returns backup codes', async () => {
    const { staff } = await seedOpsUser({
      username: 'setup_admin',
      email: 'setup_admin@test.local',
      password: 'password12',
      role: 'ADMIN',
      withCustomer: false,
    });

    const token = jwt.sign(
      { id: staff._id, accountType: 'staff' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
    );

    const agent = request.agent(app);
    const setupRes = await agent
      .post('/api/auth/mfa/setup')
      .set('Cookie', [`access_token=${token}`])
      .set('Origin', 'http://localhost:3000')
      .send({ password: 'password12' });

    assert.equal(setupRes.status, 200);
    assert.ok(setupRes.body.qrDataUrl);
    assert.ok(setupRes.body.manualEntryKey);

    const code = generateSync({ secret: setupRes.body.manualEntryKey });
    const confirmRes = await agent
      .post('/api/auth/mfa/confirm-setup')
      .set('Cookie', [`access_token=${token}`])
      .set('Origin', 'http://localhost:3000')
      .send({ code });

    assert.equal(confirmRes.status, 200);
    assert.equal(confirmRes.body.backupCodes.length, 10);

    const updated = await Staff.findById(staff._id);
    assert.equal(updated.mfa_enabled, true);
  });
});
