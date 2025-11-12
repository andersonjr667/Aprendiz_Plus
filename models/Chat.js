const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  candidateId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  companyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  jobId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Job' 
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  },
  lastMessage: String,
  lastMessageAt: { 
    type: Date, 
    default: Date.now 
  },
  unreadCount: {
    candidate: { type: Number, default: 0 },
    company: { type: Number, default: 0 }
  },
  archived: { 
    type: Boolean, 
    default: false 
  },
  archivedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['active', 'archived', 'closed'],
    default: 'active'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Índices para melhor performance
ChatSchema.index({ candidateId: 1, companyId: 1, jobId: 1 });
ChatSchema.index({ candidateId: 1, status: 1 });
ChatSchema.index({ companyId: 1, status: 1 });
ChatSchema.index({ lastMessageAt: -1 });

// Método para marcar mensagens como lidas
ChatSchema.methods.markAsRead = function(userType) {
  if (userType === 'candidato') {
    this.unreadCount.candidate = 0;
  } else if (userType === 'empresa') {
    this.unreadCount.company = 0;
  }
  return this.save();
};

// Método estático para encontrar ou criar chat
ChatSchema.statics.findOrCreate = async function(candidateId, companyId, jobId, applicationId) {
  let chat = await this.findOne({
    candidateId,
    companyId,
    jobId
  });

  if (!chat) {
    chat = await this.create({
      candidateId,
      companyId,
      jobId,
      applicationId
    });
  }

  return chat;
};

module.exports = mongoose.model('Chat', ChatSchema);
