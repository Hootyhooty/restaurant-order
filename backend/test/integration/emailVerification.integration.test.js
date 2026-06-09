const { before, after, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  generateVerificationToken,
  hashVerificationToken,
  getVerificationExpiryDate,
} = require('../../utils/emailVerification');

const Customer = require('../../models/Customer');
const { getLastSentVerificationForTest, clearLastSentVerificationForTest } = require('../../utils/emailService');

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

describe('Email verification integration', () => {
  beforeEach(async () => {
    clearLastSentVerificationForTest();
    await mongoose.connection.dropDatabase();
  });

  test('register creates unverified user and issues verification token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'newuser',
        email: 'newuser@test.local',
        password: 'password12',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.emailSent, true);
    assert.ok(getLastSentVerificationForTest()?.verifyUrl?.includes('token='));

    const user = await Customer.findOne({ email: 'newuser@test.local' });
    assert.equal(user.email_verified, false);
    assert.ok(user.email_verification_token);
    assert.ok(user.email_verification_expires);
  });

  test('login blocked until email is verified', async () => {
    await request(app).post('/api/auth/register').send({
      username: 'blocked',
      email: 'blocked@test.local',
      password: 'password12',
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'blocked',
      password: 'password12',
    });

    assert.equal(loginRes.status, 403);
    assert.equal(loginRes.body.code, 'EMAIL_NOT_VERIFIED');
  });

  test('verify-email marks user verified and allows login', async () => {
    await request(app).post('/api/auth/register').send({
      username: 'verifyme',
      email: 'verifyme@test.local',
      password: 'password12',
    });

    const token = new URL(getLastSentVerificationForTest().verifyUrl).searchParams.get('token');
    const verifyRes = await request(app).post('/api/auth/verify-email').send({ token });
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.success, true);

    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'verifyme',
      password: 'password12',
    });
    assert.equal(loginRes.status, 200);
    assert.ok(loginRes.body.token);
    assert.equal(loginRes.body.user.email_verified, true);
  });

  test('legacy user without verification token can still log in', async () => {
    await Customer.create({
      username: 'legacy',
      email: 'legacy@test.local',
      password: 'password12',
      email_verified: false,
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'legacy',
      password: 'password12',
    });
    assert.equal(loginRes.status, 200);
  });

  test('expired verification token is rejected', async () => {
    const rawToken = generateVerificationToken();
    await Customer.create({
      username: 'expired',
      email: 'expired@test.local',
      password: 'password12',
      email_verified: false,
      email_verification_token: hashVerificationToken(rawToken),
      email_verification_expires: new Date(Date.now() - 1000),
    });

    const res = await request(app).post('/api/auth/verify-email').send({ token: rawToken });
    assert.equal(res.status, 400);
  });

  test('resend-verification returns generic message', async () => {
    await Customer.create({
      username: 'resend',
      email: 'resend@test.local',
      password: 'password12',
      email_verified: false,
      email_verification_token: hashVerificationToken('old'),
      email_verification_expires: getVerificationExpiryDate(),
    });

    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'resend@test.local' });

    assert.equal(res.status, 200);
    assert.match(res.body.message, /If an account with that email exists/i);
  });
});
