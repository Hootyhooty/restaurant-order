// Order ID generator: ORD-yyyy-nnnnn format
// Example: ORD-2025-00001, ORD-2025-00002, etc.

/**
 * Generate next order ID in format ORD-yyyy-nnnnn
 * @returns {Promise<string>} Order ID like "ORD-2025-00001"
 */
async function generateOrderId() {
  // Lazy load Transaction to avoid circular dependency
  const Transaction = require('../models/Transaction');
  
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Find the highest sequence number for this year
  const lastOrder = await Transaction.findOne({
    orderId: new RegExp(`^${escapedPrefix}`),
  })
    .sort({ orderId: -1 })
    .select('orderId')
    .lean();

  let nextSeq = 1;
  if (lastOrder?.orderId) {
    const match = lastOrder.orderId.match(/^ORD-\d{4}-(\d+)$/);
    if (match) {
      nextSeq = parseInt(match[1], 10) + 1;
    }
  }

  // Format with leading zeros (5 digits)
  const seqStr = String(nextSeq).padStart(5, '0');
  return `${prefix}${seqStr}`;
}

module.exports = {
  generateOrderId,
};
