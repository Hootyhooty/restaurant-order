const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const Staff = require('../models/Staff');
const { decodeToken } = require('../utils/jwtUtils');
const { recordAdminAudit } = require('../utils/auditLog');
const { encryptSecret, decryptSecret } = require('../utils/mfaCrypto');
const {
  generateTotpSecret,
  buildOtpAuthUri,
  verifyTotp,
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
} = require('../utils/mfa');
const {
  clearAuthCookie,
  clearMfaPendingCookie,
  setAuthCookie,
  setMfaPendingCookie,
  tokenExpiresIn,
  MFA_PENDING_COOKIE,
} = require('../utils/authCookies');
const {
  resolvePrincipalById,
} = require('../services/resolvePrincipal');
const { buildAuthUserPayload } = require('../services/authUserPayload');
const {
  isLocked,
  recordFailure,
  clearFailures,
} = require('../utils/loginLockout');

function mfaLockKey(staffId) {
  return `mfa:${staffId}`;
}

function lockoutResponse(res, lockInfo) {
  res.set('Retry-After', String(lockInfo.retryAfterSec || 60));
  return res.status(429).json({
    success: false,
    message: `Too many failed verification attempts. Try again in ${lockInfo.retryAfterSec} seconds.`,
    code: 'MFA_LOCKED',
    retryAfterSec: lockInfo.retryAfterSec,
  });
}

function decodeMfaPending(req) {
  const token = req.cookies?.[MFA_PENDING_COOKIE];
  if (!token) return null;
  const decoded = decodeToken(token);
  if (!decoded || decoded.purpose !== 'mfa_pending' || !decoded.id) return null;
  return decoded;
}

async function issueStaffSession(res, staffId) {
  const principal = await resolvePrincipalById(staffId, 'staff');
  if (!principal || principal.role !== 'ADMIN') {
    return null;
  }
  const sessionToken = jwt.sign(
    { id: staffId, accountType: 'staff' },
    process.env.JWT_SECRET,
    { expiresIn: tokenExpiresIn(principal.role) },
  );
  setAuthCookie(res, sessionToken, { role: principal.role });
  return buildAuthUserPayload(principal);
}

async function loadAdminStaff(staffId, extraSelect = '') {
  const select = ['+mfa_secret_enc', '+mfa_secret_pending_enc', '+mfa_backup_codes', extraSelect]
    .filter(Boolean)
    .join(' ');
  const staff = await Staff.findById(staffId).select(select);
  if (!staff || staff.role !== 'ADMIN' || staff.active === false) return null;
  return staff;
}

// POST /api/auth/mfa/verify — complete admin login after password step
const verifyMfaLogin = async (req, res) => {
  try {
    const pending = decodeMfaPending(req);
    if (!pending) {
      return res.status(401).json({
        success: false,
        message: 'MFA session expired. Please log in again.',
        code: 'MFA_SESSION_EXPIRED',
      });
    }

    const lockKey = mfaLockKey(pending.id);
    const lockState = isLocked(lockKey);
    if (lockState.locked) {
      return lockoutResponse(res, lockState);
    }

    const staff = await loadAdminStaff(pending.id);
    if (!staff || !staff.mfa_enabled || !staff.mfa_secret_enc) {
      clearMfaPendingCookie(res);
      return res.status(401).json({
        success: false,
        message: 'MFA is not enabled for this account.',
      });
    }

    const { code, backupCode } = req.body || {};
    let verified = false;
    let usedBackupIndex = -1;

    if (code) {
      const secret = decryptSecret(staff.mfa_secret_enc);
      verified = verifyTotp(secret, code);
    } else if (backupCode) {
      const result = await verifyBackupCode(staff.mfa_backup_codes || [], backupCode);
      verified = result.ok;
      usedBackupIndex = result.index;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Enter the 6-digit code or a backup code.',
      });
    }

    if (!verified) {
      const failure = recordFailure(lockKey);
      if (failure.locked) {
        return lockoutResponse(res, failure);
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid verification code.',
      });
    }

    if (usedBackupIndex >= 0) {
      staff.mfa_backup_codes[usedBackupIndex] = null;
      staff.markModified('mfa_backup_codes');
      await staff.save();
      await recordAdminAudit(req, {
        action: 'MFA_BACKUP_CODE_USED',
        resourceType: 'staff',
        resourceId: staff._id,
        metadata: { index: usedBackupIndex },
      });
    }

    clearFailures(lockKey);
    clearMfaPendingCookie(res);
    const user = await issueStaffSession(res, staff._id);
    if (!user) {
      clearAuthCookie(res);
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    return res.json({ user });
  } catch (error) {
    console.error('MFA verify login error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during MFA verification.',
    });
  }
};

