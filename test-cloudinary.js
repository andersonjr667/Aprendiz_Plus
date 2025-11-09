// Test Cloudinary Configuration
require('dotenv').config();

const cloudinary = require('./config/cloudinary');

console.log('=== Cloudinary Configuration Test ===\n');

// Check environment variables
console.log('Environment Variables:');
console.log('  CLOUD_NAME:', process.env.CLOUD_NAME ? '✓ Set' : '✗ Missing');
console.log('  CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✓ Set' : '✗ Missing');
console.log('  CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✓ Set' : '✗ Missing');
console.log();

// Check Cloudinary config
const config = cloudinary.config();
console.log('Cloudinary Config:');
console.log('  cloud_name:', config.cloud_name || '(not set)');
console.log('  api_key:', config.api_key ? '✓ Set' : '✗ Not set');
console.log('  api_secret:', config.api_secret ? '✓ Set' : '✗ Not set');
console.log();

// Test connectivity
console.log('Testing Cloudinary connectivity...');
cloudinary.verify()
  .then(ok => {
    if (ok) {
      console.log('✓ Cloudinary connection successful!');
      console.log('\nCloudinary is ready to use.');
    } else {
      console.log('✗ Cloudinary connection failed.');
      console.log('\nPlease check your credentials in .env file.');
    }
    process.exit(ok ? 0 : 1);
  })
  .catch(err => {
    console.error('✗ Error testing Cloudinary:', err.message);
    console.log('\nPlease check your credentials and internet connection.');
    process.exit(1);
  });
