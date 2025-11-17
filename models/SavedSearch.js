const mongoose = require('mongoose');

// Modelo para filtros de busca salvos
const SavedSearchSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  filters: {
    keywords: String,
    location: String,
    workModel: String,
    salaryMin: Number,
    salaryMax: Number,
    skills: [String],
    company: String,
    jobType: String,
    experienceLevel: String
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastUsed: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SavedSearch', SavedSearchSchema);