const mongoose = require('mongoose');
const { generateUUID } = require('../utils/uuid');

const kitchenOrderLineSchema = new mongoose.Schema(
  {
    mealId: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, default: 1, min: 1 },
  },
  { _id: false }
);

const kitchenOrderSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateUUID },

    ticketNumber: { type: Number, required: true, min: 1 },
    serviceDate: { type: String, required: true, trim: true, index: true },

    source: {
      type: String,
      required: true,
      trim: true,
      enum: ['booking_preorder', 'staff_table', 'online'],
    },

    bookingId: { type: String, ref: 'Booking', sparse: true, unique: true },
    tableId: { type: Number, min: 1, max: 12, index: true },
    customerName: { type: String, required: true, trim: true },

    lines: { type: [kitchenOrderLineSchema], default: [] },

    status: {
      type: String,
      enum: ['pending', 'preparing', 'ready', 'served', 'cancelled'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'kitchen_orders',
  }
);

kitchenOrderSchema.index({ serviceDate: 1, ticketNumber: 1 }, { unique: true });

module.exports = mongoose.model('KitchenOrder', kitchenOrderSchema);
