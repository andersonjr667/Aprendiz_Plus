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
router.get('/perfil-candidato', auth, (req, res, next) => {
    if (req.user && (req.user.type === 'candidato' || req.user.type === 'admin')) {
        servePage('perfil-candidato')(req, res, next);
    } else {
        res.redirect('/');
    }
});

router.get('/perfil-empresa', auth, (req, res, next) => {
    if (req.user && (req.user.type === 'empresa' || req.user.type === 'admin')) {
        servePage('perfil-empresa')(req, res, next);
    } else {
        res.redirect('/');
    }
});

router.get('/publicar-vaga', auth, (req, res, next) => {
    if (req.user && (req.user.type === 'empresa' || req.user.type === 'admin')) {
        servePage('publicar-vaga')(req, res, next);
    } else {
        res.redirect('/');
    }
});

router.get('/vaga-detalhes/:id', servePage('vaga-detalhes'));

// Página 404 para rotas não encontradas
router.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../pages', '404.html'));
});

module.exports = router;