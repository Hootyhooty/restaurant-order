const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const { createCsrfProtection } = require('../utils/csrfProtection');

function runMiddleware({ method = 'POST', origin, referer, cookie = 'token', production = true }) {
  const middleware = createCsrfProtection({
    allowedOrigins: ['https://picha-restaurant.com'],
    isProduction: production,
  });

  const req = {
    method,
    cookies: cookie ? { access_token: cookie } : {},
    get(name) {
      if (name === 'origin') return origin;
      if (name === 'referer') return referer;
      return undefined;
    },
  };

  let status;
  let body;
  let nextCalled = false;
  const res = {
    status(value) {
      status = value;
      return this;
    },
    json(value) {
      body = value;
      return this;
    },
  };

  middleware(req, res, () => {
    nextCalled = true;
  });

  return { status, body, nextCalled };
}

describe('CSRF origin protection', () => {
  test('allows an authenticated mutation from the configured frontend', () => {
    const result = runMiddleware({ origin: 'https://picha-restaurant.com' });
    assert.equal(result.nextCalled, true);
  });

  test('rejects an authenticated mutation from another origin', () => {
    const result = runMiddleware({ origin: 'https://evil.example' });
    assert.equal(result.status, 403);
    assert.equal(result.body.success, false);
  });

  test('rejects a production mutation with no browser origin', () => {
    const result = runMiddleware({});
    assert.equal(result.status, 403);
  });

  test('does not interfere with safe or unauthenticated requests', () => {
    assert.equal(runMiddleware({ method: 'GET' }).nextCalled, true);
    assert.equal(runMiddleware({ cookie: null }).nextCalled, true);
  });
});
