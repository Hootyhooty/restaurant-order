// src/backend/controllers/mealController.js
// Public menu (meals) API handlers for the frontend

const { categories } = require('../data/meals');
const { getMealsData, getMealBySlug } = require('../utils/mealsData');

// GET /api/meals
const getMeals = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 500;
    const meals = getMealsData();
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const items = meals.slice(0, limit).map(m => ({
      ...m,
      image: m.image && m.image.startsWith('/') ? baseUrl + m.image : (m.image || '')
    }));

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
const getOneMeal = async (req, res) => {
  try {
    const { slug } = req.params;
    const meals = getMealsData();
    const meal = getMealBySlug(meals, slug);
    if (!meal) {
      return res
        .status(404)
        .json({ success: false, message: 'Meal not found' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const item = {
      ...meal,
      image: meal.image && meal.image.startsWith('/') ? baseUrl + meal.image : (meal.image || '')
    };

    res.json({
      success: true,
      item,
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

