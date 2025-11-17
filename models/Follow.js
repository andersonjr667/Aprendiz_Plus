const mongoose = require('mongoose');

// Modelo para seguidores (candidatos seguindo empresas)
const FollowSchema = new mongoose.Schema({
  followerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Quem segue (candidato)
  followingId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Quem é seguido (empresa)
  createdAt: { type: Date, default: Date.now }
});

// Índices para consultas eficientes
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
FollowSchema.index({ followingId: 1 });

module.exports = mongoose.model('Follow', FollowSchema);