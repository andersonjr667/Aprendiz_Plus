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
  status: { type: String, enum: ['aberta', 'fechada', 'pausada', 'active', 'inactive'], default: 'aberta' },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' }],
  imageUrl: { type: String }, // URL da imagem da vaga no Cloudinary
  imageCloudinaryId: { type: String }, // ID do Cloudinary para gerenciar a imagem
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', JobSchema);
