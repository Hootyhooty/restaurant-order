/**
 * Pure booking domain rules — unit-tested without DB/HTTP.
 */

const TIME_SLOTS = new Set([
  '09:00-11:00',
  '11:00-13:00',
  '13:00-15:00',
  '15:00-17:00',
  '17:00-19:00',
  '19:00-21:00',
]);

const TABLES = [
  { tableId: 1, capacity: 8 },
  { tableId: 2, capacity: 4 },
  { tableId: 3, capacity: 4 },
  { tableId: 4, capacity: 4 },
  { tableId: 5, capacity: 4 },
  { tableId: 6, capacity: 4 },
  { tableId: 7, capacity: 4 },
  { tableId: 8, capacity: 4 },
  { tableId: 9, capacity: 4 },
  { tableId: 10, capacity: 6 },
  { tableId: 11, capacity: 6 },
  { tableId: 12, capacity: 6 },
];

/** Statuses that block the table from being booked again */
const BOOKING_BLOCKING_STATUSES = ['confirmed', 'checked_in', 'no_show'];

const RESERVATION_FEE = 100;

const guestAllowedForTable = (guestCount, tableId) => {
  if (![2, 4, 6, 8].includes(guestCount)) return false;
  if (tableId === 1) return guestCount === 8;
  if (tableId >= 10 && tableId <= 12) return guestCount === 6;
  return guestCount === 2 || guestCount === 4;
};

const reservationCostForGuests = (guestCount) => {
  if (guestCount === 2 || guestCount === 4) return 500;
  if (guestCount === 6) return 1000;
  if (guestCount === 8) return 1500;
  return 0;
};

const parseDateTimeFromSlot = (dateStr, slotStr) => {
  const [start] = String(slotStr || '').split('-');
  const [hh, mm] = String(start || '').split(':').map((x) => Number(x));
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d;
};

/** Latest instant at which user may cancel (inclusive): reservation start minus 3 hours */
const getUserCancellationCutoff = (dateStr, slotStr) => {
  const startAt = parseDateTimeFromSlot(dateStr, slotStr);
  return new Date(startAt.getTime() - 3 * 60 * 60 * 1000);
};

/** Matches cancel handler: allowed only if status is confirmed and now <= cutoff */
const canUserCancelBookingAt = ({ nowMs, status, dateStr, slotStr }) => {
  if (status !== 'confirmed') return false;
  const cutoff = getUserCancellationCutoff(dateStr, slotStr);
  return nowMs <= cutoff.getTime();
};

/** Admin actions only allowed from confirmed (matches bookingAdminController guards) */
const adminBookingActionAllowed = (currentStatus, action) => {
  const normalized = String(action || '').toLowerCase().replace('_', '-');
  const allowedActions = new Set(['check-in', 'no-show', 'cancel']);
  if (!allowedActions.has(normalized)) {
    return { ok: false, reason: 'invalid_action' };
  }
  if (currentStatus !== 'confirmed') {
    return { ok: false, reason: 'invalid_status' };
  }
  return { ok: true };
};

module.exports = {
  TIME_SLOTS,
  TABLES,
  BOOKING_BLOCKING_STATUSES,
  RESERVATION_FEE,
  guestAllowedForTable,
  reservationCostForGuests,
  parseDateTimeFromSlot,
  getUserCancellationCutoff,
  canUserCancelBookingAt,
  adminBookingActionAllowed,
};
