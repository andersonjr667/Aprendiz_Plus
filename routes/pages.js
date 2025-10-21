const express = require('express');
const path = require('path');
const router = express.Router();
const auth = require('../middleware/auth');

// Função auxiliar para servir páginas HTML
function servePage(pageName) {
    return (req, res) => {
        res.sendFile(path.join(__dirname, '../pages', `${pageName}.html`));
    };
}

// Função para verificar autenticação em rotas protegidas
function requireAuth(req, res, next) {
    if (!req.user) {
        return res.redirect('/login');
    }
    next();
}

// Rotas públicas
router.get('/', servePage('index'));
router.get('/login', servePage('login'));
router.get('/cadastro', servePage('cadastro'));
router.get('/vagas', servePage('vagas'));
router.get('/empresas', servePage('empresas'));
router.get('/candidatos', servePage('candidatos'));
router.get('/noticias', servePage('noticias'));
router.get('/contato', servePage('contato'));
router.get('/sobre', servePage('sobre'));
router.get('/termos', servePage('termos'));
router.get('/privacidade', servePage('privacidade'));

// Rotas protegidas (requerem autenticação)
router.get('/perfil-candidato', requireAuth, servePage('perfil-candidato'));
router.get('/perfil-empresa', requireAuth, servePage('perfil-empresa'));
router.get('/publicar-vaga', requireAuth, servePage('publicar-vaga'));
router.get('/vaga-detalhes/:id', servePage('vaga-detalhes'));

// Página 404 para rotas não encontradas
router.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../pages', '404.html'));
});

module.exports = router;