const cloudinary = require('cloudinary').v2;

// Read env vars explicitly and validate so issues are easier to debug
const CLOUD_NAME = process.env.CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

if (!CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.warn('[cloudinary] Missing Cloudinary config. Please set CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in your environment.');
  console.warn('[cloudinary] Current values:', {
    cloud_name: CLOUD_NAME ? '(set)' : '(missing)',
    api_key: CLOUDINARY_API_KEY ? '(set)' : '(missing)',
    api_secret: CLOUDINARY_API_SECRET ? '(set)' : '(missing)'
  });
}

cloudinary.config({
  cloud_name: CLOUD_NAME || 'your_cloud_name',
  api_key: CLOUDINARY_API_KEY || 'your_api_key',
  api_secret: CLOUDINARY_API_SECRET || 'your_api_secret'
});

// Small helper to check connectivity (does not run automatically)
async function verify() {
  try {
    const res = await cloudinary.api.resources({ max_results: 1 });
    console.log('[cloudinary] verify: OK, resources:', Array.isArray(res.resources) ? res.resources.length : 'unknown');
    return true;
  } catch (err) {
    console.error('[cloudinary] verify error:', err && err.message ? err.message : err);
    return false;
  }
}

module.exports = cloudinary;
module.exports.verify = verify;
