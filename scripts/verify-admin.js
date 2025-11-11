require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function verifyAdmin() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✓ Conectado ao MongoDB\n');

        const admin = await User.findOne({ email: 'alsj1520@gmail.com' });
        
        if (admin) {
            console.log('========================================');
            console.log('✓ Usuário Admin encontrado!');
            console.log('========================================');
            console.log('ID:', admin._id);
            console.log('Nome:', admin.name);
            console.log('Email:', admin.email);
            console.log('Tipo:', admin.type);
            console.log('Status:', admin.status);
            console.log('Criado em:', admin.createdAt);
            console.log('========================================\n');
        } else {
            console.log('✗ Usuário admin não encontrado!\n');
        }

        await mongoose.disconnect();
        console.log('✓ Desconectado do MongoDB');
        
    } catch (error) {
        console.error('✗ Erro:', error);
        process.exit(1);
    }
}

verifyAdmin();
