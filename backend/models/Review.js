const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    mealId: { type: Number, required: true, index: true }, // id from meals.js
    mealName: { type: String, default: '', trim: true },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    username: { type: String, default: '', trim: true, index: true }, // snapshot for easy searching

    review: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);

