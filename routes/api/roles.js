const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { isAdmin, hasPermission } = require('../../middleware/admin-auth');
const Role = require('../../models/Role');
const AuditLog = require('../../models/AuditLog');

// Listar todas as roles
router.get('/', auth, hasPermission('users', 'manage'), async (req, res) => {
    try {
        const roles = await Role.find().sort('name');
        res.json(roles);
    } catch (error) {
        console.error('Erro ao listar roles:', error);
        res.status(500).json({ error: 'Erro ao listar roles' });
    }
});

// Buscar role específica
router.get('/:id', auth, hasPermission('users', 'manage'), async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);
        if (!role) {
            return res.status(404).json({ error: 'Role não encontrada' });
        }
        res.json(role);
    } catch (error) {
        console.error('Erro ao buscar role:', error);
        res.status(500).json({ error: 'Erro ao buscar role' });
    }
});

// Criar nova role (apenas super admin)
router.post('/', auth, isAdmin, async (req, res) => {
    try {
        const { name, description, permissions, isAdmin } = req.body;

        // Verificar se já existe role com mesmo nome
        const existingRole = await Role.findOne({ name });
        if (existingRole) {
            return res.status(400).json({ error: 'Já existe uma role com este nome' });
        }

        // Criar role
        const role = new Role({
            name,
            description,
            permissions,
            isAdmin: isAdmin || false
        });

        await role.save();

        // Registrar log
        await AuditLog.create({
            action: 'create_role',
            userId: req.user.id,
            details: {
                roleName: name,
                isAdmin: isAdmin || false
            }
        });

        res.status(201).json(role);
    } catch (error) {
        console.error('Erro ao criar role:', error);
        res.status(500).json({ error: 'Erro ao criar role' });
    }
});

// Atualizar role (apenas super admin)
router.put('/:id', auth, isAdmin, async (req, res) => {
    try {
        const { name, description, permissions, isAdmin } = req.body;
        const roleId = req.params.id;

        // Verificar se role existe
        const role = await Role.findById(roleId);
        if (!role) {
            return res.status(404).json({ error: 'Role não encontrada' });
        }

        // Impedir alteração de roles padrão do sistema
        if (role.name === 'super_admin') {
            return res.status(403).json({ error: 'Não é possível alterar a role de super admin' });
        }

        // Verificar se novo nome já existe em outra role
        if (name !== role.name) {
            const existingRole = await Role.findOne({ name });
            if (existingRole) {
                return res.status(400).json({ error: 'Já existe uma role com este nome' });
            }
        }

        // Atualizar role
        role.name = name;
        role.description = description;
        role.permissions = permissions;
        role.isAdmin = isAdmin || false;
        
        await role.save();

        // Registrar log
        await AuditLog.create({
            action: 'update_role',
            userId: req.user.id,
            details: {
                roleId,
                updatedFields: Object.keys(req.body)
            }
        });

        res.json(role);
    } catch (error) {
        console.error('Erro ao atualizar role:', error);
        res.status(500).json({ error: 'Erro ao atualizar role' });
    }
});

// Excluir role (apenas super admin)
router.delete('/:id', auth, isAdmin, async (req, res) => {
    try {
        const roleId = req.params.id;

        // Verificar se role existe
        const role = await Role.findById(roleId);
        if (!role) {
            return res.status(404).json({ error: 'Role não encontrada' });
        }

        // Impedir exclusão de roles padrão do sistema
        if (['super_admin', 'admin', 'moderator'].includes(role.name)) {
            return res.status(403).json({ error: 'Não é possível excluir roles padrão do sistema' });
        }

        await role.delete();

        // Registrar log
        await AuditLog.create({
            action: 'delete_role',
            userId: req.user.id,
            details: {
                roleId,
                roleName: role.name
            }
        });

        res.json({ message: 'Role excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir role:', error);
        res.status(500).json({ error: 'Erro ao excluir role' });
    }
});

module.exports = router;