const { before, after, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

let app;
let mongoServer;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = 'integration-test-jwt-secret-key-min-length-32';

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'restaurant_db',
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  app = require('../index');
});

after(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('health endpoints', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  test('GET /api/ready returns ready when MongoDB is connected', async () => {
    const res = await request(app).get('/api/ready');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ready');
    assert.equal(res.body.db, 'restaurant_db');
  });
});
