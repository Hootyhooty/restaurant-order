// src/backend/controllers/mealController.js
// Public menu (meals) API handlers for the frontend

const Meal = require('../models/Meal');
const { meals, categories, getMealBySlug } = require('../data/meals');

// GET /api/meals
const getMeals = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 500;
    const staticItems = meals.slice(0, limit);
    const dbMeals = await Meal.find().sort({ createdAt: -1 }).limit(limit);
    const dbItems = dbMeals.map(m => ({
      id: m._id.toString(),
      name: m.name,
      description: m.description || '',
      price: m.price,
      image: m.image || '',
      category: m.category,
      isPopular: m.isPopular || false
    }));
    const items = [...staticItems, ...dbItems];

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
    let meal = getMealBySlug(slug);
    if (!meal) {
      const nameFromSlug = (slug || '').replace(/_/g, ' ');
      const dbMeal = await Meal.findOne({ name: nameFromSlug });
      if (dbMeal) {
        meal = {
          id: dbMeal._id.toString(),
          name: dbMeal.name,
          description: dbMeal.description || '',
          price: dbMeal.price,
          image: dbMeal.image || '',
          category: dbMeal.category,
          isPopular: dbMeal.isPopular || false
        };
      }
    }
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

