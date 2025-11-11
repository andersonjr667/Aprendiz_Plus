const db = require('../data/db.json');
const fs = require('fs').promises;
const path = require('path');

const dbPath = path.join(__dirname, '../data/db.json');

// Sistema Anti-Spam
class AntiSpam {
  // Limites de ações por período
  static LIMITS = {
    MESSAGES_PER_HOUR: 20,
    MESSAGES_PER_DAY: 100,
    APPLICATIONS_PER_DAY: 30,
    REVIEWS_PER_DAY: 5,
    FAVORITES_PER_HOUR: 50,
    PROFILE_VIEWS_PER_HOUR: 100
  };

  // Pontuação de spam (quanto maior, mais suspeito)
  static SPAM_SCORES = {
    REPEATED_CONTENT: 10,
    RAPID_ACTIONS: 5,
    SUSPICIOUS_LINKS: 15,
    MASS_MESSAGING: 8,
    BLACKLISTED_WORDS: 12
  };

  static SPAM_THRESHOLD = 30; // Pontuação acima disso é bloqueado

  // Palavras suspeitas
  static BLACKLIST = [
    'ganhe dinheiro rápido', 'clique aqui', 'compre agora', 
    'oferta imperdível', 'marketing multinível', 'pirâmide',
    'bitcoin grátis', 'trabalhe em casa'
  ];

