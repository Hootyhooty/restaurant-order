const test = require('node:test');
const assert = require('node:assert/strict');
const { expandOrderLines } = require('../utils/expandOrderLines');

test('expandOrderLines: qty 3 produces 3 separate lines', () => {
  const items = [
    {
      mealId: 1,
      name: 'Pad Thai',
      unitPrice: 120,
      quantity: 3,
    },
  ];

  const lines = expandOrderLines(items);
  assert.equal(lines.length, 3);
  for (const line of lines) {
    assert.equal(line.mealId, 1);
    assert.equal(line.name, 'Pad Thai');
    assert.equal(line.unitPrice, 120);
    assert.equal(line.quantity, 1);
    assert.equal(line.lineStatus, 'pending');
  }
});

test('expandOrderLines: empty input returns empty array', () => {
  assert.deepEqual(expandOrderLines([]), []);
  assert.deepEqual(expandOrderLines(null), []);
});

test('expandOrderLines: multiple items expand independently', () => {
  const lines = expandOrderLines([
    { mealId: 1, name: 'A', unitPrice: 10, quantity: 2 },
    { mealId: 2, name: 'B', unitPrice: 20, quantity: 1 },
  ]);
  assert.equal(lines.length, 3);
  assert.equal(lines.filter((l) => l.mealId === 1).length, 2);
  assert.equal(lines.filter((l) => l.mealId === 2).length, 1);
});
