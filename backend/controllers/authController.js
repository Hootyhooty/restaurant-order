// src/backend/controllers/authController.js
// Authentication handlers (register and login) and auth-related middleware

const Customer = require('../models/Customer');
const jwt = require('jsonwebtoken');
const { decodeToken } = require('../utils/jwtUtils');
const {
  generateVerificationToken,
  hashVerificationToken,
  getVerificationExpiryDate,
  buildVerificationUrl,
} = require('../utils/emailVerification');
const {
  getPasswordResetExpiryDate,
  buildPasswordResetUrl,
} = require('../utils/passwordReset');
const { sendVerificationEmailSafe, sendPasswordResetEmailSafe } = require('../utils/emailService');
const { warn } = require('../utils/logger');

const RESEND_GENERIC_MESSAGE =
  'If an account with that email exists and is not yet verified, a verification email has been sent.';

const FORGOT_PASSWORD_GENERIC_MESSAGE =
  'If an account with that email exists, a password reset link has been sent.';

async function issueVerificationEmail(customer) {
  const rawToken = generateVerificationToken();
  customer.email_verification_token = hashVerificationToken(rawToken);
  customer.email_verification_expires = getVerificationExpiryDate();
  await customer.save();

  const verifyUrl = buildVerificationUrl(rawToken);
  await sendVerificationEmailSafe({
    to: customer.email,
    username: customer.username,
    verifyUrl,
  });
}

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

    try {
      await issueVerificationEmail(customer);
    } catch (emailError) {
      warn('register_verification_email_failed', {
        userId: customer._id,
        error: emailError.message,
      });
      return res.status(201).json({
        message:
          'Account created, but we could not send the verification email. Use resend verification on the login page.',
        emailSent: false,
      });
    }

    res.status(201).json({
      message: 'Account created. Please check your email to verify your address before logging in.',
      emailSent: true,
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// POST /api/auth/verify-email
const verifyEmail = async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    const hashed = hashVerificationToken(token);
    const customer = await Customer.findOne({
      email_verification_token: hashed,
      email_verification_expires: { $gt: new Date() },
    });

    if (!customer) {
      return res.status(400).json({
        message: 'Invalid or expired verification link. Request a new verification email.',
      });
    }

    customer.email_verified = true;
    customer.email_verification_token = undefined;
    customer.email_verification_expires = undefined;
    await customer.save();

    res.json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error) {
    console.error('Verify email error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// POST /api/auth/resend-verification
const resendVerification = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const customer = await Customer.findOne({ email });

    if (customer && !customer.email_verified) {
      try {
        await issueVerificationEmail(customer);
      } catch (emailError) {
        warn('resend_verification_email_failed', {
          userId: customer._id,
          error: emailError.message,
        });
      }
    }

    res.json({ message: RESEND_GENERIC_MESSAGE });
  } catch (error) {
    console.error('Resend verification error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const customer = await Customer.findOne({ email });

    if (
      customer &&
      customer.active !== false &&
      customer.is_active !== false &&
      customer.is_deleted !== true
    ) {
      const rawToken = generateVerificationToken();
      customer.password_reset_token = hashVerificationToken(rawToken);
      customer.password_reset_expires = getPasswordResetExpiryDate();
      await customer.save();

      const resetUrl = buildPasswordResetUrl(rawToken);
      try {
        await sendPasswordResetEmailSafe({
          to: customer.email,
          username: customer.username,
          resetUrl,
        });
      } catch (emailError) {
        warn('forgot_password_email_failed', {
          userId: customer._id,
          error: emailError.message,
        });
      }
    }

    res.json({ message: FORGOT_PASSWORD_GENERIC_MESSAGE });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');

    if (!token) {
      return res.status(400).json({ message: 'Reset token is required' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const hashed = hashVerificationToken(token);
    const customer = await Customer.findOne({
      password_reset_token: hashed,
      password_reset_expires: { $gt: new Date() },
    });

    if (!customer) {
      return res.status(400).json({
        message: 'Invalid or expired reset link. Request a new password reset email.',
      });
    }

    customer.password = password;
    customer.password_changed_at = new Date();
    customer.password_reset_token = undefined;
    customer.password_reset_expires = undefined;
    await customer.save();

    res.json({
      success: true,
      message: 'Password updated successfully. You can now log in.',
    });
  } catch (error) {
    console.error('Reset password error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// POST /api/auth/login
// Accepts either username or email for login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const usernameOrEmail = (username || '').trim();
    console.log('Received login request:', { username: usernameOrEmail });

    if (!usernameOrEmail || !password) {
      console.log('Validation failed: Missing required fields');
      return res
        .status(400)
        .json({ message: 'Username/email and password are required' });
    }

    const isEmail = usernameOrEmail.includes('@');
    const customer = await Customer.findOne(
      isEmail
        ? { email: usernameOrEmail.toLowerCase() }
        : { username: usernameOrEmail }
    );
    if (!customer) {
      console.log('User not found:', usernameOrEmail);
      return res
        .status(401)
        .json({ message: 'Invalid username or password' });
    }

    const isMatch = await customer.comparePassword(password);
    if (!isMatch) {
      console.log('Password mismatch for user:', usernameOrEmail);
      return res
        .status(401)
        .json({ message: 'Invalid username or password' });
    }

    if (
      !customer.email_verified &&
      customer.email_verification_token &&
      customer.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
        email: customer.email,
      });
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
    req.logContext = { ...(req.logContext || {}), userId: user._id.toString() };
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
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  authMiddleware,
  rolesRequired,
};
