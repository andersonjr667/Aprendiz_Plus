const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function createMongoAdmin() {
    try {
        // Conectar ao MongoDB
        console.log('Conectando ao MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });
        console.log('Conectado ao MongoDB');

        // Dados do admin
        const adminData = {
            email: 'alsj1520@gmail.com',
            password: '152070an',
            name: 'Anderson',
            type: 'admin',
            company: 'Aprendiz plus',
            cpf: '000.000.000-00',
            phone: '(00) 00000-0000',
            birthdate: new Date(),
            candidateProfile: {
                education: {
                    degree: 'Ensino Médio - Completo',
                    currentCourse: {
                        hasCourse: false
                    }
                }
            }
        };

        // Verificar se já existe
        const existingUser = await User.findOne({ email: adminData.email });
        if (existingUser) {
            if (existingUser.type === 'admin') {
                console.log('Admin já existe. Atualizando dados...');
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(adminData.password, salt);
                
                await User.findByIdAndUpdate(existingUser._id, {
                    ...adminData,
                    password: hashedPassword
                });
                console.log('Admin atualizado com sucesso!');
            } else {
                console.log('Promovendo usuário existente para admin...');
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(adminData.password, salt);
                
                await User.findByIdAndUpdate(existingUser._id, {
                    ...adminData,
                    password: hashedPassword,
                    type: 'admin'
                });
                console.log('Usuário promovido para admin com sucesso!');
            }
        } else {
            // Criar novo admin
            console.log('Criando novo admin...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminData.password, salt);
            
            const admin = new User({
                ...adminData,
                password: hashedPassword
            });
            
            await admin.save();
            console.log('Admin criado com sucesso!');
        }

    } catch (error) {
        console.error('Erro:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Desconectado do MongoDB');
        process.exit(0);
    }
}

// Executar
createMongoAdmin();