const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { isAdmin } = require('../../middleware/admin-auth');
const User = require('../../models/User');
const Job = require('../../models/Job');
const AuditLog = require('../../models/AuditLog');
const bcrypt = require('bcryptjs');

// Rota para obter dados do dashboard
router.get('/dashboard', auth, isAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalJobs = await Job.countDocuments({ status: 'active' });
        const totalCompanies = await User.countDocuments({ type: 'empresa' });
        const totalNews = await News.countDocuments();

        res.json({
            totalUsers,
            totalJobs,
            totalCompanies,
            totalNews
        });
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        res.status(500).json({ error: 'Erro ao carregar dados do dashboard' });
    }
});

// Rota para listar usuários com paginação e filtros
router.get('/users', auth, isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // Construir filtros
        const filters = {};
        if (req.query.search) {
            filters.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } }
            ];
        }
        if (req.query.type) filters.type = req.query.type;
        if (req.query.status) filters.status = req.query.status;

        // Buscar usuários
        const users = await User.find(filters)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Contar total para paginação
        const total = await User.countDocuments(filters);

        res.json({
            users,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total
            }
        });
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});

// Rota para criar novo usuário
router.post('/users', auth, isAdmin, async (req, res) => {
    try {
        const { name, email, password, type, status } = req.body;

        // Verificar se email já existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Criar usuário
        const user = new User({
            name,
            email,
            password: hashedPassword,
            type,
            status
        });

        await user.save();

        // Registrar log
        await AuditLog.create({
            action: 'create_user',
            userId: req.user.id,
            details: {
                createdUserId: user.id,
                userType: type
            }
        });

        res.status(201).json({
            message: 'Usuário criado com sucesso',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                type: user.type,
                status: user.status
            }
        });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// Rota para atualizar usuário
router.put('/users/:id', auth, isAdmin, async (req, res) => {
    try {
        const { name, email, password, type, status } = req.body;
        const userId = req.params.id;

        // Verificar se usuário existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Verificar se email já está em uso por outro usuário
        if (email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ error: 'Email já está em uso' });
            }
        }

        // Atualizar dados
        user.name = name;
        user.email = email;
        user.type = type;
        user.status = status;

        // Atualizar senha apenas se fornecida
        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();

        // Registrar log
        await AuditLog.create({
            action: 'update_user',
            userId: req.user.id,
            details: {
                updatedUserId: userId,
                updatedFields: Object.keys(req.body)
            }
        });

        res.json({
            message: 'Usuário atualizado com sucesso',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                type: user.type,
                status: user.status
            }
        });
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

// Rota para excluir usuário
router.delete('/users/:id', auth, isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        // Verificar se usuário existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Impedir exclusão do próprio usuário admin
        if (user.id === req.user.id) {
            return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' });
        }

        await user.delete();

        // Registrar log
        await AuditLog.create({
            action: 'delete_user',
            userId: req.user.id,
            details: {
                deletedUserId: userId,
                deletedUserEmail: user.email
            }
        });

        res.json({ message: 'Usuário excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
});

// Rota para obter dados de um usuário específico
router.get('/users/:id', auth, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.json(user);
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
});

module.exports = router;