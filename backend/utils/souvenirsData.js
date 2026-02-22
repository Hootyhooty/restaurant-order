// Shared utility for loading souvenirs data (clears require cache for fresh reads)
const getSouvenirsData = () => {
  delete require.cache[require.resolve('../data/souvenirs')];
  const { souvenirs } = require('../data/souvenirs');
  return souvenirs;
};

module.exports = { getSouvenirsData };
