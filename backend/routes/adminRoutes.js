// Admin routes - protected by admin role middleware
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
  getSouvenirItems,
  createSouvenirItem,
  updateSouvenirItem,
  deleteSouvenirItem,
  getDashboardStats,
  getReviewMenus,
  getReviews,
  deleteReview,
  getTransactions,
  getAnalysis,
  getAuditLogs,
} = require('../controllers/adminController');

const {
  getBookings,
  checkInBooking,
  noShowBooking,
  cancelBooking,
} = require('../controllers/bookingAdminController');
const {
  validateAdminBookingsQuery,
  validateAuditLogsQuery,
  validateMongoIdParam,
} = require('../utils/validation');

// Use in-memory storage for images; we upload to Cloudinary in controllers
const uploadMenuImage = multer({
  storage: multer.memoryStorage(),
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

router.get('/souvenir-items', rolesRequired('ADMIN'), getSouvenirItems);
router.post('/souvenir-items', rolesRequired('ADMIN'), uploadMenuImage.single('image'), createSouvenirItem);
router.put('/souvenir-items/:souvenirItemId', rolesRequired('ADMIN'), uploadMenuImage.single('image'), updateSouvenirItem);
router.delete('/souvenir-items/:souvenirItemId', rolesRequired('ADMIN'), deleteSouvenirItem);

// Reviews
router.get('/review-menus', rolesRequired('ADMIN'), getReviewMenus);
router.get('/reviews', rolesRequired('ADMIN'), getReviews);
router.delete('/reviews/:reviewId', rolesRequired('ADMIN'), deleteReview);

// Transactions
router.get('/transactions', rolesRequired('ADMIN'), getTransactions);
router.get('/analysis', rolesRequired('ADMIN'), getAnalysis);
router.get('/audit-logs', rolesRequired('ADMIN'), validateAuditLogsQuery, getAuditLogs);

// Bookings
router.get('/bookings', rolesRequired('ADMIN'), validateAdminBookingsQuery, getBookings);
router.post(
  '/bookings/:bookingId/check-in',
  rolesRequired('ADMIN'),
  validateMongoIdParam('bookingId'),
  checkInBooking,
);
router.post(
  '/bookings/:bookingId/no-show',
  rolesRequired('ADMIN'),
  validateMongoIdParam('bookingId'),
  noShowBooking,
);
router.post(
  '/bookings/:bookingId/cancel',
  rolesRequired('ADMIN'),
  validateMongoIdParam('bookingId'),
  cancelBooking,
);

module.exports = router;
