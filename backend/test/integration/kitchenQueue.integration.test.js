const { before, after, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Customer = require('../../models/Customer');
const KitchenOrder = require('../../models/KitchenOrder');
const Transaction = require('../../models/Transaction');
const { getBangkokDateString } = require('../../utils/bangkokDate');
const { createKitchenOrderFromTransaction } = require('../../services/kitchenOrderFromTransaction');
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

describe('Kitchen queue API', () => {
  let kitchenToken;
  let staffToken;
  let userToken;
  let orderId;
  let today;

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
    today = getBangkokDateString();

    const { staff: kitchenAccount } = await seedOpsUser({
      username: 'kitchen_test',
      email: 'kitchen_test@test.local',
      password: 'password12',
      role: 'KITCHEN',
      withCustomer: false,
    });
    const { staff: staffAccount } = await seedOpsUser({
      username: 'staff_kitchen_test',
      email: 'staff_kitchen_test@test.local',
      password: 'password12',
      role: 'STAFF',
      withCustomer: false,
    });
    const user = await Customer.create({
      username: 'user_kitchen_test',
      email: 'user_kitchen_test@test.local',
      password: 'password12',
      role: 'USER',
    });

    kitchenToken = makeStaffToken(jwt, kitchenAccount._id);
    staffToken = makeStaffToken(jwt, staffAccount._id);
    userToken = makeCustomerToken(jwt, user._id);

    const order = await KitchenOrder.create({
      ticketNumber: 1,
      serviceDate: today,
      source: 'staff_table',
      tableId: 3,
      customerName: 'Table 3',
      lines: [
        { mealId: 1, name: 'Pad Thai', unitPrice: 120, quantity: 1, lineStatus: 'pending' },
        { mealId: 2, name: 'Soup', unitPrice: 80, quantity: 1, lineStatus: 'pending' },
      ],
      status: 'pending',
    });
    orderId = order._id;
  });

  test('kitchen can list orders for today', async () => {
    const res = await request(app)
      .get(`/api/kitchen/orders?date=${today}`)
      .set('Authorization', `Bearer ${kitchenToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 1);
    assert.equal(res.body.items[0].ticketNumber, 1);
  });

  test('kitchen PATCH lines marks served and derives ticket status', async () => {
    const res = await request(app)
      .patch(`/api/kitchen/orders/${orderId}/lines`)
      .set('Authorization', `Bearer ${kitchenToken}`)
      .send({ lineIndexes: [0], lineStatus: 'served' });

    assert.equal(res.status, 200);
    assert.equal(res.body.item.lines[0].lineStatus, 'served');
    assert.equal(res.body.item.status, 'pending');

    const complete = await request(app)
      .patch(`/api/kitchen/orders/${orderId}/lines`)
      .set('Authorization', `Bearer ${kitchenToken}`)
      .send({ lineIndexes: [1], lineStatus: 'served' });

    assert.equal(complete.status, 200);
    assert.equal(complete.body.item.status, 'served');
  });

  test('STAFF cannot PATCH kitchen lines', async () => {
    const res = await request(app)
      .patch(`/api/kitchen/orders/${orderId}/lines`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ lineIndexes: [0], lineStatus: 'served' });

    assert.equal(res.status, 403);
  });

  test('USER cannot access kitchen routes', async () => {
    const res = await request(app)
      .get('/api/kitchen/orders')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 403);
  });

  test('createKitchenOrderFromTransaction is idempotent', async () => {
    const tx = await Transaction.create({
      userId: 'user-1',
      status: 'paid',
      currency: 'thb',
      amountTotal: 200,
      items: [{ mealId: 1, name: 'Pad Thai', unitPrice: 100, quantity: 2 }],
      customerEmail: 'buyer@test.local',
    });

    const first = await createKitchenOrderFromTransaction(tx);
    const second = await createKitchenOrderFromTransaction(tx);

    assert.ok(first);
    assert.equal(first._id.toString(), second._id.toString());
    assert.equal(first.source, 'online');
    assert.equal(first.lines.length, 2);

    const count = await KitchenOrder.countDocuments({ transactionId: tx._id.toString() });
    assert.equal(count, 1);
  });
});
