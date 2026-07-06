const { before, after, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Customer = require('../../models/Customer');
const Staff = require('../../models/Staff');
const { customerToken: makeCustomerToken, staffToken: makeStaffToken } = require('../helpers/opsUsers');

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

describe('Profile API', () => {
  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
  });

  test('customer can update profile', async () => {
    const customer = await Customer.create({
      username: 'profile_user',
      email: 'profile_user@test.local',
      password: 'password12',
      role: 'USER',
      email_verified: true,
      first_name: 'Old',
    });
    const token = makeCustomerToken(jwt, customer._id);

    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ first_name: 'New', photo: 'https://cdn.example/photo.jpg' });

    assert.equal(res.status, 200);
    assert.equal(res.body.user.first_name, 'New');
    assert.equal(res.body.user.photo, 'https://cdn.example/photo.jpg');

    const updated = await Customer.findById(customer._id).lean();
    assert.equal(updated.first_name, 'New');
    assert.equal(updated.photo, 'https://cdn.example/photo.jpg');
  });

  test('linked staff updates customer profile and keeps staff name in sync', async () => {
    const customer = await Customer.create({
      username: 'linked_staff_user',
      email: 'linked_staff_user@test.local',
      password: 'password12',
      role: 'USER',
      email_verified: true,
      first_name: 'Before',
      photo: 'https://cdn.example/old.jpg',
    });
    const staff = await Staff.create({
      customerId: customer._id.toString(),
      username: customer.username,
      email: customer.email,
      password: customer.password,
      role: 'STAFF',
      first_name: 'Before',
      email_verified: true,
    });
    staff.$locals.skipPasswordHash = true;
    await staff.save();

    const token = makeStaffToken(jwt, staff._id);

    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ first_name: 'After', photo: 'https://cdn.example/new.jpg' });

    assert.equal(res.status, 200);
    assert.equal(res.body.user.first_name, 'After');
    assert.equal(res.body.user.photo, 'https://cdn.example/new.jpg');

    const updatedCustomer = await Customer.findById(customer._id).lean();
    const updatedStaff = await Staff.findById(staff._id).lean();
    assert.equal(updatedCustomer.first_name, 'After');
    assert.equal(updatedCustomer.photo, 'https://cdn.example/new.jpg');
    assert.equal(updatedStaff.first_name, 'After');
  });

  test('staff-only account can update photo on staff record', async () => {
    const staff = await Staff.create({
      username: 'staff_only',
      email: 'staff_only@test.local',
      password: 'password12',
      role: 'KITCHEN',
      email_verified: true,
    });

    const token = makeStaffToken(jwt, staff._id);

    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ photo: 'https://cdn.example/kitchen.jpg' });

    assert.equal(res.status, 200);
    assert.equal(res.body.user.photo, 'https://cdn.example/kitchen.jpg');

    const updatedStaff = await Staff.findById(staff._id).lean();
    assert.equal(updatedStaff.photo, 'https://cdn.example/kitchen.jpg');
  });

  test('public profile resolves staff id to linked customer', async () => {
    const customer = await Customer.create({
      username: 'public_linked',
      email: 'public_linked@test.local',
      password: 'password12',
      role: 'USER',
      email_verified: true,
      photo: 'https://cdn.example/public.jpg',
    });
    const staff = await Staff.create({
      customerId: customer._id.toString(),
      username: customer.username,
      email: customer.email,
      password: customer.password,
      role: 'STAFF',
      email_verified: true,
    });
    staff.$locals.skipPasswordHash = true;
    await staff.save();

    const res = await request(app).get(`/api/users/public/${staff._id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.user.photo, 'https://cdn.example/public.jpg');
    assert.equal(res.body.user.username, 'public_linked');
  });
});
