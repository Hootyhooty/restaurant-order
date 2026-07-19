const { before, after, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  generateVerificationToken,
  hashVerificationToken,
} = require('../../utils/emailVerification');

const Customer = require('../../models/Customer');
const {
  getLastSentPasswordResetForTest,
  clearLastSentPasswordResetForTest,
} = require('../../utils/emailService');

let app;
let mongoServer;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = 'integration-test-jwt-secret-key-min-length-32';
  process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  process.env.EMAIL_SKIP_SEND = 'true';

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

describe('Password reset integration', () => {
  beforeEach(async () => {
    clearLastSentPasswordResetForTest();
    await mongoose.connection.dropDatabase();
  });

  test('forgot-password sends reset link for existing user', async () => {
    await Customer.create({
      username: 'resetuser',
      email: 'resetuser@test.local',
      password: 'password12',
      email_verified: true,
    });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'resetuser@test.local' });

    assert.equal(res.status, 200);
    assert.match(res.body.message, /If an account with that email exists/i);
    assert.ok(getLastSentPasswordResetForTest()?.resetUrl?.includes('token='));

    const user = await Customer.findOne({ email: 'resetuser@test.local' });
    assert.ok(user.password_reset_token);
    assert.ok(user.password_reset_expires);
  });

  test('forgot-password returns generic message for unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@test.local' });

    assert.equal(res.status, 200);
    assert.match(res.body.message, /If an account with that email exists/i);
    assert.equal(getLastSentPasswordResetForTest(), null);
  });

  test('reset-password updates password and allows login with new password', async () => {
    await Customer.create({
      username: 'changepw',
      email: 'changepw@test.local',
      password: 'password12',
      email_verified: true,
    });

    await request(app).post('/api/auth/forgot-password').send({
      email: 'changepw@test.local',
    });

    const token = new URL(getLastSentPasswordResetForTest().resetUrl).searchParams.get('token');
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'newpassword99' });

    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.body.success, true);

    const oldLogin = await request(app).post('/api/auth/login').send({
      username: 'changepw',
      password: 'password12',
    });
    assert.equal(oldLogin.status, 401);

    const newLogin = await request(app).post('/api/auth/login').send({
      username: 'changepw',
      password: 'newpassword99',
    });
    assert.equal(newLogin.status, 200);
    assert.equal(newLogin.body.token, undefined);
    assert.match(newLogin.headers['set-cookie']?.[0] || '', /^access_token=/);

    const user = await Customer.findOne({ email: 'changepw@test.local' });
    assert.equal(user.password_reset_token, undefined);
    assert.equal(user.password_reset_expires, undefined);
  });

  test('expired reset token is rejected', async () => {
    const rawToken = generateVerificationToken();
    await Customer.create({
      username: 'expiredreset',
      email: 'expiredreset@test.local',
      password: 'password12',
      email_verified: true,
      password_reset_token: hashVerificationToken(rawToken),
      password_reset_expires: new Date(Date.now() - 1000),
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, password: 'newpassword99' });

    assert.equal(res.status, 400);
  });
});
