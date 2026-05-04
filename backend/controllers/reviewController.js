const Review = require('../models/Review');
const { getMealsData, getMealBySlug } = require('../utils/mealsData');

// GET /api/reviews?mealId=1&limit=20
const listReviews = async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const mealId = req.query.mealId != null && req.query.mealId !== '' ? Number(req.query.mealId) : null;
    if (!Number.isFinite(mealId)) {
      return res.status(400).json({ success: false, message: 'mealId is required' });
    }

    const items = await Review.find({ mealId })
      .select('_id userId username review rating createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      items: items.map((r) => ({
        id: r._id,
        userId: r.userId,
        username: r.username || '',
        review: r.review,
        rating: r.rating,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('List reviews error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/reviews
// Body: { mealId, review, rating }
const createReview = async (req, res) => {
  try {
    const user = req.user;
    const mealId = Number(req.body?.mealId);
    const reviewText = String(req.body?.review || '').trim();
    const rating = Number(req.body?.rating);

    if (!Number.isFinite(mealId)) {
      return res.status(400).json({ success: false, message: 'mealId is required' });
    }
    if (!reviewText) {
      return res.status(400).json({ success: false, message: 'review is required' });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'rating must be between 1 and 5' });
    }

    const meals = getMealsData();
    const meal = meals.find((m) => Number(m.id) === mealId) || getMealBySlug(meals, String(mealId));
    if (!meal) {
      return res.status(400).json({ success: false, message: 'Invalid mealId' });
    }

    const userId = user._id.toString();
    let r = await Review.findOne({ mealId, userId });
    if (r) {
      r.review = reviewText;
      r.rating = rating;
      r.mealName = meal.name;
      r.username = user.username || r.username;
      await r.save();
    } else {
      r = await Review.create({
        mealId,
        mealName: meal.name,
        userId,
        username: user.username || '',
        review: reviewText,
        rating,
      });
    }

    res.status(201).json({
      success: true,
      item: {
        id: r._id,
        mealId: r.mealId,
        mealName: r.mealName,
        username: r.username,
        review: r.review,
        rating: r.rating,
        createdAt: r.createdAt,
      },
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  listReviews,
  createReview,
};

