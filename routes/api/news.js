const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { NewsService } = require('../../services/database');

// Listar todas as notícias com paginação e busca
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 9; // Notícias por página
        const skip = (page - 1) * limit;
        
        let query = {};
        
        // Filtrar por categoria
        if (req.query.category && req.query.category !== 'all') {
            query.category = req.query.category;
        }
        
        // Busca por texto
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query.$or = [
                { title: searchRegex },
                { content: searchRegex }
            ];
        }
        
        // Usar NewsService para obter notícias
        const result = await NewsService.findAll(page, limit);
        res.json({
            news: result.news,
            currentPage: result.page,
            totalPages: result.totalPages,
            totalNews: result.total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Criar nova notícia
router.post('/', auth, async (req, res) => {
    try {
        const created = await NewsService.create({
            ...req.body,
            author: req.user.id
        });
        res.status(201).json(created);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Obter uma notícia específica
router.get('/:id', async (req, res) => {
    try {
        const news = await NewsService.findById(req.params.id);
        if (!news) {
            return res.status(404).json({ error: 'Notícia não encontrada' });
        }
        res.json(news);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Atualizar uma notícia
router.put('/:id', auth, async (req, res) => {
    try {
        // Atualizar notícia (apenas autor)
        const existing = await NewsService.findById(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Notícia não encontrada' });
        if (existing.author !== req.user.id) return res.status(403).json({ error: 'Sem permissão' });

        // Atualiza os campos
        const updated = Object.assign(existing, req.body);
        // Salvar
        const db = require('../../services/database');
        // Reaproveitar writeDB via JobService trick: fazer update manual
        const data = await (async () => {
            const fs = require('fs').promises;
            const path = require('path');
            const dbPath = path.join(__dirname, '../../data/db.json');
            const content = await fs.readFile(dbPath, 'utf8');
            const parsed = JSON.parse(content);
            const idx = parsed.news.findIndex(n => n.id === req.params.id);
            if (idx === -1) return null;
            parsed.news[idx] = updated;
            await fs.writeFile(dbPath, JSON.stringify(parsed, null, 2));
            return parsed.news[idx];
        })();

        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Deletar uma notícia
router.delete('/:id', auth, async (req, res) => {
    try {
        const existing = await NewsService.findById(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Notícia não encontrada' });
        if (existing.author !== req.user.id) return res.status(403).json({ error: 'Sem permissão' });

        // Deletar
        const fs = require('fs').promises;
        const path = require('path');
        const dbPath = path.join(__dirname, '../../data/db.json');
        const content = await fs.readFile(dbPath, 'utf8');
        const parsed = JSON.parse(content);
        parsed.news = parsed.news.filter(n => n.id !== req.params.id);
        await fs.writeFile(dbPath, JSON.stringify(parsed, null, 2));

        res.json({ message: 'Notícia deletada com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;