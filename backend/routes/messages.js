const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../controllers/authController');
const { sendMessage, getMyMessages, markAsRead, deleteMessage } = require('../controllers/messageController');

router.post('/', authMiddleware, sendMessage);
router.get('/', authMiddleware, getMyMessages);
router.patch('/:id/read', authMiddleware, markAsRead);
router.delete('/:id', authMiddleware, deleteMessage);

module.exports = router;
