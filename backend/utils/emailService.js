const nodemailer = require('nodemailer');
const { warn, info } = require('./logger');

/**
 * Email transport modes:
 * - sandbox (default): Mailtrap Email Testing — messages stay in your Mailtrap inbox (never reach real users).
 * - production: real delivery to the user's mailbox via SMTP (Resend).
 *
 * To go live with Resend:
 *   1. Add picha-restaurant.com in the Resend dashboard and add the SPF/DKIM DNS records it gives you.
 *   2. Create a Resend API key.
 *   3. Set EMAIL_MODE=production and:
 *        SMTP_HOST=smtp.resend.com  SMTP_PORT=587  SMTP_USER=resend  SMTP_PASS=<your Resend API key>
 *
 * The production transporter is generic SMTP, so any provider (Resend, Mailtrap Sending,
 * SendGrid, Brevo, SES, Postmark) works by swapping the SMTP_* values.
 */

function createSandboxTransporter() {
  const host = process.env.MAILTRAP_SANDBOX_HOST || 'sandbox.smtp.mailtrap.io';
  const port = Number(process.env.MAILTRAP_SANDBOX_PORT || 2525);
  const user = process.env.MAILTRAP_SANDBOX_USER;
  const pass = process.env.MAILTRAP_SANDBOX_PASS;

  if (!user || !pass) {
    throw new Error(
      'Mailtrap sandbox credentials missing. Set MAILTRAP_SANDBOX_USER and MAILTRAP_SANDBOX_PASS in backend/.env',
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    auth: { user, pass },
  });
}

function createProductionTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      'Production SMTP credentials missing. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in backend/.env ' +
        '(get these from your verified email provider, e.g. Mailtrap Email Sending, SendGrid, Brevo, or SES).',
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user, pass },
  });
}

function getTransporter() {
  const mode = (process.env.EMAIL_MODE || 'sandbox').toLowerCase();

  if (mode === 'production') {
    return createProductionTransporter();
  }

  return createSandboxTransporter();
}

// Verifies SMTP connectivity + credentials without sending a message.
// Surfaces auth/host errors that would otherwise be hidden behind a generic send failure.
async function verifyTransport() {
  const transporter = getTransporter();
  await transporter.verify();
  return { ok: true, mode: (process.env.EMAIL_MODE || 'sandbox').toLowerCase() };
}

// Pulls the useful diagnostic fields off a nodemailer/SMTP error.
function describeEmailError(err) {
  return {
    error: err?.message,
    code: err?.code,
    command: err?.command,
    responseCode: err?.responseCode,
    response: err?.response,
  };
}

function getFromAddress() {
  return process.env.EMAIL_FROM || 'Picha <noreply@picha-restaurant.com>';
}

function buildVerificationEmailHtml({ username, verifyUrl }) {
  const safeName = String(username || 'there').replace(/[<>]/g, '');
  return `
    <p>Hi ${safeName},</p>
    <p>Thanks for signing up with Picha. Please verify your email address by clicking the link below:</p>
    <p><a href="${verifyUrl}">Verify my email</a></p>
    <p>Or copy this URL into your browser:</p>
    <p>${verifyUrl}</p>
    <p>This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>
  `;
}

let lastSentVerificationForTest = null;
let lastSentPasswordResetForTest = null;

function getLastSentVerificationForTest() {
  return lastSentVerificationForTest;
}

function clearLastSentVerificationForTest() {
  lastSentVerificationForTest = null;
}

function getLastSentPasswordResetForTest() {
  return lastSentPasswordResetForTest;
}

function clearLastSentPasswordResetForTest() {
  lastSentPasswordResetForTest = null;
}

function buildPasswordResetEmailHtml({ username, resetUrl }) {
  const safeName = String(username || 'there').replace(/[<>]/g, '');
  return `
    <p>Hi ${safeName},</p>
    <p>We received a request to reset your Picha account password. Click the link below to choose a new password:</p>
    <p><a href="${resetUrl}">Reset my password</a></p>
    <p>Or copy this URL into your browser:</p>
    <p>${resetUrl}</p>
    <p>This link expires in 1 hour. If you did not request a password reset, you can ignore this email.</p>
  `;
}

async function sendVerificationEmail({ to, username, verifyUrl }) {
  if (process.env.EMAIL_SKIP_SEND === 'true') {
    lastSentVerificationForTest = { to, username, verifyUrl };
    info('email_skip_send', { to, verifyUrl });
    return { skipped: true };
  }

  const subject = 'Verify your Picha account';
  const html = buildVerificationEmailHtml({ username, verifyUrl });

  const transporter = getTransporter();
  await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject,
    html,
    text: `Hi ${username || 'there'},\n\nVerify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
  });

  info('verification_email_sent', { to, mode: process.env.EMAIL_MODE || 'sandbox' });
  return { sent: true };
}

async function sendVerificationEmailSafe(payload) {
  try {
    return await sendVerificationEmail(payload);
  } catch (err) {
    warn('verification_email_failed', { to: payload.to, ...describeEmailError(err) });
    throw err;
  }
}

async function sendPasswordResetEmail({ to, username, resetUrl }) {
  if (process.env.EMAIL_SKIP_SEND === 'true') {
    lastSentPasswordResetForTest = { to, username, resetUrl };
    info('email_skip_send_password_reset', { to, resetUrl });
    return { skipped: true };
  }

  const subject = 'Reset your Picha password';
  const html = buildPasswordResetEmailHtml({ username, resetUrl });

  const transporter = getTransporter();
  await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject,
    html,
    text: `Hi ${username || 'there'},\n\nReset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
  });

  info('password_reset_email_sent', { to, mode: process.env.EMAIL_MODE || 'sandbox' });
  return { sent: true };
}

async function sendPasswordResetEmailSafe(payload) {
  try {
    return await sendPasswordResetEmail(payload);
  } catch (err) {
    warn('password_reset_email_failed', { to: payload.to, ...describeEmailError(err) });
    throw err;
  }
}

module.exports = {
  sendVerificationEmail,
  sendVerificationEmailSafe,
  buildVerificationEmailHtml,
  buildPasswordResetEmailHtml,
  sendPasswordResetEmail,
  sendPasswordResetEmailSafe,
  getFromAddress,
  verifyTransport,
  describeEmailError,
  getLastSentVerificationForTest,
  clearLastSentVerificationForTest,
  getLastSentPasswordResetForTest,
  clearLastSentPasswordResetForTest,
};
