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

module.exports = {
  validateRegisterBody,
  validateLoginBody,
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
  validatePaginationQuery,
  isUuid,
};
