// Menu item (meal) - admin-created items stored in MongoDB
const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    isPopular: { type: Boolean, default: false },
    mealFileId: { type: Number }, // id in data/meals.js for delete sync
  },
  { timestamps: true }
);

module.exports = mongoose.model('Meal', mealSchema);
