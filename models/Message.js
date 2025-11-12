const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderType: {
    type: String,
    enum: ['candidato', 'empresa'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  attachments: [{
    filename: String,
    url: String,
    fileType: String,
    size: Number
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Índices para performance
MessageSchema.index({ chatId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });

// Middleware para atualizar o chat quando uma mensagem é criada
MessageSchema.post('save', async function() {
  const Chat = mongoose.model('Chat');
  await Chat.findByIdAndUpdate(this.chatId, {
    lastMessage: this.content.substring(0, 100),
    lastMessageAt: this.createdAt,
    updatedAt: Date.now(),
    // Incrementar contador de não lidas para o destinatário
    $inc: {
      [this.senderType === 'candidato' ? 'unreadCount.company' : 'unreadCount.candidate']: 1
    }
  });
});

module.exports = mongoose.model('Message', MessageSchema);
