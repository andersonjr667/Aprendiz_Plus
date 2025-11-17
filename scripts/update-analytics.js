#!/usr/bin/env node

/**
 * Script para atualizar as analytics da plataforma
 * Deve ser executado diariamente para manter métricas atualizadas
 */

require('dotenv').config();
const mongoose = require('mongoose');
const PlatformAnalytics = require('../models/PlatformAnalytics');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const News = require('../models/News');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/aprendiz_plus';

async function updateAnalytics() {
  try {
    console.log('🚀 Iniciando atualização das analytics...');
    console.log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}\n`);

    // Conectar ao banco
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado ao MongoDB\n');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verificar se já existe analytics para hoje
    let analytics = await PlatformAnalytics.findOne({ date: today });

    if (analytics) {
      console.log('📊 Analytics para hoje já existem. Atualizando...\n');
    } else {
      console.log('📊 Criando nova entrada de analytics para hoje...\n');
      analytics = new PlatformAnalytics({ date: today });
    }

    // Calcular métricas
    console.log('🔢 Calculando métricas...');

    // Usuários
    const totalUsers = await User.countDocuments();
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: today }
    });
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Últimos 7 dias
    });

    // Vagas
    const totalJobs = await Job.countDocuments();
    const newJobsToday = await Job.countDocuments({
      createdAt: { $gte: today }
    });
    const activeJobs = await Job.countDocuments({
      status: { $in: ['active', 'aberta'] }
    });

    // Candidaturas
    const totalApplications = await Application.countDocuments();
    const newApplicationsToday = await Application.countDocuments({
      appliedAt: { $gte: today }
    });

    // Engajamento (views)
    const jobViewsResult = await Job.aggregate([
      { $group: { _id: null, total: { $sum: '$viewCount' } } }
    ]);
    const newsViewsResult = await News.aggregate([
      { $group: { _id: null, total: { $sum: '$viewCount' } } }
    ]);

    const jobViews = jobViewsResult[0]?.total || 0;
    const newsViews = newsViewsResult[0]?.total || 0;
    const totalViews = jobViews + newsViews;

    // Atualizar dados
    analytics.data = {
      users: {
        total: totalUsers,
        new: newUsersToday,
        active: activeUsers
      },
      jobs: {
        total: totalJobs,
        new: newJobsToday,
        active: activeJobs
      },
      applications: {
        total: totalApplications,
        new: newApplicationsToday
      },
      engagement: {
        jobViews,
        newsViews,
        totalViews
      }
    };

    await analytics.save();

    // Exibir relatório
    console.log('📊 Relatório de Analytics Atualizado:');
    console.log('=====================================');
    console.log(`👥 Usuários:`);
    console.log(`   Total: ${totalUsers}`);
    console.log(`   Novos hoje: ${newUsersToday}`);
    console.log(`   Ativos (7d): ${activeUsers}`);
    console.log(`💼 Vagas:`);
    console.log(`   Total: ${totalJobs}`);
    console.log(`   Novas hoje: ${newJobsToday}`);
    console.log(`   Ativas: ${activeJobs}`);
    console.log(`📄 Candidaturas:`);
    console.log(`   Total: ${totalApplications}`);
    console.log(`   Novas hoje: ${newApplicationsToday}`);
    console.log(`👁️  Engajamento:`);
    console.log(`   Visualizações de vagas: ${jobViews}`);
    console.log(`   Visualizações de notícias: ${newsViews}`);
    console.log(`   Total de visualizações: ${totalViews}`);
    console.log('=====================================\n');

    console.log('✅ Analytics atualizadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao atualizar analytics:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Conexão com MongoDB fechada');
    process.exit(0);
  }
}

// Executar
updateAnalytics();