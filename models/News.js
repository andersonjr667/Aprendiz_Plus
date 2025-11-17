const mongoose = require('mongoose');

const NewsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: String,
  imageUrl: String,
  imageCloudinaryId: String, // ID do Cloudinary para a imagem
  category: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },

  // Campos de moderação
  moderationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  moderatedAt: Date,
  moderationNotes: String,
  rejectionReason: String,

  // Campos de engajamento
  viewCount: { type: Number, default: 0 },
  lastViewedAt: Date,

  // Campos adicionais
  tags: [String],
  isPublished: { type: Boolean, default: true },
  publishedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('News', NewsSchema);
