const ACCESS_TOKEN_COOKIE = 'access_token';

function sessionDays() {
  const parsed = Number(process.env.AUTH_SESSION_DAYS || 30);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: sessionDays() * 24 * 60 * 60 * 1000,
  };
}

function clearCookieOptions() {
  const { maxAge, ...options } = cookieOptions();
  return options;
}

function setAuthCookie(res, token) {
  res.cookie(ACCESS_TOKEN_COOKIE, token, cookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, clearCookieOptions());
}

function tokenExpiresIn() {
  return `${sessionDays()}d`;
}

module.exports = {
  ACCESS_TOKEN_COOKIE,
  clearAuthCookie,
  cookieOptions,
  setAuthCookie,
  tokenExpiresIn,
};
