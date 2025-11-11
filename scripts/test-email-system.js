/**
 * Script de Teste do Sistema de Emails
 * 
 * Para executar: node scripts/test-email-system.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const emailService = require('../services/emailService');
const jobAlertService = require('../services/jobAlertService');
const User = require('../models/User');
const Job = require('../models/Job');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/aprendiz_plus';

async function testEmailSystem() {
  try {
    console.log('🚀 Iniciando testes do sistema de email...\n');
    
    // Conectar ao banco
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado ao MongoDB\n');
    
    // 1. Testar email de boas-vindas
    console.log('📧 Teste 1: Email de Boas-Vindas');
    const testUser = await User.findOne({ type: 'candidato' });
    if (testUser) {
      const result1 = await emailService.sendWelcomeEmail(testUser);
      console.log('Resultado:', result1.success ? '✅ Enviado' : '❌ Falhou');
      console.log('');
    } else {
      console.log('⚠️  Nenhum candidato encontrado no banco\n');
    }
    
    // 2. Testar email de confirmação
    console.log('📧 Teste 2: Email de Confirmação de Cadastro');
    if (testUser) {
      const result2 = await emailService.sendConfirmationEmail(testUser, 'test-token-12345');
      console.log('Resultado:', result2.success ? '✅ Enviado' : '❌ Falhou');
      console.log('');
    }
    
    // 3. Testar email de recuperação de senha
    console.log('📧 Teste 3: Email de Recuperação de Senha');
    if (testUser) {
      const result3 = await emailService.sendPasswordResetEmail(testUser, 'reset-token-12345');
      console.log('Resultado:', result3.success ? '✅ Enviado' : '❌ Falhou');
      console.log('');
    }
    
    // 4. Testar email de vaga publicada
    console.log('📧 Teste 4: Email de Vaga Publicada');
    const testCompany = await User.findOne({ type: 'empresa' });
    const testJob = await Job.findOne();
    if (testCompany && testJob) {
      const result4 = await emailService.sendJobPublishedEmail(testCompany, testJob);
      console.log('Resultado:', result4.success ? '✅ Enviado' : '❌ Falhou');
      console.log('');
    } else {
      console.log('⚠️  Nenhuma empresa ou vaga encontrada no banco\n');
    }
    
    // 5. Testar alerta de vagas compatíveis
    console.log('📧 Teste 5: Alerta de Vagas Compatíveis');
    if (testUser) {
      const matchingJobs = await jobAlertService.findMatchingJobsForCandidate(testUser._id, 3);
      console.log(`Vagas compatíveis encontradas: ${matchingJobs.length}`);
      
      if (matchingJobs.length > 0) {
        const result5 = await emailService.sendJobAlertEmail(testUser, matchingJobs);
        console.log('Resultado:', result5.success ? '✅ Enviado' : '❌ Falhou');
      } else {
        console.log('⚠️  Nenhuma vaga compatível encontrada');
      }
      console.log('');
    }
    
    // 6. Testar notificação de candidatura
    console.log('📧 Teste 6: Notificação de Candidatura');
    if (testCompany && testUser && testJob) {
      const result6 = await emailService.sendNewApplicationEmail(
        testCompany, 
        testUser, 
        testJob, 
        { _id: 'test-app-id' }
      );
      console.log('Resultado:', result6.success ? '✅ Enviado' : '❌ Falhou');
      console.log('');
    }
    
    // 7. Testar confirmação de candidatura
    console.log('📧 Teste 7: Confirmação de Candidatura');
    if (testUser && testJob && testCompany) {
      const result7 = await emailService.sendApplicationConfirmationEmail(
        testUser, 
        testJob, 
        testCompany
      );
      console.log('Resultado:', result7.success ? '✅ Enviado' : '❌ Falhou');
      console.log('');
    }
    
    console.log('✅ Todos os testes concluídos!\n');
    console.log('💡 Dica: Se estiver usando Ethereal (modo teste), verifique os links de preview no console.');
    console.log('💡 Para produção, configure as variáveis EMAIL_* no arquivo .env\n');
    
  } catch (error) {
    console.error('❌ Erro ao executar testes:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Conexão com MongoDB fechada');
    process.exit(0);
  }
}

// Executar testes
testEmailSystem();
