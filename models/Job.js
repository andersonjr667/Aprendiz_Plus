const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  requirements: { type: [String], default: [] },
  benefits: { type: [String], default: [] },
  salary: String,
  workload: String,
  location: String,
  workModel: String,
  startDate: Date,
  expiresAt: Date,
  applicationDeadline: Date, // Prazo limite para candidaturas
  maxApplicants: Number, // Número máximo de candidatos
  status: { type: String, enum: ['aberta', 'fechada', 'pausada', 'active', 'inactive', 'pending_moderation', 'rejected'], default: 'aberta' },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' }],
  imageUrl: { type: String }, // URL da imagem da vaga no Cloudinary
  imageCloudinaryId: { type: String }, // ID do Cloudinary para gerenciar a imagem
  createdAt: { type: Date, default: Date.now },

  // Campos de moderação
  moderationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' }, // Para controle fino
  moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  moderatedAt: Date,
  moderationNotes: String,
  rejectionReason: String,

  // Campos de engajamento
  viewCount: { type: Number, default: 0 },
  lastViewedAt: Date
});

module.exports = mongoose.model('Job', JobSchema);
