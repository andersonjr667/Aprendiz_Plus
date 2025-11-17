const mongoose = require('mongoose');

// Modelo para alertas de vagas
const JobAlertSchema = new mongoose.Schema({
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
  frequency: { type: String, enum: ['daily', 'weekly', 'instant'], default: 'weekly' },
  isActive: { type: Boolean, default: true },
  lastSent: Date,
  createdAt: { type: Date, default: Date.now },
  // Controle de notificações enviadas
  sentJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }]
});

module.exports = mongoose.model('JobAlert', JobAlertSchema);