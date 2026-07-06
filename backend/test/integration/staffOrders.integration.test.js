const { before, after, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Customer = require('../../models/Customer');
const KitchenOrder = require('../../models/KitchenOrder');
const { getBangkokDateString } = require('../../utils/bangkokDate');

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

describe('Staff orders API', () => {
  let staffToken;
  let userToken;
  let today;

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
    today = getBangkokDateString();

    const staff = await Customer.create({
      username: 'staff_order_test',
      email: 'staff_order_test@test.local',
      password: 'password12',
      role: 'STAFF',
    });
    const user = await Customer.create({
      username: 'user_order_test',
      email: 'user_order_test@test.local',
      password: 'password12',
      role: 'USER',
    });

    staffToken = jwt.sign({ user_id: staff._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    userToken = jwt.sign({ user_id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  test('staff can load menu', async () => {
    const res = await request(app)
      .get('/api/staff/menu')
      .set('Authorization', `Bearer ${staffToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.items));
    assert.ok(res.body.items.length > 0);
  });

  test('POST /api/staff/orders creates staff_table ticket with expanded lines', async () => {
    const res = await request(app)
      .post('/api/staff/orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        tableId: 4,
        customerName: 'Walk-in Guest',
        items: [{ mealId: 1, quantity: 2 }],
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.item.source, 'staff_table');
    assert.equal(res.body.item.tableId, 4);
    assert.equal(res.body.item.lines.length, 2);
    assert.ok(res.body.item.lines.every((l) => l.quantity === 1 && l.lineStatus === 'pending'));

    const saved = await KitchenOrder.findById(res.body.item.id).lean();
    assert.ok(saved);
    assert.equal(saved.ticketNumber, 1);
  });

  test('GET /api/staff/orders lists tickets for today', async () => {
    await request(app)
      .post('/api/staff/orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ tableId: 2, items: [{ mealId: 1, quantity: 1 }] });

    const res = await request(app)
      .get(`/api/staff/orders?date=${today}&tableId=2`)
      .set('Authorization', `Bearer ${staffToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 1);
    assert.equal(res.body.items[0].tableId, 2);
  });

  test('USER role gets 403 on staff order routes', async () => {
    const listRes = await request(app)
      .get('/api/staff/orders')
      .set('Authorization', `Bearer ${userToken}`);
    assert.equal(listRes.status, 403);

    const createRes = await request(app)
      .post('/api/staff/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ tableId: 1, items: [{ mealId: 1, quantity: 1 }] });
    assert.equal(createRes.status, 403);
  });
});
