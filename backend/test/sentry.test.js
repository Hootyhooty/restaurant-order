const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

describe('optional Sentry', () => {
  beforeEach(() => {
    delete process.env.SENTRY_DSN;
    delete require.cache[require.resolve('../utils/sentry')];
  });

  test('initSentry is a no-op without SENTRY_DSN', () => {
    const { initSentry, isSentryEnabled, captureLogError } = require('../utils/sentry');
    assert.equal(initSentry(), false);
    assert.equal(isSentryEnabled(), false);
    assert.doesNotThrow(() => captureLogError({ type: 'test_error', requestId: 'req-1' }));
  });
});
