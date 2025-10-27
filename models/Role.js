const mongoose = require('mongoose');

// Define o esquema de permissões
const permissionSchema = new mongoose.Schema({
    resource: {
        type: String,
        required: true,
        enum: ['users', 'jobs', 'news', 'companies', 'candidates', 'dashboard']
    },
    actions: [{
        type: String,
        required: true,
        enum: ['create', 'read', 'update', 'delete', 'manage']
    }]
});

// Define o esquema de roles (papéis)
const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    permissions: [permissionSchema],
    isAdmin: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware para atualizar o updatedAt
roleSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Método para verificar se role tem permissão específica
roleSchema.methods.hasPermission = function(resource, action) {
    if (this.isAdmin) return true;
    
    return this.permissions.some(permission => 
        permission.resource === resource && 
        permission.actions.includes(action)
    );
};

// Método para verificar múltiplas permissões
roleSchema.methods.hasPermissions = function(permissions) {
    if (this.isAdmin) return true;
    
    return permissions.every(({ resource, action }) => 
        this.hasPermission(resource, action)
    );
};

const Role = mongoose.model('Role', roleSchema);

// Criar roles padrão se não existirem
async function createDefaultRoles() {
    try {
        // Role de Super Admin
        const superAdmin = {
            name: 'super_admin',
            description: 'Acesso total ao sistema',
            isAdmin: true,
            permissions: []
        };

        // Role de Admin
        const admin = {
            name: 'admin',
            description: 'Administrador do sistema',
            permissions: [
                {
                    resource: 'users',
                    actions: ['create', 'read', 'update', 'delete', 'manage']
                },
                {
                    resource: 'jobs',
                    actions: ['create', 'read', 'update', 'delete', 'manage']
                },
                {
                    resource: 'news',
                    actions: ['create', 'read', 'update', 'delete']
                },
                {
                    resource: 'companies',
                    actions: ['read', 'update', 'manage']
                },
                {
                    resource: 'candidates',
                    actions: ['read', 'update', 'manage']
                },
                {
                    resource: 'dashboard',
                    actions: ['read']
                }
            ]
        };

        // Role de Moderador
        const moderator = {
            name: 'moderator',
            description: 'Moderador do sistema',
            permissions: [
                {
                    resource: 'jobs',
                    actions: ['read', 'update']
                },
                {
                    resource: 'news',
                    actions: ['read', 'update']
                },
                {
                    resource: 'companies',
                    actions: ['read']
                },
                {
                    resource: 'candidates',
                    actions: ['read']
                },
                {
                    resource: 'dashboard',
                    actions: ['read']
                }
            ]
        };

        // Criar roles se não existirem
        for (const role of [superAdmin, admin, moderator]) {
            const exists = await Role.findOne({ name: role.name });
            if (!exists) {
                await Role.create(role);
                console.log(`Role ${role.name} criada com sucesso`);
            }
        }
    } catch (error) {
        console.error('Erro ao criar roles padrão:', error);
    }
}

// Executar criação de roles padrão
createDefaultRoles();

module.exports = Role;