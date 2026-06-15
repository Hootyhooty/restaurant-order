/**
 * Email diagnostics — sends one real test email using the CURRENT backend/.env config.
 *
 * Usage (from backend/):
 *   node scripts/emailTest.js you@example.com
 *   npm run email:test -- you@example.com
 *
 * It prints the active EMAIL_MODE, From address, verifies the active transport (Resend
 * HTTP API in production, Mailtrap SMTP in sandbox), then attempts a send and prints the
 * exact provider error if it fails. Use this to diagnose email delivery problems.
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
    console.log('TRANSPORT       :', 'Resend HTTP API (https://api.resend.com/emails)');
    console.log(
      'RESEND_API_KEY  :',
      process.env.RESEND_API_KEY || process.env.SMTP_PASS ? '(set)' : '(unset)',
    );
  }
  console.log('To              :', to || '(missing)');
  console.log('-------------------------');

  if (!to) {
    console.error('ERROR: provide a recipient, e.g. node scripts/emailTest.js you@example.com');
    process.exit(1);
  }

  try {
    await verifyTransport();
    console.log('✓ Transport config OK');
  } catch (err) {
    console.error('✗ Transport verify FAILED:', describeEmailError(err));
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
