#!/usr/bin/env node

/**
 * Script de migração para atualizar status de candidaturas
 * de português (pendente, aprovado, reprovado) 
 * para inglês (pending, accepted, rejected)
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function migrate() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado ao MongoDB');

    const Application = mongoose.model('Application', new mongoose.Schema({}, { strict: false }));

    // Mapear status de PT para EN
    const statusMap = {
      'pendente': 'pending',
      'aprovado': 'accepted',
      'reprovado': 'rejected'
    };

    // Buscar todas as candidaturas
    const applications = await Application.find({});
    console.log(`📊 Encontradas ${applications.length} candidaturas`);

    let updatedCount = 0;

    // Atualizar cada candidatura
    for (const app of applications) {
      if (statusMap[app.status]) {
        const oldStatus = app.status;
        const newStatus = statusMap[oldStatus];
        
        await Application.updateOne(
          { _id: app._id },
          { $set: { status: newStatus } }
        );
        
        console.log(`✓ Candidatura ${app._id}: ${oldStatus} → ${newStatus}`);
        updatedCount++;
      }
    }

    console.log(`\n✅ Migração concluída!`);
    console.log(`📈 ${updatedCount} candidaturas atualizadas`);
    console.log(`📋 ${applications.length - updatedCount} já estavam corretas\n`);

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão fechada');
  }
}

migrate();
