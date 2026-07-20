const { afterEach, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');

const {
  clearFailures,
  isLocked,
  recordFailure,
  _resetForTests,
} = require('../utils/loginLockout');

const originalMax = process.env.AUTH_LOCKOUT_MAX_ATTEMPTS;
const originalDuration = process.env.AUTH_LOCKOUT_DURATION_MS;

beforeEach(() => {
  process.env.AUTH_LOCKOUT_MAX_ATTEMPTS = '3';
  process.env.AUTH_LOCKOUT_DURATION_MS = '60000';
  _resetForTests();
});

afterEach(() => {
  if (originalMax == null) delete process.env.AUTH_LOCKOUT_MAX_ATTEMPTS;
  else process.env.AUTH_LOCKOUT_MAX_ATTEMPTS = originalMax;
  if (originalDuration == null) delete process.env.AUTH_LOCKOUT_DURATION_MS;
  else process.env.AUTH_LOCKOUT_DURATION_MS = originalDuration;
  _resetForTests();
});

describe('login lockout', () => {
  test('locks after the configured number of failures', () => {
    assert.equal(recordFailure('alice').locked, false);
    assert.equal(recordFailure('alice').locked, false);
    const third = recordFailure('alice');
    assert.equal(third.locked, true);
    assert.ok(third.retryAfterSec >= 1);
    assert.equal(isLocked('alice').locked, true);
  });

  test('clears failures after a successful login path', () => {
    recordFailure('bob');
    recordFailure('bob');
    clearFailures('bob');
    assert.equal(isLocked('bob').locked, false);
    assert.equal(recordFailure('bob').failures, 1);
  });
});
