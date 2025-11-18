// Currículo
router.get('/gerar-curriculo', (req, res) => sendPage(res, 'gerar-curriculo.html'));
const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const pagesDir = path.join(__dirname, '..', 'public', 'pages');

function sendPage(res, filename) {
	try {
		const filePath = path.join(pagesDir, filename);
		let html = fs.readFileSync(filePath, 'utf8');
		// set CSP header to allow only our own scripts
		res.set('Content-Security-Policy', "default-src 'self'; base-uri 'self'; font-src 'self' https: data:; form-action 'self'; frame-ancestors 'self'; img-src 'self' data: https://res.cloudinary.com; object-src 'none'; script-src 'self' 'unsafe-inline'; script-src-attr 'unsafe-inline'; style-src 'self' https: 'unsafe-inline'; upgrade-insecure-requests");
		res.send(html);
	} catch (err) {
		res.status(500).send('Error loading page');
	}
}

// Home / core
router.get('/', (req, res) => sendPage(res, 'index.html'));

// Auth
router.get('/login', (req, res) => sendPage(res, 'login.html'));
router.get('/register', (req, res) => sendPage(res, 'register.html'));
router.get('/forgot-password', (req, res) => sendPage(res, 'forgot-password.html'));
router.get('/recuperar-senha', (req, res) => sendPage(res, 'recuperar-senha.html'));
router.get('/reset-password', (req, res) => sendPage(res, 'reset-password.html'));

// Jobs / Vagas
router.get('/vagas', (req, res) => sendPage(res, 'vagas.html'));
router.get('/job/:id', (req, res) => sendPage(res, 'job-detail.html'));
router.get('/vaga/:id', (req, res) => sendPage(res, 'vaga-detalhes.html'));
router.get('/vaga-detalhes/:id', (req, res) => sendPage(res, 'vaga-detalhes.html'));
router.get('/publicar-vaga', (req, res) => sendPage(res, 'publicar-vaga.html'));
router.get('/publish-job', (req, res) => sendPage(res, 'publish-job.html'));

// Dashboards / profiles
router.get('/dashboard-candidato', (req, res) => sendPage(res, 'dashboard-candidato.html'));
router.get('/dashboard-empresa', (req, res) => sendPage(res, 'dashboard-empresa.html'));
router.get('/profile', (req, res) => sendPage(res, 'profile.html'));
router.get('/perfil-candidato', (req, res) => sendPage(res, 'perfil-candidato.html'));
router.get('/perfil-empresa', (req, res) => sendPage(res, 'perfil-empresa.html'));
router.get('/painel-empresa', (req, res) => sendPage(res, 'painel-empresa.html'));
router.get('/analytics', (req, res) => sendPage(res, 'analytics.html'));

// Public profiles (shareable)
router.get('/perfil-publico-candidato', (req, res) => sendPage(res, 'perfil-publico-candidato.html'));
router.get('/perfil-publico-empresa', (req, res) => sendPage(res, 'perfil-publico-empresa.html'));
router.get('/perfil-publico-admin', (req, res) => sendPage(res, 'perfil-publico-admin.html'));

// Admin
router.get('/admin-panel', (req, res) => sendPage(res, 'admin-panel.html'));
router.get('/admin', (req, res) => sendPage(res, 'admin.html'));
router.get('/admin-usuarios', (req, res) => sendPage(res, 'admin-usuarios.html'));
router.get('/admin-noticia', (req, res) => sendPage(res, 'admin-noticia.html'));
router.get('/admin-monitoramento', (req, res) => sendPage(res, 'admin-monitoramento.html'));
router.get('/admin-manage-admins', (req, res) => sendPage(res, 'admin-manage-admins.html'));
router.get('/perfil-admin', (req, res) => sendPage(res, 'perfil-admin.html'));

// News
router.get('/news', (req, res) => sendPage(res, 'news.html'));
router.get('/noticias', (req, res) => sendPage(res, 'noticias.html'));
router.get('/news/:id', (req, res) => sendPage(res, 'news-detail.html'));
router.get('/noticia/:id', (req, res) => sendPage(res, 'news-detail.html'));

// Listings
router.get('/empresas', (req, res) => sendPage(res, 'empresas.html'));
router.get('/candidatos', (req, res) => sendPage(res, 'candidatos.html'));

// Other pages
router.get('/contato', (req, res) => sendPage(res, 'contato.html'));
router.get('/search', (req, res) => sendPage(res, 'search-results.html'));
router.get('/not-found', (req, res) => sendPage(res, '404.html'));
router.get('/teste-api', (req, res) => sendPage(res, 'teste-api.html'));
router.get('/ai-test', (req, res) => sendPage(res, 'ai-test.html'));

// New features pages
router.get('/chat', (req, res) => sendPage(res, 'chat.html'));
router.get('/favoritos', (req, res) => sendPage(res, 'favoritos.html'));
router.get('/mapa-vagas', (req, res) => sendPage(res, 'mapa-vagas.html'));

// Fallback for unknown routes -> 404 page
// Only catch routes that don't start with /api or /public
router.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/public') || req.path.startsWith('/uploads')) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.status(404);
    sendPage(res, '404.html');
});

module.exports = router;
