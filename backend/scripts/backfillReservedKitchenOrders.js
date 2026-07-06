/**
 * Backfill reservedTicketNumber and visitTimeSlot on existing booking_preorder kitchen orders.
 * Also drops the legacy global ticketNumber unique index when present.
 *
 * Usage: npm run migrate:kitchen-reserved
 */
require('dotenv').config();
const mongoose = require('mongoose');
const KitchenOrder = require('../models/KitchenOrder');
const Booking = require('../models/Booking');

async function dropLegacyIndex() {
  const collection = mongoose.connection.collection('kitchen_orders');
  const indexes = await collection.indexes();
  const legacy = indexes.find(
    (idx) =>
      idx.unique &&
      idx.key?.serviceDate === 1 &&
      idx.key?.ticketNumber === 1 &&
      !idx.partialFilterExpression
  );
  if (legacy) {
    await collection.dropIndex(legacy.name);
    console.log(`Dropped legacy index: ${legacy.name}`);
  }
}

async function backfillReservedFields() {
  const orders = await KitchenOrder.find({ source: 'booking_preorder' }).lean();
  let updated = 0;

  for (const order of orders) {
    const patch = {};
    if (!order.reservedTicketNumber && order.ticketNumber) {
      patch.reservedTicketNumber = order.ticketNumber;
    }
    if (!order.visitTimeSlot && order.bookingId) {
      const booking = await Booking.findById(order.bookingId).select('timeSlot').lean();
      if (booking?.timeSlot) patch.visitTimeSlot = booking.timeSlot;
    }
    if (Object.keys(patch).length) {
      await KitchenOrder.updateOne({ _id: order._id }, { $set: patch });
      updated += 1;
    }
  }

  console.log(`Backfilled ${updated} booking_preorder kitchen order(s).`);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required.');
    process.exit(1);
  }

  await mongoose.connect(uri, { dbName: 'restaurant_db' });
  await dropLegacyIndex();
  await KitchenOrder.syncIndexes();
  await backfillReservedFields();
  await mongoose.disconnect();
  console.log('Kitchen reserved ticket migration complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
