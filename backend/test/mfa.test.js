const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  generateTotpSecret,
  buildOtpAuthUri,
  verifyTotp,
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
} = require('../utils/mfa');

describe('MFA helpers', () => {
  test('generates otpauth URI for Google Authenticator', () => {
    const secret = generateTotpSecret();
    const uri = buildOtpAuthUri({ secret, email: 'admin@picha.test' });
    assert.match(uri, /^otpauth:\/\/totp\//);
    assert.match(uri, /Picha/);
  });

  test('verifyTotp accepts a valid code from the same secret', () => {
    const { generateSync } = require('otplib');
    const secret = generateTotpSecret();
    const code = generateSync({ secret });
    assert.equal(verifyTotp(secret, code), true);
    assert.equal(verifyTotp(secret, '000000'), false);
  });

  test('backup codes hash and verify once', async () => {
    const codes = generateBackupCodes(2);
    const hashed = await hashBackupCodes(codes);
    const first = await verifyBackupCode(hashed, codes[0]);
    assert.equal(first.ok, true);
    const wrong = await verifyBackupCode(hashed, 'NOTACODE');
    assert.equal(wrong.ok, false);
  });
});
