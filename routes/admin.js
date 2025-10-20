const express = require('express');
const path = require('path');
const router = express.Router();
const auth = require('../middleware/auth');

function isAdmin(req, res, next) {
    if (req.user && req.user.type === 'admin') return next();
    return res.status(403).json({ error: 'Acesso restrito a administradores.' });
}

// Página de cadastro de notícia (apenas admin)
router.get('/noticias', auth, isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '../pages', 'admin-noticia.html'));
});

// Rota para receber POST de nova notícia (apenas admin)
router.post('/noticias', auth, isAdmin, async (req, res) => {
    // Aqui você salvaria a notícia no banco de dados
    // Exemplo: req.body.titulo, req.body.conteudo
    // Usar NewsService seria ideal; por enquanto, simulação:
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });

    // Em uma implementação real, chamar NewsService.create({ title, content, author: req.user.id })
    res.json({ message: 'Notícia cadastrada (simulação).', data: { title, content } });
});

module.exports = router;
