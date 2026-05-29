/**
 * Structured JSON logging with request correlation (requestId, userId, bookingId, sessionId).
 */

const write = (level, payload) => {
  const line = {
    level,
    timestamp: new Date().toISOString(),
    ...payload,
  };
  const out = JSON.stringify(line);
  if (level === 'error') console.error(out);
  else if (level === 'warn') console.warn(out);
  else console.log(out);
};

const baseFromReq = (req) => {
  if (!req) return {};
  const ctx = req.logContext || {};
  return {
    requestId: req.requestId || ctx.requestId || undefined,
    userId: ctx.userId || req.user?._id?.toString() || undefined,
    bookingId: ctx.bookingId || undefined,
    bookingIntentId: ctx.bookingIntentId || undefined,
    sessionId: ctx.sessionId || undefined,
  };
};

const mergeContext = (req, fields = {}) => {
  const base = baseFromReq(req);
  const merged = { ...base, ...fields };
  Object.keys(merged).forEach((k) => {
    if (merged[k] == null || merged[k] === '') delete merged[k];
  });
  return merged;
};

const setLogContext = (req, partial = {}) => {
  if (!req) return;
  req.logContext = { ...(req.logContext || {}), ...partial };
};

const logEvent = (level, type, fields = {}, req = null) => {
  write(level, { type, ...mergeContext(req, fields) });
};

const info = (type, fields, req) => logEvent('info', type, fields, req);
const warn = (type, fields, req) => logEvent('warn', type, fields, req);
const error = (type, fields, req) => logEvent('error', type, fields, req);

module.exports = {
  logEvent,
  setLogContext,
  mergeContext,
  info,
  warn,
  error,
};
