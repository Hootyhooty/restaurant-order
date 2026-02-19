const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../controllers/authController');
const { listReviews, createReview } = require('../controllers/reviewController');

router.get('/', listReviews);
router.post('/', authMiddleware, createReview);

module.exports = router;

