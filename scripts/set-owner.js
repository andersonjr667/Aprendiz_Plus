/**
 * Script para definir um usuário como DONO do sistema
 * 
 * Uso:
 * node scripts/set-owner.js EMAIL_DO_USUARIO
 * 
 * Exemplo:
 * node scripts/set-owner.js alsj1520@gmail.com
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function setOwner() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado ao MongoDB');

    // Pegar email do argumento da linha de comando
    const email = process.argv[2];
    
    if (!email) {
      console.error('❌ Erro: Email não fornecido');
      console.log('\nUso: node scripts/set-owner.js EMAIL_DO_USUARIO');
      console.log('Exemplo: node scripts/set-owner.js alsj1520@gmail.com');
      process.exit(1);
    }

    // Buscar usuário
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.error(`❌ Erro: Usuário com email "${email}" não encontrado`);
      process.exit(1);
    }

    console.log('\n📋 Usuário encontrado:');
    console.log(`   ID: ${user._id}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Type atual: ${user.type}`);

    // Verificar se já é owner
    if (user.type === 'owner') {
      console.log('\n✅ Este usuário já é DONO do sistema!');
      process.exit(0);
    }

    // Atualizar para owner
    const oldType = user.type;
    user.type = 'owner';
    await user.save();

    console.log('\n🎉 SUCESSO!');
    console.log(`   ${user.name} foi promovido de "${oldType}" para "owner"`);
    console.log('\n👑 Este usuário agora tem poderes de DONO do sistema:');
    console.log('   ✓ Promover/rebaixar administradores');
    console.log('   ✓ Acesso total a todas as funcionalidades');
    console.log('   ✓ Não pode ser banido ou suspenso');
    console.log('   ✓ Não pode ser editado por outros admins');
    console.log('   ✓ Acesso ao card "Gerenciar Admins" no painel');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Desconectado do MongoDB');
    process.exit(0);
  }
}

setOwner();
