const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { generateSecret, generateURI, verifySync } = require('otplib');

const MFA_ISSUER = 'Picha Restaurant';
const BACKUP_CODE_COUNT = 10;

function generateTotpSecret() {
  return generateSecret();
}

function buildOtpAuthUri({ secret, email }) {
  return generateURI({
    issuer: MFA_ISSUER,
    label: email,
    secret,
  });
}

function verifyTotp(secret, token) {
  const code = String(token || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return false;
  const result = verifySync({ secret, token: code, epochTolerance: 1 });
  return result === true || Boolean(result?.valid);
}

function generateBackupCodes(count = BACKUP_CODE_COUNT) {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(5).toString('hex').toUpperCase(),
  );
}

async function hashBackupCodes(codes) {
  return Promise.all(codes.map((code) => bcrypt.hash(code, 10)));
}

async function verifyBackupCode(codes, candidate) {
  const normalized = String(candidate || '').trim().toUpperCase();
  if (!normalized) return { ok: false, index: -1 };

  for (let i = 0; i < codes.length; i += 1) {
    const stored = codes[i];
    if (!stored) continue;
    const match = await bcrypt.compare(normalized, stored);
    if (match) return { ok: true, index: i };
  }
  return { ok: false, index: -1 };
}

module.exports = {
  MFA_ISSUER,
  BACKUP_CODE_COUNT,
  generateTotpSecret,
  buildOtpAuthUri,
  verifyTotp,
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
};
