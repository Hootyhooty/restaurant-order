const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  generateVerificationToken,
  hashVerificationToken,
  buildVerificationUrl,
} = require('../utils/emailVerification');

describe('emailVerification utils', () => {
  test('hashVerificationToken is deterministic', () => {
    const token = 'abc123';
    assert.equal(hashVerificationToken(token), hashVerificationToken(token));
  });

  test('generateVerificationToken returns unique values', () => {
    const a = generateVerificationToken();
    const b = generateVerificationToken();
    assert.notEqual(a, b);
    assert.ok(a.length >= 32);
  });

  test('buildVerificationUrl uses FRONTEND_URL', () => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    const url = buildVerificationUrl('test-token');
    assert.equal(url, 'http://localhost:3000/verify-email?token=test-token');
  });
});
