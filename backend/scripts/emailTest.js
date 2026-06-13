/**
 * Email diagnostics — sends one real test email using the CURRENT backend/.env config.
 *
 * Usage (from backend/):
 *   node scripts/emailTest.js you@example.com
 *   npm run email:test -- you@example.com
 *
 * It prints the active EMAIL_MODE, From address, verifies the SMTP connection/auth,
 * then attempts a send and prints the exact provider error if it fails. Use this to
 * diagnose why Resend (or any provider) is not delivering verification emails.
 */
require('dotenv').config();

const {
  sendVerificationEmail,
  verifyTransport,
  getFromAddress,
  describeEmailError,
} = require('../utils/emailService');

(async () => {
  const to = process.argv[2] || process.env.EMAIL_TEST_TO;
  const mode = (process.env.EMAIL_MODE || 'sandbox').toLowerCase();

  console.log('--- Email diagnostics ---');
  console.log('EMAIL_MODE      :', mode);
  console.log('EMAIL_FROM      :', getFromAddress());
  console.log('EMAIL_SKIP_SEND :', process.env.EMAIL_SKIP_SEND || '(unset)');
  if (mode === 'production') {
    console.log('SMTP_HOST       :', process.env.SMTP_HOST || '(unset)');
    console.log('SMTP_PORT       :', process.env.SMTP_PORT || '(unset)');
    console.log('SMTP_USER       :', process.env.SMTP_USER || '(unset)');
    console.log('SMTP_PASS       :', process.env.SMTP_PASS ? '(set)' : '(unset)');
  }
  console.log('To              :', to || '(missing)');
  console.log('-------------------------');

  if (!to) {
    console.error('ERROR: provide a recipient, e.g. node scripts/emailTest.js you@example.com');
    process.exit(1);
  }

  try {
    await verifyTransport();
    console.log('✓ SMTP connection + auth OK');
  } catch (err) {
    console.error('✗ SMTP verify FAILED:', describeEmailError(err));
    process.exit(1);
  }

  try {
    const result = await sendVerificationEmail({
      to,
      username: 'Diagnostics',
      verifyUrl: 'https://picha-restaurant.com/verify-email?token=DIAGNOSTIC_TEST',
    });
    console.log('✓ Send result:', result);
    if (result?.skipped) {
      console.log('NOTE: EMAIL_SKIP_SEND=true — no real email was sent. Unset it to test delivery.');
    } else {
      console.log('Check the recipient inbox (and spam). For Resend, confirm "Delivered" in the dashboard.');
    }
    process.exit(0);
  } catch (err) {
    console.error('✗ Send FAILED:', describeEmailError(err));
    process.exit(1);
  }
})();
