const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');
require('dotenv').config();

async function migrateUserRoles() {
    try {
        // Conectar ao MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Conectado ao MongoDB');

        // Buscar todas as roles
        const [superAdminRole, adminRole] = await Promise.all([
            Role.findOne({ name: 'super_admin' }),
            Role.findOne({ name: 'admin' })
        ]);

        if (!superAdminRole || !adminRole) {
            console.error('Roles não encontradas. Execute primeiro o script de criação de roles.');
            process.exit(1);
        }

        // Buscar todos os usuários
        const users = await User.find();
        console.log(`Encontrados ${users.length} usuários para migração`);

        // Migrar cada usuário
        for (const user of users) {
            try {
                // Se o usuário já tem uma role, pular
                if (user.role) {
                    console.log(`Usuário ${user.email} já tem role definida`);
                    continue;
                }

                // Definir role baseado no tipo e permissions do usuário
                let roleToAssign = null;

                if (user.type === 'admin') {
                    // Se tiver todas as permissões, é super admin
                    if (user.permissions && user.permissions.length >= 6) {
                        roleToAssign = superAdminRole;
                    } else {
                        roleToAssign = adminRole;
                    }
                }

                // Atualizar usuário
                if (roleToAssign) {
                    await User.updateOne(
                        { _id: user._id },
                        { 
                            $set: { role: roleToAssign._id },
                            $unset: { permissions: "" }  // Remover campo antigo
                        }
                    );
                    console.log(`Usuário ${user.email} atualizado com role ${roleToAssign.name}`);
                } else {
                    console.log(`Usuário ${user.email} não precisa de role administrativa`);
                }
            } catch (error) {
                console.error(`Erro ao migrar usuário ${user.email}:`, error);
            }
        }

        console.log('Migração concluída');
        process.exit(0);
    } catch (error) {
        console.error('Erro durante a migração:', error);
        process.exit(1);
    }
}

migrateUserRoles();