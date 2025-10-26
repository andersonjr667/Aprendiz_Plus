const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { UserService } = require('../../services/database');
const authMiddleware = require('../../middleware/auth');
const AuthService = require('../../services/auth');
const UserModel = require('../../models/User');
const bcrypt = require('bcryptjs');

// Middleware para validar corpo da requisição
const validateLoginRequest = (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ 
            error: 'Email e senha são obrigatórios',
            details: {
                email: !email ? 'Email não fornecido' : null,
                password: !password ? 'Senha não fornecida' : null
            }
        });
    }
    next();
};

// Registro
router.post('/register', async (req, res) => {
    try {
        console.log('[DEBUG] /api/auth/register body:', JSON.stringify(req.body));
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
    let age = today.getFullYear() - birthdateDate.getFullYear();
        const monthDiff = today.getMonth() - birthdateDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdateDate.getDate())) {
            age--;
        }

        if (age < 14 || age > 24) {
            return res.status(400).json({ error: 'É necessário ter entre 14 e 24 anos para se cadastrar como Jovem Aprendiz' });
        }

        // Validação mínima
        if (!email || !password || password.length < 6) {
            return res.status(400).json({ error: 'Email e senha (mínimo 6 caracteres) são obrigatórios.' });
        }

        // Bloquear criação de admin via registro público
        const allowedTypes = ['candidato', 'empresa'];
        const userType = (type || '').toString().toLowerCase();
        if (!allowedTypes.includes(userType)) {
            return res.status(400).json({ error: 'Tipo de usuário inválido.' });
        }

        const userData = {
            name,
            email,
            password,
            cpf,
            birthdate,
            type: userType
        };

        // Dados comuns de endereço
        const address = {
            street: req.body.rua,
            number: req.body.numero,
            complement: req.body.complemento,
            neighborhood: req.body.bairro,
            city: req.body.cidade,
            state: req.body.estado,
            zipCode: req.body.cep
        };

        // Adicionar campos específicos baseado no tipo de usuário
        if (userType === 'candidato') {
                userData.candidateProfile = {
                education: {
                    degree: req.body.escolaridade,
                    currentCourse: {
                        hasCourse: req.body.tem_curso === 'sim',
                        institution: req.body.tem_curso === 'sim' ? req.body.instituicao : undefined,
                        courseName: req.body.tem_curso === 'sim' ? req.body.curso : undefined,
                        status: req.body.tem_curso === 'sim' ? req.body.status_curso : undefined,
                        expectedEndYear: req.body.tem_curso === 'sim' && req.body.ano_conclusao ? 
                            parseInt(req.body.ano_conclusao) : undefined
                    }
                },
                skills: (function() {
                    const s = req.body.habilidades;
                    if (!s) return [];
                    if (Array.isArray(s)) return s;
                    try { return JSON.parse(s); } catch (e) { return typeof s === 'string' ? [s] : [] }
                })(),
                phone: req.body.phone,
                address: address
            };
        } else if (userType === 'empresa') {
            // Mapear campos específicos de empresa (inclui nome fantasia e razão social)
            const benefits = (function() {
                const b = req.body.beneficios;
                if (!b) return [];
                if (Array.isArray(b)) return b;
                try { return JSON.parse(b); } catch (e) { return typeof b === 'string' ? [b] : []; }
            })();
            // Se foi informado nome fantasia, usar como nome principal do usuário
            const nomeFantasia = req.body.nome_fantasia || req.body.nomeFantasia || undefined;
            if (nomeFantasia) userData.name = nomeFantasia;

            userData.companyProfile = {
                razaoSocial: req.body.razao_social || req.body.razaoSocial || undefined,
                nomeFantasia: nomeFantasia,
                cnpj: req.body.cnpj,
                description: req.body.sobre_empresa,
                website: req.body.website,
                linkedin: req.body.linkedin,
                phone: req.body.rep_phone || req.body.phone,
                address: address,
                industry: req.body.setor,
                size: req.body.porte,
                benefits: benefits
            };
        }

        const createdUser = await UserService.create(userData);

        const token = jwt.sign({ id: createdUser.id }, process.env.JWT_SECRET);
        // Setar cookie httpOnly como fallback seguro
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 1000 * 60 * 60 * 24 * 7 // 7 dias
        });

        res.status(201).json({ user: createdUser, token });
    } catch (error) {
        console.error('Auth register error:', error && error.stack ? error.stack : error);
        const msg = process.env.NODE_ENV === 'development' ? (error && error.message ? error.message : 'Erro de registro') : 'Erro ao processar registro';
        const payload = { error: msg };
        if (process.env.NODE_ENV === 'development') payload.stack = error && error.stack ? error.stack : '';
        res.status(400).json(payload);
    }
});

