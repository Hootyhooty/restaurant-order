const test = require('node:test');
const assert = require('node:assert/strict');
const { deriveTicketStatus, normalizeLines } = require('../utils/kitchenOrderStatus');

test('deriveTicketStatus: all pending → pending', () => {
  const status = deriveTicketStatus([
    { lineStatus: 'pending' },
    { lineStatus: 'pending' },
  ]);
  assert.equal(status, 'pending');
});

test('deriveTicketStatus: any preparing → preparing', () => {
  const status = deriveTicketStatus([
    { lineStatus: 'served' },
    { lineStatus: 'preparing' },
  ]);
  assert.equal(status, 'preparing');
});

test('deriveTicketStatus: ready without preparing → ready', () => {
  const status = deriveTicketStatus([
    { lineStatus: 'served' },
    { lineStatus: 'ready' },
  ]);
  assert.equal(status, 'ready');
});

test('deriveTicketStatus: all served or cancelled → served', () => {
  const status = deriveTicketStatus([
    { lineStatus: 'served' },
    { lineStatus: 'cancelled' },
  ]);
  assert.equal(status, 'served');
});

test('deriveTicketStatus: all cancelled → cancelled', () => {
  const status = deriveTicketStatus([
    { lineStatus: 'cancelled' },
    { lineStatus: 'cancelled' },
  ]);
  assert.equal(status, 'cancelled');
});

test('normalizeLines: defaults missing lineStatus to pending', () => {
  const lines = normalizeLines([{ mealId: 1, name: 'Soup' }]);
  assert.equal(lines[0].lineStatus, 'pending');
});
