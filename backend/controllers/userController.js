// src/backend/controllers/userController.js
const Customer = require('../models/Customer');
const Image = require('../models/Image');
const AppError = require('../utils/appError');

// Upload image to MongoDB (normal Binary storage in 'img' collection)
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No image file provided'
      });
    }

    // Check file size (MongoDB document limit is 16MB)
    if (req.file.size > 16 * 1024 * 1024) {
      return res.status(400).json({
        status: 'error',
        message: 'Image too large. Maximum size is 16MB.'
      });
    }

    // Generate unique filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const originalName = req.file.originalname;
    const ext = originalName.split('.').pop();
    const baseName = originalName.replace(`.${ext}`, '').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${baseName}_${timestamp}.${ext}`;
    const contentType = req.file.mimetype;

    // Check if file already exists and delete it
    const existingFile = await Image.findOne({ filename });
    if (existingFile) {
      await Image.deleteOne({ filename });
    }

    // Create new image document in 'img' collection
    const imageDoc = new Image({
      filename: filename,
      contentType: contentType,
      data: req.file.buffer, // Store Binary data directly
      size: req.file.size
    });

    await imageDoc.save();

    console.log(`✅ Image uploaded to 'img' collection: ${filename} (ID: ${imageDoc._id}, Size: ${req.file.size} bytes)`);

    return res.status(201).json({
      status: 'success',
      message: 'Image uploaded successfully',
      data: {
        filename: filename,
        id: imageDoc._id.toString(),
        url: `/api/users/uploads/${filename}`
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

// Get image from MongoDB (normal Binary storage in 'img' collection)
exports.getImage = async (req, res) => {
  try {
    const filename = req.params.filename;

    // Try to find the file in 'img' collection
    let imageDoc = await Image.findOne({ filename });
    
    if (!imageDoc) {
      // If not found, try to serve default.jpg
      imageDoc = await Image.findOne({ filename: 'default.jpg' });
      if (!imageDoc) {
        return res.status(404).json({ message: 'Image not found' });
      }
    }

    // Set content type and send image buffer directly
    res.set('Content-Type', imageDoc.contentType || 'image/jpeg');
    res.set('Content-Length', imageDoc.size);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(imageDoc.data);
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
      id: user._id.toString(),
      username: user.username,
      email: user.email,
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
      id: user._id.toString(),
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
