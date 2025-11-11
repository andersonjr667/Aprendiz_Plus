const db = require('../data/db.json');
const fs = require('fs').promises;
const path = require('path');

const dbPath = path.join(__dirname, '../data/db.json');
const Notification = require('./Notification');

// Sistema de Pontos e Gamificação
class Gamification {
  // Configuração de pontos
  static POINTS = {
    PROFILE_COMPLETE: 100,
    PROFILE_PHOTO: 50,
    PROFILE_VIDEO: 75,
    PROFILE_SKILLS: 25,
    PROFILE_EXPERIENCE: 50,
    PROFILE_EDUCATION: 40,
    APPLY_JOB: 10,
    POST_JOB: 20,
    RECEIVE_APPLICATION: 5,
    REVIEW_GIVEN: 15,
    REVIEW_RECEIVED: 5,
    EMAIL_VERIFIED: 50,
    DOCUMENT_VERIFIED: 100,
    LOGIN_STREAK_7: 50,
    LOGIN_STREAK_30: 200,
    PROFILE_VIEW: 2,
    FIRST_MESSAGE: 25
  };

  // Configuração de níveis
  static LEVELS = [
    { level: 1, minPoints: 0, name: 'Iniciante', benefits: [] },
    { level: 2, minPoints: 100, name: 'Aprendiz', benefits: ['Destaque em buscas'] },
    { level: 3, minPoints: 300, name: 'Profissional', benefits: ['Badge especial', 'Prioridade em candidaturas'] },
    { level: 4, minPoints: 600, name: 'Expert', benefits: ['Perfil verificado', 'Análises avançadas'] },
    { level: 5, minPoints: 1000, name: 'Mestre', benefits: ['Selo premium', 'Suporte prioritário'] },
    { level: 6, minPoints: 2000, name: 'Lenda', benefits: ['Badge exclusivo', 'Todas as vantagens'] }
  ];

  // Configuração de badges/conquistas
  static ACHIEVEMENTS = {
    FIRST_STEPS: {
      id: 'first_steps',
      name: 'Primeiros Passos',
      description: 'Complete seu perfil pela primeira vez',
      icon: '🎯',
      points: 100
    },
    NETWORKER: {
      id: 'networker',
      name: 'Networking Master',
      description: 'Envie 50 mensagens',
      icon: '💬',
      points: 150
    },
    JOB_SEEKER: {
      id: 'job_seeker',
      name: 'Caçador de Oportunidades',
      description: 'Candidate-se a 10 vagas',
      icon: '🎯',
      points: 100
    },
    POPULAR: {
      id: 'popular',
      name: 'Popular',
      description: 'Receba 100 visualizações no perfil',
      icon: '⭐',
      points: 200
    },
    RECRUITER: {
      id: 'recruiter',
      name: 'Recrutador Ativo',
      description: 'Publique 10 vagas',
      icon: '📋',
      points: 150
    },
    STREAK_MASTER: {
      id: 'streak_master',
      name: 'Dedicação Total',
      description: 'Mantenha uma sequência de 30 dias',
      icon: '🔥',
      points: 300
    },
    VERIFIED: {
      id: 'verified',
      name: 'Verificado',
      description: 'Complete todas as verificações',
      icon: '✓',
      points: 250
    },
    FIVE_STARS: {
      id: 'five_stars',
      name: 'Cinco Estrelas',
      description: 'Mantenha avaliação média de 5 estrelas',
      icon: '⭐⭐⭐⭐⭐',
      points: 200
    }
  };