// GET /api/auth/mfa/status
const getMfaStatus = async (req, res) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  const staff = await Staff.findById(req.user._id).select('mfa_enabled role');
  return res.json({
    enabled: Boolean(staff?.mfa_enabled),
    backupCodesRemaining: staff?.mfa_enabled
      ? (await Staff.findById(req.user._id).select('+mfa_backup_codes'))
        .mfa_backup_codes.filter(Boolean).length
      : 0,
  });
};

// POST /api/auth/mfa/setup
const setupMfa = async (req, res) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { password } = req.body || {};
    const staff = await loadAdminStaff(req.user._id, '+password');
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Admin account not found.' });
    }

    const passwordOk = await staff.comparePassword(password);
    if (!passwordOk) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    if (staff.mfa_enabled) {
      return res.status(400).json({
        success: false,
        message: 'MFA is already enabled. Disable it first to re-enroll.',
      });
    }

    const secret = generateTotpSecret();
    staff.mfa_secret_pending_enc = encryptSecret(secret);
    await staff.save();

    const otpauthUrl = buildOtpAuthUri({ secret, email: staff.email });
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    return res.json({
      otpauthUrl,
      qrDataUrl,
      manualEntryKey: secret,
    });
  } catch (error) {
    console.error('MFA setup error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not start MFA setup.',
    });
  }
};

// POST /api/auth/mfa/confirm-setup
const confirmMfaSetup = async (req, res) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { code } = req.body || {};
    const staff = await loadAdminStaff(req.user._id);
    if (!staff?.mfa_secret_pending_enc) {
      return res.status(400).json({
        success: false,
        message: 'Start MFA setup before confirming.',
      });
    }

    const secret = decryptSecret(staff.mfa_secret_pending_enc);
    if (!verifyTotp(secret, code)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid verification code. Check Google Authenticator and try again.',
      });
    }

    const plainBackupCodes = generateBackupCodes();
    staff.mfa_secret_enc = staff.mfa_secret_pending_enc;
    staff.mfa_secret_pending_enc = undefined;
    staff.mfa_enabled = true;
    staff.mfa_backup_codes = await hashBackupCodes(plainBackupCodes);
    await staff.save();

    clearAuthCookie(res);

    await recordAdminAudit(req, {
      action: 'MFA_ENABLED',
      resourceType: 'staff',
      resourceId: staff._id,
    });

    return res.json({
      success: true,
      backupCodes: plainBackupCodes,
      message: 'MFA enabled. Save your backup codes — they will not be shown again.',
    });
  } catch (error) {
    console.error('MFA confirm setup error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not enable MFA.',
    });
  }
};

// POST /api/auth/mfa/disable
const disableMfa = async (req, res) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { password, code, backupCode } = req.body || {};
    const staff = await loadAdminStaff(req.user._id, '+password');
    if (!staff?.mfa_enabled) {
      return res.status(400).json({ success: false, message: 'MFA is not enabled.' });
    }

    const passwordOk = await staff.comparePassword(password);
    if (!passwordOk) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    let verified = false;
    if (code && staff.mfa_secret_enc) {
      const secret = decryptSecret(staff.mfa_secret_enc);
      verified = verifyTotp(secret, code);
    } else if (backupCode) {
      const result = await verifyBackupCode(staff.mfa_backup_codes || [], backupCode);
      verified = result.ok;
    }

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: 'Invalid verification code.',
      });
    }

    staff.mfa_enabled = false;
    staff.mfa_secret_enc = undefined;
    staff.mfa_secret_pending_enc = undefined;
    staff.mfa_backup_codes = [];
    await staff.save();

    await recordAdminAudit(req, {
      action: 'MFA_DISABLED',
      resourceType: 'staff',
      resourceId: staff._id,
    });

    return res.json({
      success: true,
      message: 'MFA has been disabled.',
    });
  } catch (error) {
    console.error('MFA disable error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not disable MFA.',
    });
  }
};

function createMfaPendingToken(staffId) {
  return jwt.sign(
    { id: staffId, purpose: 'mfa_pending' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' },
  );
}

module.exports = {
  verifyMfaLogin,
  getMfaStatus,
  setupMfa,
  confirmMfaSetup,
  disableMfa,
  createMfaPendingToken,
};
