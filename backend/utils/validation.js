function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

function markValidationError(req, message) {
  req.validationError = message;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isISODate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return UUID_RE.test(String(value || '').trim());
}

const BOOKING_TIME_SLOTS = new Set([
  '11:00-13:00',
  '13:00-15:00',
  '15:00-17:00',
  '17:00-19:00',
  '19:00-21:00',
  '21:00-23:00',
]);

function validatePreOrderItems(items) {
  if (items == null) return { ok: true, items: [] };
  if (!Array.isArray(items)) {
    return { ok: false, message: 'preOrderItems must be an array.' };
  }
  if (items.length > 30) {
    return { ok: false, message: 'preOrderItems cannot exceed 30 items.' };
  }
  for (const raw of items) {
    const mealId = Number(raw?.id ?? raw?.mealId);
    const quantity = Number(raw?.quantity);
    if (!Number.isFinite(mealId) || mealId < 1) {
      return { ok: false, message: 'Invalid pre-order meal id.' };
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return { ok: false, message: 'Pre-order quantity must be between 1 and 99.' };
    }
  }
  return { ok: true };
}

function validateRegisterBody(req, res, next) {
  const { username, email, password } = req.body || {};
  if (!isNonEmptyString(username) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
    markValidationError(req, 'Username, email, and password are required');
    return badRequest(res, 'Username, email, and password are required');
  }
  if (!String(email).includes('@')) {
    markValidationError(req, 'Invalid email');
    return badRequest(res, 'Invalid email');
  }
  if (String(password).length < 8) {
    markValidationError(req, 'Password must be at least 8 characters');
    return badRequest(res, 'Password must be at least 8 characters');
  }
  next();
}

function validateLoginBody(req, res, next) {
  const { username, password } = req.body || {};
  if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
    markValidationError(req, 'Username/email and password are required');
    return badRequest(res, 'Username/email and password are required');
  }
  next();
}

function validateVerifyEmailBody(req, res, next) {
  const token = req.body?.token;
  if (!isNonEmptyString(token)) {
    markValidationError(req, 'Verification token is required');
    return badRequest(res, 'Verification token is required');
  }
  next();
}

function validateResendVerificationBody(req, res, next) {
  const email = req.body?.email;
  if (!isNonEmptyString(email) || !String(email).includes('@')) {
    markValidationError(req, 'Valid email is required');
    return badRequest(res, 'Valid email is required');
  }
  next();
}

function validateForgotPasswordBody(req, res, next) {
  const email = req.body?.email;
  if (!isNonEmptyString(email) || !String(email).includes('@')) {
    markValidationError(req, 'Valid email is required');
    return badRequest(res, 'Valid email is required');
  }
  next();
}

function validateResetPasswordBody(req, res, next) {
  const token = req.body?.token;
  const password = req.body?.password;
  if (!isNonEmptyString(token)) {
    markValidationError(req, 'Reset token is required');
    return badRequest(res, 'Reset token is required');
  }
  if (!isNonEmptyString(password) || String(password).length < 8) {
    markValidationError(req, 'Password must be at least 8 characters');
    return badRequest(res, 'Password must be at least 8 characters');
  }
  next();
}

function validateReviewListQuery(req, res, next) {
  const mealId = Number(req.query?.mealId);
  if (!Number.isFinite(mealId)) {
    markValidationError(req, 'mealId is required');
    return badRequest(res, 'mealId is required');
  }
  const limitRaw = req.query?.limit;
  if (limitRaw != null && limitRaw !== '') {
    const limit = Number(limitRaw);
    if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
      markValidationError(req, 'limit must be between 1 and 100');
      return badRequest(res, 'limit must be between 1 and 100');
    }
  }
  next();
}

function validateReviewCreateBody(req, res, next) {
  const mealId = Number(req.body?.mealId);
  const review = String(req.body?.review || '').trim();
  const rating = Number(req.body?.rating);
  if (!Number.isFinite(mealId)) {
    markValidationError(req, 'mealId is required');
    return badRequest(res, 'mealId is required');
  }
  if (!review) {
    markValidationError(req, 'review is required');
    return badRequest(res, 'review is required');
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    markValidationError(req, 'rating must be between 1 and 5');
    return badRequest(res, 'rating must be between 1 and 5');
  }
  next();
}

