/**
 * Script para Envio Automatizado de Alertas de Vagas
 * 
 * Este script pode ser executado periodicamente (ex: diariamente via cron)
 * para enviar alertas de vagas compatíveis aos candidatos
 * 
 * Exemplo de uso com cron (executar diariamente às 9h):
 * 0 9 * * * cd /path/to/Aprendiz_Plus && node scripts/send-job-alerts.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const jobAlertService = require('../services/jobAlertService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/aprendiz_plus';

async function sendJobAlerts() {
  try {
    console.log('🚀 Iniciando envio de alertas de vagas...');
    console.log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}\n`);
    
    // Conectar ao banco
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado ao MongoDB\n');
    
    // Enviar alertas
    const results = await jobAlertService.sendJobAlertsToActiveCandidates();
    
    console.log('\n📊 Relatório de Envio:');
    console.log(`Total de candidatos verificados: ${results.totalCandidates}`);
    console.log(`Emails enviados com sucesso: ${results.emailsSent}`);
    console.log(`Taxa de sucesso: ${results.totalCandidates > 0 ? ((results.emailsSent / results.totalCandidates) * 100).toFixed(1) : 0}%`);
    
    // Detalhes dos envios
    if (results.results.length > 0) {
      console.log('\n📋 Detalhes:');
      results.results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.candidateName} (${result.email})`);
        console.log(`   Vagas encontradas: ${result.jobsFound}`);
        console.log(`   Status: ${result.success ? '✅ Enviado' : '❌ Falhou'}`);
        if (!result.success && result.error) {
          console.log(`   Erro: ${result.error}`);
        }
      });
    }
    
    console.log('\n✅ Processo concluído!');
    
  } catch (error) {
    console.error('❌ Erro ao enviar alertas:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Conexão com MongoDB fechada');
    process.exit(0);
  }
}

// Executar
sendJobAlerts();
