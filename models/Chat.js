const db = require('../data/db.json');
const fs = require('fs').promises;
const path = require('path');

const dbPath = path.join(__dirname, '../data/db.json');

// Modelo de Chat (Conversação entre candidato e empresa)
class Chat {
  static async create(data) {
    const chat = {
      id: Date.now().toString(),
      candidateId: data.candidateId,
      companyId: data.companyId,
      jobId: data.jobId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      archived: false,
      archivedBy: []
    };

    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.chats) dbData.chats = [];
    
    dbData.chats.push(chat);
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    
    return chat;
  }

  static async findById(id) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    return dbData.chats?.find(chat => chat.id === id);
  }

  static async findByParticipants(candidateId, companyId, jobId = null) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    return dbData.chats?.find(chat => 
      chat.candidateId === candidateId && 
      chat.companyId === companyId &&
      (!jobId || chat.jobId === jobId)
    );
  }

  static async findByUserId(userId, userType) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.chats) return [];

    const field = userType === 'candidate' ? 'candidateId' : 'companyId';
    return dbData.chats.filter(chat => 
      chat[field] === userId && 
      !chat.archivedBy.includes(userId)
    ).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  }

  static async update(id, updates) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const index = dbData.chats?.findIndex(chat => chat.id === id);
    
    if (index === -1) return null;
    
    dbData.chats[index] = {
      ...dbData.chats[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    return dbData.chats[index];
  }

  static async archive(chatId, userId) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const index = dbData.chats?.findIndex(chat => chat.id === chatId);
    
    if (index === -1) return null;
    
    if (!dbData.chats[index].archivedBy.includes(userId)) {
      dbData.chats[index].archivedBy.push(userId);
    }
    
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    return dbData.chats[index];
  }
}

module.exports = Chat;
