// src/backend/controllers/userController.js
const path = require('path');
const fs = require('fs');
const Customer = require('../models/Customer');
const Image = require('../models/Image');
const Transaction = require('../models/Transaction');
const Review = require('../models/Review');
const AppError = require('../utils/appError');
const { uploadImageBuffer } = require('../utils/cloudinary');
const {
  loadProfileDocuments,
  applyProfileUpdates,
  resolvePublicProfile,
  resolveHistoryUserId,
} = require('../services/profileDocuments');

// Upload image to Cloudinary (profile or generic uploads)
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No image file provided'
      });
    }

    let secureUrl = '';
    if (req.file.buffer) {
      const result = await uploadImageBuffer(req.file.buffer, {
        folder: 'restaurant/display',
        public_id: `display_${Date.now()}`,
      });
      secureUrl = result.secure_url;
    }

    if (!secureUrl) {
      return res.status(503).json({
        status: 'error',
        message: 'Image upload is not configured. Set Cloudinary env vars on the server.',
      });
    }

    return res.status(201).json({
      status: 'success',
      message: 'Image uploaded successfully',
      data: {
        filename: secureUrl,
        url: secureUrl,
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
      profile_slug: user.profile_slug,
      accountType: user.accountType,
      customerId: user.customerId,
      staffId: user.staffId,
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
    const userIdStr = resolveHistoryUserId(req.user);

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
    const userData = await resolvePublicProfile(userId);
    if (!userData) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, user: userData });
  } catch (error) {
    console.error('Error getting public profile:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const docs = await loadProfileDocuments(req.user);
    const userData = await applyProfileUpdates(docs, req.body);

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: userData,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Error updating profile:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Deactivate account
exports.deactivateAccount = async (req, res) => {
  try {
    const { customer, staff } = await loadProfileDocuments(req.user);

    if (customer) {
      customer.active = false;
      customer.is_active = false;
      await customer.save();
    }
    if (staff) {
      staff.active = false;
      await staff.save();
    }

    return res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Error deactivating account:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
