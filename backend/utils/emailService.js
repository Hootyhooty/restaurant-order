const nodemailer = require('nodemailer');
const { warn, info } = require('./logger');

/**
 * Email transport modes:
 * - sandbox (default): Mailtrap Email Testing over SMTP — messages stay in your Mailtrap
 *   inbox (never reach real users). Used for local development and tests.
 * - production: real delivery via the Resend HTTP API (https://api.resend.com/emails).
 *
 * Why the HTTP API instead of SMTP in production? Hosting platforms such as Render block
 * outbound SMTP ports (25/465/587), so SMTP connections time out (ETIMEDOUT on CONN).
 * The HTTP API goes over port 443, which is never blocked.
 *
 * To go live with Resend:
 *   1. Add picha-restaurant.com in the Resend dashboard and add the SPF/DKIM DNS records it gives you.
 *   2. Create a Resend API key (starts with re_...).
 *   3. Set EMAIL_MODE=production and RESEND_API_KEY=<your Resend API key>.
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

function isProduction() {
  return (process.env.EMAIL_MODE || 'sandbox').toLowerCase() === 'production';
}

function getResendApiKey() {
  // RESEND_API_KEY is preferred; fall back to SMTP_PASS for backward compatibility with the
  // previous SMTP-based config (the value is the same re_... key).
  return process.env.RESEND_API_KEY || process.env.SMTP_PASS;
}

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
    // Fail fast instead of hanging if the SMTP port is unreachable.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

// Sends one email via the Resend HTTP API (port 443; works where outbound SMTP is blocked).
async function sendViaResendApi({ to, subject, html, text }) {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    throw new Error(
      'Resend API key missing. Set RESEND_API_KEY (your re_... key) in the backend environment.',
    );
  }

  let response;
  try {
    response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: getFromAddress(), to, subject, html, text }),
    });
  } catch (err) {
    // Network-level failure (DNS, TLS, connectivity).
    err.command = 'API';
    throw err;
  }

  const bodyText = await response.text();
  if (!response.ok) {
    const err = new Error(`Resend API responded ${response.status}: ${bodyText}`);
    err.responseCode = response.status;
    err.response = bodyText;
    err.command = 'API';
    throw err;
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    return { ok: true };
  }
}

// Delivers one message through the active transport: Resend HTTP API in production,
// Mailtrap SMTP in sandbox.
async function deliver(message) {
  if (isProduction()) {
    return sendViaResendApi(message);
  }
  const transporter = createSandboxTransporter();
  await transporter.sendMail({ from: getFromAddress(), ...message });
  return { sent: true };
}

// Verifies the active transport is configured/reachable without sending a real message.
// In production this checks the Resend API key is present; in sandbox it opens the SMTP
// connection so auth/host errors surface clearly.
async function verifyTransport() {
  const mode = (process.env.EMAIL_MODE || 'sandbox').toLowerCase();
  if (isProduction()) {
    if (!getResendApiKey()) {
      throw new Error(
        'Resend API key missing. Set RESEND_API_KEY (your re_... key) in the backend environment.',
      );
    }
    return { ok: true, mode };
  }
  const transporter = createSandboxTransporter();
  await transporter.verify();
  return { ok: true, mode };
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
  const text = `Hi ${username || 'there'},\n\nVerify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`;

  await deliver({ to, subject, html, text });

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
  const text = `Hi ${username || 'there'},\n\nReset your password: ${resetUrl}\n\nThis link expires in 1 hour.`;

  await deliver({ to, subject, html, text });

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
