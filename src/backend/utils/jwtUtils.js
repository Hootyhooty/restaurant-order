// src/backend/utils/jwtUtils.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';
const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRES_IN_MINUTES = parseInt(process.env.JWT_EXPIRES_IN_MINUTES || '60');
const JWT_REFRESH_EXPIRES_IN_DAYS = parseInt(process.env.JWT_REFRESH_EXPIRES_IN_DAYS || '7');

const createAccessToken = (userId, role, expiresInMinutes = JWT_EXPIRES_IN_MINUTES) => {
  const payload = {
    user_id: userId.toString(),
    id: userId.toString(), // For backward compatibility
    role: role || 'USER',
    exp: Math.floor(Date.now() / 1000) + (expiresInMinutes * 60),
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, JWT_SECRET, { algorithm: JWT_ALGORITHM });
};

const createRefreshToken = (data) => {
  const payload = {
    ...data,
    exp: Math.floor(Date.now() / 1000) + (JWT_REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60),
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, JWT_SECRET, { algorithm: JWT_ALGORITHM });
};

const decodeToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return null;
    }
    throw error;
  }
};

module.exports = {
  createAccessToken,
  createRefreshToken,
  decodeToken,
  JWT_SECRET,
  JWT_ALGORITHM
};
