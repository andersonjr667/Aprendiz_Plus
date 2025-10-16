const express = require('express');
const path = require('path');
const router = express.Router();

// Middleware simples de autenticação admin (exemplo)
function isAdmin(req, res, next) {
    // Exemplo: checa se existe req.session && req.session.isAdmin === true
    // Aqui, para teste, aceita se query ?admin=1
    if (req.query.admin === '1') {
        return next();
    }
    return res.status(403).send('Acesso restrito a administradores.');
}

// Página de cadastro de notícia (apenas admin)
router.get('/noticias', isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '../pages', 'admin-noticia.html'));
});

// Rota para receber POST de nova notícia (apenas admin)
router.post('/noticias', isAdmin, (req, res) => {
    // Aqui você salvaria a notícia no banco de dados
    // Exemplo: req.body.titulo, req.body.conteudo
    res.send('Notícia cadastrada (simulação).');
});

module.exports = router;
