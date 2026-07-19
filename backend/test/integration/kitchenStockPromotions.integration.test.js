const { before, after, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const MealStock = require('../../models/MealStock');
const Promotion = require('../../models/Promotion');
const { seedOpsUser, staffToken: makeStaffToken } = require('../helpers/opsUsers');

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

describe('Kitchen stock and promotions', () => {
  let kitchenToken;
  let adminToken;

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
    const kitchen = await seedOpsUser({
      username: 'kitchen_stock',
      email: 'kitchen_stock@test.local',
      password: 'password12',
      role: 'KITCHEN',
      withCustomer: false,
    });
    const admin = await seedOpsUser({
      username: 'admin_stock',
      email: 'admin_stock@test.local',
      password: 'password12',
      role: 'ADMIN',
      withCustomer: false,
    });
    kitchenToken = makeStaffToken(jwt, kitchen.staff._id);
    adminToken = makeStaffToken(jwt, admin.staff._id);
  });

  test('GET /api/kitchen/stock seeds rows from menu', async () => {
    const res = await request(app)
      .get('/api/kitchen/stock')
      .set('Cookie', `access_token=${kitchenToken}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.items.length > 0);
    const count = await MealStock.countDocuments();
    assert.ok(count > 0);
  });

  test('PATCH /api/kitchen/stock/:mealFileId updates stock', async () => {
    const listRes = await request(app)
      .get('/api/kitchen/stock')
      .set('Cookie', `access_token=${kitchenToken}`);
    const mealFileId = listRes.body.items[0].mealFileId;

    const patchRes = await request(app)
      .patch(`/api/kitchen/stock/${mealFileId}`)
      .set('Cookie', `access_token=${kitchenToken}`)
      .send({ stock: 3, lowStockThreshold: 5 });
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.item.stock, 3);
    assert.equal(patchRes.body.item.isLowStock, true);
  });

  test('admin can create promotion and public list returns it', async () => {
    const createRes = await request(app)
      .post('/api/admin/promotions')
      .set('Cookie', `access_token=${adminToken}`)
      .send({
        title: 'Lunch deal',
        description: '10% off weekdays',
        code: 'LUNCH10',
        discountPercent: 10,
        active: true,
      });
    assert.equal(createRes.status, 201);

    const publicRes = await request(app).get('/api/promotions');
    assert.equal(publicRes.status, 200);
    assert.equal(publicRes.body.items.length, 1);
    assert.equal(publicRes.body.items[0].title, 'Lunch deal');

    const adminList = await request(app)
      .get('/api/admin/promotions')
      .set('Cookie', `access_token=${adminToken}`);
    assert.equal(adminList.body.items.length, 1);
    await Promotion.findByIdAndDelete(adminList.body.items[0].id);
  });
});