function validateBookingAvailabilityQuery(req, res, next) {
  const { date, timeSlot } = req.query || {};
  const guestCount = Number(req.query?.guestCount);
  if (!isISODate(date)) {
    markValidationError(req, 'Invalid date. Expected YYYY-MM-DD.');
    return badRequest(res, 'Invalid date. Expected YYYY-MM-DD.');
  }
  if (!BOOKING_TIME_SLOTS.has(String(timeSlot || '').trim())) {
    markValidationError(req, 'Invalid time slot.');
    return badRequest(res, 'Invalid time slot.');
  }
  if (![2, 4, 6, 8].includes(guestCount)) {
    markValidationError(req, 'Invalid guest count.');
    return badRequest(res, 'Invalid guest count.');
  }
  next();
}

function validateBookingCheckoutBody(req, res, next) {
  const date = String(req.body?.date || '').trim();
  const timeSlot = String(req.body?.timeSlot || '').trim();
  const guestCount = Number(req.body?.guestCount);
  const tableId = Number(req.body?.tableId);
  if (!isISODate(date)) {
    markValidationError(req, 'Invalid date.');
    return badRequest(res, 'Invalid date.');
  }
  if (!BOOKING_TIME_SLOTS.has(timeSlot)) {
    markValidationError(req, 'Invalid time slot.');
    return badRequest(res, 'Invalid time slot.');
  }
  if (![2, 4, 6, 8].includes(guestCount)) {
    markValidationError(req, 'Invalid guest count.');
    return badRequest(res, 'Invalid guest count.');
  }
  if (!Number.isFinite(tableId) || tableId < 1 || tableId > 12) {
    markValidationError(req, 'Invalid table.');
    return badRequest(res, 'Invalid table.');
  }
  const preOrderCheck = validatePreOrderItems(req.body?.preOrderItems);
  if (!preOrderCheck.ok) {
    markValidationError(req, preOrderCheck.message);
    return badRequest(res, preOrderCheck.message);
  }
  const redeemCode = req.body?.redeemCode;
  if (redeemCode != null && redeemCode !== '' && String(redeemCode).length > 64) {
    markValidationError(req, 'redeemCode is too long.');
    return badRequest(res, 'redeemCode is too long.');
  }
  next();
}

function validateBookingCancelBody(req, res, next) {
  if (typeof req.body?.confirm !== 'boolean' || req.body.confirm !== true) {
    markValidationError(req, 'Missing confirmation.');
    return badRequest(res, 'Missing confirmation.');
  }
  next();
}

function validateMessageCreateBody(req, res, next) {
  const { recipientId, subject, body } = req.body || {};
  if (!isNonEmptyString(recipientId) || !isNonEmptyString(subject) || !isNonEmptyString(body)) {
    markValidationError(req, 'recipientId, subject, and body are required');
    return badRequest(res, 'recipientId, subject, and body are required');
  }
  if (String(subject).trim().length > 180) {
    markValidationError(req, 'subject must be 180 characters or fewer');
    return badRequest(res, 'subject must be 180 characters or fewer');
  }
  next();
}

function validateStripeCheckoutBody(req, res, next) {
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    markValidationError(req, 'Cart items are required.');
    return badRequest(res, 'Cart items are required.');
  }
  if (items.length > 50) {
    markValidationError(req, 'Cart cannot exceed 50 line items.');
    return badRequest(res, 'Cart cannot exceed 50 line items.');
  }
  for (const raw of items) {
    const id = Number(raw?.id);
    const quantity = Number(raw?.quantity);
    if (!Number.isFinite(id) || id < 1) {
      markValidationError(req, 'Invalid meal id in cart.');
      return badRequest(res, 'Invalid meal id in cart.');
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      markValidationError(req, 'Cart quantity must be between 1 and 99.');
      return badRequest(res, 'Cart quantity must be between 1 and 99.');
    }
  }
  next();
}

function validateMongoIdParam(paramName) {
  return (req, res, next) => {
    const value = String(req.params[paramName] || '').trim();
    if (!isUuid(value)) {
      markValidationError(req, `Invalid ${paramName}.`);
      return badRequest(res, `Invalid ${paramName}.`);
    }
    next();
  };
}

function validateAdminBookingsQuery(req, res, next) {
  const q = String(req.query?.q || '').trim();
  if (q.length > 120) {
    markValidationError(req, 'Search query is too long.');
    return badRequest(res, 'Search query is too long.');
  }
  return validatePaginationQuery(req, res, next);
}

