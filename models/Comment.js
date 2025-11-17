const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  targetType: {
    type: String,
    enum: ['news', 'job'],
    required: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isApproved: {
    type: Boolean,
    default: true
  },
  isSpam: {
    type: Boolean,
    default: false
  },
  spamReason: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Índices para performance
CommentSchema.index({ targetId: 1, targetType: 1 });
CommentSchema.index({ author: 1 });
CommentSchema.index({ createdAt: -1 });

// Middleware para atualizar updatedAt
CommentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Método estático para contar comentários
CommentSchema.statics.countByTarget = function(targetId, targetType) {
  return this.countDocuments({ targetId, targetType, isApproved: true, isSpam: false });
};

// Método para verificar se usuário deu like
CommentSchema.methods.hasUserLiked = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

module.exports = mongoose.model('Comment', CommentSchema);