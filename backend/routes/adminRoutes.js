// Admin routes - protected by admin role middleware
const express = require('express');
const router = express.Router();
const { rolesRequired } = require('../controllers/authController');
const {
  getUsers,
  toggleUserActive,
  deleteUser,
  createUser,
  getMenuItems,
  createMenuItem,
  getDashboardStats
} = require('../controllers/adminController');

// All admin routes require ADMIN role
router.get('/stats', rolesRequired('ADMIN'), getDashboardStats);
router.get('/users', rolesRequired('ADMIN'), getUsers);
router.post('/users', rolesRequired('ADMIN'), createUser);
router.post('/users/:userId/toggle', rolesRequired('ADMIN'), toggleUserActive);
router.delete('/users/:userId', rolesRequired('ADMIN'), deleteUser);
router.get('/menu-items', rolesRequired('ADMIN'), getMenuItems);
router.post('/menu-items', rolesRequired('ADMIN'), createMenuItem);

module.exports = router;
