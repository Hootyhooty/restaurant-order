const mongoose = require('mongoose');
const { generateUUID } = require('../utils/uuid');

const reviewSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: generateUUID,
    },
    mealId: { type: Number, required: true, index: true }, // id from meals.js
    mealName: { type: String, default: '', trim: true },

    userId: { type: String, ref: 'Customer', required: true, index: true },
    username: { type: String, default: '', trim: true, index: true }, // snapshot for easy searching

    review: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5, index: true },
  },
  { timestamps: true }
);

reviewSchema.pre('save', async function (next) {
  if (!this._id) {
    this._id = generateUUID();
  }
  next();
});

module.exports = mongoose.model('Review', reviewSchema);

