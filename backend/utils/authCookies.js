const ACCESS_TOKEN_COOKIE = 'access_token';

function envNumber(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Customer browser sessions (default 7 days). */
function customerSessionDays() {
  return envNumber('AUTH_SESSION_DAYS', 7);
}

/** Admin / staff / kitchen sessions (default 1 day). */
function opsSessionDays() {
  return envNumber('AUTH_OPS_SESSION_DAYS', 1);
}

function isOpsRole(role) {
  return role === 'ADMIN' || role === 'STAFF' || role === 'KITCHEN';
}

function sessionDaysForRole(role) {
  return isOpsRole(role) ? opsSessionDays() : customerSessionDays();
}

function cookieOptions(role) {
  const days = sessionDaysForRole(role);
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: days * 24 * 60 * 60 * 1000,
  };
}

function clearCookieOptions() {
  const { maxAge, ...options } = cookieOptions();
  return options;
}

function setAuthCookie(res, token, { role } = {}) {
  res.cookie(ACCESS_TOKEN_COOKIE, token, cookieOptions(role));
}

function clearAuthCookie(res) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, clearCookieOptions());
}

function tokenExpiresIn(role) {
  return `${sessionDaysForRole(role)}d`;
}

module.exports = {
  ACCESS_TOKEN_COOKIE,
  clearAuthCookie,
  cookieOptions,
  customerSessionDays,
  opsSessionDays,
  sessionDaysForRole,
  setAuthCookie,
  tokenExpiresIn,
};
