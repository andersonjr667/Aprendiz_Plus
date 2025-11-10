const mongoose = require('mongoose');

const ProfileLikeSchema = new mongoose.Schema({
  // Quem curtiu
  liker: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  // Perfil curtido
  profileUser: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Evitar que o mesmo usuário curta o mesmo perfil múltiplas vezes
ProfileLikeSchema.index({ liker: 1, profileUser: 1 }, { unique: true });

module.exports = mongoose.model('ProfileLike', ProfileLikeSchema);
