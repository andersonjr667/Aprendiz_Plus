require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

// Configuração do MongoDB
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/aprendiz_plus';

async function createAdmin() {
    try {
        // Conectar ao MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✓ Conectado ao MongoDB');

        // Verificar se o admin já existe
        const existingAdmin = await User.findOne({ email: 'alsj1520@gmail.com' });
        
        if (existingAdmin) {
            console.log('⚠ Usuário admin já existe!');
            console.log('Atualizando senha...');
            
            // Atualizar senha
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('152070an', salt);
            
            existingAdmin.passwordHash = passwordHash;
            existingAdmin.type = 'admin';
            existingAdmin.status = 'active';
            
            await existingAdmin.save();
            console.log('✓ Senha do admin atualizada com sucesso!');
        } else {
            // Criar hash da senha
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('152070an', salt);

            // Criar usuário admin
            const admin = new User({
                name: 'Administrador',
                email: 'alsj1520@gmail.com',
                passwordHash: passwordHash,
                type: 'admin',
                status: 'active',
                phone: '',
                bio: 'Administrador do sistema Aprendiz+',
                createdAt: new Date()
            });

            await admin.save();
            console.log('✓ Usuário admin criado com sucesso!');
        }

        console.log('\n========================================');
        console.log('Credenciais do Administrador:');
        console.log('Email: alsj1520@gmail.com');
        console.log('Senha: 152070an');
        console.log('Tipo: admin');
        console.log('========================================\n');

        // Desconectar
        await mongoose.disconnect();
        console.log('✓ Desconectado do MongoDB');
        
    } catch (error) {
        console.error('✗ Erro ao criar admin:', error);
        process.exit(1);
    }
}

// Executar
createAdmin();