function validateAuditLogsQuery(req, res, next) {
  const bookingId = String(req.query?.bookingId || '').trim();
  if (bookingId && !isUuid(bookingId)) {
    markValidationError(req, 'Invalid bookingId filter.');
    return badRequest(res, 'Invalid bookingId filter.');
  }
  const action = String(req.query?.action || '').trim();
  if (action.length > 80) {
    markValidationError(req, 'action filter is too long.');
    return badRequest(res, 'action filter is too long.');
  }
  return validatePaginationQuery(req, res, next);
}

function validatePaginationQuery(req, res, next) {
  const { limit, page } = req.query || {};
  if (limit != null && limit !== '') {
    const limitNum = Number(limit);
    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) {
      markValidationError(req, 'limit must be an integer between 1 and 100');
      return badRequest(res, 'limit must be an integer between 1 and 100');
    }
  }
  if (page != null && page !== '') {
    const pageNum = Number(page);
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      markValidationError(req, 'page must be a positive integer');
      return badRequest(res, 'page must be a positive integer');
    }
  }
  next();
}

function validateStaffBookingsQuery(req, res, next) {
  const date = req.query?.date;
  if (date != null && date !== '' && !isISODate(date)) {
    markValidationError(req, 'Invalid date. Expected YYYY-MM-DD.');
    return badRequest(res, 'Invalid date. Expected YYYY-MM-DD.');
  }
  const status = req.query?.status;
  if (status != null && status !== '' && typeof status !== 'string') {
    markValidationError(req, 'Invalid status.');
    return badRequest(res, 'Invalid status.');
  }
  next();
}

function validateStaffOrdersQuery(req, res, next) {
  const date = req.query?.date;
  if (date != null && date !== '' && !isISODate(date)) {
    markValidationError(req, 'Invalid date. Expected YYYY-MM-DD.');
    return badRequest(res, 'Invalid date. Expected YYYY-MM-DD.');
  }
  const tableId = req.query?.tableId;
  if (tableId != null && tableId !== '') {
    const n = Number(tableId);
    if (!Number.isInteger(n) || n < 1 || n > 12) {
      markValidationError(req, 'tableId must be between 1 and 12.');
      return badRequest(res, 'tableId must be between 1 and 12.');
    }
  }
  next();
}

function validateStaffCreateOrderBody(req, res, next) {
  const tableId = Number(req.body?.tableId);
  if (!Number.isInteger(tableId) || tableId < 1 || tableId > 12) {
    markValidationError(req, 'tableId must be between 1 and 12.');
    return badRequest(res, 'tableId must be between 1 and 12.');
  }
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    markValidationError(req, 'items must be a non-empty array.');
    return badRequest(res, 'items must be a non-empty array.');
  }
  if (items.length > 30) {
    markValidationError(req, 'items cannot exceed 30 entries.');
    return badRequest(res, 'items cannot exceed 30 entries.');
  }
  for (const raw of items) {
    const mealId = Number(raw?.mealId ?? raw?.id);
    const quantity = Number(raw?.quantity);
    if (!Number.isFinite(mealId) || mealId < 1) {
      markValidationError(req, 'Invalid meal id in items.');
      return badRequest(res, 'Invalid meal id in items.');
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      markValidationError(req, 'Item quantity must be between 1 and 99.');
      return badRequest(res, 'Item quantity must be between 1 and 99.');
    }
  }
  next();
}

function validateKitchenOrdersQuery(req, res, next) {
  const date = req.query?.date;
  if (date != null && date !== '' && !isISODate(date)) {
    markValidationError(req, 'Invalid date. Expected YYYY-MM-DD.');
    return badRequest(res, 'Invalid date. Expected YYYY-MM-DD.');
  }
  next();
}

const KITCHEN_LINE_PATCH_STATUSES = new Set(['preparing', 'ready', 'served', 'cancelled']);

function validateKitchenPatchLinesBody(req, res, next) {
  const lineStatus = String(req.body?.lineStatus || '').trim().toLowerCase();
  if (!KITCHEN_LINE_PATCH_STATUSES.has(lineStatus)) {
    markValidationError(req, 'lineStatus must be preparing, ready, served, or cancelled.');
    return badRequest(res, 'lineStatus must be preparing, ready, served, or cancelled.');
  }
  const lineIndexes = req.body?.lineIndexes;
  if (!Array.isArray(lineIndexes) || lineIndexes.length === 0) {
    markValidationError(req, 'lineIndexes must be a non-empty array.');
    return badRequest(res, 'lineIndexes must be a non-empty array.');
  }
  next();
}

