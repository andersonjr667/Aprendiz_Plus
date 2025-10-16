const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { UserService } = require('../../services/database');
const authMiddleware = require('../../middleware/auth');

// Registro
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, cpf, birthdate, type } = req.body;

        // Validar CPF único
        const existingCPF = await UserService.findByCPF(cpf);
        if (existingCPF) {
            return res.status(400).json({ error: 'CPF já cadastrado' });
        }

        // Validar email único
        const existingEmail = await UserService.findByEmail(email);
        if (existingEmail) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }

        // Validar idade
        const today = new Date();
        const birthdateDate = new Date(birthdate);
        const age = today.getFullYear() - birthdateDate.getFullYear();
        const monthDiff = today.getMonth() - birthdateDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdateDate.getDate())) {
            age--;
        }

        if (age < 14) {
            return res.status(400).json({ error: 'É necessário ter pelo menos 14 anos para se cadastrar' });
        }

        const createdUser = await UserService.create({
            name,
            email,
            password,
            cpf,
            birthdate,
            type
        });

        const token = jwt.sign({ id: createdUser.id }, process.env.JWT_SECRET);
        res.status(201).json({ user: createdUser, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await UserService.findByEmail(email);

        if (!user || !(await UserService.comparePassword(user, password))) {
            throw new Error('Email ou senha inválidos');
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
        const { password: pwd, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Verificar token / obter dados do usuário logado
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = req.user;
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(401).json({ error: 'Não autorizado' });
    }
});

module.exports = router;