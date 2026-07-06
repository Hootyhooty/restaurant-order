const mongoose = require('mongoose');
const { generateUUID } = require('../utils/uuid');

const promotionSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateUUID },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 2000 },
    code: { type: String, trim: true, uppercase: true, sparse: true },
    discountPercent: { type: Number, min: 0, max: 100 },
    active: { type: Boolean, default: true, index: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
  },
  { timestamps: true, collection: 'promotions' },
);

module.exports = mongoose.model('Promotion', promotionSchema);