function validateContactBody(req, res, next) {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim();
  const phone = String(req.body?.phone || '').trim();
  const message = String(req.body?.message || '').trim();

  if (name.length < 2 || name.length > 100) {
    markValidationError(req, 'Name must be between 2 and 100 characters');
    return badRequest(res, 'Name must be between 2 and 100 characters');
  }
  if (!isNonEmptyString(email) || !email.includes('@')) {
    markValidationError(req, 'Valid email is required');
    return badRequest(res, 'Valid email is required');
  }
  if (phone.length > 30) {
    markValidationError(req, 'Phone number is too long');
    return badRequest(res, 'Phone number is too long');
  }
  if (message.length < 10 || message.length > 2000) {
    markValidationError(req, 'Message must be between 10 and 2000 characters');
    return badRequest(res, 'Message must be between 10 and 2000 characters');
  }

  req.body.name = name;
  req.body.email = email;
  req.body.phone = phone;
  req.body.message = message;
  next();
}

function validateAdminUserRoleBody(req, res, next) {
  const role = String(req.body?.role || '').trim().toUpperCase();
  const allowed = new Set(['USER', 'ADMIN', 'STAFF', 'KITCHEN']);
  if (!allowed.has(role)) {
    markValidationError(req, 'role must be USER, ADMIN, STAFF, or KITCHEN.');
    return badRequest(res, 'role must be USER, ADMIN, STAFF, or KITCHEN.');
  }
  req.body.role = role;
  next();
}

function validateMfaCodeBody(req, res, next) {
  const code = String(req.body?.code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) {
    markValidationError(req, 'A 6-digit verification code is required');
    return badRequest(res, 'A 6-digit verification code is required');
  }
  req.body.code = code;
  next();
}

function validateMfaVerifyLoginBody(req, res, next) {
  const code = req.body?.code != null ? String(req.body.code).replace(/\s/g, '') : '';
  const backupCode = req.body?.backupCode != null
    ? String(req.body.backupCode).trim().toUpperCase()
    : '';
  if (!code && !backupCode) {
    markValidationError(req, 'Enter a 6-digit code or a backup code');
    return badRequest(res, 'Enter a 6-digit code or a backup code');
  }
  if (code && !/^\d{6}$/.test(code)) {
    markValidationError(req, 'Verification code must be 6 digits');
    return badRequest(res, 'Verification code must be 6 digits');
  }
  req.body.code = code || undefined;
  req.body.backupCode = backupCode || undefined;
  next();
}

function validateMfaPasswordBody(req, res, next) {
  const password = req.body?.password;
  if (!isNonEmptyString(password)) {
    markValidationError(req, 'Password is required');
    return badRequest(res, 'Password is required');
  }
  next();
}

function validateMfaDisableBody(req, res, next) {
  const password = req.body?.password;
  if (!isNonEmptyString(password)) {
    markValidationError(req, 'Password is required');
    return badRequest(res, 'Password is required');
  }
  const code = req.body?.code != null ? String(req.body.code).replace(/\s/g, '') : '';
  const backupCode = req.body?.backupCode != null
    ? String(req.body.backupCode).trim().toUpperCase()
    : '';
  if (!code && !backupCode) {
    markValidationError(req, 'Enter your current authenticator or backup code');
    return badRequest(res, 'Enter your current authenticator or backup code');
  }
  if (code && !/^\d{6}$/.test(code)) {
    markValidationError(req, 'Verification code must be 6 digits');
    return badRequest(res, 'Verification code must be 6 digits');
  }
  req.body.code = code || undefined;
  req.body.backupCode = backupCode || undefined;
  next();
}

module.exports = {
  validateRegisterBody,
  validateLoginBody,
  validateVerifyEmailBody,
  validateResendVerificationBody,
  validateForgotPasswordBody,
  validateResetPasswordBody,
  validateContactBody,
  validateReviewListQuery,
  validateReviewCreateBody,
  validateBookingAvailabilityQuery,
  validateBookingCheckoutBody,
  validateBookingCancelBody,
  validateMessageCreateBody,
  validateStripeCheckoutBody,
  validateMongoIdParam,
  validateAdminBookingsQuery,
  validateAuditLogsQuery,
  validateStaffBookingsQuery,
  validateStaffOrdersQuery,
  validateStaffCreateOrderBody,
  validateKitchenOrdersQuery,
  validateKitchenPatchLinesBody,
  validateAdminUserRoleBody,
  validateMfaCodeBody,
  validateMfaVerifyLoginBody,
  validateMfaPasswordBody,
  validateMfaDisableBody,
  validatePaginationQuery,
  isUuid,
};
