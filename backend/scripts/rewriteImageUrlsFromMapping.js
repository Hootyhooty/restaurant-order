// Rewrite hard-coded local image paths to Cloudinary URLs
// using backend/cloudinary-mapping.json produced by
//   scripts/migrateLocalImagesToCloudinary.js
//
// Usage (from backend directory):
//   node scripts/rewriteImageUrlsFromMapping.js
//
// This script is intentionally conservative:
// - It only replaces exact string matches found in the mapping file.
// - It targets:
//     - backend/data/meals.js
//     - frontend/src/components/Header.jsx
//     - frontend/src/components/Footer.jsx
//     - frontend/src/components/Hero.css

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..', '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

const mappingPath = path.join(backendDir, 'cloudinary-mapping.json');
const mealsPath = path.join(backendDir, 'data', 'meals.js');
const headerPath = path.join(frontendDir, 'src', 'components', 'Header.jsx');
const footerPath = path.join(frontendDir, 'src', 'components', 'Footer.jsx');
const heroCssPath = path.join(frontendDir, 'src', 'components', 'Hero.css');

function loadMapping() {
  if (!fs.existsSync(mappingPath)) {
    throw new Error(
      `Mapping file not found at ${mappingPath}. Run scripts/migrateLocalImagesToCloudinary.js first.`
    );
  }
  const raw = fs.readFileSync(mappingPath, 'utf8');
  const json = JSON.parse(raw);
  return json;
}

function replaceInFile(filePath, mapping) {
  if (!fs.existsSync(filePath)) {
    console.warn(`Skip (not found): ${path.relative(rootDir, filePath)}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // For predictability, process keys in descending length order
  // so more specific paths (e.g. backend/public/food_img/..) win.
  const keys = Object.keys(mapping).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    const url = mapping[key];
    if (!url || typeof url !== 'string') continue;

    // We only care about image-like paths that you might have in code.
    // Keys in mapping are things like:
    // - "food_img/Name.jpg"
    // - "/food_img/Name.jpg"
    // - "backend/public/food_img/Name.jpg"
    if (!/\.(png|jpe?g|gif|webp|bmp)$/i.test(key)) continue;

    if (content.includes(key)) {
      content = content.split(key).join(url);
    }

    // Also try with a leading slash if not already present
    if (!key.startsWith('/')) {
      const withSlash = '/' + key;
      if (content.includes(withSlash)) {
        content = content.split(withSlash).join(url);
      }
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Rewrote image URLs in ${path.relative(rootDir, filePath)}`);
  } else {
    console.log(`No changes in ${path.relative(rootDir, filePath)}`);
  }
}

function main() {
  try {
    const mapping = loadMapping();
    console.log(`Loaded ${Object.keys(mapping).length} mapping entries from cloudinary-mapping.json`);

    replaceInFile(mealsPath, mapping);
    replaceInFile(headerPath, mapping);
    replaceInFile(footerPath, mapping);
    replaceInFile(heroCssPath, mapping);

    console.log('Rewrite complete. Review git diff before committing.');
  } catch (err) {
    console.error('Error rewriting image URLs:', err.message);
    process.exit(1);
  }
}

main();

