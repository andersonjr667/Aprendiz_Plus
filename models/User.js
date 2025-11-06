const mongoose = require('mongoose');

const CandidateProfileSchema = new mongoose.Schema({
  skills: { type: [String], default: [] },
  bio: String,
  education: String
}, { _id: false });

const CompanyProfileSchema = new mongoose.Schema({
  website: String,
  description: String
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  type: { type: String, enum: ['candidato', 'empresa', 'admin'], default: 'candidato' },
  status: { type: String, default: 'active' },
  cpf: String,
  cnpj: String,
  phone: String,
  address: String,
  bio: String,
  skills: [String],
  website: String,
  description: String,
  avatarUrl: String,
  profilePhotoUrl: String,
  resumeUrl: String,
  createdAt: { type: Date, default: Date.now },
  candidateProfile: { type: CandidateProfileSchema, default: () => ({}) },
  companyProfile: { type: CompanyProfileSchema, default: () => ({}) },
  resetToken: String,
  resetExpires: Date
});

module.exports = mongoose.model('User', UserSchema);
