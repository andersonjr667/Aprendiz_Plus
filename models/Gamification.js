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
    },
    // 1. Conquistas de Construção de Perfil
    PERFIL_COMPLETO_CANDIDATO: {
      id: 'perfil_completo_candidato',
      name: 'Candidato 100%',
      description: 'Preencheu todos os campos obrigatórios do perfil de candidato',
      icon: '✅',
      points: 150
    },
    PERFIL_COMPLETO_EMPRESA: {
      id: 'perfil_completo_empresa',
      name: 'Empresa Transparente',
      description: 'Preencheu todos os campos obrigatórios do perfil de empresa',
      icon: '🏢',
      points: 150
    },
    CURRICULO_UPLOAD: {
      id: 'curriculo_upload',
      name: 'Pronto para o Jogo',
      description: 'Fez o upload do currículo (PDF/DOCX)',
      icon: '📄',
      points: 50
    },
    FOTO_PERFIL_HD: {
      id: 'foto_perfil_hd',
      name: 'Imagem Profissional',
      description: 'Adicionou uma foto de perfil de alta qualidade',
      icon: '📸',
      points: 50
    },
    // 2. Conquistas de Engajamento e Atividade (Gatilhos de pontos já existem para STREAK)
    LEITOR_ASSIDUO: {
      id: 'leitor_assiduo',
      name: 'Leitor Assíduo',
      description: 'Leu 10 artigos de notícias na plataforma',
      icon: '📰',
      points: 75
    },
    ASSISTENTE_IA: {
      id: 'assistente_ia',
      name: 'Mestre da IA',
      description: 'Utilizou o assistente de IA 5 vezes',
      icon: '🤖',
      points: 100
    },
    // 3. Conquistas de Busca e Candidatura (Candidatos)
    CAÇADOR_DE_OURO: {
      id: 'cacador_de_ouro',
      name: 'Caçador de Ouro',
      description: 'Candidatou-se a 25 vagas',
      icon: '🥇',
      points: 150
    },
    ESPECIALISTA_AREA: {
      id: 'especialista_area',
      name: 'Especialista da Área',
      description: 'Candidatou-se a 5 vagas em uma mesma área de interesse',
      icon: '🧭',
      points: 100
    },
    PRIMEIRO_MATCH: {
      id: 'primeiro_match',
      name: 'Primeiro Match',
      description: 'Recebeu a primeira candidatura aceita',
      icon: '🤝',
      points: 200
    },
    FAVORITADOR: {
      id: 'favoritador',
      name: 'Olho Clínico',
      description: 'Adicionou 10 vagas aos favoritos',
      icon: '❤️',
      points: 50
    },
    // 4. Conquistas de Recrutamento e Gestão (Empresas)
    RECRUTADOR_PRO: {
      id: 'recrutador_pro',
      name: 'Recrutador Pro',
      description: 'Publicou 25 vagas',
      icon: '🚀',
      points: 200
    },
    GESTOR_EFICIENTE: {
      id: 'gestor_eficiente',
      name: 'Gestor Eficiente',
      description: 'Respondeu a 10 candidaturas (aceitas ou rejeitadas)',
      icon: '⏱️',
      points: 100
    },
    PRIMEIRO_CONTRATADO: {
      id: 'primeiro_contratado',
      name: 'Primeiro Talento',
      description: 'Marcar a primeira candidatura como Contratado',
      icon: '🌟',
      points: 300
    },
    VAGA_VERIFICADA: {
      id: 'vaga_verificada',
      name: 'Vaga de Confiança',
      description: 'Publicou uma vaga com todos os detalhes verificados',
      icon: '🛡️',
      points: 100
    },
    // 5. Conquistas de Comunidade e Interação
    CHAT_ATIVO: {
      id: 'chat_ativo',
      name: 'Comunicador',
      description: 'Enviou 10 mensagens no chat da plataforma',
      icon: '💬',
      points: 50
    },
    AVALIADOR_CRITICO: {
      id: 'avaliador_critico',
      name: 'Voz da Comunidade',
      description: 'Deixou 5 avaliações (em empresas ou candidatos)',
      icon: '🗣️',
      points: 75
    },
    PERFIL_POPULAR_500: {
      id: 'perfil_popular_500',
      name: 'Superstar',
      description: 'Recebeu 500 visualizações no perfil',
      icon: '✨',
      points: 350
    },
    // 6. Conquistas de Excelência e Reconhecimento
    CINCO_ESTRELAS_PRO: {
      id: 'cinco_estrelas_pro',
      name: 'Excelência Máxima',
      description: 'Manteve avaliação média de 5 estrelas com mais de 10 avaliações',
      icon: '👑',
      points: 300
    },
    LIDER_RANKING: {
      id: 'lider_ranking',
      name: 'Top 10',
      description: 'Alcançou o Top 10 no ranking geral de pontos',
      icon: '🏆',
      points: 500
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
    
        // FIRST_STEPS - Perfil completo (EXISTENTE)
        if (!gamif.achievements.includes('first_steps')) {
          const profileComplete = user.name && user.email && user.phone && 
                                 (user.skills?.length > 0 || user.description);
          if (profileComplete) {
            newAchievements.push('first_steps');
          }
        }
    
        // NETWORKER - 50 mensagens enviadas (EXISTENTE)
        if (!gamif.achievements.includes('networker')) {
          const messageCount = dbData.messages?.filter(m => m.senderId === userId).length || 0;
          if (messageCount >= 50) {
            newAchievements.push('networker');
          }
        }
    
        // JOB_SEEKER - 10 candidaturas (EXISTENTE)
        if (!gamif.achievements.includes('job_seeker')) {
          const applicationCount = dbData.applications?.filter(a => a.candidateId === userId).length || 0;
          if (applicationCount >= 10) {
            newAchievements.push('job_seeker');
          }
        }
    
        // RECRUITER - 10 vagas publicadas (EXISTENTE)
        if (!gamif.achievements.includes('recruiter') && user.role === 'company') {
          const jobCount = dbData.jobs?.filter(j => j.companyId === userId).length || 0;
          if (jobCount >= 10) {
            newAchievements.push('recruiter');
          }
        }
    
        // VERIFIED - Todas verificações (EXISTENTE)
        if (!gamif.achievements.includes('verified')) {
          const allVerified = user.emailVerified && user.documentVerified && 
                             (user.role !== 'company' || user.cnpjVerified);
          if (allVerified) {
            newAchievements.push('verified');
          }
        }
    
        // FIVE_STARS - Avaliação 5 estrelas (EXISTENTE)
        if (!gamif.achievements.includes('five_stars')) {
          if (user.rating && user.rating.average >= 4.8 && user.rating.count >= 5) {
            newAchievements.push('five_stars');
          }
        }
    
        // --- NOVAS CONQUISTAS ---
    
        // PERFIL_COMPLETO_CANDIDATO - Candidato 100%
        if (!gamif.achievements.includes('perfil_completo_candidato') && user.role === 'candidato') {
          const candidateProfile = user.candidateProfile || {};
          const isComplete = user.name && user.email && user.phone && user.avatarUrl &&
                             candidateProfile.birthDate && candidateProfile.rg && candidateProfile.gender &&
                             candidateProfile.maritalStatus && candidateProfile.street && candidateProfile.number &&
                             candidateProfile.neighborhood && candidateProfile.city && candidateProfile.state &&
                             candidateProfile.cep && candidateProfile.whatsapp && candidateProfile.areasOfInterest?.length > 0 &&
                             candidateProfile.currentEducation && candidateProfile.educationInstitution;
          if (isComplete) {
            newAchievements.push('perfil_completo_candidato');
          }
        }
    
        // PERFIL_COMPLETO_EMPRESA - Empresa Transparente
        if (!gamif.achievements.includes('perfil_completo_empresa') && user.role === 'company') {
          const companyProfile = user.companyProfile || {};
          const isComplete = user.name && user.email && user.phone && user.avatarUrl && user.cnpj &&
                             companyProfile.website && companyProfile.description && companyProfile.tradeName &&
                             companyProfile.legalName && companyProfile.businessArea && companyProfile.numberOfEmployees &&
                             companyProfile.commercialPhone && companyProfile.corporateEmail && companyProfile.street &&
                             companyProfile.number && companyProfile.neighborhood && companyProfile.city &&
                             companyProfile.state && companyProfile.cep;
          if (isComplete) {
            newAchievements.push('perfil_completo_empresa');
          }
        }
    
        // CURRICULO_UPLOAD - Pronto para o Jogo
        if (!gamif.achievements.includes('curriculo_upload') && user.role === 'candidato') {
          if (user.resumeUrl) {
            newAchievements.push('curriculo_upload');
          }
        }
    
        // FOTO_PERFIL_HD - Imagem Profissional
        if (!gamif.achievements.includes('foto_perfil_hd')) {
          if (user.profilePhotoUrl) { // Simplesmente verifica se a URL existe. A validação de "alta qualidade" é mais complexa e pode ser feita em outro lugar.
            newAchievements.push('foto_perfil_hd');
          }
        }
    
        // LEITOR_ASSIDUO - Leu 10 artigos de notícias (Assumindo que News.js registra leitura em dbData.newsReads)
        if (!gamif.achievements.includes('leitor_assiduo')) {
          const newsReadCount = dbData.newsReads?.filter(r => r.userId === userId).length || 0;
          if (newsReadCount >= 10) {
            newAchievements.push('leitor_assiduo');
          }
        }
    
        // ASSISTENTE_IA - Mestre da IA (Assumindo que há um registro de uso do assistente em dbData.aiUsage)
        if (!gamif.achievements.includes('assistente_ia')) {
          const aiUsageCount = dbData.aiUsage?.filter(u => u.userId === userId).length || 0;
          if (aiUsageCount >= 5) {
            newAchievements.push('assistente_ia');
          }
        }
    
        // CAÇADOR_DE_OURO - Candidatou-se a 25 vagas
        if (!gamif.achievements.includes('cacador_de_ouro') && user.role === 'candidato') {
          const applicationCount = dbData.applications?.filter(a => a.candidateId === userId).length || 0;
          if (applicationCount >= 25) {
            newAchievements.push('cacador_de_ouro');
          }
        }
    
        // ESPECIALISTA_AREA - Candidatou-se a 5 vagas em uma mesma área de interesse (Gatilho complexo, simplificando para 5 candidaturas)
        // Para simplificar a implementação no db.json, vamos usar o gatilho de 5 candidaturas no total, se o usuário tiver áreas de interesse definidas.
        if (!gamif.achievements.includes('especialista_area') && user.role === 'candidato') {
          const applicationCount = dbData.applications?.filter(a => a.candidateId === userId).length || 0;
          if (applicationCount >= 5) {
            newAchievements.push('especialista_area');
          }
        }
    
        // PRIMEIRO_MATCH - Recebeu a primeira candidatura aceita
        if (!gamif.achievements.includes('primeiro_match') && user.role === 'candidato') {
          const acceptedApplication = dbData.applications?.find(a => a.candidateId === userId && a.status === 'accepted');
          if (acceptedApplication) {
            newAchievements.push('primeiro_match');
          }
        }
    
        // FAVORITADOR - Adicionou 10 vagas aos favoritos (Assumindo que Favorites.js registra em dbData.favorites)
        if (!gamif.achievements.includes('favoritador') && user.role === 'candidato') {
          const favoriteCount = dbData.favorites?.filter(f => f.userId === userId).length || 0;
          if (favoriteCount >= 10) {
            newAchievements.push('favoritador');
          }
        }
    
        // RECRUTADOR_PRO - Publicou 25 vagas
        if (!gamif.achievements.includes('recrutador_pro') && user.role === 'company') {
          const jobCount = dbData.jobs?.filter(j => j.companyId === userId).length || 0;
          if (jobCount >= 25) {
            newAchievements.push('recrutador_pro');
          }
        }
    
        // GESTOR_EFICIENTE - Respondeu a 10 candidaturas
        if (!gamif.achievements.includes('gestor_eficiente') && user.role === 'company') {
          const respondedApplications = dbData.applications?.filter(a => {
            const job = dbData.jobs?.find(j => j.id === a.jobId);
            return job && job.companyId === userId && (a.status === 'accepted' || a.status === 'rejected');
          }).length || 0;
          if (respondedApplications >= 10) {
            newAchievements.push('gestor_eficiente');
          }
        }
    
        // PRIMEIRO_CONTRATADO - Marcar a primeira candidatura como Contratado (Novo status 'hired' sugerido)
        if (!gamif.achievements.includes('primeiro_contratado') && user.role === 'company') {
          const hiredApplication = dbData.applications?.find(a => {
            const job = dbData.jobs?.find(j => j.id === a.jobId);
            return job && job.companyId === userId && a.status === 'hired';
          });
          if (hiredApplication) {
            newAchievements.push('primeiro_contratado');
          }
        }
    
        // VAGA_VERIFICADA - Publicou uma vaga com todos os detalhes verificados (Assumindo que 'verified' é um campo na vaga)
        if (!gamif.achievements.includes('vaga_verificada') && user.role === 'company') {
          const verifiedJob = dbData.jobs?.find(j => j.companyId === userId && j.status === 'verified');
          if (verifiedJob) {
            newAchievements.push('vaga_verificada');
          }
        }
    
        // CHAT_ATIVO - Enviou 10 mensagens
        if (!gamif.achievements.includes('chat_ativo')) {
          const messageCount = dbData.messages?.filter(m => m.senderId === userId).length || 0;
          if (messageCount >= 10) {
            newAchievements.push('chat_ativo');
          }
        }
    
        // AVALIADOR_CRITICO - Deixou 5 avaliações (Assumindo que Reviews.js registra em dbData.reviews)
        if (!gamif.achievements.includes('avaliador_critico')) {
          const reviewCount = dbData.reviews?.filter(r => r.reviewerId === userId).length || 0;
          if (reviewCount >= 5) {
            newAchievements.push('avaliador_critico');
          }
        }
    
        // PERFIL_POPULAR_500 - Recebeu 500 visualizações no perfil (Assumindo que ProfileView.js registra em dbData.profileViews)
        if (!gamif.achievements.includes('perfil_popular_500')) {
          const viewCount = dbData.profileViews?.filter(v => v.viewedUserId === userId).length || 0;
          if (viewCount >= 500) {
            newAchievements.push('perfil_popular_500');
          }
        }
    
        // CINCO_ESTRELAS_PRO - Excelência Máxima
        if (!gamif.achievements.includes('cinco_estrelas_pro')) {
          if (user.rating && user.rating.average >= 5.0 && user.rating.count >= 10) {
            newAchievements.push('cinco_estrelas_pro');
          }
        }
    
        // LIDER_RANKING - Top 10 (Requer a função getLeaderboard)
        if (!gamif.achievements.includes('lider_ranking')) {
          const leaderboard = await this.getLeaderboard(10);
          const userRank = leaderboard.find(u => u.id === userId)?.rank;
          if (userRank && userRank <= 10) {
            newAchievements.push('lider_ranking');
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

  // Novo método: Obter conquistas com progresso detalhado
  static async getUserAchievementsWithProgress(userId) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const user = dbData.users?.find(u => u.id === userId);
    
    if (!user) return null;

    const gamif = user.gamification || { achievements: [], bannerAchievements: [] };
    const obtainedAchievements = [];
    const nearAchievements = [];

    // Conquistas já obtidas
    gamif.achievements.forEach(achievementId => {
      const achievement = Object.values(this.ACHIEVEMENTS).find(a => a.id === achievementId);
      if (achievement) {
        obtainedAchievements.push({
          ...achievement,
          obtained: true,
          progress: 100,
          remaining: 0
        });
      }
    });

    // Verificar conquistas próximas (não obtidas ainda)
    Object.values(this.ACHIEVEMENTS).forEach(achievement => {
      if (!gamif.achievements.includes(achievement.id)) {
        const progress = this.calculateAchievementProgress(user, achievement.id, dbData);
        
        if (progress.progress > 0) { // Só mostrar se tem algum progresso
          nearAchievements.push({
            ...achievement,
            obtained: false,
            progress: progress.progress,
            remaining: progress.remaining,
            description: progress.description || achievement.description
          });
        }
      }
    });

    // Ordenar por progresso (maior primeiro)
    nearAchievements.sort((a, b) => b.progress - a.progress);

    return {
      obtained: obtainedAchievements,
      near: nearAchievements.slice(0, 5), // Top 5 próximas
      banner: gamif.bannerAchievements || []
    };
  }

  // Calcular progresso de uma conquista específica
  static calculateAchievementProgress(user, achievementId, dbData) {
    const progress = { progress: 0, remaining: 0, description: null };

    switch (achievementId) {
      case 'first_steps':
        const profileComplete = user.name && user.email && user.phone && 
                               (user.skills?.length > 0 || user.description);
        progress.progress = profileComplete ? 100 : 25;
        progress.remaining = profileComplete ? 0 : 'Complete seu perfil básico';
        break;

      case 'networker':
        const messageCount = dbData.messages?.filter(m => m.senderId === user.id).length || 0;
        progress.progress = Math.min((messageCount / 50) * 100, 100);
        progress.remaining = `Envie mais ${50 - messageCount} mensagens`;
        break;

      case 'job_seeker':
        const applicationCount = dbData.applications?.filter(a => a.candidateId === user.id).length || 0;
        progress.progress = Math.min((applicationCount / 10) * 100, 100);
        progress.remaining = `Candidate-se a mais ${10 - applicationCount} vagas`;
        break;

      case 'recruiter':
        if (user.role === 'company') {
          const jobCount = dbData.jobs?.filter(j => j.companyId === user.id).length || 0;
          progress.progress = Math.min((jobCount / 10) * 100, 100);
          progress.remaining = `Publique mais ${10 - jobCount} vagas`;
        }
        break;

      case 'verified':
        let verifiedCount = 0;
        if (user.emailVerified) verifiedCount++;
        if (user.documentVerified) verifiedCount++;
        if (user.role !== 'company' || user.cnpjVerified) verifiedCount++;
        progress.progress = (verifiedCount / 3) * 100;
        progress.remaining = `Complete ${3 - verifiedCount} verificações`;
        break;

      case 'five_stars':
        if (user.rating && user.rating.count >= 5) {
          progress.progress = Math.min((user.rating.average / 5) * 100, 100);
          progress.remaining = user.rating.average < 4.8 ? 'Melhore sua avaliação média' : '';
        }
        break;

      case 'perfil_completo_candidato':
        if (user.role === 'candidato') {
          const candidateProfile = user.candidateProfile || {};
          const fields = [
            user.name, user.email, user.phone, user.avatarUrl,
            candidateProfile.birthDate, candidateProfile.rg, candidateProfile.gender,
            candidateProfile.maritalStatus, candidateProfile.street, candidateProfile.number,
            candidateProfile.neighborhood, candidateProfile.city, candidateProfile.state,
            candidateProfile.cep, candidateProfile.whatsapp, 
            candidateProfile.areasOfInterest?.length > 0,
            candidateProfile.currentEducation, candidateProfile.educationInstitution
          ];
          const completedFields = fields.filter(f => f).length;
          progress.progress = (completedFields / fields.length) * 100;
          progress.remaining = `Complete ${fields.length - completedFields} campos do perfil`;
        }
        break;

      case 'perfil_completo_empresa':
        if (user.role === 'company') {
          const companyProfile = user.companyProfile || {};
          const fields = [
            user.name, user.email, user.phone, user.avatarUrl, user.cnpj,
            companyProfile.website, companyProfile.description, companyProfile.tradeName,
            companyProfile.legalName, companyProfile.businessArea, companyProfile.numberOfEmployees,
            companyProfile.commercialPhone, companyProfile.corporateEmail, companyProfile.street,
            companyProfile.number, companyProfile.neighborhood, companyProfile.city,
            companyProfile.state, companyProfile.cep
          ];
          const completedFields = fields.filter(f => f).length;
          progress.progress = (completedFields / fields.length) * 100;
          progress.remaining = `Complete ${fields.length - completedFields} campos do perfil`;
        }
        break;

      case 'curriculo_upload':
        progress.progress = user.resumeUrl ? 100 : 0;
        progress.remaining = 'Faça upload do seu currículo';
        break;

      case 'foto_perfil_hd':
        progress.progress = user.profilePhotoUrl ? 100 : 0;
        progress.remaining = 'Adicione uma foto de perfil';
        break;

      case 'leitor_assiduo':
        const newsReadCount = dbData.newsReads?.filter(r => r.userId === user.id).length || 0;
        progress.progress = Math.min((newsReadCount / 10) * 100, 100);
        progress.remaining = `Leia mais ${10 - newsReadCount} artigos`;
        break;

      case 'assistente_ia':
        const aiUsageCount = dbData.aiUsage?.filter(u => u.userId === user.id).length || 0;
        progress.progress = Math.min((aiUsageCount / 5) * 100, 100);
        progress.remaining = `Use o assistente IA mais ${5 - aiUsageCount} vezes`;
        break;

      case 'cacador_de_ouro':
        if (user.role === 'candidato') {
          const applicationCount = dbData.applications?.filter(a => a.candidateId === user.id).length || 0;
          progress.progress = Math.min((applicationCount / 25) * 100, 100);
          progress.remaining = `Candidate-se a mais ${25 - applicationCount} vagas`;
        }
        break;

      case 'especialista_area':
        if (user.role === 'candidato') {
          const applicationCount = dbData.applications?.filter(a => a.candidateId === user.id).length || 0;
          progress.progress = Math.min((applicationCount / 5) * 100, 100);
          progress.remaining = `Candidate-se a mais ${5 - applicationCount} vagas na sua área`;
        }
        break;

      case 'primeiro_match':
        if (user.role === 'candidato') {
          const hasAccepted = dbData.applications?.some(a => a.candidateId === user.id && a.status === 'accepted');
          progress.progress = hasAccepted ? 100 : 0;
          progress.remaining = 'Seja aceito em uma candidatura';
        }
        break;

      case 'favoritador':
        if (user.role === 'candidato') {
          const favoriteCount = dbData.favorites?.filter(f => f.userId === user.id).length || 0;
          progress.progress = Math.min((favoriteCount / 10) * 100, 100);
          progress.remaining = `Adicione mais ${10 - favoriteCount} vagas aos favoritos`;
        }
        break;

      case 'recrutador_pro':
        if (user.role === 'company') {
          const jobCount = dbData.jobs?.filter(j => j.companyId === user.id).length || 0;
          progress.progress = Math.min((jobCount / 25) * 100, 100);
          progress.remaining = `Publique mais ${25 - jobCount} vagas`;
        }
        break;

      case 'gestor_eficiente':
        if (user.role === 'company') {
          const respondedCount = dbData.applications?.filter(a => {
            const job = dbData.jobs?.find(j => j.id === a.jobId);
            return job && job.companyId === user.id && (a.status === 'accepted' || a.status === 'rejected');
          }).length || 0;
          progress.progress = Math.min((respondedCount / 10) * 100, 100);
          progress.remaining = `Responda a mais ${10 - respondedCount} candidaturas`;
        }
        break;

      case 'primeiro_contratado':
        if (user.role === 'company') {
          const hasHired = dbData.applications?.some(a => {
            const job = dbData.jobs?.find(j => j.id === a.jobId);
            return job && job.companyId === user.id && a.status === 'hired';
          });
          progress.progress = hasHired ? 100 : 0;
          progress.remaining = 'Contrate seu primeiro candidato';
        }
        break;

      case 'vaga_verificada':
        if (user.role === 'company') {
          const hasVerified = dbData.jobs?.some(j => j.companyId === user.id && j.status === 'verified');
          progress.progress = hasVerified ? 100 : 0;
          progress.remaining = 'Publique uma vaga verificada';
        }
        break;

      case 'chat_ativo':
        const messageCountChat = dbData.messages?.filter(m => m.senderId === user.id).length || 0;
        progress.progress = Math.min((messageCountChat / 10) * 100, 100);
        progress.remaining = `Envie mais ${10 - messageCountChat} mensagens`;
        break;

      case 'avaliador_critico':
        const reviewCount = dbData.reviews?.filter(r => r.reviewerId === user.id).length || 0;
        progress.progress = Math.min((reviewCount / 5) * 100, 100);
        progress.remaining = `Deixe mais ${5 - reviewCount} avaliações`;
        break;

      case 'perfil_popular_500':
        const viewCount = dbData.profileViews?.filter(v => v.viewedUserId === user.id).length || 0;
        progress.progress = Math.min((viewCount / 500) * 100, 100);
        progress.remaining = `Receba mais ${500 - viewCount} visualizações`;
        break;

      case 'cinco_estrelas_pro':
        if (user.rating && user.rating.count >= 10) {
          progress.progress = Math.min((user.rating.average / 5) * 100, 100);
          progress.remaining = user.rating.average < 5.0 ? 'Mantenha avaliação perfeita' : '';
        } else {
          progress.progress = (user.rating?.count || 0) / 10 * 100;
          progress.remaining = `Receba mais ${10 - (user.rating?.count || 0)} avaliações`;
        }
        break;

      case 'lider_ranking':
        // Complexo de calcular sem o leaderboard completo, simplificar
        progress.progress = 0;
        progress.remaining = 'Alcance o top 10 do ranking';
        break;
    }

    return progress;
  }

  // Novo método: Definir conquistas do banner
  static async setBannerAchievements(userId, achievementIds) {
    if (!Array.isArray(achievementIds) || achievementIds.length > 3) {
      throw new Error('Deve selecionar no máximo 3 conquistas');
    }

    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const userIndex = dbData.users?.findIndex(u => u.id === userId);
    
    if (userIndex === -1) return false;

    // Verificar se o usuário possui essas conquistas
    const gamif = dbData.users[userIndex].gamification || { achievements: [] };
    const validAchievements = achievementIds.filter(id => gamif.achievements.includes(id));

    if (validAchievements.length !== achievementIds.length) {
      throw new Error('Você só pode selecionar conquistas que já possui');
    }

    gamif.bannerAchievements = validAchievements;
    dbData.users[userIndex].gamification = gamif;

    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    return true;
  }

  // Novo método: Obter conquistas do banner
  static async getBannerAchievements(userId) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const user = dbData.users?.find(u => u.id === userId);
    
    if (!user) return [];

    const gamif = user.gamification || { bannerAchievements: [] };
    return gamif.bannerAchievements.map(id => 
      Object.values(this.ACHIEVEMENTS).find(a => a.id === id)
    ).filter(Boolean);
  }
}

module.exports = Gamification;
