// src/backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/auth');
const {
  uploadImage,
  getImage,
  getMe,
  updateProfile,
  deactivateAccount
} = require('../controllers/userController');

// Configure multer for memory storage (we'll store in MongoDB GridFS)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG and PNG formats are supported'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Routes
router.post('/upload-image-to-allimgs', authMiddleware, upload.single('image'), uploadImage);
router.get('/uploads/:filename', getImage);
router.get('/me', authMiddleware, getMe);
router.put('/profile', authMiddleware, updateProfile);
router.post('/deactivate', authMiddleware, deactivateAccount);

module.exports = router;
