const db = require('../data/db.json');
const fs = require('fs').promises;
const path = require('path');

const dbPath = path.join(__dirname, '../data/db.json');

// Modelo de Mensagem
class Message {
  static async create(data) {
    const message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      chatId: data.chatId,
      senderId: data.senderId,
      senderType: data.senderType, // 'candidate' ou 'company'
      content: data.content,
      attachments: data.attachments || [],
      createdAt: new Date().toISOString(),
      readBy: [data.senderId], // Remetente já leu
      readAt: {}
    };

    message.readAt[data.senderId] = new Date().toISOString();

    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.messages) dbData.messages = [];
    
    dbData.messages.push(message);
    
    // Atualizar lastMessageAt no chat
    const Chat = require('./Chat');
    await Chat.update(data.chatId, {
      lastMessageAt: message.createdAt
    });
    
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    
    return message;
  }

  static async findByChatId(chatId, limit = 50, offset = 0) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.messages) return [];

    const messages = dbData.messages
      .filter(msg => msg.chatId === chatId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(offset, offset + limit);
    
    return messages.reverse(); // Retornar em ordem cronológica
  }

  static async markAsRead(messageId, userId) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const index = dbData.messages?.findIndex(msg => msg.id === messageId);
    
    if (index === -1) return null;
    
    if (!dbData.messages[index].readBy.includes(userId)) {
      dbData.messages[index].readBy.push(userId);
      dbData.messages[index].readAt[userId] = new Date().toISOString();
    }
    
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    return dbData.messages[index];
  }

  static async markChatAsRead(chatId, userId) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.messages) return 0;

    let updatedCount = 0;
    
    dbData.messages.forEach(msg => {
      if (msg.chatId === chatId && !msg.readBy.includes(userId)) {
        msg.readBy.push(userId);
        msg.readAt[userId] = new Date().toISOString();
        updatedCount++;
      }
    });
    
    if (updatedCount > 0) {
      await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    }
    
    return updatedCount;
  }

  static async getUnreadCount(userId, chatId = null) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.messages) return 0;

    return dbData.messages.filter(msg => 
      msg.senderId !== userId &&
      (!chatId || msg.chatId === chatId) &&
      !msg.readBy.includes(userId)
    ).length;
  }

  static async delete(messageId) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const index = dbData.messages?.findIndex(msg => msg.id === messageId);
    
    if (index === -1) return false;
    
    dbData.messages.splice(index, 1);
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    
    return true;
  }
}

module.exports = Message;
