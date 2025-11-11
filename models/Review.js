const db = require('../data/db.json');
const fs = require('fs').promises;
const path = require('path');

const dbPath = path.join(__dirname, '../data/db.json');

// Modelo de Avaliação
class Review {
  static async create(data) {
    const review = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      reviewerId: data.reviewerId,
      reviewerType: data.reviewerType, // 'candidate' ou 'company'
      targetId: data.targetId,
      targetType: data.targetType, // 'candidate' ou 'company'
      jobId: data.jobId || null,
      rating: Math.max(1, Math.min(5, data.rating)), // 1-5 estrelas
      comment: data.comment || '',
      pros: data.pros || [],
      cons: data.cons || [],
      anonymous: data.anonymous || false,
      status: 'pending', // pending, approved, rejected
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.reviews) dbData.reviews = [];
    
    // Verificar se já existe avaliação para esta combinação
    const exists = dbData.reviews.find(r => 
      r.reviewerId === review.reviewerId && 
      r.targetId === review.targetId && 
      r.jobId === review.jobId
    );
    
    if (exists) {
      throw new Error('Você já avaliou este perfil para esta vaga');
    }
    
    dbData.reviews.push(review);
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    
    // Atualizar rating médio do alvo
    await this.updateAverageRating(review.targetId, review.targetType);
    
    return review;
  }

  static async findByTargetId(targetId, status = 'approved') {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.reviews) return [];

    return dbData.reviews
      .filter(r => r.targetId === targetId && r.status === status)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async findByReviewerId(reviewerId) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.reviews) return [];

    return dbData.reviews
      .filter(r => r.reviewerId === reviewerId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async findPending(limit = 50) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.reviews) return [];

    return dbData.reviews
      .filter(r => r.status === 'pending')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(0, limit);
  }

  static async updateStatus(reviewId, status, moderatorNotes = '') {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const index = dbData.reviews?.findIndex(r => r.id === reviewId);
    
    if (index === -1) return null;
    
    dbData.reviews[index].status = status;
    dbData.reviews[index].moderatorNotes = moderatorNotes;
    dbData.reviews[index].updatedAt = new Date().toISOString();
    
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    
    // Atualizar rating médio
    await this.updateAverageRating(
      dbData.reviews[index].targetId, 
      dbData.reviews[index].targetType
    );
    
    return dbData.reviews[index];
  }

  static async getAverageRating(targetId) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.reviews) return { average: 0, count: 0 };

    const approvedReviews = dbData.reviews.filter(r => 
      r.targetId === targetId && r.status === 'approved'
    );

    if (approvedReviews.length === 0) {
      return { average: 0, count: 0 };
    }

    const sum = approvedReviews.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / approvedReviews.length;

    return {
      average: Math.round(average * 10) / 10,
      count: approvedReviews.length,
      distribution: this.getRatingDistribution(approvedReviews)
    };
  }

  static getRatingDistribution(reviews) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    reviews.forEach(r => {
      distribution[r.rating]++;
    });

    return distribution;
  }

  static async updateAverageRating(targetId, targetType) {
    const stats = await this.getAverageRating(targetId);
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));

    // Atualizar no perfil do usuário
    const userIndex = dbData.users?.findIndex(u => u.id === targetId);
    if (userIndex !== -1) {
      if (!dbData.users[userIndex].rating) {
        dbData.users[userIndex].rating = {};
      }
      dbData.users[userIndex].rating.average = stats.average;
      dbData.users[userIndex].rating.count = stats.count;
      dbData.users[userIndex].rating.distribution = stats.distribution;
      
      await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    }
  }

  static async delete(reviewId) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const index = dbData.reviews?.findIndex(r => r.id === reviewId);
    
    if (index === -1) return false;
    
    const review = dbData.reviews[index];
    dbData.reviews.splice(index, 1);
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    
    // Atualizar rating médio
    await this.updateAverageRating(review.targetId, review.targetType);
    
    return true;
  }

  static async reportReview(reviewId, reporterId, reason) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const index = dbData.reviews?.findIndex(r => r.id === reviewId);
    
    if (index === -1) return null;
    
    if (!dbData.reviews[index].reports) {
      dbData.reviews[index].reports = [];
    }
    
    dbData.reviews[index].reports.push({
      reporterId,
      reason,
      createdAt: new Date().toISOString()
    });
    
    // Se houver 3 ou mais denúncias, mudar status para pending
    if (dbData.reviews[index].reports.length >= 3) {
      dbData.reviews[index].status = 'pending';
    }
    
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    return dbData.reviews[index];
  }
}

module.exports = Review;
