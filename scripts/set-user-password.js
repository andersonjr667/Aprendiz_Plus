/* Usage: node scripts/set-user-password.js email newPassword

This script connects to MongoDB using MONGODB_URI or MONGO_URI from .env
and sets the user's password to the provided newPassword (hashed with bcrypt).

WARNING: This script updates the production database when run against your
production MONGODB_URI. Use with care.
*/

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function main() {
  const [,, email, newPassword] = process.argv;
  if (!email || !newPassword) {
    console.error('Usage: node scripts/set-user-password.js <email> <newPassword>');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URL;
  if (!uri) {
    console.error('No MongoDB URI found in environment (MONGODB_URI or MONGO_URI)');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email });
    if (!user) {
      console.error('User not found:', email);
      process.exit(2);
    }

    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    await user.save();

    console.log('Password updated for', email);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(3);
  }
}

main();
