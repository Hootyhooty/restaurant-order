// src/backend/middleware/auth.js
const Customer = require('../models/Customer');
const { decodeToken } = require('../utils/jwtUtils');
const AppError = require('../utils/appError');

const authMiddleware = async (req, res, next) => {
  try {
    let token = null;

    // Prefer Authorization header if present and well-formed
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const [tokenType, tokenVal] = authHeader.split(' ');
        if (tokenType.toLowerCase() === 'bearer' && tokenVal) {
          token = tokenVal;
        }
      } catch (error) {
        // Invalid format, continue to check cookies
      }
    }

    // Fallback to cookies
    if (!token) {
      token = req.cookies?.access_token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token missing'
      });
    }

    const decoded = decodeToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Support both 'user_id' and 'id' from token
    const userId = decoded.user_id || decoded.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload'
      });
    }

    const user = await Customer.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if account is active
    if (user.active === false || user.is_active === false) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Role-based authorization middleware
const rolesRequired = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      // First check authentication
      await new Promise((resolve, reject) => {
        authMiddleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const userRole = req.user.role || 'USER';
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Requires role(s): ${allowedRoles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
  };
};

module.exports = authMiddleware;
module.exports.rolesRequired = rolesRequired;