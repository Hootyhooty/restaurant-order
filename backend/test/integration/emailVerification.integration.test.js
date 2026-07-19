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
const PendingRegistration = require('../../models/PendingRegistration');
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

  test('register creates a pending registration and NO Customer yet', async () => {
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

    // No real account exists before verification.
    const user = await Customer.findOne({ email: 'newuser@test.local' });
    assert.equal(user, null);

    const pending = await PendingRegistration.findOne({ email: 'newuser@test.local' });
    assert.ok(pending);
    assert.ok(pending.verification_token);
    assert.ok(pending.password_hash);
  });

  test('login fails before verification because the account does not exist yet', async () => {
    await request(app).post('/api/auth/register').send({
      username: 'blocked',
      email: 'blocked@test.local',
      password: 'password12',
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'blocked',
      password: 'password12',
    });

    assert.equal(loginRes.status, 401);

    const user = await Customer.findOne({ email: 'blocked@test.local' });
    assert.equal(user, null);
  });

  test('verify-email creates the account and allows login', async () => {
    await request(app).post('/api/auth/register').send({
      username: 'verifyme',
      email: 'verifyme@test.local',
      password: 'password12',
      phone: '0810000001',
    });

    // No account yet.
    assert.equal(await Customer.findOne({ email: 'verifyme@test.local' }), null);

    const token = new URL(getLastSentVerificationForTest().verifyUrl).searchParams.get('token');
    const verifyRes = await request(app).post('/api/auth/verify-email').send({ token });
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.success, true);

    // Account now exists, verified, and the pending record is gone.
    const user = await Customer.findOne({ email: 'verifyme@test.local' });
    assert.ok(user);
    assert.equal(user.email_verified, true);
    assert.equal(await PendingRegistration.findOne({ email: 'verifyme@test.local' }), null);

    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'verifyme',
      password: 'password12',
    });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.token, undefined);
    assert.match(loginRes.headers['set-cookie']?.[0] || '', /^access_token=/);
    assert.equal(loginRes.body.user.email_verified, true);
  });

  test('resend-verification regenerates token for a pending registration', async () => {
    await request(app).post('/api/auth/register').send({
      username: 'pendingresend',
      email: 'pendingresend@test.local',
      password: 'password12',
    });
    const firstToken = new URL(getLastSentVerificationForTest().verifyUrl).searchParams.get('token');

    clearLastSentVerificationForTest();

    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'pendingresend@test.local' });
    assert.equal(res.status, 200);

    const secondToken = new URL(getLastSentVerificationForTest().verifyUrl).searchParams.get('token');
    assert.notEqual(firstToken, secondToken);

    // The newest token verifies and creates the account.
    const verifyRes = await request(app).post('/api/auth/verify-email').send({ token: secondToken });
    assert.equal(verifyRes.status, 200);
    assert.ok(await Customer.findOne({ email: 'pendingresend@test.local' }));
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
