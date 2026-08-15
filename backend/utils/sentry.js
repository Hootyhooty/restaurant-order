/**
 * Optional Sentry for the Express API. No-op unless SENTRY_DSN is set.
 */
let enabled = false;

function appEnvironment() {
  return process.env.APP_ENV || process.env.NODE_ENV || 'development';
}

function appRelease() {
  return process.env.SENTRY_RELEASE || process.env.RENDER_GIT_COMMIT || undefined;
}

function scrubEvent(event) {
  if (event.request) {
    delete event.request.cookies;
    if (event.request.headers) {
      delete event.request.headers.cookie;
      delete event.request.headers.Cookie;
      delete event.request.headers.authorization;
      delete event.request.headers.Authorization;
    }
  }
  return event;
}

function initSentry() {
  if (enabled) return enabled;
  const dsn = String(process.env.SENTRY_DSN || '').trim();
  if (!dsn) return false;

  const Sentry = require('@sentry/node');
  Sentry.init({
    dsn,
    environment: appEnvironment(),
    release: appRelease(),
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  });
  enabled = true;
  return true;
}

function isSentryEnabled() {
  return enabled;
}

function setupSentryExpress(app) {
  if (!enabled) return false;
  const Sentry = require('@sentry/node');
  Sentry.setupExpressErrorHandler(app);
  return true;
}

function captureLogError(payload = {}) {
  if (!enabled) return;
  const Sentry = require('@sentry/node');
  const { type, requestId, error: err, ...rest } = payload;

  Sentry.withScope((scope) => {
    if (requestId) scope.setTag('requestId', String(requestId));
    if (type) scope.setTag('logType', String(type));
    scope.setContext('log', rest);
    if (err instanceof Error) {
      Sentry.captureException(err);
      return;
    }
    const message = err != null ? String(err) : String(type || 'error');
    Sentry.captureMessage(message, 'error');
  });
}

module.exports = {
  initSentry,
  isSentryEnabled,
  setupSentryExpress,
  captureLogError,
  appEnvironment,
  appRelease,
};
