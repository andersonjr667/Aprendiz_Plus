const express = require('express');
const router = express.Router();
const path = require('path');
const authRouter = require('./api/auth');
const newsRouter = require('./api/news');
const jobsRouter = require('./api/jobs');
const commentsRouter = require('./api/comments');
const recommendationsRouter = require('./api/recommendations');
const usersRouter = require('./api/users');

// Rotas da API
router.use('/api/auth', authRouter);
router.use('/api/news', newsRouter);
router.use('/api/jobs', jobsRouter);
router.use('/api/comments', commentsRouter);
router.use('/api/recommendations', recommendationsRouter);
router.use('/api/users', usersRouter);
router.use('/api/audit', require('./api/audit'));

// Rota principal
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages', 'index.html'));
});

// Rotas para as diferentes seções
router.get('/vagas', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages', 'vagas.html'));
});

router.get('/empresas', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages', 'empresas.html'));
});

router.get('/candidatos', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages', 'candidatos.html'));
});

router.get('/noticias', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages', 'noticias.html'));
});

// Rotas de perfil
router.get('/perfil-candidato', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages', 'perfil-candidato.html'));
});

router.get('/perfil-empresa', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages', 'perfil-empresa.html'));
});

router.get('/publicar-vaga', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages', 'publicar-vaga.html'));
});

router.get('/candidatos-vaga/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages', 'candidatos-vaga.html'));
});

// Rotas de autenticação
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages', 'login.html'));
});

router.get('/cadastro', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages', 'cadastro.html'));
});

// Rota de detalhes da vaga
router.get('/vaga/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages', 'vaga-detalhes.html'));
});

// Rota de contato
router.get('/contato', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages', 'contato.html'));
});

module.exports = router;