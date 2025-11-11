const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  resumeUrl: String,
  appliedAt: { type: Date, default: Date.now },
  feedback: String
});

module.exports = mongoose.model('Application', ApplicationSchema);
