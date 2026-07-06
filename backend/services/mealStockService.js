const MealStock = require('../models/MealStock');
const { getMealsData } = require('../utils/mealsData');

const DEFAULT_STOCK = 50;
const DEFAULT_LOW_THRESHOLD = 5;

async function ensureStockRows() {
  const meals = getMealsData();
  const existing = await MealStock.find().lean();
  const byFileId = Object.fromEntries(existing.map((r) => [r.mealFileId, r]));

  const rows = [];
  for (const meal of meals) {
    if (byFileId[meal.id]) {
      rows.push(byFileId[meal.id]);
      continue;
    }
    const created = await MealStock.create({
      mealFileId: meal.id,
      mealName: meal.name,
      stock: DEFAULT_STOCK,
      lowStockThreshold: DEFAULT_LOW_THRESHOLD,
    });
    rows.push(created.toObject());
  }

  const mealById = Object.fromEntries(meals.map((m) => [m.id, m]));
  return rows
    .map((row) => {
      const meal = mealById[row.mealFileId];
      return {
        mealFileId: row.mealFileId,
        mealName: meal?.name || row.mealName,
        category: meal?.category || '',
        stock: row.stock,
        lowStockThreshold: row.lowStockThreshold,
        isLowStock: row.stock <= row.lowStockThreshold,
        updatedAt: row.updatedAt,
      };
    })
    .sort((a, b) => a.mealName.localeCompare(b.mealName));
}

async function updateMealStock(mealFileId, { stock, lowStockThreshold }) {
  const meals = getMealsData();
  const meal = meals.find((m) => m.id === Number(mealFileId));
  if (!meal) {
    const err = new Error('Meal not found.');
    err.statusCode = 404;
    throw err;
  }

  const update = { mealName: meal.name };
  if (stock !== undefined) update.stock = Math.max(0, Number(stock));
  if (lowStockThreshold !== undefined) {
    update.lowStockThreshold = Math.max(0, Number(lowStockThreshold));
  }

  const row = await MealStock.findOneAndUpdate(
    { mealFileId: meal.id },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  return {
    mealFileId: row.mealFileId,
    mealName: meal.name,
    category: meal.category,
    stock: row.stock,
    lowStockThreshold: row.lowStockThreshold,
    isLowStock: row.stock <= row.lowStockThreshold,
    updatedAt: row.updatedAt,
  };
}

async function decrementStockForServedLines(lines) {
  if (!Array.isArray(lines) || !lines.length) return;
  const meals = getMealsData();
  const nameToMeal = Object.fromEntries(meals.map((m) => [m.name.toLowerCase(), m]));

  for (const line of lines) {
    if (line.lineStatus !== 'served') continue;
    const meal = nameToMeal[String(line.name || '').toLowerCase()];
    if (!meal) continue;
    await MealStock.findOneAndUpdate(
      { mealFileId: meal.id },
      { $inc: { stock: -1 }, $set: { mealName: meal.name } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }
}

module.exports = {
  ensureStockRows,
  updateMealStock,
  decrementStockForServedLines,
};
