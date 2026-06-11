const nodemailer = require('nodemailer');
const { warn, info } = require('./logger');

/**
 * Email transport modes:
 * - sandbox (default): Mailtrap Email Testing — messages stay in your Mailtrap inbox.
 * - production: real delivery to the user's mailbox (code below; uncomment when your sending domain is verified).
 *
 * Set EMAIL_MODE=production and uncomment the production transporter when ready.
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

/*
 * --- Production (real user delivery) ---
 * Uncomment this block and switch getTransporter() when your sending domain is verified
 * (Mailtrap Email Sending, SendGrid, etc.).
 *
 * function createProductionTransporter() {
 *   const host = process.env.MAILTRAP_SENDING_HOST || 'live.smtp.mailtrap.io';
 *   const port = Number(process.env.MAILTRAP_SENDING_PORT || 587);
 *   const user = process.env.MAILTRAP_SENDING_USER;
 *   const pass = process.env.MAILTRAP_SENDING_PASS;
 *
 *   if (!user || !pass) {
 *     throw new Error(
 *       'Production SMTP credentials missing. Set MAILTRAP_SENDING_USER and MAILTRAP_SENDING_PASS.',
 *     );
 *   }
 *
 *   return nodemailer.createTransport({
 *     host,
 *     port,
 *     secure: port === 465,
 *     auth: { user, pass },
 *   });
 * }
 *
 * Alternative: HTTP API (e.g. Resend) instead of SMTP:
 *
 * const { Resend } = require('resend');
 * const resend = new Resend(process.env.RESEND_API_KEY);
 *
 * async function sendViaResend({ to, subject, html }) {
 *   await resend.emails.send({
 *     from: process.env.EMAIL_FROM,
 *     to,
 *     subject,
 *     html,
 *   });
 * }
 */

function getTransporter() {
  const mode = (process.env.EMAIL_MODE || 'sandbox').toLowerCase();

  if (mode === 'production') {
    // return createProductionTransporter();
    throw new Error(
      'EMAIL_MODE=production is set but the production transporter is still commented out in emailService.js. ' +
        'Uncomment createProductionTransporter() or switch EMAIL_MODE back to sandbox.',
    );
  }

  return createSandboxTransporter();
}

function getFromAddress() {
  return process.env.EMAIL_FROM || 'Picha <noreply@picha.co.th>';
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
    warn('verification_email_failed', { to: payload.to, error: err.message });
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
    warn('password_reset_email_failed', { to: payload.to, error: err.message });
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
  getLastSentVerificationForTest,
  clearLastSentVerificationForTest,
  getLastSentPasswordResetForTest,
  clearLastSentPasswordResetForTest,
};
