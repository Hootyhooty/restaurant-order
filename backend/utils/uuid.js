// UUID v7 utility - generates time-ordered UUIDs
// Using uuid library (v9+ supports v7, fallback to v4 if needed)
let uuidv7;
try {
  const uuid = require('uuid');
  // Check if v7 is available (uuid v9+)
  if (uuid.v7) {
    uuidv7 = uuid.v7;
  } else {
    // Fallback: use v4 for now (you should upgrade uuid package to v9+ for v7 support)
    console.warn('UUID v7 not available, using v4. Install uuid@^9.0.0 for v7 support.');
    uuidv7 = uuid.v4;
  }
} catch (e) {
  // Fallback implementation if uuid package not available
  console.error('uuid package not found. Install with: npm install uuid');
  uuidv7 = () => {
    throw new Error('UUID package not installed. Run: npm install uuid');
  };
}

/**
 * Generate a UUID v7 (time-ordered) or v4 (fallback)
 * @returns {string} UUID string
 */
function generateUUID() {
  return uuidv7();
}

/**
 * Validate if a string is a valid UUID format (v4 or v7)
 * @param {string} str
 * @returns {boolean}
 */
function isValidUUID(str) {
  if (typeof str !== 'string') return false;
  // Accept both v4 (4) and v7 (7) UUIDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

module.exports = {
  generateUUID,
  isValidUUID,
};
