// src/backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware } = require('../controllers/authController');
const {
  uploadImage,
  getImage,
  getMe,
  updateProfile,
  deactivateAccount,
  getHistory,
  getPublicHistory,
  getPublicProfile,
} = require('../controllers/userController');

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG and PNG formats are supported'), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Routes
router.post('/upload-image-to-allimgs', authMiddleware, upload.single('image'), uploadImage);
router.get('/uploads/:filename', getImage);
router.get('/me', authMiddleware, getMe);
router.put('/profile', authMiddleware, updateProfile);
router.post('/deactivate', authMiddleware, deactivateAccount);
router.get('/history', authMiddleware, getHistory);
router.get('/:userId/history', getPublicHistory);
router.get('/public/:userId', getPublicProfile);

module.exports = router;
