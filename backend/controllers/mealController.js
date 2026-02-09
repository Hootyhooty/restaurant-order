// src/backend/controllers/mealController.js
// Public menu (meals) API handlers for the frontend

const { meals, categories, getMealBySlug } = require('../data/meals');

// GET /api/meals
const getMeals = (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || meals.length;
    const items = meals.slice(0, limit);

    res.json({
      success: true,
      items,
      categories,
    });
  } catch (error) {
    console.error('Get meals error:', error);
    res.status(500).json({ success: false, message: 'Failed to load meals' });
  }
};

// GET /api/meals/:slug
const getOneMeal = (req, res) => {
  try {
    const { slug } = req.params;
    const meal = getMealBySlug(slug);

    if (!meal) {
      return res
        .status(404)
        .json({ success: false, message: 'Meal not found' });
    }

    res.json({
      success: true,
      item: meal,
      categories,
    });
  } catch (error) {
    console.error('Get meal by slug error:', error);
    res.status(500).json({ success: false, message: 'Failed to load meal' });
  }
};

module.exports = {
  getMeals,
  getOneMeal,
};

