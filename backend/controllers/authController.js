// src/backend/controllers/authController.js
// Authentication handlers (register and login) and auth-related middleware

const Customer = require('../models/Customer');
const jwt = require('jsonwebtoken');
const { decodeToken } = require('../utils/jwtUtils');

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;
    console.log('Received registration request:', { username, email, phone });

    if (!username || !email || !password) {
      console.log('Validation failed: Missing required fields');
      return res
        .status(400)
        .json({ message: 'Username, email, and password are required' });
    }

    const existingUser = await Customer.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      console.log('User already exists:', { username, email });
      return res
        .status(400)
        .json({ message: 'Username or email already exists' });
    }

    const customer = new Customer({ username, email, password, phone });
    await customer.save();
    console.log('User saved to database:', customer._id);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Received login request:', { username });

    if (!username || !password) {
      console.log('Validation failed: Missing required fields');
      return res
        .status(400)
        .json({ message: 'Username and password are required' });
    }

    const customer = await Customer.findOne({ username });
    if (!customer) {
      console.log('User not found:', username);
      return res
        .status(401)
        .json({ message: 'Invalid username or password' });
    }

    const isMatch = await customer.comparePassword(password);
    if (!isMatch) {
      console.log('Password mismatch for user:', username);
      return res
        .status(401)
        .json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: customer._id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    console.log('Login successful, token generated for:', customer._id);

    // Expose key profile fields to the frontend (Profile page)
    res.json({
      token,
      user: {
        id: customer._id,
        username: customer.username,
        email: customer.email,
        phone: customer.phone,
        first_name: customer.first_name,
        last_name: customer.last_name,
        photo: customer.photo,
        role: customer.role,
        email_verified: customer.email_verified,
        phone_verified: customer.phone_verified,
        address_line1: customer.address_line1,
        city: customer.city,
        state: customer.state,
        zipcode: customer.zipcode,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// Authentication middleware - attaches req.user when token is valid
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
        message: 'Authorization token missing',
      });
    }

    const decoded = decodeToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    // Support both 'user_id' and 'id' from token
    const userId = decoded.user_id || decoded.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload',
      });
    }

    const user = await Customer.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if account is active
    if (user.active === false || user.is_active === false) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
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
          message: `Access denied. Requires role(s): ${allowedRoles.join(
            ', ',
          )}`,
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }
  };
};

module.exports = {
  register,
  login,
  authMiddleware,
  rolesRequired,
};

