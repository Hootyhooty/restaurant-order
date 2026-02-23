// Upload all image files under backend/public to Cloudinary
// Usage (from backend directory):
//   node scripts/migrateLocalImagesToCloudinary.js
//
// Requires Cloudinary env vars in backend/.env (CLOUD_NAME/CLOUD_KEY/CLOUD_SECRET or CLOUDINARY_URL)

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { uploadImageFile } = require('../utils/cloudinary');

const publicRoot = path.join(__dirname, '..', 'public');
const mappingOutputPath = path.join(__dirname, '..', 'cloudinary-mapping.json');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']);

function walkDir(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else if (stat.isFile()) {
      const ext = path.extname(entry).toLowerCase();
      if (IMAGE_EXTENSIONS.has(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

async function main() {
  console.log('Scanning for images under', publicRoot);
  const files = walkDir(publicRoot);
  if (files.length === 0) {
    console.log('No image files found under backend/public');
    return;
  }

  console.log(`Found ${files.length} image file(s). Uploading to Cloudinary...`);

  const mapping = {};

  for (const filePath of files) {
    const relFromPublic = path.relative(publicRoot, filePath).replace(/\\/g, '/');
    const relKeyFoodImg = relFromPublic.startsWith('food_img/')
      ? `/food_img/${path.basename(filePath)}`
      : null;
    const relKeyBackend = `backend/public/${relFromPublic}`;

    try {
      const publicIdBase = relFromPublic.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9/_-]/g, '_');

      // Use only restaurant/display | souvenir | food (no "migrated" folder).
      // - display/*   → restaurant/display
      // - souvenir/*  → restaurant/souvenir
      // - food_img/*  → restaurant/food
      // - other       → restaurant
      let folder = 'restaurant';
      if (relFromPublic.startsWith('display/')) {
        folder = 'restaurant/display';
      } else if (relFromPublic.startsWith('souvenir/')) {
        folder = 'restaurant/souvenir';
      } else if (relFromPublic.startsWith('food_img/')) {
        folder = 'restaurant/food';
      }

      const uploadResult = await uploadImageFile(filePath, {
        folder,
        public_id: publicIdBase,
      });
      const url = uploadResult.secure_url;
      console.log(`Uploaded ${relFromPublic} → ${url}`);

      // Primary key: path relative to backend/public
      mapping[relFromPublic] = url;
      // Common code references:
      if (relKeyFoodImg) mapping[relKeyFoodImg] = url;
      mapping[relKeyBackend] = url;
    } catch (err) {
      console.error(`Failed to upload ${filePath}:`, err.message);
    }
  }

  fs.writeFileSync(mappingOutputPath, JSON.stringify(mapping, null, 2), 'utf8');
  console.log(`Cloudinary mapping written to ${mappingOutputPath}`);
  console.log('You can use this mapping to update hard-coded image paths (e.g. /food_img/...) to Cloudinary URLs in your codebase.');
}

main().catch((err) => {
  console.error('Migration script error:', err);
  process.exit(1);
});

