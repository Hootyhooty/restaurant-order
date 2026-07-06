const KitchenOrder = require('../models/KitchenOrder');

async function nextTicketNumber(serviceDate) {
  const latest = await KitchenOrder.findOne({ serviceDate, source: { $ne: 'booking_preorder' } })
    .sort({ ticketNumber: -1 })
    .select('ticketNumber')
    .lean();
  return (latest?.ticketNumber || 0) + 1;
}

module.exports = { nextTicketNumber };
