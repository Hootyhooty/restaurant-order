// Public souvenirs API for the frontend (Store page)
// Reads from data/souvenirs.js file - frontend does not read database directly
const { getSouvenirsData } = require('../utils/souvenirsData');

// GET /api/souvenirs
const getSouvenirs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 500;
    const souvenirs = getSouvenirsData();
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const items = souvenirs.slice(0, limit).map(s => ({
      ...s,
      image: s.image && s.image.startsWith('/')
        ? baseUrl + s.image
        : (s.image || ''),
    }));
    res.json({ success: true, items });
  } catch (error) {
    console.error('Get souvenirs error:', error);
    res.status(500).json({ success: false, message: 'Failed to load souvenirs' });
  }
};

module.exports = { getSouvenirs };
