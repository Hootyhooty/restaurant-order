/**
 * In-memory failed-login lockout (single-process). Resets on restart.
 * Keyed by normalized username/email so guessing across IPs still trips the limit.
 */

function envNumber(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const attempts = new Map();

function maxFailures() {
  return envNumber('AUTH_LOCKOUT_MAX_ATTEMPTS', 5);
}

function lockDurationMs() {
  return envNumber('AUTH_LOCKOUT_DURATION_MS', 15 * 60 * 1000);
}

function normalizeKey(usernameOrEmail) {
  return String(usernameOrEmail || '').trim().toLowerCase();
}

function getEntry(key) {
  const entry = attempts.get(key);
  if (!entry) return null;
  if (entry.lockedUntil && entry.lockedUntil <= Date.now()) {
    attempts.delete(key);
    return null;
  }
  return entry;
}

function isLocked(usernameOrEmail) {
  const key = normalizeKey(usernameOrEmail);
  if (!key) return { locked: false };
  const entry = getEntry(key);
  if (!entry?.lockedUntil || entry.lockedUntil <= Date.now()) {
    return { locked: false };
  }
  const retryAfterSec = Math.max(1, Math.ceil((entry.lockedUntil - Date.now()) / 1000));
  return { locked: true, retryAfterSec };
}

function recordFailure(usernameOrEmail) {
  const key = normalizeKey(usernameOrEmail);
  if (!key) return { locked: false, failures: 0 };

  const now = Date.now();
  const existing = getEntry(key) || { failures: 0, lockedUntil: null };
  const failures = existing.failures + 1;
  const locked = failures >= maxFailures();
  const lockedUntil = locked ? now + lockDurationMs() : null;

  attempts.set(key, { failures: locked ? 0 : failures, lockedUntil });

  if (locked) {
    return {
      locked: true,
      retryAfterSec: Math.ceil(lockDurationMs() / 1000),
    };
  }

  return { locked: false, failures, remaining: maxFailures() - failures };
}

function clearFailures(usernameOrEmail) {
  const key = normalizeKey(usernameOrEmail);
  if (key) attempts.delete(key);
}

/** Test helper */
function _resetForTests() {
  attempts.clear();
}

module.exports = {
  clearFailures,
  isLocked,
  recordFailure,
  _resetForTests,
  maxFailures,
  lockDurationMs,
};
