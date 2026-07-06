/**
 * Expand order items so each unit is its own line (no quantity stacking).
 */
function expandOrderLines(items) {
  const lines = [];
  for (const item of items || []) {
    const qty = Math.max(1, Number(item.quantity) || 1);
    for (let i = 0; i < qty; i += 1) {
      lines.push({
        mealId: item.mealId,
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: 1,
      });
    }
  }
  return lines;
}

module.exports = { expandOrderLines };
