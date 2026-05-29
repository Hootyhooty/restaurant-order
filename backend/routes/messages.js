const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../controllers/authController');
const { sendMessage, getMyMessages, markAsRead, deleteMessage } = require('../controllers/messageController');
const { writeLimiter } = require('../utils/security');
const {
  validateMessageCreateBody,
  validatePaginationQuery,
  validateMongoIdParam,
} = require('../utils/validation');

router.post('/', writeLimiter, authMiddleware, validateMessageCreateBody, sendMessage);
router.get('/', authMiddleware, validatePaginationQuery, getMyMessages);
router.patch('/:id/read', writeLimiter, authMiddleware, validateMongoIdParam('id'), markAsRead);
router.delete('/:id', writeLimiter, authMiddleware, validateMongoIdParam('id'), deleteMessage);

module.exports = router;
