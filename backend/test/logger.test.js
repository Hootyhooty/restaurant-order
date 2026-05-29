const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { mergeContext, setLogContext } = require('../utils/logger');

describe('structured logger', () => {
  test('mergeContext includes request correlation fields', () => {
    const req = {
      requestId: 'req-123',
      logContext: {
        userId: 'user-1',
        bookingId: 'book-9',
        sessionId: 'sess-7',
        bookingIntentId: 'intent-4',
      },
    };
    const merged = mergeContext(req, { type: 'booking_confirmed' });
    assert.equal(merged.requestId, 'req-123');
    assert.equal(merged.userId, 'user-1');
    assert.equal(merged.bookingId, 'book-9');
    assert.equal(merged.sessionId, 'sess-7');
    assert.equal(merged.bookingIntentId, 'intent-4');
    assert.equal(merged.type, 'booking_confirmed');
  });

  test('setLogContext merges onto req.logContext', () => {
    const req = { logContext: { userId: 'u1' } };
    setLogContext(req, { sessionId: 'cs_test', bookingIntentId: 'bi1' });
    assert.deepEqual(req.logContext, {
      userId: 'u1',
      sessionId: 'cs_test',
      bookingIntentId: 'bi1',
    });
  });
});
