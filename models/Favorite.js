const db = require('../data/db.json');
const fs = require('fs').promises;
const path = require('path');

const dbPath = path.join(__dirname, '../data/db.json');

// Modelo de Favoritos
class Favorite {
  static async create(data) {
    const favorite = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId: data.userId,
      targetId: data.targetId,
      targetType: data.targetType, // 'job', 'candidate', 'company'
      listId: data.listId || 'default',
      notes: data.notes || '',
      createdAt: new Date().toISOString()
    };

    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.favorites) dbData.favorites = [];
    
    // Verificar se já existe
    const exists = dbData.favorites.find(f => 
      f.userId === favorite.userId && 
      f.targetId === favorite.targetId && 
      f.targetType === favorite.targetType
    );
    
    if (exists) return exists;
    
    dbData.favorites.push(favorite);
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    
    return favorite;
  }

  static async findByUserId(userId, targetType = null) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.favorites) return [];

    let favorites = dbData.favorites.filter(f => f.userId === userId);
    
    if (targetType) {
      favorites = favorites.filter(f => f.targetType === targetType);
    }
    
    return favorites.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async findByList(userId, listId) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.favorites) return [];

    return dbData.favorites
      .filter(f => f.userId === userId && f.listId === listId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async isFavorite(userId, targetId, targetType) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.favorites) return false;

    return dbData.favorites.some(f => 
      f.userId === userId && 
      f.targetId === targetId && 
      f.targetType === targetType
    );
  }

  static async delete(userId, targetId, targetType) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const index = dbData.favorites?.findIndex(f => 
      f.userId === userId && 
      f.targetId === targetId && 
      f.targetType === targetType
    );
    
    if (index === -1) return false;
    
    dbData.favorites.splice(index, 1);
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    
    return true;
  }

  static async updateList(favoriteId, newListId) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const index = dbData.favorites?.findIndex(f => f.id === favoriteId);
    
    if (index === -1) return null;
    
    dbData.favorites[index].listId = newListId;
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    
    return dbData.favorites[index];
  }
}

// Modelo de Lista de Favoritos
class FavoriteList {
  static async create(data) {
    const list = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId: data.userId,
      name: data.name,
      description: data.description || '',
      type: data.type, // 'jobs', 'candidates', 'companies'
      isPublic: data.isPublic || false,
      createdAt: new Date().toISOString()
    };

    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.favoriteLists) dbData.favoriteLists = [];
    
    dbData.favoriteLists.push(list);
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    
    return list;
  }

  static async findByUserId(userId) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.favoriteLists) return [];

    return dbData.favoriteLists
      .filter(l => l.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async findById(id) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    return dbData.favoriteLists?.find(l => l.id === id);
  }

  static async update(id, updates) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const index = dbData.favoriteLists?.findIndex(l => l.id === id);
    
    if (index === -1) return null;
    
    dbData.favoriteLists[index] = {
      ...dbData.favoriteLists[index],
      ...updates
    };
    
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    return dbData.favoriteLists[index];
  }

  static async delete(id) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const index = dbData.favoriteLists?.findIndex(l => l.id === id);
    
    if (index === -1) return false;
    
    // Mover favoritos dessa lista para 'default'
    if (dbData.favorites) {
      dbData.favorites.forEach(f => {
        if (f.listId === id) {
          f.listId = 'default';
        }
      });
    }
    
    dbData.favoriteLists.splice(index, 1);
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    
    return true;
  }
}

module.exports = { Favorite, FavoriteList };
