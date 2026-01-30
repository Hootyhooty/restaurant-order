// src/backend/models/Image.js
const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  contentType: {
    type: String,
    required: true,
    default: 'image/jpeg'
  },
  data: {
    type: Buffer,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'img' // Store in single 'img' collection
});

module.exports = mongoose.model('Image', imageSchema);
