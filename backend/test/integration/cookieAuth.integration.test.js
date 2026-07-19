const { before, after, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Customer = require('../../models/Customer');

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

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  await Customer.create({
    username: 'cookie_user',
    email: 'cookie_user@test.local',
    password: 'password12',
    email_verified: true,
  });
});

describe('HttpOnly cookie authentication', () => {
  test('login creates a protected session without exposing the JWT', async () => {
    const agent = request.agent(app);
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ username: 'cookie_user', password: 'password12' });

    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.token, undefined);
    assert.equal(loginRes.body.user.username, 'cookie_user');

    const setCookie = loginRes.headers['set-cookie']?.[0] || '';
    assert.match(setCookie, /^access_token=/);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    assert.match(setCookie, /Path=\//i);

    const meRes = await agent.get('/api/users/me');
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.user.username, 'cookie_user');
  });

  test('Bearer tokens are no longer accepted', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer not-a-cookie-session');

    assert.equal(res.status, 401);
  });

  test('logout clears the session cookie', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ username: 'cookie_user', password: 'password12' });

    const logoutRes = await agent
      .post('/api/auth/logout')
      .set('Origin', 'http://localhost:3000');
    assert.equal(logoutRes.status, 200);
    assert.match(logoutRes.headers['set-cookie']?.[0] || '', /access_token=;/);

    const meRes = await agent.get('/api/users/me');
    assert.equal(meRes.status, 401);
  });
});
