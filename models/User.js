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
  interests: [String], // Áreas de interesse do candidato
  website: String,
  description: String,
  avatarUrl: String,
  profilePhotoUrl: String,
  profilePhotoCloudinaryId: String, // ID do Cloudinary para foto de perfil
  resumeUrl: String,
  resumeFileId: String, // ID do arquivo no GridFS
  createdAt: { type: Date, default: Date.now },
  candidateProfile: { type: CandidateProfileSchema, default: () => ({}) },
  companyProfile: { type: CompanyProfileSchema, default: () => ({}) },
  // Email verification
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  // Password reset
  resetToken: String,
  resetExpires: Date,
  // Email preferences
  emailNotifications: { type: Boolean, default: true },
  jobAlerts: { type: Boolean, default: true },
  // Ban/Suspension fields
  banReason: String,
  banMessage: String,
  bannedAt: Date,
  bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  suspensionReason: String,
  suspensionMessage: String,
  suspendedAt: Date,
  suspendedUntil: Date,
  suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('User', UserSchema);
