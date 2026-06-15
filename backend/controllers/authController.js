// src/backend/controllers/authController.js
// Authentication handlers (register and login) and auth-related middleware

const bcrypt = require('bcrypt');
const Customer = require('../models/Customer');
const PendingRegistration = require('../models/PendingRegistration');
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
const {
  sendVerificationEmailSafe,
  sendPasswordResetEmailSafe,
  describeEmailError,
} = require('../utils/emailService');
const { warn } = require('../utils/logger');

const RESEND_GENERIC_MESSAGE =
  'If an account with that email exists and is not yet verified, a verification email has been sent.';

const FORGOT_PASSWORD_GENERIC_MESSAGE =
  'If an account with that email exists, a password reset link has been sent.';

// Legacy helper: re-issue a verification email for an already-created (pre-deferred-flow)
// unverified Customer. New registrations never create a Customer until verified.
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

// Sends the verification email for a pending registration with a fresh raw token.
async function sendPendingVerificationEmail(pending, rawToken) {
  const verifyUrl = buildVerificationUrl(rawToken);
  await sendVerificationEmailSafe({
    to: pending.email,
    username: pending.username,
    verifyUrl,
  });
}

// POST /api/auth/register
// Does NOT create a Customer. It stores a PendingRegistration and emails a verification
// link. The real account is created only when the link is verified.
const register = async (req, res) => {
  try {
    const { username, password, phone } = req.body;
    const email = String(req.body?.email || '').trim().toLowerCase();
    console.log('Received registration request:', { username, email, phone });

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Username, email, and password are required' });
    }

    // Reject if a real account already uses this email/username.
    const existingUser = await Customer.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: 'Username or email already exists' });
    }

    // Reject if phone is already taken by a real account (unique index).
    if (phone) {
      const phoneTaken = await Customer.findOne({ phone });
      if (phoneTaken) {
        return res.status(400).json({ message: 'Phone number already in use' });
      }
    }

    // Username reserved by a different pending registration.
    const usernamePending = await PendingRegistration.findOne({ username });
    if (usernamePending && usernamePending.email !== email) {
      return res
        .status(400)
        .json({ message: 'Username or email already exists' });
    }

    // Replace any earlier pending attempt for this email (fresh token + data).
    await PendingRegistration.deleteOne({ email });

    const rawToken = generateVerificationToken();
    const passwordHash = await bcrypt.hash(password, 10);
    const expiry = getVerificationExpiryDate();

    const pending = await PendingRegistration.create({
      username,
      email,
      password_hash: passwordHash,
      phone: phone ? String(phone).trim() : undefined,
      verification_token: hashVerificationToken(rawToken),
      verification_expires: expiry,
      expires_at: expiry,
    });

    // Don't block registration on email delivery. We keep the pending record either way
    // and send the user to the waiting room, where they can resend the link.
    let emailSent = true;
    try {
      await sendPendingVerificationEmail(pending, rawToken);
    } catch (emailError) {
      emailSent = false;
      warn('register_verification_email_failed', {
        email,
        ...describeEmailError(emailError),
      });
    }

    res.status(201).json({
      message: emailSent
        ? 'We sent a verification link to your email. Click it to activate your account — no account is created until you verify.'
        : 'Your registration is pending, but we could not send the verification email just yet. Use "Resend" on the next page in a moment.',
      emailSent,
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// POST /api/auth/verify-email
// Creates the real Customer from the matching PendingRegistration (new flow), or marks
// an existing unverified Customer verified (legacy flow / backward compatibility).
const verifyEmail = async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    const hashed = hashVerificationToken(token);

    // New flow: pending registration -> create the account now.
    const pending = await PendingRegistration.findOne({
      verification_token: hashed,
      verification_expires: { $gt: new Date() },
    });

    if (pending) {
      // Someone may have taken the username/email between register and verify.
      const conflict = await Customer.findOne({
        $or: [{ email: pending.email }, { username: pending.username }],
      });
      if (conflict) {
        await PendingRegistration.deleteOne({ _id: pending._id });
        return res.status(409).json({
          message:
            'This username or email is already registered. Please log in or register again.',
        });
      }

      const customer = new Customer({
        username: pending.username,
        email: pending.email,
        phone: pending.phone || undefined,
        email_verified: true,
      });
      // Reuse the already-hashed password; do not re-hash.
      customer.password = pending.password_hash;
      customer.$locals.skipPasswordHash = true;
      await customer.save();

      await PendingRegistration.deleteOne({ _id: pending._id });

      return res.json({
        success: true,
        message: 'Email verified successfully. Your account is now active — you can log in.',
      });
    }

    // Legacy flow: unverified Customer that already exists.
    const customer = await Customer.findOne({
      email_verification_token: hashed,
      email_verification_expires: { $gt: new Date() },
    });

    if (customer) {
      customer.email_verified = true;
      customer.email_verification_token = undefined;
      customer.email_verification_expires = undefined;
      await customer.save();

      return res.json({
        success: true,
        message: 'Email verified successfully. You can now log in.',
      });
    }

    return res.status(400).json({
      message: 'Invalid or expired verification link. Request a new verification email.',
    });
  } catch (error) {
    console.error('Verify email error:', error.message);
    // Duplicate key (race on unique email/username/phone) -> friendly message.
    if (error.code === 11000) {
      return res.status(409).json({
        message:
          'This username or email is already registered. Please log in or register again.',
      });
    }
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

    // New flow: pending registration -> regenerate token + resend.
    const pending = await PendingRegistration.findOne({ email });
    if (pending) {
      const rawToken = generateVerificationToken();
      const expiry = getVerificationExpiryDate();
      pending.verification_token = hashVerificationToken(rawToken);
      pending.verification_expires = expiry;
      pending.expires_at = expiry;
      await pending.save();

      try {
        await sendPendingVerificationEmail(pending, rawToken);
      } catch (emailError) {
        warn('resend_verification_email_failed', { email, error: emailError.message });
      }
    } else {
      // Legacy flow: unverified Customer.
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
