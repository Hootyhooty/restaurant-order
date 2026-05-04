const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../controllers/authController');
const { listReviews, createReview } = require('../controllers/reviewController');
const { publicLimiter, writeLimiter } = require('../utils/security');
const { validateReviewListQuery, validateReviewCreateBody } = require('../utils/validation');

router.get('/', publicLimiter, validateReviewListQuery, listReviews);
router.post('/', writeLimiter, authMiddleware, validateReviewCreateBody, createReview);

module.exports = router;

