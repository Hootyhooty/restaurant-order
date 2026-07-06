const KitchenOrder = require('../models/KitchenOrder');
const Customer = require('../models/Customer');
const { expandOrderLines } = require('../utils/expandOrderLines');
const { getBangkokDateString } = require('../utils/bangkokDate');
const { nextTicketNumber } = require('./kitchenTicketNumber');

async function resolveCustomerName(tx) {
  if (tx.customerEmail) {
    return String(tx.customerEmail).split('@')[0] || 'Online customer';
  }
  if (tx.userId) {
    const user = await Customer.findById(tx.userId)
      .select('username first_name last_name email')
      .lean();
    if (user) {
      const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
      return full || user.username || user.email || 'Online customer';
    }
  }
  return 'Online customer';
}

/**
 * Create a kitchen ticket from a paid online transaction (idempotent per transactionId).
 */
async function createKitchenOrderFromTransaction(tx) {
  if (!tx || tx.status !== 'paid') return null;

  const items = tx.items || [];
  if (!items.length) return null;

  const transactionId = tx._id?.toString?.() || String(tx._id);
  const existing = await KitchenOrder.findOne({ transactionId }).lean();
  if (existing) return existing;

  const lines = expandOrderLines(items);
  if (!lines.length) return null;

  const serviceDate = getBangkokDateString();
  const ticketNumber = await nextTicketNumber(serviceDate);
  const customerName = await resolveCustomerName(tx);

  return KitchenOrder.create({
    ticketNumber,
    serviceDate,
    source: 'online',
    transactionId,
    customerName,
    lines,
    status: 'pending',
  });
}

module.exports = { createKitchenOrderFromTransaction };
