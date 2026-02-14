// Shared utility for loading meals data (clears require cache for fresh reads)
const getMealsData = () => {
  delete require.cache[require.resolve('../data/meals')];
  const { meals } = require('../data/meals');
  return meals;
};

const getMealBySlug = (meals, slug) => {
  const safeSlug = (slug || '').replace(/_/g, ' ');
  return (
    meals.find(
      (m) =>
        m.name.replace(/\s+/g, '_') === slug ||
        m.name === safeSlug
    ) || null
  );
};

module.exports = { getMealsData, getMealBySlug };
