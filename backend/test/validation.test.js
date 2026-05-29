const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateStripeCheckoutBody,
  validateMongoIdParam,
  isUuid,
} = require('../utils/validation');

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('validation helpers', () => {
  test('isUuid accepts canonical UUID', () => {
    assert.equal(isUuid('019e71da-9436-7997-a165-72b615b0a65e'), true);
    assert.equal(isUuid('not-an-id'), false);
  });

  test('validateStripeCheckoutBody rejects empty cart', () => {
    const req = { body: { items: [] } };
    const res = mockRes();
    let nextCalled = false;
    validateStripeCheckoutBody(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 400);
  });

  test('validateStripeCheckoutBody accepts valid cart', () => {
    const req = { body: { items: [{ id: 1, quantity: 2 }] } };
    const res = mockRes();
    let nextCalled = false;
    validateStripeCheckoutBody(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
  });

  test('validateMongoIdParam rejects invalid bookingId', () => {
    const req = { params: { bookingId: 'bad-id' } };
    const res = mockRes();
    let nextCalled = false;
    validateMongoIdParam('bookingId')(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 400);
  });
});
