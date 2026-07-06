const KitchenOrder = require('../models/KitchenOrder');
const { expandOrderLines } = require('../utils/expandOrderLines');
const { nextReservedTicketNumber } = require('./reservedTicketNumber');
const { emitKitchenEvent } = require('../utils/kitchenEventHub');

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
  const reservedTicketNumber = await nextReservedTicketNumber(serviceDate);

  const order = await KitchenOrder.create({
    reservedTicketNumber,
    visitTimeSlot: booking.timeSlot,
    serviceDate,
    source: 'booking_preorder',
    bookingId,
    tableId: booking.tableId,
    customerName,
    lines,
    status: 'pending',
  });

  emitKitchenEvent('orders_updated', { orderId: order._id.toString(), date: serviceDate });
  emitKitchenEvent('reservations_updated', { date: serviceDate });

  return order;
}

module.exports = { createKitchenOrderFromBooking };
