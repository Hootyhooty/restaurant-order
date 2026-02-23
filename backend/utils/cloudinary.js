// Cloudinary configuration and helper upload functions
const cloudinary = require('cloudinary').v2;

const {
  CLOUD_NAME,
  CLOUD_KEY,
  CLOUD_SECRET,
  CLOUDINARY_URL,
} = process.env;

if (!CLOUDINARY_URL && (!CLOUD_NAME || !CLOUD_KEY || !CLOUD_SECRET)) {
  console.warn(
    'Cloudinary is not fully configured. Set CLOUDINARY_URL or CLOUD_NAME/CLOUD_KEY/CLOUD_SECRET in backend/.env'
  );
}

if (CLOUDINARY_URL) {
  cloudinary.config({ secure: true });
} else {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: CLOUD_KEY,
    api_secret: CLOUD_SECRET,
    secure: true,
  });
}

/**
 * Upload a file from disk path to Cloudinary.
 * Returns the full upload result (including secure_url and public_id).
 */
async function uploadImageFile(filePath, options = {}) {
  return cloudinary.uploader.upload(filePath, {
    folder: options.folder || 'restaurant',
    resource_type: 'image',
    ...options,
  });
}

/**
 * Upload an in-memory buffer (e.g. from multer memoryStorage) to Cloudinary.
 * Returns the full upload result (including secure_url and public_id).
 */
function uploadImageBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'restaurant',
        resource_type: 'image',
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

module.exports = {
  cloudinary,
  uploadImageFile,
  uploadImageBuffer,
};

