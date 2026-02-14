// Admin routes - protected by admin role middleware
const path = require('path');
const express = require('express');
const multer = require('multer');
const router = express.Router();
const { rolesRequired } = require('../controllers/authController');
const {
  getUsers,
  toggleUserActive,
  deleteUser,
  createUser,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getDashboardStats
} = require('../controllers/adminController');

const foodImgDir = path.join(__dirname, '..', 'public', 'food_img');
const menuImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, foodImgDir),
  filename: (req, file, cb) => {
    const ext = (file.originalname.match(/\.\w+$/) || ['.jpg'])[0];
    cb(null, `menu_${Date.now()}${ext}`);
  }
});
const uploadMenuImage = multer({
  storage: menuImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files (JPEG, PNG, GIF, WebP) allowed'), false);
  }
});

// All admin routes require ADMIN role
router.get('/stats', rolesRequired('ADMIN'), getDashboardStats);
router.get('/users', rolesRequired('ADMIN'), getUsers);
router.post('/users', rolesRequired('ADMIN'), createUser);
router.post('/users/:userId/toggle', rolesRequired('ADMIN'), toggleUserActive);
router.delete('/users/:userId', rolesRequired('ADMIN'), deleteUser);
router.get('/menu-items', rolesRequired('ADMIN'), getMenuItems);
router.post('/menu-items', rolesRequired('ADMIN'), uploadMenuImage.single('image'), createMenuItem);
router.put('/menu-items/:menuItemId', rolesRequired('ADMIN'), uploadMenuImage.single('image'), updateMenuItem);
router.delete('/menu-items/:menuItemId', rolesRequired('ADMIN'), deleteMenuItem);

module.exports = router;
