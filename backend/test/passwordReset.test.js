const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { buildPasswordResetUrl } = require('../utils/passwordReset');

describe('passwordReset utils', () => {
  test('buildPasswordResetUrl uses FRONTEND_URL', () => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    const url = buildPasswordResetUrl('reset-token');
    assert.equal(url, 'http://localhost:3000/reset-password?token=reset-token');
  });
});
