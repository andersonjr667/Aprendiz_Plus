const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
    try {
        // Verificar se já existe um admin
        const adminExists = await User.findOne({ type: 'admin' });
        if (adminExists) {
            console.log('Usuário admin já existe!');
            return;
        }

        // Criar usuário admin
        const adminUser = new User({
            name: 'Administrador',
            email: 'admin@aprendizmais.com',
            password: await bcrypt.hash('admin123', 10),
            type: 'admin',
            status: 'active',
            permissions: [
                'manage_users',
                'manage_jobs',
                'manage_companies',
                'manage_news',
                'view_logs',
                'manage_settings'
            ],
            cpf: '000.000.000-00', // CPF fictício para admin
            birthdate: new Date('1990-01-01') // Data fictícia para admin
        });

        await adminUser.save();
        console.log('Usuário admin criado com sucesso!');
        console.log('Email: admin@aprendizmais.com');
        console.log('Senha: admin123');
    } catch (error) {
        console.error('Erro ao criar usuário admin:', error);
    } finally {
        mongoose.disconnect();
    }
}

// Conectar ao banco de dados e criar admin
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aprendizmais', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Conectado ao MongoDB');
    createAdminUser();
})
.catch(error => {
    console.error('Erro ao conectar ao MongoDB:', error);
});