// Souvenir item - same structure as Meal, for admin-managed souvenir products
const mongoose = require('mongoose');

const souvenirSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, default: 'souvenir', trim: true },
    souvenirFileId: { type: Number }, // id in data/souvenirs.js for delete/update sync
  },
  { timestamps: true }
);

module.exports = mongoose.model('Souvenir', souvenirSchema);
