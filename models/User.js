const mongoose = require('mongoose');

const CandidateProfileSchema = new mongoose.Schema({
  skills: { type: [String], default: [] },
  bio: String,
  education: String,
  // Novos campos para candidato
  birthDate: Date,
  rg: String,
  gender: { type: String, enum: ['masculino', 'feminino', 'outro', 'nao-informar'] },
  maritalStatus: { type: String, enum: ['solteiro', 'casado', 'divorciado', 'viuvo', 'uniao-estavel'] },
  street: String,
  number: String,
  neighborhood: String,
  city: String,
  state: String,
  cep: String,
  whatsapp: String,
  areasOfInterest: [String],
  previousExperience: String,
  extracurricularCourses: String,
  availability: { type: String, enum: ['manha', 'tarde', 'noite', 'integral', 'flexivel'] },
  isPCD: { type: Boolean, default: false },
  pcdDescription: String,
  isInApprenticeshipProgram: { type: Boolean, default: false },
  apprenticeshipProgramName: String,
  linkedinUrl: String,
  portfolioUrl: String,
  currentEducation: { type: String, enum: ['fundamental-cursando', 'fundamental-completo', 'medio-cursando', 'medio-completo', 'superior-cursando', 'superior-completo', 'pos-graduacao'] },
  educationInstitution: String,
  studyShift: { type: String, enum: ['manha', 'tarde', 'noite', 'ead'] },
  technicalCourse: String,
  expectedGraduation: Date
}, { _id: false });

const CompanyProfileSchema = new mongoose.Schema({
  website: String,
  description: String,
  // Novos campos para empresa
  tradeName: String, // Nome fantasia
  legalName: String, // Razão social
  businessArea: String, // Área de atuação
  numberOfEmployees: Number,
  commercialPhone: String,
  corporateEmail: String,
  street: String,
  number: String,
  neighborhood: String,
  city: String,
  state: String,
  cep: String
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  type: { type: String, enum: ['candidato', 'empresa', 'admin', 'owner'], default: 'candidato' },
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
  suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Responsabilidades customizadas (para admins/owner)
  responsibilities: { type: [String], default: [] },

  // Campos de engajamento e analytics
  profileViewCount: { type: Number, default: 0 },
  lastProfileView: Date,
  followerCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
  lastLogin: Date,
  loginCount: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', UserSchema);
