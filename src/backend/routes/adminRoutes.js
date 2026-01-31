// Admin routes - protected by admin role middleware
const express = require('express');
const router = express.Router();
const { rolesRequired } = require('../middleware/auth');
const {
  getUsers,
  toggleUserActive,
  deleteUser,
  createUser,
  getMenuItems,
  getDashboardStats
} = require('../controllers/adminController');

// All admin routes require ADMIN role
router.get('/stats', rolesRequired('ADMIN'), getDashboardStats);
router.get('/users', rolesRequired('ADMIN'), getUsers);
router.post('/users', rolesRequired('ADMIN'), createUser);
router.post('/users/:userId/toggle', rolesRequired('ADMIN'), toggleUserActive);
router.delete('/users/:userId', rolesRequired('ADMIN'), deleteUser);
router.get('/menu-items', rolesRequired('ADMIN'), getMenuItems);

module.exports = router;
