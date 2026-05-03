const test = require('node:test');
const assert = require('node:assert/strict');
const {
  guestAllowedForTable,
  reservationCostForGuests,
  RESERVATION_FEE,
  parseDateTimeFromSlot,
  getUserCancellationCutoff,
  canUserCancelBookingAt,
  adminBookingActionAllowed,
  BOOKING_BLOCKING_STATUSES,
  TIME_SLOTS,
} = require('../utils/bookingRules');

test('guestAllowedForTable: table 1 only for 8 guests', () => {
  assert.equal(guestAllowedForTable(8, 1), true);
  assert.equal(guestAllowedForTable(6, 1), false);
  assert.equal(guestAllowedForTable(4, 1), false);
});

test('guestAllowedForTable: tables 10–12 only for 6 guests', () => {
  for (const id of [10, 11, 12]) {
    assert.equal(guestAllowedForTable(6, id), true);
    assert.equal(guestAllowedForTable(8, id), false);
    assert.equal(guestAllowedForTable(4, id), false);
  }
});

test('guestAllowedForTable: tables 2–9 for 2 or 4 guests only', () => {
  for (const id of [2, 3, 4, 5, 6, 7, 8, 9]) {
    assert.equal(guestAllowedForTable(2, id), true);
    assert.equal(guestAllowedForTable(4, id), true);
    assert.equal(guestAllowedForTable(6, id), false);
    assert.equal(guestAllowedForTable(8, id), false);
  }
});

test('guestAllowedForTable: invalid guest count', () => {
  assert.equal(guestAllowedForTable(3, 5), false);
  assert.equal(guestAllowedForTable(0, 5), false);
});

test('reservationCostForGuests', () => {
  assert.equal(reservationCostForGuests(2), 500);
  assert.equal(reservationCostForGuests(4), 500);
  assert.equal(reservationCostForGuests(6), 1000);
  assert.equal(reservationCostForGuests(8), 1500);
  assert.equal(reservationCostForGuests(1), 0);
});

test('RESERVATION_FEE constant', () => {
  assert.equal(RESERVATION_FEE, 100);
});

test('getUserCancellationCutoff is 3 hours before slot start', () => {
  const date = '2026-06-15';
  const slot = '17:00-19:00';
  const start = parseDateTimeFromSlot(date, slot);
  const cutoff = getUserCancellationCutoff(date, slot);
  assert.equal(cutoff.getTime(), start.getTime() - 3 * 60 * 60 * 1000);
});

test('canUserCancelBookingAt: allowed before cutoff', () => {
  const date = '2026-06-15';
  const slot = '17:00-19:00';
  const cutoff = getUserCancellationCutoff(date, slot);
  assert.equal(
    canUserCancelBookingAt({
      nowMs: cutoff.getTime() - 1,
      status: 'confirmed',
      dateStr: date,
      slotStr: slot,
    }),
    true
  );
  assert.equal(
    canUserCancelBookingAt({
      nowMs: cutoff.getTime(),
      status: 'confirmed',
      dateStr: date,
      slotStr: slot,
    }),
    true
  );
});

test('canUserCancelBookingAt: blocked after cutoff', () => {
  const date = '2026-06-15';
  const slot = '17:00-19:00';
  const cutoff = getUserCancellationCutoff(date, slot);
  assert.equal(
    canUserCancelBookingAt({
      nowMs: cutoff.getTime() + 1,
      status: 'confirmed',
      dateStr: date,
      slotStr: slot,
    }),
    false
  );
});

test('canUserCancelBookingAt: non-confirmed cannot cancel', () => {
  assert.equal(
    canUserCancelBookingAt({
      nowMs: 0,
      status: 'checked_in',
      dateStr: '2026-06-15',
      slotStr: '17:00-19:00',
    }),
    false
  );
});

test('adminBookingActionAllowed: only confirmed', () => {
  assert.deepEqual(adminBookingActionAllowed('confirmed', 'check-in'), { ok: true });
  assert.deepEqual(adminBookingActionAllowed('confirmed', 'no-show'), { ok: true });
  assert.deepEqual(adminBookingActionAllowed('confirmed', 'cancel'), { ok: true });
  assert.equal(adminBookingActionAllowed('checked_in', 'check-in').ok, false);
  assert.equal(adminBookingActionAllowed('confirmed', 'bogus').ok, false);
});

test('BOOKING_BLOCKING_STATUSES includes expected values', () => {
  assert.ok(BOOKING_BLOCKING_STATUSES.includes('confirmed'));
  assert.ok(BOOKING_BLOCKING_STATUSES.includes('checked_in'));
  assert.ok(BOOKING_BLOCKING_STATUSES.includes('no_show'));
});

test('TIME_SLOTS has six slots', () => {
  assert.equal(TIME_SLOTS.size, 6);
});
