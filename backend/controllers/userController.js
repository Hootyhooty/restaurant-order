// src/backend/controllers/userController.js
const path = require('path');
const fs = require('fs');
const Customer = require('../models/Customer');
const Image = require('../models/Image');
const Transaction = require('../models/Transaction');
const Review = require('../models/Review');
const AppError = require('../utils/appError');

// Upload image to public/display (disk storage)
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No image file provided'
      });
    }

    const filename = req.file.filename;

    return res.status(201).json({
      status: 'success',
      message: 'Image uploaded successfully',
      data: {
        filename: filename,
        url: `/display/${filename}`
      }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error uploading image: ' + error.message
    });
  }
};

// Get image - serve from public/display, or fallback to MongoDB (backward compat)
exports.getImage = async (req, res) => {
  try {
    const filename = req.params.filename;

    // Try disk first (public/display)
    const displayPath = path.join(__dirname, '..', 'public', 'display', filename);
    if (fs.existsSync(displayPath)) {
      return res.sendFile(displayPath);
    }

    // Fallback: MongoDB (legacy uploads)
    const imageDoc = await Image.findOne({ filename }) || await Image.findOne({ filename: 'default.jpg' });
    if (imageDoc) {
      res.set('Content-Type', imageDoc.contentType || 'image/jpeg');
      res.set('Content-Length', imageDoc.size);
      res.set('Cache-Control', 'public, max-age=31536000');
      return res.send(imageDoc.data);
    }

    return res.status(404).json({ message: 'Image not found' });
  } catch (error) {
    console.error('Error retrieving image:', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Error retrieving image' });
    }
  }
};

// Get current user (me)
exports.getMe = async (req, res) => {
  try {
    const user = req.user;
    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role || 'USER',
      alternate_email: user.alternate_email,
      first_name: user.first_name,
      last_name: user.last_name,
      photo: user.photo || 'default.jpg',
      phone: user.phone,
      display_phone: user.display_phone,
      address_line1: user.address_line1,
      address_line2: user.address_line2,
      city: user.city,
      state: user.state,
      zipcode: user.zipcode,
      country: user.country,
      latitude: user.latitude,
      longitude: user.longitude,
      email_verified: user.email_verified,
      phone_verified: user.phone_verified,
      profile_slug: user.profile_slug
    };

    return res.json({ success: true, user: userData });
  } catch (error) {
    console.error('Error getting user:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: build unified history items
const buildHistoryItems = (transactions, reviews, { includeOrders }) => {
  const items = [];

  if (includeOrders) {
    (transactions || []).forEach((t) => {
      const menus = (t.items || []).map((i) => i.name);
      items.push({
        type: 'order',
        reference: t.orderId || t._id,
        menus,
        amount: t.amountTotal,
        status: t.status,
        createdAt: t.createdAt,
      });
    });
  }

  (reviews || []).forEach((r) => {
    items.push({
      type: 'review',
      reference: r._id,
      menus: [r.mealName || ''],
      amount: null,
      status: '—',
      createdAt: r.createdAt,
    });
  });

  items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return items;
};

// GET /api/users/history (auth) - full history for owner (orders + reviews)
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const userIdStr = userId.toString();

    const [transactions, reviews] = await Promise.all([
      Transaction.find({ userId: userIdStr }).sort({ createdAt: -1 }).lean(),
      Review.find({ userId: userIdStr }).sort({ createdAt: -1 }).lean(),
    ]);

    const items = buildHistoryItems(transactions, reviews, { includeOrders: true });
    return res.json({ success: true, items });
  } catch (error) {
    console.error('Error getting history:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/users/:userId/history - public view (reviews only)
exports.getPublicHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const reviews = await Review.find({ userId }).sort({ createdAt: -1 }).lean();
    const items = buildHistoryItems([], reviews, { includeOrders: false });
    return res.json({ success: true, items });
  } catch (error) {
    console.error('Error getting public history:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/users/public/:userId - public profile (safe fields only)
exports.getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await Customer.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userData = {
      id: user._id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      photo: user.photo || 'default.jpg',
      address_line1: user.address_line1,
      address_line2: user.address_line2,
      city: user.city,
      state: user.state,
      zipcode: user.zipcode,
      country: user.country,
      email_verified: user.email_verified,
      phone_verified: user.phone_verified,
      display_phone: user.display_phone,
    };

    return res.json({ success: true, user: userData });
  } catch (error) {
    console.error('Error getting public profile:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const user = req.user;
    const data = req.body;

    // Update allowed fields
    if (data.first_name !== undefined) user.first_name = data.first_name;
    if (data.last_name !== undefined) user.last_name = data.last_name;
    if (data.alternate_email !== undefined) user.alternate_email = data.alternate_email;
    if (data.address_line1 !== undefined) user.address_line1 = data.address_line1;
    if (data.address_line2 !== undefined) user.address_line2 = data.address_line2;
    if (data.city !== undefined) user.city = data.city;
    if (data.state !== undefined) user.state = data.state;
    if (data.zipcode !== undefined) user.zipcode = data.zipcode;
    if (data.country !== undefined) user.country = data.country;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.display_phone !== undefined) user.display_phone = Boolean(data.display_phone);
    if (data.photo !== undefined) user.photo = data.photo || 'default.jpg';
    if (data.latitude !== undefined) user.latitude = data.latitude;
    if (data.longitude !== undefined) user.longitude = data.longitude;

    await user.save();

    // Return updated user data
    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      alternate_email: user.alternate_email,
      first_name: user.first_name,
      last_name: user.last_name,
      photo: user.photo,
      phone: user.phone,
      display_phone: user.display_phone,
      address_line1: user.address_line1,
      address_line2: user.address_line2,
      city: user.city,
      state: user.state,
      zipcode: user.zipcode,
      country: user.country,
      latitude: user.latitude,
      longitude: user.longitude,
      email_verified: user.email_verified,
      phone_verified: user.phone_verified
    };

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: userData
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Deactivate account
exports.deactivateAccount = async (req, res) => {
  try {
    const user = req.user;
    user.active = false;
    user.is_active = false;
    await user.save();

    return res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating account:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