  static async addPoints(userId, action, metadata = {}) {
    const points = this.POINTS[action] || 0;
    if (points === 0) return null;

    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const userIndex = dbData.users?.findIndex(u => u.id === userId);
    
    if (userIndex === -1) return null;

    // Inicializar gamificação se não existir
    if (!dbData.users[userIndex].gamification) {
      dbData.users[userIndex].gamification = {
        points: 0,
        level: 1,
        achievements: [],
        history: []
      };
    }

    const gamif = dbData.users[userIndex].gamification;
    const oldPoints = gamif.points;
    const oldLevel = gamif.level;

    // Adicionar pontos
    gamif.points += points;

    // Registrar no histórico
    gamif.history.push({
      action,
      points,
      metadata,
      timestamp: new Date().toISOString()
    });

    // Calcular novo nível
    const newLevel = this.calculateLevel(gamif.points);
    gamif.level = newLevel;

    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));

    // Notificar se subiu de nível
    if (newLevel > oldLevel) {
      const levelInfo = this.LEVELS.find(l => l.level === newLevel);
      await Notification.create({
        userId,
        type: 'level_up',
        title: '🎉 Você subiu de nível!',
        message: `Parabéns! Você alcançou o nível ${newLevel} - ${levelInfo.name}`,
        metadata: { level: newLevel, levelName: levelInfo.name }
      });
    }

    // Verificar conquistas
    await this.checkAchievements(userId);

    return {
      points: gamif.points,
      pointsAdded: points,
      level: gamif.level,
      leveledUp: newLevel > oldLevel
    };
  }

  static calculateLevel(points) {
    for (let i = this.LEVELS.length - 1; i >= 0; i--) {
      if (points >= this.LEVELS[i].minPoints) {
        return this.LEVELS[i].level;
      }
    }
    return 1;
  }

  static async checkAchievements(userId) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const userIndex = dbData.users?.findIndex(u => u.id === userId);
    
    if (userIndex === -1) return;

    const user = dbData.users[userIndex];
    const gamif = user.gamification || { achievements: [] };

    // Verificar cada conquista
    const newAchievements = [];

    // FIRST_STEPS - Perfil completo
    if (!gamif.achievements.includes('first_steps')) {
      const profileComplete = user.name && user.email && user.phone && 
                             (user.skills?.length > 0 || user.description);
      if (profileComplete) {
        newAchievements.push('first_steps');
      }
    }

    // NETWORKER - 50 mensagens enviadas
    if (!gamif.achievements.includes('networker')) {
      const messageCount = dbData.messages?.filter(m => m.senderId === userId).length || 0;
      if (messageCount >= 50) {
        newAchievements.push('networker');
      }
    }

    // JOB_SEEKER - 10 candidaturas
    if (!gamif.achievements.includes('job_seeker')) {
      const applicationCount = dbData.applications?.filter(a => a.candidateId === userId).length || 0;
      if (applicationCount >= 10) {
        newAchievements.push('job_seeker');
      }
    }

    // RECRUITER - 10 vagas publicadas
    if (!gamif.achievements.includes('recruiter') && user.role === 'company') {
      const jobCount = dbData.jobs?.filter(j => j.companyId === userId).length || 0;
      if (jobCount >= 10) {
        newAchievements.push('recruiter');
      }
    }

    // VERIFIED - Todas verificações
    if (!gamif.achievements.includes('verified')) {
      const allVerified = user.emailVerified && user.documentVerified && 
                         (user.role !== 'company' || user.cnpjVerified);
      if (allVerified) {
        newAchievements.push('verified');
      }
    }

    // FIVE_STARS - Avaliação 5 estrelas
    if (!gamif.achievements.includes('five_stars')) {
      if (user.rating && user.rating.average >= 4.8 && user.rating.count >= 5) {
        newAchievements.push('five_stars');
      }
    }

    // Adicionar novas conquistas
    if (newAchievements.length > 0) {
      gamif.achievements = [...new Set([...gamif.achievements, ...newAchievements])];
      dbData.users[userIndex].gamification = gamif;

      // Adicionar pontos das conquistas
      let totalPoints = 0;
      newAchievements.forEach(achievementId => {
        const achievement = Object.values(this.ACHIEVEMENTS).find(a => a.id === achievementId);
        if (achievement) {
          totalPoints += achievement.points;
          
          // Notificar
          Notification.create({
            userId,
            type: 'achievement',
            title: `🏆 Nova Conquista: ${achievement.name}`,
            message: achievement.description,
            metadata: { achievementId, points: achievement.points }
          });
        }
      });

      if (totalPoints > 0) {
        gamif.points = (gamif.points || 0) + totalPoints;
        gamif.level = this.calculateLevel(gamif.points);
      }

      await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    }

    return newAchievements;
  }

  static async getLeaderboard(limit = 100, userType = null) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.users) return [];

    let users = dbData.users.filter(u => u.gamification);
    
    if (userType) {
      users = users.filter(u => u.role === userType);
    }

    return users
      .map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        points: u.gamification.points,
        level: u.gamification.level,
        achievements: u.gamification.achievements.length,
        profilePhoto: u.profilePhoto
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, limit)
      .map((u, index) => ({ ...u, rank: index + 1 }));
  }

  static async getUserStats(userId) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const user = dbData.users?.find(u => u.id === userId);
    
    if (!user) return null;

    const gamif = user.gamification || { points: 0, level: 1, achievements: [] };
    const levelInfo = this.LEVELS.find(l => l.level === gamif.level);
    const nextLevel = this.LEVELS.find(l => l.level === gamif.level + 1);

    return {
      points: gamif.points,
      level: gamif.level,
      levelName: levelInfo.name,
      levelBenefits: levelInfo.benefits,
      achievements: gamif.achievements.map(id => 
        Object.values(this.ACHIEVEMENTS).find(a => a.id === id)
      ),
      nextLevel: nextLevel ? {
        level: nextLevel.level,
        name: nextLevel.name,
        pointsNeeded: nextLevel.minPoints - gamif.points
      } : null
    };
  }
}

module.exports = Gamification;
