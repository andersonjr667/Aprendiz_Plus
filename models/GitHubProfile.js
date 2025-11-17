const mongoose = require('mongoose');

// Modelo para integração GitHub
const GitHubProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  githubUsername: { type: String, required: true },
  githubId: String,
  accessToken: String, // Token de acesso (encriptado)
  refreshToken: String, // Token de refresh (encriptado)
  profileData: {
    name: String,
    bio: String,
    company: String,
    location: String,
    blog: String,
    email: String,
    publicRepos: Number,
    publicGists: Number,
    followers: Number,
    following: Number,
    avatarUrl: String,
    htmlUrl: String
  },
  repositories: [{
    id: Number,
    name: String,
    fullName: String,
    description: String,
    language: String,
    stars: Number,
    forks: Number,
    htmlUrl: String,
    createdAt: Date,
    updatedAt: Date,
    pushedAt: Date
  }],
  contributions: {
    total: Number,
    thisYear: Number,
    lastYear: Number,
    streak: Number,
    longestStreak: Number
  },
  isConnected: { type: Boolean, default: false },
  lastSync: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Índice único para usuário
GitHubProfileSchema.index({ userId: 1 }, { unique: true });
GitHubProfileSchema.index({ githubUsername: 1 });

module.exports = mongoose.model('GitHubProfile', GitHubProfileSchema);