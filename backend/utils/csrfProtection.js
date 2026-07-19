const { ACCESS_TOKEN_COOKIE } = require('./authCookies');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function originFromReferer(referer) {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function createCsrfProtection({ allowedOrigins, isProduction }) {
  const allowed = new Set(allowedOrigins);

  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method) || !req.cookies?.[ACCESS_TOKEN_COOKIE]) {
      return next();
    }

    const requestOrigin = req.get('origin') || originFromReferer(req.get('referer'));
    if (requestOrigin && allowed.has(requestOrigin)) {
      return next();
    }

    // Non-browser clients do not send Origin/Referer. Keep local tools usable,
    // but require an allow-listed browser origin in production.
    if (!requestOrigin && !isProduction) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Request origin is not allowed.',
    });
  };
}

module.exports = { createCsrfProtection };
