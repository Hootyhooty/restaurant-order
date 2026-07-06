const KitchenOrder = require('../models/KitchenOrder');

async function nextReservedTicketNumber(serviceDate) {
  const latest = await KitchenOrder.findOne({ serviceDate, source: 'booking_preorder' })
    .sort({ reservedTicketNumber: -1 })
    .select('reservedTicketNumber')
    .lean();
  return (latest?.reservedTicketNumber || 0) + 1;
}

module.exports = { nextReservedTicketNumber };
