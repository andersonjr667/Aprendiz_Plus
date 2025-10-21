const express = require('express');
const path = require('path');
const router = express.Router();
const auth = require('../middleware/auth');

function isAdmin(req, res, next) {
    if (req.user && req.user.type === 'admin') return next();
    return res.status(403).json({ error: 'Acesso restrito a administradores.' });
}

// Rota principal do admin
router.get('/', auth, isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '../pages', 'admin.html'));
});

// API para dados do dashboard
router.get('/api/dashboard', auth, isAdmin, async (req, res) => {
    try {
        // Em uma implementação real, estes dados viriam do banco de dados
        const dashboardData = {
            totalUsers: await countUsers(),
            totalJobs: await countJobs(),
            totalCompanies: await countCompanies(),
            totalNews: await countNews()
        };
        res.json(dashboardData);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar dados do dashboard' });
    }
});

// API para atividades recentes
router.get('/api/recent-activity', auth, isAdmin, async (req, res) => {
    try {
        const activities = await getRecentActivities();
        res.json(activities);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar atividades recentes' });
    }
});

// Página de cadastro de notícia
router.get('/noticias', auth, isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '../pages', 'admin-noticia.html'));
});

// API para criar notícia
router.post('/noticias', auth, isAdmin, async (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });
    }

    try {
        const news = await createNews({ title, content, author: req.user.id });
        res.json({ message: 'Notícia cadastrada com sucesso', data: news });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao cadastrar notícia' });
    }
});

// Funções auxiliares (mock - substituir pela implementação real)
async function countUsers() {
    return 150; // Mock - implementar consulta real ao banco
}

async function countJobs() {
    return 75; // Mock - implementar consulta real ao banco
}

async function countCompanies() {
    return 45; // Mock - implementar consulta real ao banco
}

async function countNews() {
    return 30; // Mock - implementar consulta real ao banco
}

async function getRecentActivities() {
    // Mock - implementar consulta real ao banco
    return [
        {
            type: 'user',
            description: 'Novo usuário registrado: João Silva',
            timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 minutos atrás
        },
        {
            type: 'job',
            description: 'Nova vaga publicada: Desenvolvedor Full Stack',
            timestamp: new Date(Date.now() - 1000 * 60 * 60) // 1 hora atrás
        },
        {
            type: 'company',
            description: 'Nova empresa cadastrada: Tech Solutions',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 horas atrás
        }
    ];
}

async function createNews(data) {
    // Mock - implementar criação real no banco
    return {
        id: Math.floor(Math.random() * 1000),
        ...data,
        createdAt: new Date()
    };
}

module.exports = router;
