const mongoose = require('mongoose');

// Modelo para analytics de plataforma
const PlatformAnalyticsSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  metrics: {
    // Usuários
    totalUsers: { type: Number, default: 0 },
    newUsers: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 },
    candidatesCount: { type: Number, default: 0 },
    companiesCount: { type: Number, default: 0 },

    // Vagas
    totalJobs: { type: Number, default: 0 },
    newJobs: { type: Number, default: 0 },
    activeJobs: { type: Number, default: 0 },
    jobsWithApplications: { type: Number, default: 0 },

    // Candidaturas
    totalApplications: { type: Number, default: 0 },
    newApplications: { type: Number, default: 0 },
    acceptedApplications: { type: Number, default: 0 },
    rejectedApplications: { type: Number, default: 0 },
    pendingApplications: { type: Number, default: 0 },

    // Engajamento
    totalViews: { type: Number, default: 0 },
    jobViews: { type: Number, default: 0 },
    profileViews: { type: Number, default: 0 },
    newsViews: { type: Number, default: 0 },

    // Conversão
    applicationConversionRate: { type: Number, default: 0 }, // % de vagas que recebem candidaturas
    userConversionRate: { type: Number, default: 0 }, // % de candidatos que se candidatam
    jobFillRate: { type: Number, default: 0 }, // % de vagas preenchidas

    // Retenção
    returningUsers: { type: Number, default: 0 },
    userRetentionRate: { type: Number, default: 0 },

    // Conteúdo
    totalNews: { type: Number, default: 0 },
    newNews: { type: Number, default: 0 },
    totalComments: { type: Number, default: 0 },
    newComments: { type: Number, default: 0 },

    // Social
    totalFollows: { type: Number, default: 0 },
    newFollows: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    newLikes: { type: Number, default: 0 },

    // Sistema
    totalLogins: { type: Number, default: 0 },
    totalSearches: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now }
});

// Índice na data para consultas eficientes
PlatformAnalyticsSchema.index({ date: -1 });

module.exports = mongoose.model('PlatformAnalytics', PlatformAnalyticsSchema);