// Login
router.post('/login', validateLoginRequest, async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('🔐 [LOGIN] Tentativa de login para:', email);

        // Buscar usuário
        let user = await UserService.findByEmail(email);
        console.log('👤 [LOGIN] Usuário encontrado?', !!user);
        
        if (!user) {
            console.log('❌ [LOGIN] Usuário não encontrado');
            return res.status(401).json({ 
                error: 'Email ou senha inválidos',
                debug: process.env.NODE_ENV === 'development' ? 'Usuário não encontrado' : undefined
            });
        }

        // Verificar se o usuário tem senha definida
        if (!user.password) {
            console.log('⚠️ [LOGIN] Usuário sem senha definida:', email);
            return res.status(401).json({ 
                error: 'Email ou senha inválidos',
                debug: process.env.NODE_ENV === 'development' ? 'Usuário sem senha' : undefined
            });
        }

        // Verificar senha
        console.log('🔍 [LOGIN] Verificando senha para:', email);
        const isValidPassword = await UserService.comparePassword(user, password);
        console.log('🔑 [LOGIN] Senha válida?', isValidPassword);

        if (!isValidPassword) {
            console.log('❌ [LOGIN] Senha inválida para:', email);
            return res.status(401).json({ error: 'Email ou senha inválidos' });
        }

        // Gerar token JWT e setar cookie httpOnly
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 1000 * 60 * 60 * 24 * 7 // 7 dias
        });

        // Retornar usuário (pode remover senha no serviço se necessário)
        const { password: pwd, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword, token });
    } catch (error) {
        console.error('Auth login error:', error && error.stack ? error.stack : error);
        const msg = process.env.NODE_ENV === 'development' ? (error && error.message ? error.message : 'Erro de login') : 'Erro ao processar login';
        const payload = { error: msg };
        if (process.env.NODE_ENV === 'development') payload.stack = error && error.stack ? error.stack : '';
        res.status(400).json(payload);
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

// Logout (limpa cookie httpOnly)
router.post('/logout', (req, res) => {
    try {
        res.clearCookie('token');
        res.json({ message: 'Logout realizado' });
    } catch (e) {
        console.error('Logout error:', e);
        res.status(500).json({ error: 'Erro ao realizar logout' });
    }
});

// Admin-protected password reset endpoint (protected by ADMIN_RESET_TOKEN env var)
// Usage: send header 'x-admin-token' with value of process.env.ADMIN_RESET_TOKEN
router.post('/admin-reset-password', async (req, res) => {
    const token = req.headers['x-admin-token'] || req.body.token;
    if (!process.env.ADMIN_RESET_TOKEN || token !== process.env.ADMIN_RESET_TOKEN) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
        return res.status(400).json({ error: 'Email e nova senha são obrigatórios' });
    }

    try {
        // If using Mongo, update via the model so pre('save') hashes password
        const useMongo = process.env.MONGO_ENABLED === 'true' || process.env.USE_MONGO === 'true';
        if (useMongo) {
            const user = await UserModel.findOne({ email }).select('+password');
            if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
            user.password = newPassword; // pre-save middleware will hash
            await user.save();
            const obj = user.toObject();
            delete obj.password;
            return res.json({ message: 'Senha atualizada', user: obj });
        }

        // Fallback: local JSON DB - hash then update
        const hashed = await bcrypt.hash(newPassword, 10);
        const existing = await UserService.findByEmail(email);
        if (!existing) return res.status(404).json({ error: 'Usuário não encontrado' });
        await UserService.update(existing.id, { password: hashed });
        const updated = await UserService.findByEmail(email);
        const { password, ...userWithoutPassword } = updated;
        return res.json({ message: 'Senha atualizada', user: userWithoutPassword });
    } catch (error) {
        console.error('admin-reset-password error:', error);
        return res.status(500).json({ error: 'Erro ao atualizar senha' });
    }
});

module.exports = router;