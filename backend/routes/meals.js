// src/backend/routes/meals.js
// Public menu (meals) API for the frontend

const express = require('express');
const router = express.Router();
const { getMeals, getOneMeal } = require('../controllers/mealController');

router.get('/', getMeals);
router.get('/:slug', getOneMeal);

module.exports = router;

