const { before, after, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Customer = require('../../models/Customer');
const { _resetForTests } = require('../../utils/loginLockout');

let app;
let mongoServer;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = 'integration-test-jwt-secret-key-min-length-32';
  process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
  process.env.AUTH_LOCKOUT_MAX_ATTEMPTS = '3';
  process.env.AUTH_LOCKOUT_DURATION_MS = '60000';

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
  _resetForTests();
  await mongoose.connection.dropDatabase();
  await Customer.create({
    username: 'lock_user',
    email: 'lock_user@test.local',
    password: 'password12',
    email_verified: true,
  });
});

describe('Login lockout and session revocation', () => {
  test('locks after repeated failed passwords', async () => {
    for (let i = 0; i < 3; i += 1) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'lock_user', password: 'wrong-password' });
      if (i < 2) assert.equal(res.status, 401);
      else {
        assert.equal(res.status, 429);
        assert.equal(res.body.code, 'ACCOUNT_LOCKED');
      }
    }
  });

  test('rejects cookies issued before a password reset', async () => {
    const agent = request.agent(app);
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ username: 'lock_user', password: 'password12' });
    assert.equal(loginRes.status, 200);

    const user = await Customer.findOne({ username: 'lock_user' });
    user.password = 'newpassword99';
    user.password_changed_at = new Date(Date.now() + 1000);
    await user.save();

    // Force an old iat so the session is clearly older than password_changed_at.
    const staleToken = jwt.sign(
      { id: user._id, accountType: 'customer', iat: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
    );

    const meRes = await request(app)
      .get('/api/users/me')
      .set('Cookie', `access_token=${staleToken}`);
    assert.equal(meRes.status, 401);
    assert.equal(meRes.body.code, 'SESSION_REVOKED');
  });
});
