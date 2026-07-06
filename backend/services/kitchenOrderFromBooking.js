const KitchenOrder = require('../models/KitchenOrder');
const { expandOrderLines } = require('../utils/expandOrderLines');

async function nextTicketNumber(serviceDate) {
  const latest = await KitchenOrder.findOne({ serviceDate })
    .sort({ ticketNumber: -1 })
    .select('ticketNumber')
    .lean();
  return (latest?.ticketNumber || 0) + 1;
}

/**
 * Create a kitchen ticket from booking pre-order items (idempotent per bookingId).
 */
async function createKitchenOrderFromBooking(booking, customerName) {
  const preOrderItems = booking.preOrderItems || [];
  if (!preOrderItems.length) return null;

  const bookingId = booking._id?.toString?.() || String(booking._id);
  const existing = await KitchenOrder.findOne({ bookingId }).lean();
  if (existing) return existing;

  const lines = expandOrderLines(preOrderItems);
  if (!lines.length) return null;

  const serviceDate = booking.date;
  const ticketNumber = await nextTicketNumber(serviceDate);

  return KitchenOrder.create({
    ticketNumber,
    serviceDate,
    source: 'booking_preorder',
    bookingId,
    tableId: booking.tableId,
    customerName,
    lines,
    status: 'pending',
  });
}

module.exports = { createKitchenOrderFromBooking };