  static async checkRateLimit(userId, action) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.rateLimits) dbData.rateLimits = {};
    
    const now = new Date();
    const hourAgo = new Date(now - 60 * 60 * 1000);
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

    const key = `${userId}_${action}`;
    
    if (!dbData.rateLimits[key]) {
      dbData.rateLimits[key] = [];
    }

    // Limpar registros antigos
    dbData.rateLimits[key] = dbData.rateLimits[key].filter(timestamp => 
      new Date(timestamp) > dayAgo
    );

    const actionsLastHour = dbData.rateLimits[key].filter(timestamp => 
      new Date(timestamp) > hourAgo
    ).length;

    const actionsLastDay = dbData.rateLimits[key].length;

    // Verificar limites
    let limitExceeded = false;
    let limit = null;
    let period = null;

    switch(action) {
      case 'message':
        if (actionsLastHour >= this.LIMITS.MESSAGES_PER_HOUR) {
          limitExceeded = true;
          limit = this.LIMITS.MESSAGES_PER_HOUR;
          period = 'hora';
        } else if (actionsLastDay >= this.LIMITS.MESSAGES_PER_DAY) {
          limitExceeded = true;
          limit = this.LIMITS.MESSAGES_PER_DAY;
          period = 'dia';
        }
        break;
      
      case 'application':
        if (actionsLastDay >= this.LIMITS.APPLICATIONS_PER_DAY) {
          limitExceeded = true;
          limit = this.LIMITS.APPLICATIONS_PER_DAY;
          period = 'dia';
        }
        break;
      
      case 'review':
        if (actionsLastDay >= this.LIMITS.REVIEWS_PER_DAY) {
          limitExceeded = true;
          limit = this.LIMITS.REVIEWS_PER_DAY;
          period = 'dia';
        }
        break;
      
      case 'favorite':
        if (actionsLastHour >= this.LIMITS.FAVORITES_PER_HOUR) {
          limitExceeded = true;
          limit = this.LIMITS.FAVORITES_PER_HOUR;
          period = 'hora';
        }
        break;

      case 'profile_view':
        if (actionsLastHour >= this.LIMITS.PROFILE_VIEWS_PER_HOUR) {
          limitExceeded = true;
          limit = this.LIMITS.PROFILE_VIEWS_PER_HOUR;
          period = 'hora';
        }
        break;
    }

    if (limitExceeded) {
      // Registrar tentativa de spam
      await this.recordSpamAttempt(userId, 'rate_limit_exceeded', {
        action,
        limit,
        period
      });

      return {
        allowed: false,
        reason: `Limite de ${limit} ${action}s por ${period} excedido`,
        retryAfter: period === 'hora' ? hourAgo : dayAgo
      };
    }

    // Registrar ação
    dbData.rateLimits[key].push(now.toISOString());
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));

    return { allowed: true };
  }

  static async checkContentSpam(content, userId) {
    let spamScore = 0;
    const reasons = [];

    // Verificar palavras na blacklist
    const lowerContent = content.toLowerCase();
    this.BLACKLIST.forEach(word => {
      if (lowerContent.includes(word)) {
        spamScore += this.SPAM_SCORES.BLACKLISTED_WORDS;
        reasons.push(`Palavra suspeita: ${word}`);
      }
    });

    // Verificar links suspeitos
    const linkPattern = /(https?:\/\/[^\s]+)/g;
    const links = content.match(linkPattern) || [];
    if (links.length > 3) {
      spamScore += this.SPAM_SCORES.SUSPICIOUS_LINKS;
      reasons.push('Muitos links no conteúdo');
    }

    // Verificar conteúdo repetido
    const recentContent = await this.getRecentContent(userId, 'message');
    const duplicates = recentContent.filter(msg => 
      this.similarityScore(msg.content, content) > 0.8
    );
    
    if (duplicates.length >= 3) {
      spamScore += this.SPAM_SCORES.REPEATED_CONTENT;
      reasons.push('Conteúdo repetido múltiplas vezes');
    }

    // Verificar letras maiúsculas excessivas
    const upperCaseRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (upperCaseRatio > 0.6 && content.length > 20) {
      spamScore += 5;
      reasons.push('Uso excessivo de maiúsculas');
    }

    const isSpam = spamScore >= this.SPAM_THRESHOLD;

    if (isSpam) {
      await this.recordSpamAttempt(userId, 'content_spam', {
        spamScore,
        reasons,
        content: content.substring(0, 100)
      });
    }

    return {
      isSpam,
      spamScore,
      reasons,
      threshold: this.SPAM_THRESHOLD
    };
  }

  static similarityScore(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  static levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  static async getRecentContent(userId, type, hours = 24) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    if (type === 'message' && dbData.messages) {
      return dbData.messages.filter(m => 
        m.senderId === userId && new Date(m.createdAt) > cutoff
      );
    }

    return [];
  }

  static async recordSpamAttempt(userId, type, metadata = {}) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.spamAttempts) dbData.spamAttempts = [];

    const attempt = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId,
      type,
      metadata,
      timestamp: new Date().toISOString()
    };

    dbData.spamAttempts.push(attempt);

    // Verificar se usuário deve ser bloqueado
    const recentAttempts = dbData.spamAttempts.filter(a => 
      a.userId === userId && 
      new Date(a.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    if (recentAttempts.length >= 10) {
      // Bloquear usuário temporariamente
      const userIndex = dbData.users?.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        dbData.users[userIndex].restricted = true;
        dbData.users[userIndex].restrictedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        dbData.users[userIndex].restrictionReason = 'Múltiplas tentativas de spam';
      }
    }

    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    return attempt;
  }

  static async isUserRestricted(userId) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const user = dbData.users?.find(u => u.id === userId);

    if (!user) return false;
    if (!user.restricted) return false;

    // Verificar se restrição expirou
    if (user.restrictedUntil && new Date(user.restrictedUntil) < new Date()) {
      const userIndex = dbData.users.findIndex(u => u.id === userId);
      dbData.users[userIndex].restricted = false;
      delete dbData.users[userIndex].restrictedUntil;
      delete dbData.users[userIndex].restrictionReason;
      await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
      return false;
    }

    return {
      restricted: true,
      until: user.restrictedUntil,
      reason: user.restrictionReason
    };
  }

  static async getSpamReports(limit = 50) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.spamAttempts) return [];

    return dbData.spamAttempts
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }
}

module.exports = AntiSpam;
