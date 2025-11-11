const db = require('../data/db.json');
const fs = require('fs').promises;
const path = require('path');

const dbPath = path.join(__dirname, '../data/db.json');

// Modelo de Notificação
class Notification {
  static async create(data) {
    const notification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId: data.userId,
      type: data.type, // 'message', 'application', 'evaluation', 'achievement', etc
      title: data.title,
      message: data.message,
      link: data.link || null,
      read: false,
      metadata: data.metadata || {},
      createdAt: new Date().toISOString()
    };

    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.notifications) dbData.notifications = [];
    
    dbData.notifications.push(notification);
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    
    return notification;
  }

  static async findByUserId(userId, limit = 20, unreadOnly = false) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.notifications) return [];

    let notifications = dbData.notifications.filter(n => n.userId === userId);
    
    if (unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }
    
    return notifications
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  static async markAsRead(notificationId) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const index = dbData.notifications?.findIndex(n => n.id === notificationId);
    
    if (index === -1) return null;
    
    dbData.notifications[index].read = true;
    dbData.notifications[index].readAt = new Date().toISOString();
    
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    return dbData.notifications[index];
  }

  static async markAllAsRead(userId) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.notifications) return 0;

    let updatedCount = 0;
    const now = new Date().toISOString();
    
    dbData.notifications.forEach(n => {
      if (n.userId === userId && !n.read) {
        n.read = true;
        n.readAt = now;
        updatedCount++;
      }
    });
    
    if (updatedCount > 0) {
      await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    }
    
    return updatedCount;
  }

  static async getUnreadCount(userId) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.notifications) return 0;

    return dbData.notifications.filter(n => n.userId === userId && !n.read).length;
  }

  static async delete(notificationId) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const index = dbData.notifications?.findIndex(n => n.id === notificationId);
    
    if (index === -1) return false;
    
    dbData.notifications.splice(index, 1);
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    
    return true;
  }

  static async deleteOld(daysOld = 30) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.notifications) return 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const initialLength = dbData.notifications.length;
    dbData.notifications = dbData.notifications.filter(n => 
      new Date(n.createdAt) > cutoffDate
    );

    const deletedCount = initialLength - dbData.notifications.length;
    
    if (deletedCount > 0) {
      await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    }
    
    return deletedCount;
  }
}

module.exports = Notification;
