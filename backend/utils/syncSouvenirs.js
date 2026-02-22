// Sync MongoDB souvenirs → data/souvenirs.js
// Run on startup so file always reflects database (DB is source of truth)
const path = require('path');
const fs = require('fs');
const Souvenir = require('../models/Souvenir');

const souvenirsDataPath = path.join(__dirname, '..', 'data', 'souvenirs.js');

const escape = (str) => (str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

async function syncSouvenirsDbToFile() {
  try {
    const docs = await Souvenir.find().sort({ createdAt: 1 }).lean();
    const absPath = path.resolve(souvenirsDataPath);

    if (docs.length === 0) {
      // Keep empty array
      const content = `// src/backend/data/souvenirs.js
// Synced from MongoDB - DB is source of truth

const souvenirs = [
];

module.exports = {
  souvenirs,
};
`;
      fs.writeFileSync(absPath, content, 'utf8');
      console.log('Souvenirs sync: file updated (0 items)');
      return;
    }

    // Build file content from DB, assign souvenirFileId to each doc
    const blocks = [];
    for (let i = 0; i < docs.length; i++) {
      const d = docs[i];
      const id = i + 1;
      const imgPath = d.imageFilename ? `/food_img/${d.imageFilename}` : '';
      const imgValue = imgPath ? `'${imgPath}'` : "''";
      blocks.push(`  {
    id: ${id},
    name: '${escape(d.name)}',
    description: '${escape(d.description)}',
    price: ${d.price},
    image: ${imgValue},
    category: '${escape(d.category || 'souvenir')}',
  }`);
      // Update MongoDB doc with souvenirFileId for admin edit/delete mapping
      await Souvenir.findByIdAndUpdate(d._id, { souvenirFileId: id });
    }

    const content = `// src/backend/data/souvenirs.js
// Synced from MongoDB - DB is source of truth

const souvenirs = [
${blocks.join(',\n')},
];

module.exports = {
  souvenirs,
};
`;
    fs.writeFileSync(absPath, content, 'utf8');
    console.log(`Souvenirs sync: file updated (${docs.length} items from DB)`);
  } catch (err) {
    console.error('Souvenirs sync error:', err.message);
  }
}

module.exports = { syncSouvenirsDbToFile };
