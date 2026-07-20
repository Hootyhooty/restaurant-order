const { afterEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');

const {
  cookieOptions,
  sessionDaysForRole,
  tokenExpiresIn,
} = require('../utils/authCookies');

const originalNodeEnv = process.env.NODE_ENV;
const originalSessionDays = process.env.AUTH_SESSION_DAYS;
const originalOpsDays = process.env.AUTH_OPS_SESSION_DAYS;

afterEach(() => {
  if (originalNodeEnv == null) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;

  if (originalSessionDays == null) delete process.env.AUTH_SESSION_DAYS;
  else process.env.AUTH_SESSION_DAYS = originalSessionDays;

  if (originalOpsDays == null) delete process.env.AUTH_OPS_SESSION_DAYS;
  else process.env.AUTH_OPS_SESSION_DAYS = originalOpsDays;
});

describe('authentication cookie options', () => {
  test('uses secure host-only HttpOnly cookies in production', () => {
    process.env.NODE_ENV = 'production';
    const options = cookieOptions();

    assert.equal(options.httpOnly, true);
    assert.equal(options.secure, true);
    assert.equal(options.sameSite, 'lax');
    assert.equal(options.path, '/');
    assert.equal(options.domain, undefined);
  });

  test('keeps JWT and cookie lifetime aligned for customers', () => {
    process.env.AUTH_SESSION_DAYS = '7';
    assert.equal(tokenExpiresIn('USER'), '7d');
    assert.equal(cookieOptions('USER').maxAge, 7 * 24 * 60 * 60 * 1000);
  });

  test('uses a shorter default lifetime for ops roles', () => {
    delete process.env.AUTH_OPS_SESSION_DAYS;
    assert.equal(sessionDaysForRole('ADMIN'), 1);
    assert.equal(tokenExpiresIn('STAFF'), '1d');
    assert.equal(cookieOptions('KITCHEN').maxAge, 24 * 60 * 60 * 1000);
  });
});
