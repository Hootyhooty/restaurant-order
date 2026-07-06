const mongoose = require('mongoose');

const mealStockSchema = new mongoose.Schema(
  {
    mealFileId: { type: Number, required: true, unique: true, index: true },
    mealName: { type: String, required: true, trim: true },
    stock: { type: Number, required: true, default: 50, min: 0 },
    lowStockThreshold: { type: Number, required: true, default: 5, min: 0 },
  },
  { timestamps: true, collection: 'meal_stock' },
);

module.exports = mongoose.model('MealStock', mealStockSchema);
