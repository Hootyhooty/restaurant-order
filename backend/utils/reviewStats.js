const Review = require('../models/Review');

// Compute rating summary for a single mealId (number)
async function getMealRatingSummary(mealId) {
  const agg = await Review.aggregate([
    { $match: { mealId: Number(mealId) } },
    {
      $group: {
        _id: '$mealId',
        totalRating: { $sum: '$rating' },
        reviewCount: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (!agg.length) {
    return { totalRating: 0, reviewCount: 0, averageRating: null };
  }

  const { totalRating, reviewCount, avgRating } = agg[0];
  return {
    totalRating,
    reviewCount,
    averageRating: Number(avgRating.toFixed(2)),
  };
}

module.exports = {
  getMealRatingSummary,
};

